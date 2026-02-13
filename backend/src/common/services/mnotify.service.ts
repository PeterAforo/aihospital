import axios from 'axios';
import { config } from '../../config/index.js';
import { logger } from '../utils/logger.js';

interface SendSMSOptions {
  to: string;
  message: string;
  senderId?: string;
}

interface SendSMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class MNotifyService {
  private apiKey: string;
  private baseUrl: string;
  private senderId: string;

  constructor() {
    this.apiKey = process.env.MNOTIFY_API_KEY || '';
    this.baseUrl = 'https://apps.mnotify.net/smsapi';
    this.senderId = process.env.MNOTIFY_SENDER_ID || 'MediCare';
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Convert 0XX to 233XX format
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.substring(1);
    }
    
    // Remove leading + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  }

  async sendSMS(options: SendSMSOptions): Promise<SendSMSResponse> {
    const { to, message, senderId } = options;

    if (!this.apiKey) {
      logger.warn('mNotify API key not configured. SMS not sent.');
      logger.info(`[DEV MODE] SMS to ${to}: ${message}`);
      return { success: true, messageId: 'dev-mode-' + Date.now() };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(to);
      
      const response = await axios.get(this.baseUrl, {
        params: {
          key: this.apiKey,
          to: formattedPhone,
          msg: message,
          sender_id: senderId || this.senderId,
        },
      });

      // mNotify returns different response codes
      // 1000 = Success
      // 1002 = SMS sent but some numbers failed
      // 1003 = Insufficient balance
      // 1004 = Invalid API key
      // 1005 = Invalid phone number
      // 1006 = Invalid sender ID
      // 1007 = Message too long
      // 1008 = Empty message
      
      const responseCode = response.data?.code || response.data;
      
      if (responseCode === '1000' || responseCode === 1000 || response.data?.status === 'success') {
        logger.info(`SMS sent successfully to ${formattedPhone}`);
        return { 
          success: true, 
          messageId: response.data?.message_id || response.data?.id 
        };
      } else {
        logger.error(`mNotify error: ${JSON.stringify(response.data)}`);
        return { 
          success: false, 
          error: this.getErrorMessage(responseCode) 
        };
      }
    } catch (error: any) {
      logger.error(`mNotify SMS error: ${error.message}`);
      return { 
        success: false, 
        error: error.message || 'Failed to send SMS' 
      };
    }
  }

  private getErrorMessage(code: string | number): string {
    const errors: Record<string, string> = {
      '1002': 'Some numbers failed',
      '1003': 'Insufficient SMS balance',
      '1004': 'Invalid API key',
      '1005': 'Invalid phone number',
      '1006': 'Invalid sender ID',
      '1007': 'Message too long',
      '1008': 'Empty message',
    };
    return errors[String(code)] || `Unknown error (${code})`;
  }

  async sendOTP(phone: string, code: string): Promise<SendSMSResponse> {
    const message = `Your MediCare Ghana verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
    return this.sendSMS({ to: phone, message });
  }

  async sendWelcome(phone: string, hospitalName: string): Promise<SendSMSResponse> {
    const message = `Welcome to MediCare Ghana! ${hospitalName} has been registered successfully. Log in at app.medicaregha.com to get started.`;
    return this.sendSMS({ to: phone, message });
  }

  async sendAppointmentReminder(phone: string, patientName: string, date: string, time: string, hospitalName: string): Promise<SendSMSResponse> {
    const message = `Hi ${patientName}, reminder: You have an appointment at ${hospitalName} on ${date} at ${time}. Reply CONFIRM to confirm.`;
    return this.sendSMS({ to: phone, message });
  }

  async sendCustom(phone: string, message: string, senderId?: string): Promise<SendSMSResponse> {
    return this.sendSMS({ to: phone, message, senderId });
  }
}

export const mnotifyService = new MNotifyService();
