import { logger } from '../../common/utils/logger.js';
import { resolveApiConfig, logApiUsage } from '../api-config/api-config.service.js';
import { paystackService } from '../billing/paystack.service.js';
import { flutterwaveService } from './flutterwave.service.js';
import { stripeService } from './stripe.service.js';
import { mobileMoneyService } from './momo.service.js';

// Unified Payment Gateway Factory
// Resolves the correct payment provider based on 3-tier API config
// Supports: Paystack, Flutterwave, Stripe, MTN MoMo, Vodafone Cash, AirtelTigo

export type PaymentProvider = 'Paystack' | 'Flutterwave' | 'Stripe' | 'MTN_MoMo' | 'Vodafone_Cash' | 'AirtelTigo';

export interface UnifiedPaymentRequest {
  invoiceId: string;
  tenantId: string;
  branchId?: string;
  amount: number;
  currency?: string;
  email: string;
  phone?: string;
  name?: string;
  callbackUrl?: string;
  preferredProvider?: PaymentProvider;
  preferredChannel?: 'card' | 'mobile_money' | 'bank_transfer';
  metadata?: Record<string, any>;
}

export interface UnifiedPaymentResult {
  success: boolean;
  provider: string;
  reference: string;
  paymentUrl?: string;
  status: string;
  message: string;
}

export const SUPPORTED_PAYMENT_PROVIDERS: { name: PaymentProvider; label: string; channels: string[]; regions: string[] }[] = [
  { name: 'Paystack', label: 'Paystack', channels: ['card', 'mobile_money', 'bank_transfer'], regions: ['Ghana', 'Nigeria', 'South Africa'] },
  { name: 'Flutterwave', label: 'Flutterwave', channels: ['card', 'mobile_money', 'bank_transfer'], regions: ['Pan-African', '30+ countries'] },
  { name: 'Stripe', label: 'Stripe', channels: ['card'], regions: ['International', '46+ countries'] },
  { name: 'MTN_MoMo', label: 'MTN Mobile Money', channels: ['mobile_money'], regions: ['Ghana'] },
  { name: 'Vodafone_Cash', label: 'Vodafone Cash', channels: ['mobile_money'], regions: ['Ghana'] },
  { name: 'AirtelTigo', label: 'AirtelTigo Money', channels: ['mobile_money'], regions: ['Ghana'] },
];

/**
 * Initialize a payment using the resolved provider for the tenant
 */
export async function initializePayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResult> {
  // Resolve which provider to use
  let provider = request.preferredProvider;

  if (!provider) {
    const config = await resolveApiConfig(request.tenantId, request.branchId || null, 'PAYMENT');
    provider = config?.provider as PaymentProvider || 'Paystack';
  }

  logger.info(`Payment gateway: Using ${provider} for tenant ${request.tenantId}, amount ${request.amount} ${request.currency || 'GHS'}`);

  try {
    let result: UnifiedPaymentResult;

    switch (provider) {
      case 'Paystack': {
        const ps = await paystackService.initializePayment({
          invoiceId: request.invoiceId,
          tenantId: request.tenantId,
          amount: request.amount,
          email: request.email,
          callbackUrl: request.callbackUrl,
          channels: request.preferredChannel ? [request.preferredChannel as any] : undefined,
          metadata: request.metadata,
        });
        result = {
          success: true, provider: 'Paystack', reference: ps.reference,
          paymentUrl: ps.authorizationUrl, status: 'PENDING', message: 'Paystack payment initialized',
        };
        break;
      }

      case 'Flutterwave': {
        const flw = await flutterwaveService.initializePayment({
          invoiceId: request.invoiceId,
          tenantId: request.tenantId,
          amount: request.amount,
          email: request.email,
          phone: request.phone,
          name: request.name,
          callbackUrl: request.callbackUrl,
          paymentType: request.preferredChannel === 'mobile_money' ? 'mobilemoneyghana' : request.preferredChannel as any,
          metadata: request.metadata,
        });
        result = {
          success: true, provider: 'Flutterwave', reference: flw.reference,
          paymentUrl: flw.paymentLink, status: 'PENDING', message: 'Flutterwave payment initialized',
        };
        break;
      }

      case 'Stripe': {
        const stripe = await stripeService.createCheckoutSession({
          invoiceId: request.invoiceId,
          tenantId: request.tenantId,
          amount: request.amount,
          currency: request.currency,
          email: request.email,
          callbackUrl: request.callbackUrl,
          metadata: request.metadata,
        });
        result = {
          success: true, provider: 'Stripe', reference: stripe.reference,
          paymentUrl: stripe.paymentUrl, status: 'PENDING', message: 'Stripe checkout session created',
        };
        break;
      }

      case 'MTN_MoMo':
      case 'Vodafone_Cash':
      case 'AirtelTigo': {
        const momoProvider = provider === 'MTN_MoMo' ? 'MTN' : provider === 'Vodafone_Cash' ? 'VODAFONE' : 'AIRTELTIGO';
        const momo = await mobileMoneyService.initiatePayment({
          invoiceId: request.invoiceId,
          amount: request.amount,
          currency: request.currency || 'GHS',
          phoneNumber: request.phone || '',
          provider: momoProvider as any,
          description: `Invoice payment - ${request.invoiceId}`,
          patientName: request.name || '',
        });
        result = {
          success: momo.success, provider, reference: momo.transactionId || '',
          status: momo.status, message: momo.message,
        };
        break;
      }

      default:
        result = { success: false, provider: provider || 'unknown', reference: '', status: 'ERROR', message: `Unsupported provider: ${provider}` };
    }

    // Log API usage
    await logApiUsage({
      tenantId: request.tenantId,
      branchId: request.branchId,
      apiType: 'PAYMENT',
      provider: provider,
      action: 'initialize_payment',
      referenceId: result.reference,
      cost: 0,
      status: result.success ? 'SUCCESS' : 'FAILED',
      metadata: { amount: request.amount, currency: request.currency || 'GHS' },
    }).catch(e => logger.warn('Failed to log API usage:', e.message));

    return result;
  } catch (error: any) {
    logger.error(`Payment initialization failed (${provider}):`, error.message);
    return { success: false, provider: provider || 'unknown', reference: '', status: 'ERROR', message: error.message };
  }
}

/**
 * Get all supported payment providers with their status
 */
export function getSupportedProviders() {
  return SUPPORTED_PAYMENT_PROVIDERS.map(p => ({
    ...p,
    configured: isProviderConfigured(p.name),
  }));
}

function isProviderConfigured(provider: PaymentProvider): boolean {
  switch (provider) {
    case 'Paystack': return !!process.env.PAYSTACK_SECRET_KEY;
    case 'Flutterwave': return !!process.env.FLUTTERWAVE_SECRET_KEY;
    case 'Stripe': return !!process.env.STRIPE_SECRET_KEY;
    case 'MTN_MoMo': return process.env.MTN_MOMO_ENABLED === 'true';
    case 'Vodafone_Cash': return process.env.VODAFONE_CASH_ENABLED === 'true';
    case 'AirtelTigo': return process.env.AIRTELTIGO_ENABLED === 'true';
    default: return false;
  }
}
