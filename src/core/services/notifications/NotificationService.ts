import { NotificationRepository } from '@/data/repositories/NotificationRepository';
import type { 
  Notification, 
  CreateNotificationDTO 
} from '@/models/entities/Notification';
import { 
  NotificationType, 
  NotificationPriority 
} from '@/models/enums/NotificationType';

/**
 * NotificationService
 * Business logic for managing notifications
 */
export class NotificationService {
  /**
   * Create a notification for a new order
   */
  static async notifyOrderCreated(
    orderId: string,
    orderNumber: string,
    totalAmount: number
  ): Promise<Notification> {
    return NotificationRepository.create({
      type: NotificationType.ORDER_CREATED,
      title: 'New Order',
      message: `Order #${orderNumber} created - Total: ₱${totalAmount.toFixed(2)}`,
      priority: NotificationPriority.NORMAL,
      reference_id: orderId,
      reference_table: 'orders',
      role: 'cashier',
      data: {
        order_number: orderNumber,
        total_amount: totalAmount,
      },
    });
  }

  /**
   * Create a notification for order completion
   */
  static async notifyOrderCompleted(
    orderId: string,
    orderNumber: string,
    totalAmount: number
  ): Promise<Notification> {
    return NotificationRepository.create({
      type: NotificationType.ORDER_COMPLETED,
      title: 'Order Completed',
      message: `Order #${orderNumber} completed - ₱${totalAmount.toFixed(2)}`,
      priority: NotificationPriority.NORMAL,
      reference_id: orderId,
      reference_table: 'orders',
      role: 'cashier',
      data: {
        order_number: orderNumber,
        total_amount: totalAmount,
      },
    });
  }

  /**
   * Create a notification for food ready
   */
  static async notifyFoodReady(
    orderId: string,
    orderNumber: string,
    kitchenOrderId: string
  ): Promise<Notification> {
    return NotificationRepository.create({
      type: NotificationType.FOOD_READY,
      title: 'Food Ready',
      message: `Order #${orderNumber} is ready for delivery`,
      priority: NotificationPriority.NORMAL,
      reference_id: kitchenOrderId,
      reference_table: 'kitchen_orders',
      role: 'waiter',
      data: {
        order_id: orderId,
        order_number: orderNumber,
      },
    });
  }

  /**
   * Create a notification for beverage ready
   */
  static async notifyBeverageReady(
    orderId: string,
    orderNumber: string,
    kitchenOrderId: string
  ): Promise<Notification> {
    return NotificationRepository.create({
      type: NotificationType.BEVERAGE_READY,
      title: 'Beverage Ready',
      message: `Order #${orderNumber} drinks are ready for delivery`,
      priority: NotificationPriority.NORMAL,
      reference_id: kitchenOrderId,
      reference_table: 'kitchen_orders',
      role: 'waiter',
      data: {
        order_id: orderId,
        order_number: orderNumber,
      },
    });
  }

  /**
   * Create a notification for item delivered
   */
  static async notifyItemDelivered(
    orderId: string,
    orderNumber: string,
    deliveredBy: string,
    itemType: 'food' | 'beverage'
  ): Promise<Notification> {
    const type = itemType === 'food' 
      ? NotificationType.FOOD_DELIVERED 
      : NotificationType.BEVERAGE_DELIVERED;

    return NotificationRepository.create({
      type,
      title: `${itemType === 'food' ? 'Food' : 'Beverage'} Delivered`,
      message: `Order #${orderNumber} ${itemType} delivered by ${deliveredBy}`,
      priority: NotificationPriority.NORMAL,
      reference_id: orderId,
      reference_table: 'orders',
      role: 'cashier',
      data: {
        order_number: orderNumber,
        delivered_by: deliveredBy,
        item_type: itemType,
      },
    });
  }

  /**
   * Create a notification for low stock
   */
  static async notifyLowStock(
    productId: string,
    productName: string,
    currentStock: number,
    reorderPoint: number
  ): Promise<Notification> {
    const isOutOfStock = currentStock <= 0;
    
    return NotificationRepository.create({
      type: isOutOfStock ? NotificationType.OUT_OF_STOCK : NotificationType.LOW_STOCK,
      title: isOutOfStock ? 'OUT OF STOCK' : 'Low Stock Alert',
      message: isOutOfStock
        ? `${productName} is out of stock!`
        : `${productName} is running low (${currentStock.toFixed(2)} remaining)`,
      priority: isOutOfStock ? NotificationPriority.URGENT : NotificationPriority.HIGH,
      reference_id: productId,
      reference_table: 'products',
      role: 'manager',
      data: {
        product_name: productName,
        current_stock: currentStock,
        reorder_point: reorderPoint,
      },
    });
  }

  /**
   * Create a notification for reorder point reached
   */
  static async notifyReorderPoint(
    productId: string,
    productName: string,
    currentStock: number,
    reorderPoint: number
  ): Promise<Notification> {
    return NotificationRepository.create({
      type: NotificationType.REORDER_POINT,
      title: 'Reorder Point Reached',
      message: `${productName} has reached reorder point (${currentStock.toFixed(2)} / ${reorderPoint.toFixed(2)})`,
      priority: NotificationPriority.NORMAL,
      reference_id: productId,
      reference_table: 'products',
      role: 'manager',
      data: {
        product_name: productName,
        current_stock: currentStock,
        reorder_point: reorderPoint,
      },
    });
  }

  /**
   * Create a system alert notification
   */
  static async notifySystemAlert(
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    targetRole?: string,
    targetUserId?: string
  ): Promise<Notification> {
    return NotificationRepository.create({
      type: NotificationType.SYSTEM_ALERT,
      title,
      message,
      priority,
      role: targetRole,
      user_id: targetUserId,
    });
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(
    userId: string,
    limit: number = 50,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    return NotificationRepository.getForUser(userId, limit, unreadOnly);
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return NotificationRepository.getUnreadCount(userId);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    return NotificationRepository.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await NotificationRepository.markAllAsRead(userId);
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    return NotificationRepository.delete(notificationId);
  }

  /**
   * Play notification sound (helper)
   */
  static playNotificationSound(muted: boolean = false) {
    if (muted) return;

    // Play a subtle notification sound
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.3; // Subtle volume
    audio.play().catch(err => console.log('Could not play notification sound:', err));
  }

  /**
   * Show browser notification (helper)
   */
  static async showBrowserNotification(
    title: string,
    message: string,
    muted: boolean = false
  ) {
    if (muted || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/beerhive-icon.png',
        badge: '/beerhive-icon.png',
        silent: true, // Keep it subtle
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/beerhive-icon.png',
          badge: '/beerhive-icon.png',
          silent: true,
        });
      }
    }
  }
}
