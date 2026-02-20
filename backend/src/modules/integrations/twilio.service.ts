import { logger } from '../../common/utils/logger.js';

// Twilio SMS & WhatsApp Integration
// Supports: SMS, WhatsApp, Voice (global coverage)

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '';
const TWILIO_BASE_URL = 'https://api.twilio.com/2010-04-01';

interface TwilioSMSParams {
  to: string;
  message: string;
  channel?: 'sms' | 'whatsapp';
  mediaUrl?: string; // For MMS/WhatsApp media
  statusCallback?: string;
}

interface TwilioResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
  errorCode?: number;
}

interface TwilioWebhookData {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  Body?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

class TwilioService {
  private enabled: boolean;

  constructor() {
    this.enabled = !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN && process.env.TWILIO_ENABLED === 'true';
  }

  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(params: TwilioSMSParams): Promise<TwilioResult> {
    const phone = this.formatPhone(params.to);
    if (!phone) return { success: false, error: 'Invalid phone number' };

    if (!this.enabled) {
      logger.info(`[Twilio-SIM] ${params.channel || 'sms'} To: ${phone} | ${params.message.substring(0, 50)}...`);
      return { success: true, sid: `TWIL-SIM-${Date.now()}`, status: 'simulated' };
    }

    const isWhatsApp = params.channel === 'whatsapp';
    const from = isWhatsApp ? `whatsapp:${TWILIO_WHATSAPP_NUMBER}` : TWILIO_PHONE_NUMBER;
    const to = isWhatsApp ? `whatsapp:${phone}` : phone;

    try {
      const body = new URLSearchParams({
        To: to,
        From: from,
        Body: params.message,
      });

      if (params.mediaUrl) {
        body.append('MediaUrl', params.mediaUrl);
      }

      if (params.statusCallback) {
        body.append('StatusCallback', params.statusCallback);
      }

      const response = await fetch(
        `${TWILIO_BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );

      const result: any = await response.json();

      if (response.ok && result.sid) {
        return {
          success: true,
          sid: result.sid,
          status: result.status,
        };
      }

      return {
        success: false,
        error: result.message || 'Twilio send failed',
        errorCode: result.code,
      };
    } catch (error: any) {
      logger.error(`Twilio ${params.channel || 'sms'} send failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(to: string, message: string, mediaUrl?: string): Promise<TwilioResult> {
    return this.sendSMS({ to, message, channel: 'whatsapp', mediaUrl });
  }

  /**
   * Send WhatsApp template message (for business-initiated conversations)
   */
  async sendWhatsAppTemplate(to: string, templateSid: string, variables?: Record<string, string>): Promise<TwilioResult> {
    const phone = this.formatPhone(to);
    if (!phone) return { success: false, error: 'Invalid phone number' };

    if (!this.enabled) {
      return { success: true, sid: `TWIL-TPL-SIM-${Date.now()}`, status: 'simulated' };
    }

    try {
      const body = new URLSearchParams({
        To: `whatsapp:${phone}`,
        From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
        ContentSid: templateSid,
      });

      if (variables) {
        body.append('ContentVariables', JSON.stringify(variables));
      }

      const response = await fetch(
        `${TWILIO_BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );

      const result: any = await response.json();

      if (response.ok && result.sid) {
        return { success: true, sid: result.sid, status: result.status };
      }

      return { success: false, error: result.message || 'Template send failed', errorCode: result.code };
    } catch (error: any) {
      logger.error('Twilio WhatsApp template send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(messages: { to: string; message: string }[]): Promise<{ sent: number; failed: number; results: TwilioResult[] }> {
    const results: TwilioResult[] = [];
    let sent = 0, failed = 0;

    for (const msg of messages) {
      const result = await this.sendSMS({ to: msg.to, message: msg.message });
      results.push(result);
      if (result.success) sent++; else failed++;
      // Rate limit: 100ms between messages (Twilio allows ~1 msg/sec on trial)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { sent, failed, results };
  }

  /**
   * Handle Twilio status callback webhook
   */
  async handleStatusCallback(data: TwilioWebhookData): Promise<{ processed: boolean; status: string }> {
    logger.info(`Twilio status callback: ${data.MessageSid} → ${data.MessageStatus}`);

    // Status values: queued, sent, delivered, undelivered, failed
    return {
      processed: true,
      status: data.MessageStatus,
    };
  }

  /**
   * Handle incoming WhatsApp/SMS message webhook
   */
  async handleIncomingMessage(data: TwilioWebhookData): Promise<{ processed: boolean; from: string; body: string }> {
    logger.info(`Twilio incoming message from ${data.From}: ${data.Body?.substring(0, 50)}`);

    return {
      processed: true,
      from: data.From,
      body: data.Body || '',
    };
  }

  /**
   * Get message status
   */
  async getMessageStatus(sid: string): Promise<{ success: boolean; status?: string; error?: string }> {
    if (!this.enabled) return { success: true, status: 'simulated' };

    try {
      const response = await fetch(
        `${TWILIO_BASE_URL}/Accounts/${TWILIO_ACCOUNT_SID}/Messages/${sid}.json`,
        { headers: { Authorization: this.authHeader } }
      );

      const result: any = await response.json();
      if (response.ok) return { success: true, status: result.status };
      return { success: false, error: result.message };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get integration status
   */
  getStatus(): { enabled: boolean; provider: string; smsNumber: string; whatsappNumber: string } {
    return {
      enabled: this.enabled,
      provider: 'Twilio',
      smsNumber: TWILIO_PHONE_NUMBER ? TWILIO_PHONE_NUMBER.slice(0, 4) + '***' : 'Not configured',
      whatsappNumber: TWILIO_WHATSAPP_NUMBER ? TWILIO_WHATSAPP_NUMBER.slice(0, 4) + '***' : 'Not configured',
    };
  }

  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '233' + cleaned.substring(1);
    if (!cleaned.startsWith('233') && !cleaned.startsWith('+')) cleaned = '233' + cleaned;
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
    return cleaned;
  }
}

export const twilioService = new TwilioService();
