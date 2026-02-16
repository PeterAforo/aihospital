import { PrismaClient } from '@prisma/client';
import { logger } from '../../common/utils/logger.js';

const prisma = new PrismaClient();

// SMS Gateway Integration
// Supports Hubtel, Arkesel, and generic HTTP SMS providers for Ghana

interface SMSConfig {
  provider: string;
  apiUrl: string;
  apiKey: string;
  senderId: string;
  enabled: boolean;
}

interface SMSMessage {
  to: string;
  message: string;
  type?: 'appointment_reminder' | 'lab_result' | 'discharge' | 'general';
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSService {
  private config: SMSConfig = {
    provider: process.env.SMS_PROVIDER || 'hubtel',
    apiUrl: process.env.SMS_API_URL || 'https://smsc.hubtel.com/v1/messages/send',
    apiKey: process.env.SMS_API_KEY || '',
    senderId: process.env.SMS_SENDER_ID || 'AIHospital',
    enabled: process.env.SMS_ENABLED === 'true',
  };

  // Send a single SMS
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    const phone = this.formatPhone(message.to);
    if (!phone) return { success: false, error: 'Invalid phone number' };

    if (!this.config.enabled) {
      logger.info(`[SMS-SIM] To: ${phone} | ${message.message.substring(0, 50)}...`);
      return { success: true, messageId: `SIM-${Date.now()}` };
    }

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(this.config.apiKey).toString('base64')}`,
        },
        body: JSON.stringify({
          From: this.config.senderId,
          To: phone,
          Content: message.message,
          Type: 0,
        }),
      });

      const result: any = await response.json();

      if (response.ok) {
        return { success: true, messageId: result.MessageId || result.messageId };
      }

      return { success: false, error: result.Message || result.message || 'SMS send failed' };
    } catch (error: any) {
      logger.error('SMS send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send bulk SMS
  async sendBulkSMS(messages: SMSMessage[]): Promise<{ sent: number; failed: number; results: SMSResult[] }> {
    const results: SMSResult[] = [];
    let sent = 0, failed = 0;

    for (const msg of messages) {
      const result = await this.sendSMS(msg);
      results.push(result);
      if (result.success) sent++; else failed++;
      // Rate limiting: 100ms between messages
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { sent, failed, results };
  }

  // Send appointment reminder
  async sendAppointmentReminder(appointmentId: string): Promise<SMSResult> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { firstName: true, lastName: true, phonePrimary: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
    });

    if (!appointment) return { success: false, error: 'Appointment not found' };
    if (!appointment.patient.phonePrimary) return { success: false, error: 'No phone number' };

    const date = new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
    const time = appointment.appointmentTime || '';
    const doctor = `Dr. ${appointment.doctor.lastName}`;

    const message = `Dear ${appointment.patient.firstName}, this is a reminder of your appointment on ${date} ${time} with ${doctor}. Please arrive 15 minutes early. - ${this.config.senderId}`;

    return this.sendSMS({
      to: appointment.patient.phonePrimary,
      message,
      type: 'appointment_reminder',
    });
  }

  // Send batch appointment reminders for tomorrow
  async sendTomorrowReminders(): Promise<{ sent: number; failed: number }> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: tomorrow, lt: dayAfter },
        status: { in: ['CONFIRMED', 'SCHEDULED'] },
      },
      select: { id: true },
    });

    let sent = 0, failed = 0;
    for (const appt of appointments) {
      const result = await this.sendAppointmentReminder(appt.id);
      if (result.success) sent++; else failed++;
    }

    logger.info(`Appointment reminders sent: ${sent} success, ${failed} failed`);
    return { sent, failed };
  }

  // Send discharge notification
  async sendDischargeNotification(admissionId: string): Promise<SMSResult> {
    try {
      const admission = await (prisma as any).admission.findUnique({
        where: { id: admissionId },
        include: { patient: { select: { firstName: true, phonePrimary: true } } },
      });

      if (!admission?.patient?.phonePrimary) return { success: false, error: 'No phone number' };

      const message = `Dear ${admission.patient.firstName}, you have been discharged. Please follow your discharge instructions and attend your follow-up appointment. Get well soon! - ${this.config.senderId}`;

      return this.sendSMS({ to: admission.patient.phonePrimary, message, type: 'discharge' });
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Send lab result notification
  async sendLabResultNotification(patientId: string, testName: string): Promise<SMSResult> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { firstName: true, phonePrimary: true },
    });

    if (!patient?.phonePrimary) return { success: false, error: 'No phone number' };

    const message = `Dear ${patient.firstName}, your ${testName} results are ready. Please visit the hospital or contact us for details. - ${this.config.senderId}`;

    return this.sendSMS({ to: patient.phonePrimary, message, type: 'lab_result' });
  }

  // Get integration status
  getStatus(): { enabled: boolean; provider: string; senderId: string } {
    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      senderId: this.config.senderId,
    };
  }

  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '233' + cleaned.substring(1);
    if (!cleaned.startsWith('233')) cleaned = '233' + cleaned;
    if (cleaned.length < 12) return '';
    return cleaned;
  }
}

export const smsService = new SMSService();
