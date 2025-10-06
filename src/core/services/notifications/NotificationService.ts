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
   * Dynamically load the appropriate repository depending on runtime context.
   * - Server: uses `NotificationRepositoryServer` (supabaseAdmin)
   * - Client: uses `NotificationRepository` (browser supabase)
   * This avoids pulling the client repository into server bundles and leaking
   * NEXT_PUBLIC env values into server output.
   */
  private static async loadRepo(): Promise<any> {
    const isServer = typeof window === 'undefined';
    if (isServer) {
      const mod = await import("@/data/repositories/NotificationRepository.server");
      return mod.NotificationRepositoryServer;
    }
    const mod = await import("@/data/repositories/NotificationRepository");
    return mod.NotificationRepository;
  }

  /**
   * Create a notification for a new order
   */
  static async notifyOrderCreated(
    orderId: string,
    orderNumber: string,
    totalAmount: number
  ): Promise<Notification> {
    const Repo = await this.loadRepo();
    return Repo.create({
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
    const Repo = await this.loadRepo();
    return Repo.create({
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
    const Repo = await this.loadRepo();
    return Repo.create({
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
    const Repo = await this.loadRepo();
    return Repo.create({
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

    const Repo = await this.loadRepo();
    return Repo.create({
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
    
    const Repo = await this.loadRepo();
    return Repo.create({
      type: isOutOfStock ? NotificationType.OUT_OF_STOCK : NotificationType.LOW_STOCK,
      title: isOutOfStock ? 'OUT OF STOCK' : 'Low Stock Alert',
      message: isOutOfStock
        ? `${productName} is out of stock!`
        : `${productName} is running low (${currentStock.toFixed(2)} remaining)`,
      priority: NotificationPriority.URGENT,
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
    const Repo = await this.loadRepo();
    return Repo.create({
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
    const Repo = await this.loadRepo();
    return Repo.create({
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
    const Repo = await this.loadRepo();
    return Repo.getForUser(userId, limit, unreadOnly);
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const Repo = await this.loadRepo();
    return Repo.getUnreadCount(userId);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    const Repo = await this.loadRepo();
    return Repo.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const Repo = await this.loadRepo();
    await Repo.markAllAsRead(userId);
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    const Repo = await this.loadRepo();
    return Repo.delete(notificationId);
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
