import { PrismaClient } from '@prisma/client';
import { logger } from '../../common/utils/logger.js';

const prisma = new PrismaClient();

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || '';
const FLW_PUBLIC = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

interface FlutterwavePaymentParams {
  invoiceId: string;
  tenantId: string;
  amount: number;
  currency?: string;
  email: string;
  phone?: string;
  name?: string;
  callbackUrl?: string;
  paymentType?: 'card' | 'mobilemoneyghana' | 'bank_transfer';
  metadata?: Record<string, any>;
}

interface FlutterwaveWebhookEvent {
  event: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    charged_amount: number;
    status: string;
    payment_type: string;
    customer: { email: string; name: string; phone_number: string };
    meta?: Record<string, any>;
  };
}

class FlutterwaveService {
  private get headers() {
    return {
      Authorization: `Bearer ${FLW_SECRET}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initialize a payment (hosted payment page)
   */
  async initializePayment(params: FlutterwavePaymentParams) {
    if (!FLW_SECRET) {
      throw new Error('Flutterwave secret key not configured. Set FLUTTERWAVE_SECRET_KEY env variable.');
    }

    const txRef = `FLW-${params.invoiceId.slice(0, 8)}-${Date.now()}`;

    const payload: any = {
      tx_ref: txRef,
      amount: params.amount,
      currency: params.currency || 'GHS',
      redirect_url: params.callbackUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing/payment-callback`,
      customer: {
        email: params.email,
        phonenumber: params.phone || '',
        name: params.name || '',
      },
      customizations: {
        title: 'SmartMed Payment',
        description: `Invoice payment - ${params.invoiceId}`,
        logo: `${process.env.FRONTEND_URL || ''}/logo.png`,
      },
      meta: {
        invoiceId: params.invoiceId,
        tenantId: params.tenantId,
        ...params.metadata,
      },
    };

    if (params.paymentType) {
      payload.payment_options = params.paymentType;
    }

    try {
      const response = await fetch(`${FLW_BASE_URL}/payments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const result: any = await response.json();

      if (result.status === 'success' && result.data?.link) {
        // Store pending transaction
        await prisma.mobileMoneyTransaction.create({
          data: {
            tenantId: params.tenantId,
            invoiceId: params.invoiceId,
            amount: params.amount,
            phone: params.phone || '',
            network: 'FLUTTERWAVE',
            externalRef: txRef,
            status: 'PENDING',
          },
        });

        return {
          reference: txRef,
          paymentLink: result.data.link,
        };
      }

      throw new Error(result.message || 'Flutterwave initialization failed');
    } catch (error: any) {
      const msg = error.message || 'Unknown error';
      throw new Error(`Flutterwave initialization failed: ${msg}`);
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(transactionId: string) {
    if (!FLW_SECRET) throw new Error('Flutterwave secret key not configured.');

    try {
      const response = await fetch(`${FLW_BASE_URL}/transactions/${transactionId}/verify`, {
        headers: this.headers,
      });

      const result: any = await response.json();
      if (result.status === 'success') return result.data;
      throw new Error(result.message || 'Verification failed');
    } catch (error: any) {
      throw new Error(`Flutterwave verification failed: ${error.message}`);
    }
  }

  /**
   * Verify by tx_ref
   */
  async verifyByReference(txRef: string) {
    if (!FLW_SECRET) throw new Error('Flutterwave secret key not configured.');

    try {
      const response = await fetch(`${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${txRef}`, {
        headers: this.headers,
      });

      const result: any = await response.json();
      if (result.status === 'success') return result.data;
      throw new Error(result.message || 'Verification failed');
    } catch (error: any) {
      throw new Error(`Flutterwave verification failed: ${error.message}`);
    }
  }

  /**
   * Handle Flutterwave webhook
   */
  async handleWebhook(event: FlutterwaveWebhookEvent) {
    if (event.data.status !== 'successful') {
      return { processed: false, reason: `Transaction status: ${event.data.status}` };
    }

    const txRef = event.data.tx_ref;
    const meta = event.data.meta || {};
    const invoiceId = (meta as any).invoiceId as string;
    const tenantId = (meta as any).tenantId as string;

    if (!invoiceId || !tenantId) {
      return { processed: false, reason: 'Missing invoiceId or tenantId in meta' };
    }

    // Idempotency check
    const existing = await prisma.payment.findFirst({ where: { transactionRef: txRef } });
    if (existing) return { processed: true, reason: 'Already processed', paymentId: existing.id };

    const amountGHS = event.data.amount;

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { processed: false, reason: 'Invoice not found' };

    const paymentMethod = event.data.payment_type === 'mobilemoneyghana' ? 'MOBILE_MONEY' : 'CARD';
    const newBalance = Math.max(0, invoice.balance - amountGHS);
    const newAmountPaid = invoice.amountPaid + amountGHS;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId,
        amount: amountGHS,
        paymentMethod: paymentMethod as any,
        transactionRef: txRef,
        status: 'COMPLETED',
        notes: `Flutterwave ${event.data.payment_type} - Ref: ${event.data.flw_ref}`,
      },
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newAmountPaid, balance: newBalance, status: newStatus },
    });

    await prisma.mobileMoneyTransaction.updateMany({
      where: { externalRef: txRef },
      data: { status: 'COMPLETED' },
    });

    return { processed: true, paymentId: payment.id, amountGHS, invoiceStatus: newStatus, remainingBalance: newBalance };
  }

  /**
   * Initiate Ghana Mobile Money charge directly (no redirect)
   */
  async chargeMobileMoney(params: {
    invoiceId: string; tenantId: string; amount: number; phone: string;
    network: 'MTN' | 'VODAFONE' | 'TIGO'; email: string;
  }) {
    if (!FLW_SECRET) throw new Error('Flutterwave secret key not configured.');

    const txRef = `FLW-MOMO-${params.invoiceId.slice(0, 8)}-${Date.now()}`;

    try {
      const response = await fetch(`${FLW_BASE_URL}/charges?type=mobile_money_ghana`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          tx_ref: txRef,
          amount: params.amount,
          currency: 'GHS',
          email: params.email,
          phone_number: params.phone,
          network: params.network,
          meta: { invoiceId: params.invoiceId, tenantId: params.tenantId },
        }),
      });

      const result: any = await response.json();

      if (result.status === 'success') {
        await prisma.mobileMoneyTransaction.create({
          data: {
            tenantId: params.tenantId,
            invoiceId: params.invoiceId,
            amount: params.amount,
            phone: params.phone,
            network: params.network,
            externalRef: txRef,
            status: 'PENDING',
          },
        });

        return { reference: txRef, status: result.data.status, message: result.data.processor_response || 'Charge initiated' };
      }

      throw new Error(result.message || 'Mobile money charge failed');
    } catch (error: any) {
      throw new Error(`Flutterwave MoMo charge failed: ${error.message}`);
    }
  }

  getPublicKey(): string {
    return FLW_PUBLIC;
  }
}

export const flutterwaveService = new FlutterwaveService();
