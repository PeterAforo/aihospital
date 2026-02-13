import { prisma } from '../utils/prisma.js';
import { smsService } from './sms.service.js';
import { logger } from '../utils/logger.js';

export class ReminderSchedulerService {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    logger.info('Starting reminder scheduler...');
    
    // Run every hour
    this.intervalId = setInterval(async () => {
      await this.processReminders();
    }, 60 * 60 * 1000);

    // Run immediately on start
    this.processReminders();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Reminder scheduler stopped');
    }
  }

  private async processReminders() {
    try {
      await this.send24HourReminders();
      await this.send2HourReminders();
    } catch (error) {
      logger.error('Error processing reminders:', error);
    }
  }

  async send24HourReminders(): Promise<{ sent: number; failed: number }> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: tomorrow, lte: tomorrowEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        reminder24hSent: false,
        isWalkIn: false,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, phonePrimary: true, phoneSecondary: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const apt of appointments) {
      const phone = apt.patient?.phonePrimary || apt.patient?.phoneSecondary;
      if (!phone) {
        failed++;
        continue;
      }

      const patientName = `${apt.patient?.firstName} ${apt.patient?.lastName}`;
      const doctorName = `${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''}`.trim();

      const message = `Reminder: Your appointment with Dr. ${doctorName} is TOMORROW at ${apt.appointmentTime}.\n\nReply:\n1-CONFIRM\n2-RESCHEDULE\n3-CANCEL\n\n-MediCare Ghana`;

      try {
        const result = await smsService.sendSMS({ to: phone, message });

        if (result.success) {
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { reminder24hSent: true },
          });

          await prisma.appointmentReminder.create({
            data: {
              appointmentId: apt.id,
              reminderType: '24h_reminder',
              sentVia: 'sms',
              messageText: message,
              deliveryStatus: 'sent',
              costGhs: 0.05,
            },
          });

          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error(`Failed to send 24h reminder for appointment ${apt.id}:`, error);
        failed++;
      }
    }

    logger.info(`24-hour reminders: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  async send2HourReminders(): Promise<{ sent: number; failed: number }> {
    const now = new Date();
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in2Hours30 = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const targetTimeStart = in2Hours.toTimeString().slice(0, 5);
    const targetTimeEnd = in2Hours30.toTimeString().slice(0, 5);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: today, lte: todayEnd },
        appointmentTime: { gte: targetTimeStart, lte: targetTimeEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        reminder2hSent: false,
        isWalkIn: false,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, phonePrimary: true, phoneSecondary: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const apt of appointments) {
      const phone = apt.patient?.phonePrimary || apt.patient?.phoneSecondary;
      if (!phone) {
        failed++;
        continue;
      }

      const doctorName = `${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''}`.trim();

      const message = `Your appointment with Dr. ${doctorName} is in 2 HOURS at ${apt.appointmentTime}.\n\nSee you soon at MediCare Ghana!`;

      try {
        const result = await smsService.sendSMS({ to: phone, message });

        if (result.success) {
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { reminder2hSent: true },
          });

          await prisma.appointmentReminder.create({
            data: {
              appointmentId: apt.id,
              reminderType: '2h_reminder',
              sentVia: 'sms',
              messageText: message,
              deliveryStatus: 'sent',
              costGhs: 0.05,
            },
          });

          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error(`Failed to send 2h reminder for appointment ${apt.id}:`, error);
        failed++;
      }
    }

    logger.info(`2-hour reminders: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  async sendRunningLateNotification(
    appointmentId: string,
    delayMinutes: number
  ): Promise<boolean> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { firstName: true, phonePrimary: true, phoneSecondary: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
    });

    if (!appointment) return false;

    const phone = appointment.patient?.phonePrimary || appointment.patient?.phoneSecondary;
    if (!phone) return false;

    const doctorName = `${appointment.doctor?.firstName || ''} ${appointment.doctor?.lastName || ''}`.trim();
    
    // Calculate new estimated time
    const [hours, minutes] = appointment.appointmentTime.split(':').map(Number);
    const newMinutes = hours * 60 + minutes + delayMinutes;
    const newHours = Math.floor(newMinutes / 60) % 24;
    const newMins = newMinutes % 60;
    const newTime = `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;

    const message = `Update: Dr. ${doctorName} is running ${delayMinutes} minutes late.\n\nYour new estimated time: ${newTime}\n\nReply 1 to WAIT or 2 to RESCHEDULE.`;

    try {
      const result = await smsService.sendSMS({ to: phone, message });

      if (result.success) {
        await prisma.appointmentReminder.create({
          data: {
            appointmentId,
            reminderType: 'running_late',
            sentVia: 'sms',
            messageText: message,
            deliveryStatus: 'sent',
            costGhs: 0.05,
          },
        });
        return true;
      }
    } catch (error) {
      logger.error(`Failed to send running late notification for appointment ${appointmentId}:`, error);
    }

    return false;
  }

  async markNoShow(appointmentId: string): Promise<boolean> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { firstName: true, phonePrimary: true, phoneSecondary: true } },
      },
    });

    if (!appointment) return false;

    // Update appointment status
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'NO_SHOW',
        noShowReason: 'Patient did not arrive within 15 minutes of appointment time',
      },
    });

    // Send SMS notification
    const phone = appointment.patient?.phonePrimary || appointment.patient?.phoneSecondary;
    if (phone) {
      const message = `We missed you at your ${appointment.appointmentTime} appointment.\n\nPlease call to reschedule.\n\n-MediCare Ghana`;

      try {
        await smsService.sendSMS({ to: phone, message });

        await prisma.appointmentReminder.create({
          data: {
            appointmentId,
            reminderType: 'no_show',
            sentVia: 'sms',
            messageText: message,
            deliveryStatus: 'sent',
            costGhs: 0.05,
          },
        });
      } catch (error) {
        logger.error(`Failed to send no-show notification for appointment ${appointmentId}:`, error);
      }
    }

    return true;
  }
}

export const reminderScheduler = new ReminderSchedulerService();
