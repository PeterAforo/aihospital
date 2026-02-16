import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authenticate } from '../../common/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/notifications - Get user notifications
router.get('/', notificationController.getNotifications.bind(notificationController));

// GET /api/notifications/count - Get notification count
router.get('/count', notificationController.getNotificationCount.bind(notificationController));

// POST /api/notifications - Create notification
router.post('/', notificationController.createNotification.bind(notificationController));

// PATCH /api/notifications/:notificationId/read - Mark notification as read
router.patch('/:notificationId/read', notificationController.markAsRead.bind(notificationController));

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead.bind(notificationController));

export default router;
