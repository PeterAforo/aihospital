import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notificationService, Notification, NotificationCount } from '@/services/notification.service';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

interface NotificationContextType {
  notifications: Notification[];
  notificationCount: NotificationCount;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState<NotificationCount>({ total: 0, unread: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  const refreshNotifications = async () => {
    if (!user?.id || authFailed) return;
    
    try {
      setIsLoading(true);
      const [notificationsResult, countResult] = await Promise.allSettled([
        notificationService.getNotifications(user.id),
        notificationService.getNotificationCount(user.id),
      ]);
      
      // Stop polling if we get 401 errors
      const has401 = [notificationsResult, countResult].some(
        r => r.status === 'rejected' && (r.reason?.response?.status === 401 || r.reason?.status === 401)
      );
      if (has401) {
        setAuthFailed(true);
        return;
      }

      if (notificationsResult.status === 'fulfilled') setNotifications(notificationsResult.value);
      if (countResult.status === 'fulfilled') setNotificationCount(countResult.value);
    } catch {
      // Silently ignore — auth errors are handled by the API interceptor
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      await refreshNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await notificationService.markAllAsRead(user.id);
      await refreshNotifications();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Reset auth failure state when user changes (re-login)
  useEffect(() => {
    if (user?.id) {
      setAuthFailed(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && !authFailed) {
      refreshNotifications();
      
      // Set up polling for new notifications
      const interval = setInterval(refreshNotifications, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [user?.id, authFailed]);

  const value: NotificationContextType = {
    notifications,
    notificationCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
