import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { notificationService } from './notification.service';
import { sendSuccess, sendError } from '../../common/utils/api-response';
import { AppError } from '../../common/middleware/error-handler';

export class NotificationController {
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw new AppError('User ID required', 400, 'USER_ID_REQUIRED');
      }

      const notifications = await notificationService.getNotifications(userId);
      
      return sendSuccess(res, notifications, 'Notifications retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getNotificationCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw new AppError('User ID required', 400, 'USER_ID_REQUIRED');
      }

      const count = await notificationService.getNotificationCount(userId);
      
      return sendSuccess(res, count, 'Notification count retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { notificationId } = req.params;
      
      if (!notificationId) {
        throw new AppError('Notification ID required', 400, 'NOTIFICATION_ID_REQUIRED');
      }

      const notification = await notificationService.markAsRead(notificationId);
      
      return sendSuccess(res, notification, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw new AppError('User ID required', 400, 'USER_ID_REQUIRED');
      }

      const result = await notificationService.markAllAsRead(userId);
      
      return sendSuccess(res, result, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  async createNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw new AppError('User ID required', 400, 'USER_ID_REQUIRED');
      }

      const notification = await notificationService.createNotification({
        ...req.body,
        userId,
      });
      
      return sendSuccess(res, notification, 'Notification created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
