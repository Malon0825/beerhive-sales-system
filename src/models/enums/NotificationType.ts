/**
 * Notification Types Enum
 * Defines all possible notification types in the system
 */
export enum NotificationType {
  // Order notifications
  ORDER_CREATED = 'order_created',
  ORDER_COMPLETED = 'order_completed',
  ORDER_VOIDED = 'order_voided',
  
  // Kitchen notifications
  FOOD_READY = 'food_ready',
  FOOD_DELIVERED = 'food_delivered',
  
  // Bartender notifications
  BEVERAGE_READY = 'beverage_ready',
  BEVERAGE_DELIVERED = 'beverage_delivered',
  
  // Inventory notifications
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  REORDER_POINT = 'reorder_point',
  
  // Package inventory notifications (Phase 4)
  PACKAGE_UNAVAILABLE = 'package_unavailable',
  PACKAGE_LOW_STOCK = 'package_low_stock',
  PACKAGE_BOTTLENECK = 'package_bottleneck',
  STOCKOUT_PREDICTED = 'stockout_predicted',
  
  // System notifications
  SYSTEM_ALERT = 'system_alert',
}

/**
 * Notification Priority Levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}
