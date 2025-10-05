import { supabase } from '../supabase/client';
import { Notification, CreateNotificationDTO } from '@/models/entities/Notification';
import { NotificationType } from '@/models/enums/NotificationType';

/**
 * NotificationRepository
 * Handles data access for notifications
 */
export class NotificationRepository {
  /**
   * Get notifications for current user
   * @param userId - User ID
   * @param limit - Number of notifications to fetch
   * @param unreadOnly - Fetch only unread notifications
   */
  static async getForUser(
    userId: string,
    limit: number = 50,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    // First, get the user's role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user role:', userError);
      throw new Error('Failed to fetch user role');
    }

    const userRole = userData?.role;

    // Build query to get notifications for this user or their role
    let query = supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},role.eq.${userRole}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }

    return data as Notification[];
  }

  /**
   * Get unread notification count
   * @param userId - User ID
   */
  static async getUnreadCount(userId: string): Promise<number> {
    // First, get the user's role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user role:', userError);
      return 0;
    }

    const userRole = userData?.role;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},role.eq.${userRole}`)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Mark notification as read
   * @param notificationId - Notification ID
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  }

  /**
   * Mark all notifications as read for a user
   * @param userId - User ID
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const { error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error marking all as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }

    return 0; // RPC returns count
  }

  /**
   * Create a new notification
   * @param notification - Notification data
   */
  static async create(notification: CreateNotificationDTO): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority || 'normal',
        reference_id: notification.reference_id,
        reference_table: notification.reference_table,
        user_id: notification.user_id,
        role: notification.role,
        data: notification.data,
        expires_at: notification.expires_at?.toISOString(),
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }

    return data as Notification;
  }

  /**
   * Delete notification
   * @param notificationId - Notification ID
   */
  static async delete(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete old read notifications (cleanup)
   */
  static async cleanupOldNotifications(): Promise<void> {
    const { error } = await supabase.rpc('cleanup_old_notifications');

    if (error) {
      console.error('Error cleaning up notifications:', error);
    }
  }

  /**
   * Get notifications by type
   * @param userId - User ID
   * @param type - Notification type
   * @param limit - Number of notifications to fetch
   */
  static async getByType(
    userId: string,
    type: NotificationType,
    limit: number = 20
  ): Promise<Notification[]> {
    // First, get the user's role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user role:', userError);
      throw new Error('Failed to fetch user role');
    }

    const userRole = userData?.role;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},role.eq.${userRole}`)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications by type:', error);
      throw new Error('Failed to fetch notifications');
    }

    return data as Notification[];
  }
}
