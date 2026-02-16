import api from './api';

export interface Notification {
  id: string;
  userId: string;
  type: 'LAB_RESULT' | 'PRESCRIPTION' | 'APPOINTMENT' | 'SYSTEM';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationCount {
  total: number;
  unread: number;
}

class NotificationService {
  async getNotifications(_userId: string): Promise<Notification[]> {
    const response = await api.get('/notifications');
    return response.data;
  }

  async getNotificationCount(_userId: string): Promise<NotificationCount> {
    const response = await api.get('/notifications/count');
    return response.data;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  }

  async markAllAsRead(_userId: string): Promise<void> {
    await api.patch('/notifications/read-all');
  }

  async createNotification(data: {
    userId: string;
    type: Notification['type'];
    title: string;
    message: string;
    data?: any;
  }): Promise<Notification> {
    const response = await api.post('/notifications', data);
    return response.data;
  }
}

export const notificationService = new NotificationService();
