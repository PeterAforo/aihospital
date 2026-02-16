import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface InitializePaymentParams {
  invoiceId: string;
  tenantId: string;
  amount: number; // in GHS
  email: string;
  callbackUrl?: string;
  channels?: ('card' | 'mobile_money' | 'bank')[];
  metadata?: Record<string, any>;
}

interface PaystackWebhookEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    channel: string;
    paid_at: string;
    customer: { email: string };
    metadata?: Record<string, any>;
    authorization?: {
      authorization_code: string;
      card_type: string;
      last4: string;
      bank: string;
      channel: string;
    };
  };
}

class PaystackService {
  private get headers() {
    return {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(params: InitializePaymentParams) {
    if (!PAYSTACK_SECRET) {
      throw new Error('Paystack secret key not configured. Set PAYSTACK_SECRET_KEY env variable.');
    }

    const reference = `INV-${params.invoiceId.slice(0, 8)}-${Date.now()}`;

    const payload: any = {
      email: params.email,
      amount: Math.round(params.amount * 100), // Paystack expects pesewas
      currency: 'GHS',
      reference,
      callback_url: params.callbackUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing/payment-callback`,
      metadata: {
        invoiceId: params.invoiceId,
        tenantId: params.tenantId,
        ...params.metadata,
      },
    };

    if (params.channels && params.channels.length > 0) {
      payload.channels = params.channels;
    }

    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        payload,
        { headers: this.headers }
      );

      // Store the pending transaction
      await prisma.mobileMoneyTransaction.create({
        data: {
          tenantId: params.tenantId,
          invoiceId: params.invoiceId,
          amount: params.amount,
          phone: '',
          network: 'PAYSTACK',
          externalRef: reference,
          status: 'PENDING',
        },
      });

      return {
        reference,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      throw new Error(`Paystack initialization failed: ${msg}`);
    }
  }

  /**
   * Verify a transaction by reference
   */
  async verifyTransaction(reference: string) {
    if (!PAYSTACK_SECRET) {
      throw new Error('Paystack secret key not configured.');
    }

    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers: this.headers }
      );

      return response.data.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      throw new Error(`Paystack verification failed: ${msg}`);
    }
  }

  /**
   * Handle Paystack webhook event
   */
  async handleWebhook(event: PaystackWebhookEvent) {
    if (event.event !== 'charge.success') {
      return { processed: false, reason: `Unhandled event: ${event.event}` };
    }

    const { reference, amount, status, channel } = event.data;
    const metadata = event.data.metadata || {};
    const invoiceId = metadata.invoiceId as string;
    const tenantId = metadata.tenantId as string;

    if (!invoiceId || !tenantId) {
      return { processed: false, reason: 'Missing invoiceId or tenantId in metadata' };
    }

    if (status !== 'success') {
      return { processed: false, reason: `Transaction status: ${status}` };
    }

    // Check if already processed (idempotency)
    const existing = await prisma.payment.findFirst({
      where: { transactionRef: reference },
    });

    if (existing) {
      return { processed: true, reason: 'Already processed', paymentId: existing.id };
    }

    const amountGHS = amount / 100; // Convert pesewas to GHS

    // Find the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { processed: false, reason: 'Invoice not found' };
    }

    // Create payment record
    const paymentMethod = channel === 'mobile_money' ? 'MOBILE_MONEY' : 'CARD';

    const newBalance = Math.max(0, invoice.balance - amountGHS);
    const newAmountPaid = invoice.amountPaid + amountGHS;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId,
        amount: amountGHS,
        paymentMethod: paymentMethod as any,
        transactionRef: reference,
        status: 'COMPLETED',
        notes: `Paystack ${channel} payment`,
      },
    });

    // Update invoice
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
      },
    });

    // Update MoMo transaction record
    await prisma.mobileMoneyTransaction.updateMany({
      where: { externalRef: reference },
      data: { status: 'COMPLETED' },
    });

    return {
      processed: true,
      paymentId: payment.id,
      amountGHS,
      invoiceStatus: newStatus,
      remainingBalance: newBalance,
    };
  }

  /**
   * List supported banks for transfers
   */
  async listBanks() {
    if (!PAYSTACK_SECRET) return [];
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank?country=ghana&currency=GHS`,
        { headers: this.headers }
      );
      return response.data.data;
    } catch {
      return [];
    }
  }
}

export const paystackService = new PaystackService();
