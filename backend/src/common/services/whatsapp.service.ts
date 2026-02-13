import axios from 'axios';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';

export interface WhatsAppMessage {
  to: string;
  message: string;
  buttons?: Array<{ id: string; title: string }>;
  appointmentId?: string;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class WhatsAppService {
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.substring(1);
    } else if (!cleaned.startsWith('233')) {
      cleaned = '233' + cleaned;
    }
    
    return cleaned;
  }

  async sendMessage(params: WhatsAppMessage): Promise<WhatsAppResult> {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      logger.warn('WhatsApp service not configured');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(params.to);

      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { body: params.message },
      };

      // If buttons provided, use interactive message
      if (params.buttons && params.buttons.length > 0) {
        payload.type = 'interactive';
        payload.interactive = {
          type: 'button',
          body: { text: params.message },
          action: {
            buttons: params.buttons.map(btn => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title },
            })),
          },
        };
        delete payload.text;
      }

      const response = await axios.post(
        `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const messageId = response.data?.messages?.[0]?.id;

      // Log message
      if (params.appointmentId) {
        await prisma.appointmentReminder.create({
          data: {
            appointmentId: params.appointmentId,
            reminderType: 'whatsapp_message',
            sentVia: 'whatsapp',
            messageText: params.message,
            deliveryStatus: 'sent',
            costGhs: 0.15,
          },
        });
      }

      logger.info(`WhatsApp message sent to ${formattedPhone}`);
      return { success: true, messageId };
    } catch (error: any) {
      logger.error(`WhatsApp error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendBookingConfirmation(appointment: any): Promise<WhatsAppResult> {
    const phone = appointment.patient?.phonePrimary || appointment.patient?.phoneSecondary;
    if (!phone) {
      return { success: false, error: 'No phone number' };
    }

    const patientName = appointment.patient?.firstName || 'Patient';
    const doctorName = `Dr. ${appointment.doctor?.firstName || ''} ${appointment.doctor?.lastName || ''}`.trim();
    const date = new Date(appointment.appointmentDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const message = `Hi ${patientName}! 👋\n\nYour appointment is confirmed:\n\n📅 ${date}\n🕐 ${appointment.appointmentTime}\n👨‍⚕️ ${doctorName}\n📍 MediCare Ghana\n\nReply CANCEL to cancel.`;

    return this.sendMessage({
      to: phone,
      message,
      buttons: [
        { id: 'view_details', title: 'View Details' },
        { id: 'add_calendar', title: 'Add to Calendar' },
      ],
      appointmentId: appointment.id,
    });
  }

  async send24HourReminder(appointment: any): Promise<WhatsAppResult> {
    const phone = appointment.patient?.phonePrimary || appointment.patient?.phoneSecondary;
    if (!phone) {
      return { success: false, error: 'No phone number' };
    }

    const doctorName = `Dr. ${appointment.doctor?.firstName || ''} ${appointment.doctor?.lastName || ''}`.trim();

    const message = `⏰ Reminder: Your appointment with ${doctorName} is TOMORROW at ${appointment.appointmentTime}.\n\nPlease arrive 15 minutes early.\n\n- MediCare Ghana`;

    return this.sendMessage({
      to: phone,
      message,
      buttons: [
        { id: 'confirm', title: 'Confirm ✓' },
        { id: 'reschedule', title: 'Reschedule' },
        { id: 'cancel', title: 'Cancel' },
      ],
      appointmentId: appointment.id,
    });
  }

  async sendQueueUpdate(params: {
    phone: string;
    queueNumber: string;
    doctorName: string;
    estimatedWait: number;
  }): Promise<WhatsAppResult> {
    const message = `🏥 Queue Update\n\nYou're #${params.queueNumber} in queue for ${params.doctorName}.\n\n⏱️ Estimated wait: ${params.estimatedWait} minutes\n\nWe'll notify you when it's your turn!`;

    return this.sendMessage({
      to: params.phone,
      message,
    });
  }

  async sendTurnNotification(params: {
    phone: string;
    roomNumber?: string;
  }): Promise<WhatsAppResult> {
    const message = `🔔 It's your turn!\n\nPlease proceed to ${params.roomNumber || 'the consultation room'}.\n\n- MediCare Ghana`;

    return this.sendMessage({
      to: params.phone,
      message,
    });
  }

  async handleWebhook(body: any): Promise<void> {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        return;
      }

      for (const message of messages) {
        const from = message.from;
        const messageType = message.type;

        if (messageType === 'interactive') {
          const buttonId = message.interactive?.button_reply?.id;
          await this.handleButtonReply(from, buttonId);
        } else if (messageType === 'text') {
          const text = message.text?.body?.toLowerCase().trim();
          await this.handleTextReply(from, text);
        }
      }
    } catch (error) {
      logger.error('WhatsApp webhook error:', error);
    }
  }

  private async handleButtonReply(phone: string, buttonId: string): Promise<void> {
    const formattedPhone = this.formatPhoneNumber(phone);

    // Find patient by phone
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phonePrimary: { contains: formattedPhone.slice(-9) } },
          { phoneSecondary: { contains: formattedPhone.slice(-9) } },
        ],
      },
    });

    if (!patient) {
      await this.sendMessage({
        to: phone,
        message: "Sorry, we couldn't find your record. Please call us for assistance.",
      });
      return;
    }

    // Find upcoming appointment
    const appointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        appointmentDate: { gte: new Date() },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    switch (buttonId) {
      case 'confirm':
        if (appointment) {
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { status: 'CONFIRMED', confirmedAt: new Date() },
          });
          await this.sendMessage({
            to: phone,
            message: '✅ Thank you for confirming! See you at your appointment.',
          });
        }
        break;

      case 'reschedule':
        await this.sendMessage({
          to: phone,
          message: 'To reschedule, please call us or visit our patient portal.',
        });
        break;

      case 'cancel':
        if (appointment) {
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { status: 'CANCELLED', cancelReason: 'Cancelled via WhatsApp', cancelledAt: new Date() },
          });
          await this.sendMessage({
            to: phone,
            message: '❌ Your appointment has been cancelled. Book again anytime!',
          });
        }
        break;

      case 'view_details':
        if (appointment) {
          const date = new Date(appointment.appointmentDate).toLocaleDateString('en-GB');
          await this.sendMessage({
            to: phone,
            message: `📋 Appointment Details:\n\n📅 Date: ${date}\n🕐 Time: ${appointment.appointmentTime}\n📍 Location: MediCare Ghana`,
          });
        }
        break;
    }
  }

  private async handleTextReply(phone: string, text: string): Promise<void> {
    if (text === 'cancel') {
      await this.handleButtonReply(phone, 'cancel');
    } else if (text === 'confirm' || text === 'yes') {
      await this.handleButtonReply(phone, 'confirm');
    } else {
      await this.sendMessage({
        to: phone,
        message: "I didn't understand that. Reply CONFIRM, CANCEL, or call us for help.",
      });
    }
  }
}

export const whatsappService = new WhatsAppService();
