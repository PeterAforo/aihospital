import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

const db = prisma as any;

/**
 * Push Notification Service
 * Supports Firebase Cloud Messaging (FCM) for mobile push notifications.
 * Falls back to in-app notifications when FCM is not configured.
 */
export class PushNotificationService {
  private fcmServerKey: string;
  private fcmApiUrl = 'https://fcm.googleapis.com/fcm/send';

  constructor() {
    this.fcmServerKey = process.env.FCM_SERVER_KEY || '';
  }

  get isConfigured(): boolean {
    return !!this.fcmServerKey;
  }

  /**
   * Send push notification to a specific device token
   */
  async sendToDevice(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      logger.debug('[PUSH] FCM not configured, skipping device push');
      return { success: false, error: 'FCM not configured' };
    }

    try {
      const response = await fetch(this.fcmApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${this.fcmServerKey}`,
        },
        body: JSON.stringify({
          to: deviceToken,
          notification: { title, body, sound: 'default' },
          data: data || {},
          priority: 'high',
        }),
      });

      const result = await response.json() as any;

      if (result.success === 1) {
        return { success: true, messageId: result.results?.[0]?.message_id };
      } else {
        const error = result.results?.[0]?.error || 'Unknown FCM error';
        logger.warn(`[PUSH] FCM send failed: ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      logger.error('[PUSH] FCM request error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to a user by userId
   * Looks up their registered device tokens
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    notificationType: string = 'GENERAL'
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    try {
      // Get user's device tokens
      let deviceTokens: string[] = [];
      try {
        const tokens = await db.deviceToken.findMany({
          where: { userId, isActive: true },
          select: { token: true },
        });
        deviceTokens = tokens.map((t: any) => t.token);
      } catch {
        // DeviceToken model may not exist yet
      }

      // Send to each device
      for (const token of deviceTokens) {
        const result = await this.sendToDevice(token, title, body, data);
        if (result.success) sent++;
        else failed++;
      }

      // Always create in-app notification
      await this.createInAppNotification(userId, title, body, notificationType, data);

    } catch (error: any) {
      logger.error(`[PUSH] Send to user ${userId} failed:`, error.message);
      failed++;
    }

    return { sent, failed };
  }

  /**
   * Send push notification to all users with a specific role in a tenant
   */
  async sendToRole(
    tenantId: string,
    role: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ totalUsers: number; sent: number; failed: number }> {
    try {
      const users = await prisma.user.findMany({
        where: { tenantId, role: role as any, isActive: true },
        select: { id: true },
      });

      let sent = 0;
      let failed = 0;

      for (const user of users) {
        const result = await this.sendToUser(user.id, title, body, data);
        sent += result.sent;
        failed += result.failed;
      }

      return { totalUsers: users.length, sent, failed };
    } catch (error: any) {
      logger.error(`[PUSH] Send to role ${role} failed:`, error.message);
      return { totalUsers: 0, sent: 0, failed: 0 };
    }
  }

  /**
   * Create in-app notification (always works, no FCM needed)
   */
  async createInAppNotification(
    userId: string,
    title: string,
    body: string,
    type: string = 'GENERAL',
    data?: Record<string, string>
  ) {
    try {
      await db.notification.create({
        data: {
          userId,
          title,
          body,
          type,
          data: data ? JSON.stringify(data) : null,
          isRead: false,
        },
      });
    } catch {
      // Notification model may not exist - log instead
      logger.debug(`[PUSH] In-app notification for ${userId}: ${title} - ${body}`);
    }
  }

  /**
   * Register a device token for push notifications
   */
  async registerDeviceToken(userId: string, token: string, platform: string = 'android') {
    try {
      await db.deviceToken.upsert({
        where: { token },
        create: { userId, token, platform, isActive: true },
        update: { userId, isActive: true, updatedAt: new Date() },
      });
      return { success: true };
    } catch {
      logger.debug(`[PUSH] Device token registration skipped (model may not exist)`);
      return { success: false, error: 'DeviceToken model not available' };
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(token: string) {
    try {
      await db.deviceToken.update({
        where: { token },
        data: { isActive: false },
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  // ── Convenience notification methods ──

  async notifyAppointmentReminder(userId: string, doctorName: string, time: string) {
    return this.sendToUser(userId, 'Appointment Reminder', `Your appointment with Dr. ${doctorName} is at ${time}`, { type: 'APPOINTMENT_REMINDER' }, 'APPOINTMENT');
  }

  async notifyLabResultReady(userId: string, testName: string) {
    return this.sendToUser(userId, 'Lab Results Ready', `Your ${testName} results are now available`, { type: 'LAB_RESULT' }, 'LAB');
  }

  async notifyPrescriptionReady(userId: string) {
    return this.sendToUser(userId, 'Prescription Ready', 'Your prescription is ready for pickup at the pharmacy', { type: 'PRESCRIPTION_READY' }, 'PHARMACY');
  }

  async notifyPaymentReceived(userId: string, amount: string) {
    return this.sendToUser(userId, 'Payment Received', `Payment of GHS ${amount} has been received. Thank you!`, { type: 'PAYMENT' }, 'BILLING');
  }

  async notifyCriticalAlert(userId: string, message: string) {
    return this.sendToUser(userId, 'Critical Alert', message, { type: 'CRITICAL', priority: 'high' }, 'CRITICAL');
  }
}

export const pushNotificationService = new PushNotificationService();
