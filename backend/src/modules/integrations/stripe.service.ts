import { PrismaClient } from '@prisma/client';
import { logger } from '../../common/utils/logger.js';

const prisma = new PrismaClient();

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_BASE_URL = 'https://api.stripe.com/v1';

interface StripePaymentParams {
  invoiceId: string;
  tenantId: string;
  amount: number;
  currency?: string;
  email: string;
  description?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

interface StripeWebhookEvent {
  type: string;
  data: {
    object: {
      id: string;
      amount: number;
      amount_received: number;
      currency: string;
      status: string;
      payment_method_types: string[];
      metadata: Record<string, string>;
      customer_email?: string;
    };
  };
}

class StripeService {
  private get headers() {
    return {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private encodeParams(params: Record<string, any>, prefix = ''): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        parts.push(this.encodeParams(value, fullKey));
      } else {
        parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.join('&');
  }

  /**
   * Create a Checkout Session (hosted payment page)
   */
  async createCheckoutSession(params: StripePaymentParams) {
    if (!STRIPE_SECRET) {
      throw new Error('Stripe secret key not configured. Set STRIPE_SECRET_KEY env variable.');
    }

    const successUrl = params.callbackUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing/payment-callback?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing/invoices`;

    const body = this.encodeParams({
      'line_items[0][price_data][currency]': params.currency || 'ghs',
      'line_items[0][price_data][product_data][name]': params.description || `Invoice ${params.invoiceId}`,
      'line_items[0][price_data][unit_amount]': Math.round(params.amount * 100), // Stripe expects pesewas/cents
      'line_items[0][quantity]': 1,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: params.email,
      'metadata[invoiceId]': params.invoiceId,
      'metadata[tenantId]': params.tenantId,
    });

    try {
      const response = await fetch(`${STRIPE_BASE_URL}/checkout/sessions`, {
        method: 'POST',
        headers: this.headers,
        body,
      });

      const result: any = await response.json();

      if (result.id && result.url) {
        await prisma.mobileMoneyTransaction.create({
          data: {
            tenantId: params.tenantId,
            invoiceId: params.invoiceId,
            amount: params.amount,
            phone: '',
            network: 'STRIPE',
            externalRef: result.id,
            status: 'PENDING',
          },
        });

        return {
          sessionId: result.id,
          paymentUrl: result.url,
          reference: result.id,
        };
      }

      throw new Error(result.error?.message || 'Stripe session creation failed');
    } catch (error: any) {
      throw new Error(`Stripe checkout failed: ${error.message}`);
    }
  }

  /**
   * Retrieve a checkout session
   */
  async retrieveSession(sessionId: string) {
    if (!STRIPE_SECRET) throw new Error('Stripe secret key not configured.');

    try {
      const response = await fetch(`${STRIPE_BASE_URL}/checkout/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET}` },
      });

      const result: any = await response.json();
      if (result.id) return result;
      throw new Error(result.error?.message || 'Session not found');
    } catch (error: any) {
      throw new Error(`Stripe session retrieval failed: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook (checkout.session.completed)
   */
  async handleWebhook(event: StripeWebhookEvent) {
    if (event.type !== 'checkout.session.completed') {
      return { processed: false, reason: `Unhandled event: ${event.type}` };
    }

    const session = event.data.object;
    const invoiceId = session.metadata?.invoiceId;
    const tenantId = session.metadata?.tenantId;

    if (!invoiceId || !tenantId) {
      return { processed: false, reason: 'Missing invoiceId or tenantId in metadata' };
    }

    if (session.status !== 'complete') {
      return { processed: false, reason: `Session status: ${session.status}` };
    }

    // Idempotency
    const existing = await prisma.payment.findFirst({ where: { transactionRef: session.id } });
    if (existing) return { processed: true, reason: 'Already processed', paymentId: existing.id };

    const amountGHS = (session.amount_received || session.amount) / 100;

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { processed: false, reason: 'Invoice not found' };

    const newBalance = Math.max(0, invoice.balance - amountGHS);
    const newAmountPaid = invoice.amountPaid + amountGHS;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId,
        amount: amountGHS,
        paymentMethod: 'CARD' as any,
        transactionRef: session.id,
        status: 'COMPLETED',
        notes: `Stripe checkout payment`,
      },
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newAmountPaid, balance: newBalance, status: newStatus },
    });

    await prisma.mobileMoneyTransaction.updateMany({
      where: { externalRef: session.id },
      data: { status: 'COMPLETED' },
    });

    return { processed: true, paymentId: payment.id, amountGHS, invoiceStatus: newStatus, remainingBalance: newBalance };
  }

  /**
   * Create a Payment Intent (for custom frontend integration)
   */
  async createPaymentIntent(params: StripePaymentParams) {
    if (!STRIPE_SECRET) throw new Error('Stripe secret key not configured.');

    const body = this.encodeParams({
      amount: Math.round(params.amount * 100),
      currency: params.currency || 'ghs',
      'metadata[invoiceId]': params.invoiceId,
      'metadata[tenantId]': params.tenantId,
      receipt_email: params.email,
      description: params.description || `Invoice ${params.invoiceId}`,
    });

    try {
      const response = await fetch(`${STRIPE_BASE_URL}/payment_intents`, {
        method: 'POST',
        headers: this.headers,
        body,
      });

      const result: any = await response.json();
      if (result.id) return { intentId: result.id, clientSecret: result.client_secret, status: result.status };
      throw new Error(result.error?.message || 'Payment intent creation failed');
    } catch (error: any) {
      throw new Error(`Stripe payment intent failed: ${error.message}`);
    }
  }
}

export const stripeService = new StripeService();
