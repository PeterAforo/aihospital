import { logger } from '../../common/utils/logger.js';

// mNotifier SMS API Integration for Ghana
// Docs: https://apps.mnotify.net/smsapi
// Supports: SMS, Voice, Bulk SMS, Delivery Reports, Contact Groups

const MNOTIFIER_API_KEY = process.env.MNOTIFIER_API_KEY || '';
const MNOTIFIER_BASE_URL = process.env.MNOTIFIER_API_URL || 'https://apps.mnotify.net/smsapi';
const MNOTIFIER_SENDER_ID = process.env.MNOTIFIER_SENDER_ID || 'SmartMed';

interface MNotifierSMSParams {
  to: string | string[];
  message: string;
  senderId?: string;
  scheduleDate?: string; // YYYY-MM-DD HH:mm format
  isVoice?: boolean;
}

interface MNotifierResult {
  success: boolean;
  messageId?: string;
  code?: string;
  status?: string;
  error?: string;
  balance?: number;
}

interface MNotifierBulkResult {
  sent: number;
  failed: number;
  results: MNotifierResult[];
}

class MNotifierService {
  private enabled: boolean;

  constructor() {
    this.enabled = !!MNOTIFIER_API_KEY && process.env.MNOTIFIER_ENABLED === 'true';
  }

  /**
   * Send a single SMS via mNotifier
   */
  async sendSMS(params: MNotifierSMSParams): Promise<MNotifierResult> {
    const phone = Array.isArray(params.to) ? params.to.map(p => this.formatPhone(p)).join(',') : this.formatPhone(params.to);

    if (!phone) return { success: false, error: 'Invalid phone number' };

    if (!this.enabled) {
      logger.info(`[mNotifier-SIM] To: ${phone} | ${params.message.substring(0, 50)}...`);
      return { success: true, messageId: `MNOT-SIM-${Date.now()}`, status: 'simulated' };
    }

    try {
      const url = new URL(MNOTIFIER_BASE_URL);
      url.searchParams.set('key', MNOTIFIER_API_KEY);
      url.searchParams.set('to', phone);
      url.searchParams.set('msg', params.message);
      url.searchParams.set('sender_id', params.senderId || MNOTIFIER_SENDER_ID);
      url.searchParams.set('type', params.isVoice ? '2' : '0'); // 0=SMS, 2=Voice

      if (params.scheduleDate) {
        url.searchParams.set('schedule_date', params.scheduleDate);
      }

      const response = await fetch(url.toString(), { method: 'GET' });
      const result: any = await response.json();

      // mNotifier response codes: 1000=Success, 1002=SMS sent, 1003=Insufficient balance, etc.
      const successCodes = ['1000', '1002'];
      const code = String(result.code || result.status || '');

      if (successCodes.includes(code) || result.status === 'success') {
        return {
          success: true,
          messageId: result.message_id || result.id || `MNOT-${Date.now()}`,
          code,
          status: 'sent',
          balance: result.balance,
        };
      }

      return {
        success: false,
        code,
        error: this.getErrorMessage(code) || result.message || 'SMS send failed',
        balance: result.balance,
      };
    } catch (error: any) {
      logger.error('mNotifier SMS send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk SMS (different messages to different recipients)
   */
  async sendBulkSMS(messages: { to: string; message: string }[]): Promise<MNotifierBulkResult> {
    const results: MNotifierResult[] = [];
    let sent = 0, failed = 0;

    for (const msg of messages) {
      const result = await this.sendSMS({ to: msg.to, message: msg.message });
      results.push(result);
      if (result.success) sent++; else failed++;
      // Rate limit: 150ms between messages
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return { sent, failed, results };
  }

  /**
   * Send same message to multiple recipients (group SMS)
   */
  async sendGroupSMS(recipients: string[], message: string): Promise<MNotifierResult> {
    return this.sendSMS({ to: recipients, message });
  }

  /**
   * Send voice message
   */
  async sendVoiceMessage(to: string, message: string): Promise<MNotifierResult> {
    return this.sendSMS({ to, message, isVoice: true });
  }

  /**
   * Schedule SMS for later delivery
   */
  async scheduleSMS(to: string, message: string, scheduleDate: string): Promise<MNotifierResult> {
    return this.sendSMS({ to, message, scheduleDate });
  }

  /**
   * Check SMS balance
   */
  async checkBalance(): Promise<{ success: boolean; balance?: number; error?: string }> {
    if (!this.enabled) {
      return { success: true, balance: 9999 };
    }

    try {
      const url = `${MNOTIFIER_BASE_URL}/balance?key=${MNOTIFIER_API_KEY}`;
      const response = await fetch(url);
      const result: any = await response.json();

      return {
        success: true,
        balance: parseFloat(result.balance || result.sms_balance || '0'),
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get delivery report for a message
   */
  async getDeliveryReport(messageId: string): Promise<{ success: boolean; status?: string; deliveredAt?: string; error?: string }> {
    if (!this.enabled) {
      return { success: true, status: 'delivered' };
    }

    try {
      const url = `${MNOTIFIER_BASE_URL}/report?key=${MNOTIFIER_API_KEY}&id=${messageId}`;
      const response = await fetch(url);
      const result: any = await response.json();

      return {
        success: true,
        status: result.status || 'unknown',
        deliveredAt: result.delivered_at,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get integration status
   */
  getStatus(): { enabled: boolean; provider: string; senderId: string } {
    return {
      enabled: this.enabled,
      provider: 'mNotifier',
      senderId: MNOTIFIER_SENDER_ID,
    };
  }

  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '233' + cleaned.substring(1);
    if (!cleaned.startsWith('233')) cleaned = '233' + cleaned;
    if (cleaned.length < 12) return '';
    return cleaned;
  }

  private getErrorMessage(code: string): string {
    const errors: Record<string, string> = {
      '1000': 'Message submitted successfully',
      '1002': 'SMS sent',
      '1003': 'Insufficient SMS balance',
      '1004': 'Invalid API key',
      '1005': 'Phone number not valid',
      '1006': 'Invalid sender ID',
      '1007': 'Message is empty',
      '1008': 'Sender ID too long (max 11 chars)',
      '1009': 'Duplicate message detected',
      '1010': 'Message too long',
      '2000': 'Unknown error',
    };
    return errors[code] || '';
  }
}

export const mnotifierService = new MNotifierService();
