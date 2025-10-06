// @ts-nocheck - Supabase type inference issues (notifications table not typed)
import { supabaseAdmin } from '@/data/supabase/server-client';
import type { Notification, CreateNotificationDTO } from '@/models/entities/Notification';
import { NotificationType } from '@/models/enums/NotificationType';

/**
 * Server-only NotificationRepository
 * Uses `supabaseAdmin` (service role) and must never be imported in client bundles.
 * This avoids leaking NEXT_PUBLIC env values into server builds.
 */
export class NotificationRepositoryServer {
  /**
   * Get notifications for a user or their role (server-side)
   */
  static async getForUser(
    userId: string,
    limit: number = 50,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    // Get user role first
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('NotificationRepositoryServer.getForUser role fetch error:', userError);
      throw new Error('Failed to fetch user role');
    }

    const userRole = (userData as any)?.role;

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},role.eq.${userRole}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq('is_read', false);

    const { data, error } = await query;
    if (error) {
      console.error('NotificationRepositoryServer.getForUser error:', error);
      throw new Error('Failed to fetch notifications');
    }

    return data as Notification[];
  }

  /**
   * Get unread notification count (server-side)
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('NotificationRepositoryServer.getUnreadCount role fetch error:', userError);
      return 0;
    }

    const userRole = (userData as any)?.role;

    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},role.eq.${userRole}`)
      .eq('is_read', false);

    if (error) {
      console.error('NotificationRepositoryServer.getUnreadCount error:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Mark a single notification as read (server-side)
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('NotificationRepositoryServer.markAsRead error:', error);
      return false;
    }

    return true;
  }

  /**
   * Mark all notifications as read via RPC (server-side)
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabaseAdmin.rpc('mark_all_notifications_read', { p_user_id: userId });
    if (error) {
      console.error('NotificationRepositoryServer.markAllAsRead error:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Create a notification (server-side)
   */
  static async create(notification: CreateNotificationDTO): Promise<Notification> {
    const { data, error } = await supabaseAdmin
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
      console.error('NotificationRepositoryServer.create error:', error);
      throw new Error('Failed to create notification');
    }

    return data as Notification;
  }

  /**
   * Delete a notification (server-side)
   */
  static async delete(notificationId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('NotificationRepositoryServer.delete error:', error);
      return false;
    }

    return true;
  }

  /**
   * Cleanup old notifications via RPC (server-side)
   */
  static async cleanupOldNotifications(): Promise<void> {
    const { error } = await supabaseAdmin.rpc('cleanup_old_notifications');
    if (error) {
      console.error('NotificationRepositoryServer.cleanupOldNotifications error:', error);
    }
  }

  /**
   * Get notifications filtered by type (server-side)
   */
  static async getByType(
    userId: string,
    type: NotificationType,
    limit: number = 20
  ): Promise<Notification[]> {
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('NotificationRepositoryServer.getByType role fetch error:', userError);
      throw new Error('Failed to fetch user role');
    }

    const userRole = (userData as any)?.role;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},role.eq.${userRole}`)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('NotificationRepositoryServer.getByType error:', error);
      throw new Error('Failed to fetch notifications');
    }

    return data as Notification[];
  }
}
