'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Notification } from '@/models/entities/Notification';
import { NotificationService } from '@/core/services/notifications/NotificationService';
import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isMuted: boolean;
  loading: boolean;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  toggleMute: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

/**
 * NotificationProvider
 * Manages notification state and real-time updates
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Load mute preference from localStorage
   */
  useEffect(() => {
    const savedMuteState = localStorage.getItem('notifications_muted');
    if (savedMuteState) {
      setIsMuted(savedMuteState === 'true');
    }
  }, []);

  /**
   * Fetch notifications for current user
   */
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [notifs, count] = await Promise.all([
        NotificationService.getNotifications(user.id, 50, false),
        NotificationService.getUnreadCount(user.id),
      ]);

      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Initial load of notifications
   */
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /**
   * Handle new notification from realtime
   * Only process notifications for current user or their role
   */
  const handleNewNotification = useCallback((payload: any) => {
    if (!user) return; // No user, skip
    
    if (payload.eventType === 'INSERT') {
      const newNotification = payload.new as Notification;
      
      // Check if this notification is for current user or their role
      const isForUser = newNotification.user_id === user.id;
      const isForRole = newNotification.role === user.role;
      
      if (!isForUser && !isForRole) {
        // Not for this user, skip
        return;
      }
      
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Play sound and show browser notification if not muted
      NotificationService.playNotificationSound(isMuted);
      NotificationService.showBrowserNotification(
        newNotification.title,
        newNotification.message,
        isMuted
      );
    } else if (payload.eventType === 'UPDATE') {
      const updatedNotification = payload.new as Notification;
      
      // Only update if we have this notification in state
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === updatedNotification.id);
        if (!exists) return prev;
        
        return prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n));
      });

      // Update unread count if notification was marked as read
      if (updatedNotification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } else if (payload.eventType === 'DELETE') {
      const deletedId = payload.old.id;
      
      setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
      
      // Update unread count if deleted notification was unread
      if (!payload.old.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
  }, [isMuted, user]);

  /**
   * Subscribe to realtime notifications
   */
  useRealtime({
    table: 'notifications',
    event: '*',
    onChange: handleNewNotification,
  });

  /**
   * Mark a notification as read
   */
  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await NotificationService.markAllAsRead(user.id);
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  /**
   * Delete a notification
   */
  const deleteNotification = async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      
      const notif = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      
      if (notif && !notif.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  /**
   * Toggle mute state
   */
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    localStorage.setItem('notifications_muted', String(newMuteState));
  };

  /**
   * Refresh notifications manually
   */
  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    isMuted,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    toggleMute,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
}
