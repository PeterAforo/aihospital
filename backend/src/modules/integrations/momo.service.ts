import { PrismaClient } from '@prisma/client';
import { logger } from '../../common/utils/logger.js';

const prisma = new PrismaClient();

// Mobile Money Payment Gateway Integration
// Supports MTN MoMo, Vodafone Cash, AirtelTigo Money

interface MoMoConfig {
  provider: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  callbackUrl: string;
  enabled: boolean;
}

interface PaymentRequest {
  invoiceId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  provider: 'MTN' | 'VODAFONE' | 'AIRTELTIGO';
  description: string;
  patientName: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: string;
  message: string;
  provider: string;
}

class MobileMoneyService {
  private configs: Record<string, MoMoConfig> = {
    MTN: {
      provider: 'MTN',
      apiUrl: process.env.MTN_MOMO_API_URL || 'https://sandbox.momodeveloper.mtn.com',
      apiKey: process.env.MTN_MOMO_API_KEY || '',
      apiSecret: process.env.MTN_MOMO_API_SECRET || '',
      callbackUrl: process.env.MOMO_CALLBACK_URL || '',
      enabled: process.env.MTN_MOMO_ENABLED === 'true',
    },
    VODAFONE: {
      provider: 'VODAFONE',
      apiUrl: process.env.VODAFONE_CASH_API_URL || 'https://api.vodafone.com.gh',
      apiKey: process.env.VODAFONE_CASH_API_KEY || '',
      apiSecret: process.env.VODAFONE_CASH_API_SECRET || '',
      callbackUrl: process.env.MOMO_CALLBACK_URL || '',
      enabled: process.env.VODAFONE_CASH_ENABLED === 'true',
    },
    AIRTELTIGO: {
      provider: 'AIRTELTIGO',
      apiUrl: process.env.AIRTELTIGO_API_URL || 'https://api.airteltigo.com.gh',
      apiKey: process.env.AIRTELTIGO_API_KEY || '',
      apiSecret: process.env.AIRTELTIGO_API_SECRET || '',
      callbackUrl: process.env.MOMO_CALLBACK_URL || '',
      enabled: process.env.AIRTELTIGO_ENABLED === 'true',
    },
  };

  // Initiate a payment request
  async initiatePayment(request: PaymentRequest): Promise<PaymentResult> {
    const config = this.configs[request.provider];
    if (!config) {
      return { success: false, status: 'ERROR', message: `Unknown provider: ${request.provider}`, provider: request.provider };
    }

    if (!config.enabled) {
      logger.warn(`${request.provider} MoMo integration not enabled. Simulating payment.`);
      return this.simulatePayment(request);
    }

    try {
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const response = await fetch(`${config.apiUrl}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'X-Reference-Id': transactionId,
          'X-Target-Environment': process.env.MOMO_ENVIRONMENT || 'sandbox',
          'Ocp-Apim-Subscription-Key': config.apiSecret,
        },
        body: JSON.stringify({
          amount: String(request.amount),
          currency: request.currency || 'GHS',
          externalId: request.invoiceId,
          payer: { partyIdType: 'MSISDN', partyId: this.formatPhone(request.phoneNumber) },
          payerMessage: request.description,
          payeeNote: `Payment for ${request.patientName}`,
        }),
      });

      if (response.ok || response.status === 202) {
        return { success: true, transactionId, status: 'PENDING', message: 'Payment request sent to phone', provider: request.provider };
      }

      const errorBody: any = await response.json().catch(() => ({}));
      return { success: false, status: 'FAILED', message: errorBody.message || `HTTP ${response.status}`, provider: request.provider };
    } catch (error: any) {
      logger.error(`${request.provider} payment initiation failed:`, error.message);
      return { success: false, status: 'ERROR', message: error.message, provider: request.provider };
    }
  }

  // Check payment status
  async checkPaymentStatus(transactionId: string, provider: string): Promise<{ status: string; amount?: number; reason?: string }> {
    const config = this.configs[provider];
    if (!config || !config.enabled) {
      return { status: 'SIMULATED_SUCCESS', amount: 0 };
    }

    try {
      const response = await fetch(`${config.apiUrl}/collection/v1_0/requesttopay/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'X-Target-Environment': process.env.MOMO_ENVIRONMENT || 'sandbox',
          'Ocp-Apim-Subscription-Key': config.apiSecret,
        },
      });

      const result: any = await response.json();
      return { status: result.status || 'UNKNOWN', amount: parseFloat(result.amount) || 0, reason: result.reason };
    } catch (error: any) {
      logger.error('Payment status check failed:', error.message);
      return { status: 'ERROR', reason: error.message };
    }
  }

  // Handle callback from payment provider
  async handleCallback(data: any): Promise<void> {
    logger.info('MoMo callback received:', JSON.stringify(data));

    const { externalId, status, financialTransactionId } = data;
    if (!externalId) return;

    try {
      if (status === 'SUCCESSFUL') {
        // Record payment against the invoice
        const invoice = await prisma.invoice.findUnique({ where: { id: externalId } });
        if (invoice) {
          await prisma.payment.create({
            data: {
              tenantId: invoice.tenantId,
              invoiceId: invoice.id,
              amount: invoice.total,
              paymentMethod: 'MTN_MOMO',
              paymentDate: new Date(),
              transactionRef: financialTransactionId || '',
              status: 'COMPLETED',
              notes: `MoMo payment - Ref: ${financialTransactionId}`,
            },
          });
        }
      }
    } catch (error: any) {
      logger.error('MoMo callback processing failed:', error.message);
    }
  }

  // Get available providers and their status
  getProviderStatus(): { provider: string; enabled: boolean }[] {
    return Object.entries(this.configs).map(([key, config]) => ({
      provider: key,
      enabled: config.enabled,
    }));
  }

  private simulatePayment(request: PaymentRequest): PaymentResult {
    const transactionId = `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    return {
      success: true,
      transactionId,
      status: 'SIMULATED_PENDING',
      message: `Simulated ${request.provider} payment of GHS ${request.amount} to ${request.phoneNumber}`,
      provider: request.provider,
    };
  }

  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '233' + cleaned.substring(1);
    if (!cleaned.startsWith('233')) cleaned = '233' + cleaned;
    return cleaned;
  }
}

export const mobileMoneyService = new MobileMoneyService();
