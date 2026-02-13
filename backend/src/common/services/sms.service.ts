import axios from 'axios';
import { config } from '../../config/index.js';
import { logger } from '../utils/logger.js';

export interface SMSMessage {
  to: string;
  message: string;
  senderId?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSService {
  private apiKey: string;
  private senderId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.mnotify?.apiKey || process.env.MNOTIFY_API_KEY || '';
    this.senderId = config.mnotify?.senderId || process.env.MNOTIFY_SENDER_ID || 'MediCare';
    this.baseUrl = 'https://apps.mnotify.net/smsapi';
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.substring(1);
    } else if (!cleaned.startsWith('233')) {
      cleaned = '233' + cleaned;
    }
    
    return cleaned;
  }

  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    if (!this.apiKey) {
      logger.warn('SMS service not configured - API key missing');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(message.to);
      
      const response = await axios.get(this.baseUrl, {
        params: {
          key: this.apiKey,
          to: formattedPhone,
          msg: message.message,
          sender_id: message.senderId || this.senderId,
        },
      });

      if (response.data.code === '1000' || response.data.status === 'success') {
        logger.info(`SMS sent successfully to ${formattedPhone}`);
        return { success: true, messageId: response.data.message_id };
      } else {
        logger.error(`SMS failed: ${response.data.message || 'Unknown error'}`);
        return { success: false, error: response.data.message || 'SMS sending failed' };
      }
    } catch (error: any) {
      logger.error(`SMS error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
    const results = await Promise.all(messages.map(msg => this.sendSMS(msg)));
    return results;
  }

  async sendAppointmentReminder(
    patientPhone: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    appointmentTime: string,
    hospitalName: string = 'MediCare Ghana'
  ): Promise<SMSResult> {
    const dateStr = appointmentDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const message = `Dear ${patientName}, this is a reminder for your appointment with Dr. ${doctorName} on ${dateStr} at ${appointmentTime}. Please arrive 15 minutes early. - ${hospitalName}`;

    return this.sendSMS({ to: patientPhone, message });
  }

  async sendAppointmentConfirmation(
    patientPhone: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    appointmentTime: string,
    hospitalName: string = 'MediCare Ghana'
  ): Promise<SMSResult> {
    const dateStr = appointmentDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const message = `Dear ${patientName}, your appointment with Dr. ${doctorName} has been confirmed for ${dateStr} at ${appointmentTime}. Reply CANCEL to cancel. - ${hospitalName}`;

    return this.sendSMS({ to: patientPhone, message });
  }

  async sendAppointmentCancellation(
    patientPhone: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    appointmentTime: string,
    hospitalName: string = 'MediCare Ghana'
  ): Promise<SMSResult> {
    const dateStr = appointmentDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
    });

    const message = `Dear ${patientName}, your appointment with Dr. ${doctorName} on ${dateStr} at ${appointmentTime} has been cancelled. Please call us to reschedule. - ${hospitalName}`;

    return this.sendSMS({ to: patientPhone, message });
  }

  async sendQueueNotification(
    patientPhone: string,
    patientName: string,
    queueNumber: number,
    estimatedWait: number,
    hospitalName: string = 'MediCare Ghana'
  ): Promise<SMSResult> {
    const message = `Dear ${patientName}, you are now #${queueNumber} in the queue. Estimated wait time: ${estimatedWait} minutes. Please stay nearby. - ${hospitalName}`;

    return this.sendSMS({ to: patientPhone, message });
  }

  async sendRegistrationWelcome(
    patientPhone: string,
    patientName: string,
    mrn: string,
    hospitalName: string = 'MediCare Ghana'
  ): Promise<SMSResult> {
    const message = `Welcome to ${hospitalName}, ${patientName}! Your Medical Record Number (MRN) is ${mrn}. Keep this for future visits. Thank you for choosing us!`;

    return this.sendSMS({ to: patientPhone, message });
  }
}

export const smsService = new SMSService();
