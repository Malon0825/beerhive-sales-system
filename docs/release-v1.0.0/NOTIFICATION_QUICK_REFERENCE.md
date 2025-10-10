# Notification System - Quick Reference Card

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install @radix-ui/react-scroll-area

# 2. Run migration in Supabase SQL Editor
migrations/create_notifications_table.sql

# 3. Enable Realtime for notifications table
# Dashboard → Database → Replication → notifications → Enable

# 4. Start and test
npm run dev
```

---

## 📦 Import Statements

```typescript
// Context Hook
import { useNotifications } from '@/lib/contexts/NotificationContext';

// Service
import { NotificationService } from '@/core/services/notifications/NotificationService';

// Types
import { 
  Notification, 
  CreateNotificationDTO 
} from '@/models/entities/Notification';

import { 
  NotificationType, 
  NotificationPriority 
} from '@/models/enums/NotificationType';
```

---

## 🎣 Using the Hook

```typescript
function MyComponent() {
  const {
    notifications,      // Notification[]
    unreadCount,        // number
    isMuted,           // boolean
    loading,           // boolean
    markAsRead,        // (id: string) => Promise<void>
    markAllAsRead,     // () => Promise<void>
    deleteNotification, // (id: string) => Promise<void>
    toggleMute,        // () => void
    refreshNotifications, // () => Promise<void>
  } = useNotifications();
  
  return <div>Unread: {unreadCount}</div>;
}
```

---

## 🔔 Creating Notifications

### Order Notifications
```typescript
// Order created
await NotificationService.notifyOrderCreated(
  orderId,        // string
  orderNumber,    // string
  totalAmount     // number
);

// Order completed
await NotificationService.notifyOrderCompleted(
  orderId,
  orderNumber,
  totalAmount
);
```

### Kitchen/Bartender Notifications
```typescript
// Food ready
await NotificationService.notifyFoodReady(
  orderId,
  orderNumber,
  kitchenOrderId
);

// Beverage ready
await NotificationService.notifyBeverageReady(
  orderId,
  orderNumber,
  kitchenOrderId
);

// Item delivered
await NotificationService.notifyItemDelivered(
  orderId,
  orderNumber,
  deliveredBy,    // string
  'food' | 'beverage'
);
```

### Inventory Notifications
```typescript
// Low stock
await NotificationService.notifyLowStock(
  productId,
  productName,
  currentStock,
  reorderPoint
);

// Reorder point
await NotificationService.notifyReorderPoint(
  productId,
  productName,
  currentStock,
  reorderPoint
);
```

### Custom System Alerts
```typescript
await NotificationService.notifySystemAlert(
  'Alert Title',
  'Alert message',
  NotificationPriority.HIGH,    // optional
  'cashier',                     // target role, optional
  'user-id'                      // target user, optional
);
```

---

## 📊 Notification Types

```typescript
enum NotificationType {
  ORDER_CREATED = 'order_created',
  ORDER_COMPLETED = 'order_completed',
  ORDER_VOIDED = 'order_voided',
  FOOD_READY = 'food_ready',
  FOOD_DELIVERED = 'food_delivered',
  BEVERAGE_READY = 'beverage_ready',
  BEVERAGE_DELIVERED = 'beverage_delivered',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  REORDER_POINT = 'reorder_point',
  SYSTEM_ALERT = 'system_alert',
}

enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}
```

---

## 🎨 UI Components

### Using NotificationBell
```typescript
import { NotificationBell } from '@/views/shared/ui/NotificationBell';

function Header() {
  return (
    <header>
      <NotificationBell />
    </header>
  );
}
```

### Custom Notification Display
```typescript
function NotificationList() {
  const { notifications, markAsRead } = useNotifications();
  
  return (
    <div>
      {notifications.map(notif => (
        <div key={notif.id} onClick={() => markAsRead(notif.id)}>
          <h4>{notif.title}</h4>
          <p>{notif.message}</p>
          <span>{notif.priority}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 🗄️ Database Queries

### Get Notifications
```sql
-- All notifications for a role
SELECT * FROM notifications 
WHERE role = 'cashier' 
ORDER BY created_at DESC;

-- Unread only
SELECT * FROM notifications 
WHERE role = 'manager' 
AND is_read = false;

-- By type
SELECT * FROM notifications 
WHERE type = 'low_stock';
```

### Mark as Read
```sql
-- Single notification
UPDATE notifications 
SET is_read = true, read_at = NOW()
WHERE id = 'notification-id';

-- All for user (use function)
SELECT mark_all_notifications_read('user-id');
```

### Create Manual Notification
```sql
INSERT INTO notifications (
    type,
    title,
    message,
    priority,
    role
) VALUES (
    'system_alert',
    'Maintenance Notice',
    'System will restart at midnight',
    'high',
    'admin'
);
```

---

## 🔧 API Endpoints

```typescript
// GET /api/notifications?userId=xxx&limit=50&unreadOnly=false
fetch('/api/notifications?userId=' + userId);

// GET /api/notifications/count?userId=xxx
fetch('/api/notifications/count?userId=' + userId);

// PATCH /api/notifications/[id]
fetch('/api/notifications/' + id, { method: 'PATCH' });

// DELETE /api/notifications/[id]
fetch('/api/notifications/' + id, { method: 'DELETE' });

// POST /api/notifications/mark-all-read
fetch('/api/notifications/mark-all-read', {
  method: 'POST',
  body: JSON.stringify({ userId })
});
```

---

## 🎯 Role Targeting

| Notification Type | Default Target |
|-------------------|----------------|
| Order Created | `cashier` |
| Order Completed | `cashier` |
| Food Ready | `waiter` |
| Beverage Ready | `waiter` |
| Low Stock | `manager` |
| Out of Stock | `manager` |

---

## 🔍 Testing Commands

```sql
-- Test order notification
INSERT INTO orders (order_number, cashier_id, total_amount, status)
VALUES ('TEST-001', 'user-id', 100, 'pending');

-- Test low stock
UPDATE products SET current_stock = 3 WHERE id = 'product-id';

-- Test kitchen ready
UPDATE kitchen_orders SET status = 'ready' WHERE id = 'kitchen-order-id';

-- View all triggers
SELECT * FROM pg_trigger WHERE tgname LIKE 'trigger_notify%';

-- Count notifications
SELECT type, COUNT(*) FROM notifications GROUP BY type;
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| No notifications | Enable Realtime in Supabase |
| Sound not playing | Check mute toggle, browser autoplay |
| Wrong user sees notif | Check role targeting in RLS |
| Triggers not firing | Verify triggers enabled in DB |
| Old notifs not cleaning | Run `cleanup_old_notifications()` |

---

## ⚡ Performance Tips

```typescript
// ✅ Good: Use role targeting
role: 'cashier'

// ❌ Avoid: Broadcasting to all users
user_id: null, role: null

// ✅ Good: Limit notifications
limit: 50

// ❌ Avoid: Loading thousands
limit: 10000

// ✅ Good: Filter unread
unreadOnly: true

// ✅ Good: Use indexes
WHERE user_id = 'xxx' AND is_read = false
```

---

## 📝 Best Practices Checklist

- [ ] Use appropriate priority levels
- [ ] Target specific roles when possible
- [ ] Keep messages under 200 characters
- [ ] Test triggers after schema changes
- [ ] Monitor unread count trends
- [ ] Clean up test notifications
- [ ] Don't overuse URGENT priority
- [ ] Add reference_id for linking
- [ ] Use expires_at for temporary alerts
- [ ] Test realtime subscriptions

---

## 🎨 Priority Colors

```typescript
const colors = {
  urgent: 'bg-red-50 text-red-600',      // Critical
  high: 'bg-orange-50 text-orange-600',  // Important
  normal: 'bg-blue-50 text-blue-600',    // Regular
  low: 'bg-gray-50 text-gray-600',       // Info
};
```

---

## 🔗 File Locations

```
src/
├── models/
│   ├── enums/NotificationType.ts
│   └── entities/Notification.ts
├── data/repositories/NotificationRepository.ts
├── core/services/notifications/NotificationService.ts
├── lib/contexts/NotificationContext.tsx
├── views/shared/ui/NotificationBell.tsx
└── app/api/notifications/

migrations/
└── create_notifications_table.sql

docs/
├── NOTIFICATION_SYSTEM_GUIDE.md
└── NOTIFICATION_SETUP_INSTRUCTIONS.md
```

---

## 📞 Quick Help

```bash
# View logs
# Browser console for realtime events
# Supabase logs for database triggers

# Test realtime connection
supabase.channel('test').subscribe()

# Verify RLS
SELECT * FROM notifications WHERE user_id = 'your-id';

# Check trigger status
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE 'trigger_notify%';
```

---

## 🚀 Production Checklist

- [ ] Migration executed
- [ ] Realtime enabled
- [ ] Triggers verified
- [ ] RLS policies tested
- [ ] Indexes created
- [ ] Cleanup job scheduled
- [ ] Browser permissions handled
- [ ] Error handling tested
- [ ] Performance monitored
- [ ] Documentation reviewed

---

**Last Updated**: 2025-10-06  
**Version**: 1.0  
**Status**: Production Ready
