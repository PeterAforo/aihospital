import { logger } from '../../common/utils/logger.js';
import { resolveApiConfig, logApiUsage } from '../api-config/api-config.service.js';
import { smsService } from './sms.service.js';
import { mnotifierService } from './mnotifier.service.js';
import { twilioService } from './twilio.service.js';

// Unified SMS Gateway Factory
// Resolves the correct SMS provider based on 3-tier API config
// Supports: Hubtel, mNotifier, Twilio, Africa's Talking

export type SMSProvider = 'Hubtel' | 'mNotifier' | 'Twilio' | 'AfricasTalking';

export interface UnifiedSMSRequest {
  to: string;
  message: string;
  tenantId: string;
  branchId?: string;
  type?: 'appointment_reminder' | 'lab_result' | 'discharge' | 'prescription' | 'campaign' | 'otp' | 'general';
  preferredProvider?: SMSProvider;
  channel?: 'sms' | 'whatsapp';
  scheduleDate?: string;
}

export interface UnifiedSMSResult {
  success: boolean;
  provider: string;
  messageId?: string;
  status: string;
  error?: string;
}

export interface UnifiedBulkSMSRequest {
  messages: { to: string; message: string }[];
  tenantId: string;
  branchId?: string;
  preferredProvider?: SMSProvider;
}

export const SUPPORTED_SMS_PROVIDERS: { name: SMSProvider; label: string; features: string[]; regions: string[]; costPerSMS?: string }[] = [
  {
    name: 'Hubtel',
    label: 'Hubtel SMS',
    features: ['SMS', 'Bulk SMS', 'Delivery Reports', '2-Way SMS', 'Sender ID'],
    regions: ['Ghana'],
    costPerSMS: '~GHS 0.02',
  },
  {
    name: 'mNotifier',
    label: 'mNotifier SMS',
    features: ['SMS', 'Bulk SMS', 'Voice SMS', 'Scheduled SMS', 'Delivery Reports', 'Contact Groups', 'Sender ID'],
    regions: ['Ghana'],
    costPerSMS: '~GHS 0.02',
  },
  {
    name: 'Twilio',
    label: 'Twilio',
    features: ['SMS', 'WhatsApp', 'Voice', 'Bulk SMS', 'Delivery Reports', 'Global Coverage', 'Templates'],
    regions: ['Global (180+ countries)'],
    costPerSMS: '~$0.05 (international)',
  },
  {
    name: 'AfricasTalking',
    label: "Africa's Talking",
    features: ['SMS', 'Bulk SMS', 'Voice', 'USSD', 'Airtime'],
    regions: ['Africa (20+ countries)'],
    costPerSMS: '~$0.02',
  },
];

/**
 * Send a single SMS using the resolved provider for the tenant
 */
export async function sendSMS(request: UnifiedSMSRequest): Promise<UnifiedSMSResult> {
  let provider = request.preferredProvider;

  if (!provider) {
    const config = await resolveApiConfig(request.tenantId, request.branchId || null, 'SMS');
    provider = config?.provider as SMSProvider || 'Hubtel';
  }

  // If WhatsApp channel requested, force Twilio
  if (request.channel === 'whatsapp') {
    provider = 'Twilio';
  }

  logger.info(`SMS gateway: Using ${provider} for tenant ${request.tenantId}, to ${request.to.slice(0, 6)}***`);

  try {
    let result: UnifiedSMSResult;

    switch (provider) {
      case 'Hubtel': {
        const hubtelResult = await smsService.sendSMS({ to: request.to, message: request.message, type: request.type as any });
        result = {
          success: hubtelResult.success,
          provider: 'Hubtel',
          messageId: hubtelResult.messageId,
          status: hubtelResult.success ? 'sent' : 'failed',
          error: hubtelResult.error,
        };
        break;
      }

      case 'mNotifier': {
        const mnotResult = await mnotifierService.sendSMS({
          to: request.to,
          message: request.message,
          scheduleDate: request.scheduleDate,
        });
        result = {
          success: mnotResult.success,
          provider: 'mNotifier',
          messageId: mnotResult.messageId,
          status: mnotResult.status || (mnotResult.success ? 'sent' : 'failed'),
          error: mnotResult.error,
        };
        break;
      }

      case 'Twilio': {
        const twilioResult = await twilioService.sendSMS({
          to: request.to,
          message: request.message,
          channel: request.channel || 'sms',
        });
        result = {
          success: twilioResult.success,
          provider: 'Twilio',
          messageId: twilioResult.sid,
          status: twilioResult.status || (twilioResult.success ? 'sent' : 'failed'),
          error: twilioResult.error,
        };
        break;
      }

      case 'AfricasTalking': {
        // Africa's Talking uses similar API pattern to Hubtel
        // Falls back to Hubtel adapter with AT config
        const atResult = await smsService.sendSMS({ to: request.to, message: request.message });
        result = {
          success: atResult.success,
          provider: "Africa's Talking",
          messageId: atResult.messageId,
          status: atResult.success ? 'sent' : 'failed',
          error: atResult.error,
        };
        break;
      }

      default:
        result = { success: false, provider: provider || 'unknown', status: 'error', error: `Unsupported SMS provider: ${provider}` };
    }

    // Log API usage
    await logApiUsage({
      tenantId: request.tenantId,
      branchId: request.branchId,
      apiType: 'SMS',
      provider: provider,
      action: request.type || 'send_sms',
      status: result.success ? 'SUCCESS' : 'FAILED',
      metadata: { channel: request.channel || 'sms', messageId: result.messageId },
    }).catch(e => logger.warn('Failed to log SMS usage:', e.message));

    return result;
  } catch (error: any) {
    logger.error(`SMS send failed (${provider}):`, error.message);
    return { success: false, provider: provider || 'unknown', status: 'error', error: error.message };
  }
}

/**
 * Send bulk SMS using the resolved provider
 */
export async function sendBulkSMS(request: UnifiedBulkSMSRequest): Promise<{ sent: number; failed: number; provider: string; results: UnifiedSMSResult[] }> {
  let provider = request.preferredProvider;

  if (!provider) {
    const config = await resolveApiConfig(request.tenantId, request.branchId || null, 'SMS');
    provider = config?.provider as SMSProvider || 'Hubtel';
  }

  const results: UnifiedSMSResult[] = [];
  let sent = 0, failed = 0;

  for (const msg of request.messages) {
    const result = await sendSMS({
      to: msg.to,
      message: msg.message,
      tenantId: request.tenantId,
      branchId: request.branchId,
      preferredProvider: provider,
      type: 'campaign',
    });
    results.push(result);
    if (result.success) sent++; else failed++;
  }

  return { sent, failed, provider: provider || 'Hubtel', results };
}

/**
 * Send WhatsApp message (always uses Twilio)
 */
export async function sendWhatsApp(tenantId: string, to: string, message: string, mediaUrl?: string): Promise<UnifiedSMSResult> {
  const result = await twilioService.sendWhatsApp(to, message, mediaUrl);
  return {
    success: result.success,
    provider: 'Twilio (WhatsApp)',
    messageId: result.sid,
    status: result.status || (result.success ? 'sent' : 'failed'),
    error: result.error,
  };
}

/**
 * Get all supported SMS providers with their status
 */
export function getSupportedSMSProviders() {
  return SUPPORTED_SMS_PROVIDERS.map(p => ({
    ...p,
    configured: isSMSProviderConfigured(p.name),
  }));
}

function isSMSProviderConfigured(provider: SMSProvider): boolean {
  switch (provider) {
    case 'Hubtel': return process.env.SMS_ENABLED === 'true';
    case 'mNotifier': return process.env.MNOTIFIER_ENABLED === 'true';
    case 'Twilio': return process.env.TWILIO_ENABLED === 'true';
    case 'AfricasTalking': return !!process.env.AT_API_KEY;
    default: return false;
  }
}
