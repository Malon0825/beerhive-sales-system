import { NotificationType, NotificationPriority } from '../enums/NotificationType';

/**
 * Notification Entity
 * Represents a system notification for real-time updates
 * 
 * @interface Notification
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  
  // Reference data
  reference_id?: string; // Order ID, Product ID, etc.
  reference_table?: string; // orders, products, kitchen_orders, etc.
  
  // User targeting
  user_id?: string; // Specific user (optional)
  role?: string; // Target specific role
  
  // Status
  is_read: boolean;
  read_at?: Date;
  
  // Metadata
  data?: Record<string, any>; // Additional context data
  
  created_at: Date;
  expires_at?: Date; // Optional expiration
}

/**
 * Notification DTO for creating notifications
 * 
 * @interface CreateNotificationDTO
 */
export interface CreateNotificationDTO {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  reference_id?: string;
  reference_table?: string;
  user_id?: string;
  role?: string;
  data?: Record<string, any>;
  expires_at?: Date;
}

// Re-export enums for convenience
export { NotificationType, NotificationPriority };
