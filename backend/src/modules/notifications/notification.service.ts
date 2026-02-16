import { prisma } from '../../common/utils/prisma.js';
import { AppError } from '../../common/middleware/error-handler.js';
import { logger } from '../../common/utils/logger.js';

export interface CreateNotificationDto {
  userId: string;
  type: 'LAB_RESULT' | 'PRESCRIPTION' | 'APPOINTMENT' | 'SYSTEM';
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  async createNotification(data: CreateNotificationDto) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          isRead: false,
        },
      });

      logger.info(`[NOTIFICATION] Created notification for user ${data.userId}: ${data.title}`);
      
      return notification;
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to create notification:', error);
      throw new AppError('Failed to create notification', 500);
    }
  }

  async getNotifications(userId: string) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return notifications;
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to get notifications:', error);
      throw new AppError('Failed to get notifications', 500);
    }
  }

  async getNotificationCount(userId: string) {
    try {
      const [total, unread] = await Promise.all([
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({ where: { userId, isRead: false } }),
      ]);

      return { total, unread };
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to get notification count:', error);
      throw new AppError('Failed to get notification count', 500);
    }
  }

  async markAsRead(notificationId: string) {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      logger.info(`[NOTIFICATION] Marked notification ${notificationId} as read`);
      
      return notification;
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to mark notification as read:', error);
      throw new AppError('Failed to mark notification as read', 500);
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      logger.info(`[NOTIFICATION] Marked ${result.count} notifications as read for user ${userId}`);
      
      return result;
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to mark all notifications as read:', error);
      throw new AppError('Failed to mark all notifications as read', 500);
    }
  }

  async notifyLabResultReady(doctorId: string, patientName: string, testName: string, orderId: string) {
    return this.createNotification({
      userId: doctorId,
      type: 'LAB_RESULT',
      title: 'Lab Result Ready',
      message: `Lab result for ${patientName} - ${testName} is ready for review`,
      data: {
        orderId,
        patientName,
        testName,
      },
    });
  }

  async notifyLabResultVerified(doctorId: string, patientName: string, testName: string, orderId: string) {
    return this.createNotification({
      userId: doctorId,
      type: 'LAB_RESULT',
      title: 'Lab Result Verified',
      message: `Lab result for ${patientName} - ${testName} has been verified`,
      data: {
        orderId,
        patientName,
        testName,
      },
    });
  }
}

export const notificationService = new NotificationService();
