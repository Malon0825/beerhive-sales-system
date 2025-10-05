/**
 * Notification System - Usage Examples
 * This file contains practical examples of using the notification system
 */

import { useNotifications } from '@/lib/contexts/NotificationContext';
import { NotificationService } from '@/core/services/notifications/NotificationService';
import { NotificationPriority } from '@/models/enums/NotificationType';

// ============================================
// EXAMPLE 1: Display Unread Count in Badge
// ============================================
export function UnreadBadgeExample() {
  const { unreadCount } = useNotifications();

  return (
    <div className="relative">
      <button className="p-2">
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

// ============================================
// EXAMPLE 2: Notification List Component
// ============================================
export function NotificationListExample() {
  const { 
    notifications, 
    loading, 
    markAsRead, 
    deleteNotification 
  } = useNotifications();

  if (loading) {
    return <div>Loading notifications...</div>;
  }

  if (notifications.length === 0) {
    return <div>No notifications</div>;
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded ${
            notification.is_read ? 'bg-gray-50' : 'bg-blue-50'
          }`}
        >
          <h4 className="font-semibold">{notification.title}</h4>
          <p className="text-sm">{notification.message}</p>
          <div className="flex gap-2 mt-2">
            {!notification.is_read && (
              <button
                onClick={() => markAsRead(notification.id)}
                className="text-sm text-blue-600"
              >
                Mark as read
              </button>
            )}
            <button
              onClick={() => deleteNotification(notification.id)}
              className="text-sm text-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 3: Mute Toggle Button
// ============================================
export function MuteToggleExample() {
  const { isMuted, toggleMute } = useNotifications();

  return (
    <button
      onClick={toggleMute}
      className="flex items-center gap-2 px-4 py-2 rounded"
    >
      {isMuted ? '🔇' : '🔔'}
      {isMuted ? 'Unmuted' : 'Muted'}
    </button>
  );
}

// ============================================
// EXAMPLE 4: Creating Order Notification
// ============================================
export async function createOrderNotificationExample(
  orderId: string,
  orderNumber: string,
  totalAmount: number
) {
  try {
    await NotificationService.notifyOrderCreated(
      orderId,
      orderNumber,
      totalAmount
    );
    console.log('Order notification sent');
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// ============================================
// EXAMPLE 5: Creating Low Stock Alert
// ============================================
export async function createLowStockAlertExample(
  productId: string,
  productName: string,
  currentStock: number,
  reorderPoint: number
) {
  try {
    await NotificationService.notifyLowStock(
      productId,
      productName,
      currentStock,
      reorderPoint
    );
    console.log('Low stock alert sent');
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}

// ============================================
// EXAMPLE 6: Creating Custom System Alert
// ============================================
export async function createSystemAlertExample() {
  try {
    await NotificationService.notifySystemAlert(
      'System Maintenance',
      'The system will be down for maintenance from 2 AM to 4 AM.',
      NotificationPriority.HIGH,
      'admin' // Target admins only
    );
    console.log('System alert sent');
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}

// ============================================
// EXAMPLE 7: Filter Notifications by Type
// ============================================
export function FilteredNotificationsExample() {
  const { notifications } = useNotifications();

  // Filter only order notifications
  const orderNotifications = notifications.filter(n => 
    n.type.includes('order')
  );

  // Filter only inventory notifications
  const inventoryNotifications = notifications.filter(n => 
    ['low_stock', 'out_of_stock', 'reorder_point'].includes(n.type)
  );

  // Filter only kitchen notifications
  const kitchenNotifications = notifications.filter(n => 
    n.type.includes('food') || n.type.includes('beverage')
  );

  return (
    <div>
      <h3>Order Notifications ({orderNotifications.length})</h3>
      <h3>Inventory Alerts ({inventoryNotifications.length})</h3>
      <h3>Kitchen Updates ({kitchenNotifications.length})</h3>
    </div>
  );
}

// ============================================
// EXAMPLE 8: Mark All as Read
// ============================================
export function MarkAllReadExample() {
  const { unreadCount, markAllAsRead } = useNotifications();

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      console.log('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <button
      onClick={handleMarkAllRead}
      disabled={unreadCount === 0}
      className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
    >
      Mark All as Read ({unreadCount})
    </button>
  );
}

// ============================================
// EXAMPLE 9: Notification with Priority Colors
// ============================================
export function PriorityColoredNotificationExample() {
  const { notifications } = useNotifications();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-500';
      case 'high':
        return 'bg-orange-100 border-orange-500';
      case 'normal':
        return 'bg-blue-100 border-blue-500';
      case 'low':
        return 'bg-gray-100 border-gray-500';
      default:
        return 'bg-blue-100 border-blue-500';
    }
  };

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`p-4 border-l-4 ${getPriorityColor(notif.priority)}`}
        >
          <h4>{notif.title}</h4>
          <p>{notif.message}</p>
          <span className="text-xs uppercase">{notif.priority}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 10: Real-time Notification Counter
// ============================================
export function RealtimeCounterExample() {
  const { unreadCount, notifications } = useNotifications();

  // This automatically updates in real-time!
  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <div className="text-3xl font-bold text-blue-600">{unreadCount}</div>
        <div className="text-sm text-gray-600">Unread</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-600">
          {notifications.length}
        </div>
        <div className="text-sm text-gray-600">Total</div>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 11: Notification with Actions
// ============================================
export function NotificationWithActionsExample() {
  const { notifications, markAsRead } = useNotifications();

  const handleViewOrder = (orderId: string) => {
    console.log('Viewing order:', orderId);
    // Navigate to order details page
    // router.push(`/orders/${orderId}`);
  };

  const handleViewProduct = (productId: string) => {
    console.log('Viewing product:', productId);
    // Navigate to product details page
    // router.push(`/inventory/products/${productId}`);
  };

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <div key={notif.id} className="p-4 border rounded">
          <h4>{notif.title}</h4>
          <p>{notif.message}</p>
          
          <div className="flex gap-2 mt-2">
            {/* Show action based on notification type */}
            {notif.type.includes('order') && notif.reference_id && (
              <button
                onClick={() => {
                  handleViewOrder(notif.reference_id!);
                  markAsRead(notif.id);
                }}
                className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
              >
                View Order
              </button>
            )}
            
            {notif.type.includes('stock') && notif.reference_id && (
              <button
                onClick={() => {
                  handleViewProduct(notif.reference_id!);
                  markAsRead(notif.id);
                }}
                className="text-sm bg-orange-500 text-white px-3 py-1 rounded"
              >
                View Product
              </button>
            )}
            
            {!notif.is_read && (
              <button
                onClick={() => markAsRead(notif.id)}
                className="text-sm text-gray-600"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 12: Notification Toast Popup
// ============================================
export function NotificationToastExample() {
  const { notifications } = useNotifications();
  
  // Get the most recent unread notification
  const latestUnread = notifications.find(n => !n.is_read);

  if (!latestUnread) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-sm animate-slide-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          🔔
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{latestUnread.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{latestUnread.message}</p>
        </div>
        <button className="flex-shrink-0 text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 13: Grouped Notifications
// ============================================
export function GroupedNotificationsExample() {
  const { notifications } = useNotifications();

  // Group by type
  const grouped = notifications.reduce((acc, notif) => {
    const type = notif.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(notif);
    return acc;
  }, {} as Record<string, typeof notifications>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <h3 className="font-semibold capitalize mb-2">
            {type.replace('_', ' ')} ({items.length})
          </h3>
          <div className="space-y-2">
            {items.map(notif => (
              <div key={notif.id} className="p-2 bg-gray-50 rounded">
                {notif.message}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 14: Notification Stats Dashboard
// ============================================
export function NotificationStatsExample() {
  const { notifications, unreadCount } = useNotifications();

  const stats = {
    total: notifications.length,
    unread: unreadCount,
    orders: notifications.filter(n => n.type.includes('order')).length,
    inventory: notifications.filter(n => 
      ['low_stock', 'out_of_stock', 'reorder_point'].includes(n.type)
    ).length,
    kitchen: notifications.filter(n => 
      n.type.includes('food') || n.type.includes('beverage')
    ).length,
    urgent: notifications.filter(n => n.priority === 'urgent').length,
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-blue-50 p-4 rounded">
        <div className="text-2xl font-bold">{stats.unread}</div>
        <div className="text-sm">Unread</div>
      </div>
      <div className="bg-gray-50 p-4 rounded">
        <div className="text-2xl font-bold">{stats.orders}</div>
        <div className="text-sm">Orders</div>
      </div>
      <div className="bg-orange-50 p-4 rounded">
        <div className="text-2xl font-bold">{stats.inventory}</div>
        <div className="text-sm">Inventory</div>
      </div>
      <div className="bg-green-50 p-4 rounded">
        <div className="text-2xl font-bold">{stats.kitchen}</div>
        <div className="text-sm">Kitchen</div>
      </div>
      <div className="bg-red-50 p-4 rounded">
        <div className="text-2xl font-bold">{stats.urgent}</div>
        <div className="text-sm">Urgent</div>
      </div>
      <div className="bg-purple-50 p-4 rounded">
        <div className="text-2xl font-bold">{stats.total}</div>
        <div className="text-sm">Total</div>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 15: Conditional Notification Display
// ============================================
export function ConditionalNotificationExample() {
  const { notifications } = useNotifications();

  // Only show urgent notifications
  const urgentNotifications = notifications.filter(
    n => n.priority === 'urgent' && !n.is_read
  );

  // Don't show anything if no urgent notifications
  if (urgentNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 p-4 rounded shadow-lg">
      <h3 className="font-bold text-red-800 mb-2">
        🚨 Urgent Notifications ({urgentNotifications.length})
      </h3>
      {urgentNotifications.map(notif => (
        <div key={notif.id} className="text-sm text-red-700 mb-1">
          {notif.message}
        </div>
      ))}
    </div>
  );
}

/**
 * Usage in your components:
 * 
 * import { UnreadBadgeExample, NotificationListExample } from '@/examples/notification-examples';
 * 
 * function MyPage() {
 *   return (
 *     <div>
 *       <UnreadBadgeExample />
 *       <NotificationListExample />
 *     </div>
 *   );
 * }
 */
