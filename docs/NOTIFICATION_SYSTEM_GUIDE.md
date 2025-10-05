# Notification System - Implementation Guide

**Version**: 1.0  
**Last Updated**: 2025-10-06  
**Author**: AI Development Team

---

## Overview

The notification system provides real-time alerts for critical events in the BeerHive POS system including:
- Order transactions (created, completed, voided)
- Kitchen/Bartender status updates (ready, delivered)
- Inventory alerts (low stock, out of stock, reorder points)
- System alerts

### Key Features

✅ **Real-time Updates** - Supabase Realtime for instant notifications  
✅ **Role-based Targeting** - Notifications sent to specific roles or users  
✅ **Subtle UI** - Non-intrusive bell icon with badge counter  
✅ **Mute Function** - Users can mute notification sounds  
✅ **Mark as Read** - Individual and bulk read actions  
✅ **Priority Levels** - Urgent, High, Normal, Low priorities  
✅ **Auto-cleanup** - Old read notifications are automatically removed  
✅ **Browser Notifications** - Optional browser push notifications

---

## Architecture

### Database Layer

#### Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority notification_priority DEFAULT 'normal',
    reference_id UUID,
    reference_table VARCHAR(100),
    user_id UUID REFERENCES users(id),
    role user_role,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
```

#### Automatic Triggers
- **Order Created** → Notifies cashiers
- **Order Completed** → Notifies cashiers
- **Kitchen Order Ready** → Notifies waiters
- **Low Stock** → Notifies managers
- **Out of Stock** → Urgent notification to managers

### Application Layer

```
┌─────────────────────────────────────────┐
│        NotificationBell (UI)            │
│  - Bell icon with unread badge          │
│  - Dropdown with notification list      │
│  - Mute toggle, Mark all read           │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      NotificationContext                │
│  - State management                     │
│  - Real-time subscription               │
│  - Action handlers                      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      NotificationService                │
│  - Business logic                       │
│  - Helper methods                       │
│  - Sound/browser notifications          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│    NotificationRepository               │
│  - Database queries                     │
│  - CRUD operations                      │
└─────────────────────────────────────────┘
```

---

## Installation & Setup

### 1. Install Dependencies

Run the following command to install the new package:

```bash
npm install @radix-ui/react-scroll-area
```

### 2. Run Database Migration

Execute the migration file in Supabase SQL Editor:

```sql
-- File: migrations/create_notifications_table.sql
```

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Open the migration file
3. Execute the SQL
4. Verify tables and triggers created successfully

### 3. Enable Realtime for Notifications Table

In Supabase Dashboard:
1. Go to **Database** → **Replication**
2. Find `notifications` table
3. Enable **Realtime**
4. Save changes

### 4. Verify Installation

Run this query to verify:
```sql
SELECT COUNT(*) FROM notifications;
SELECT * FROM pg_trigger WHERE tgname LIKE 'trigger_notify%';
```

---

## Usage

### Accessing Notifications

Notifications are automatically available in the dashboard via the bell icon in the header.

### Using NotificationContext

```tsx
import { useNotifications } from '@/lib/contexts/NotificationContext';

function MyComponent() {
  const {
    notifications,      // Array of notifications
    unreadCount,        // Number of unread notifications
    isMuted,           // Mute state
    loading,           // Loading state
    markAsRead,        // Mark single as read
    markAllAsRead,     // Mark all as read
    deleteNotification, // Delete notification
    toggleMute,        // Toggle mute
  } = useNotifications();

  return (
    <div>
      <p>Unread: {unreadCount}</p>
    </div>
  );
}
```

### Creating Notifications Programmatically

```tsx
import { NotificationService } from '@/core/services/notifications/NotificationService';
import { NotificationPriority } from '@/models/enums/NotificationType';

// Order notification
await NotificationService.notifyOrderCreated(
  orderId,
  orderNumber,
  totalAmount
);

// Low stock notification
await NotificationService.notifyLowStock(
  productId,
  productName,
  currentStock,
  reorderPoint
);

// Custom system alert
await NotificationService.notifySystemAlert(
  'System Maintenance',
  'System will be down for maintenance at 2 AM',
  NotificationPriority.HIGH,
  'admin' // Target role
);
```

---

## Notification Types

| Type | Description | Target Role | Priority |
|------|-------------|-------------|----------|
| `ORDER_CREATED` | New order placed | Cashier | Normal |
| `ORDER_COMPLETED` | Order completed | Cashier | Normal |
| `ORDER_VOIDED` | Order voided | Cashier, Manager | Normal |
| `FOOD_READY` | Food ready for delivery | Waiter | Normal |
| `FOOD_DELIVERED` | Food delivered | Cashier | Normal |
| `BEVERAGE_READY` | Beverage ready | Waiter | Normal |
| `BEVERAGE_DELIVERED` | Beverage delivered | Cashier | Normal |
| `LOW_STOCK` | Product low on stock | Manager | High |
| `OUT_OF_STOCK` | Product out of stock | Manager | Urgent |
| `REORDER_POINT` | Reorder point reached | Manager | Normal |
| `SYSTEM_ALERT` | System notification | Custom | Variable |

---

## Priority Levels

### Visual Indicators

| Priority | Color | Use Case |
|----------|-------|----------|
| **URGENT** | Red | Out of stock, critical errors |
| **HIGH** | Orange | Low stock, important updates |
| **NORMAL** | Blue | Regular transactions |
| **LOW** | Gray | Informational messages |

### Sound & Visual Behavior

- **Urgent**: Prominent notification, browser alert
- **High**: Standard notification sound
- **Normal**: Subtle ping sound
- **Low**: Visual only (no sound)

---

## Mute Functionality

Users can mute notifications to prevent sounds and browser notifications:

```tsx
const { isMuted, toggleMute } = useNotifications();

<button onClick={toggleMute}>
  {isMuted ? 'Unmute' : 'Mute'}
</button>
```

Mute state is persisted in `localStorage` per user device.

---

## API Endpoints

### GET /api/notifications
Get notifications for current user

**Query Parameters:**
- `userId` (required): User ID
- `limit` (optional): Number of notifications (default: 50)
- `unreadOnly` (optional): Filter unread only

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "order_created",
      "title": "New Order",
      "message": "Order #1234 created - Total: ₱450.00",
      "priority": "normal",
      "is_read": false,
      "created_at": "2025-10-06T00:00:00Z"
    }
  ]
}
```

### GET /api/notifications/count
Get unread count

**Query Parameters:**
- `userId` (required): User ID

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

### PATCH /api/notifications/[notificationId]
Mark notification as read

### DELETE /api/notifications/[notificationId]
Delete notification

### POST /api/notifications/mark-all-read
Mark all as read

**Body:**
```json
{
  "userId": "uuid"
}
```

---

## Customization

### Adding New Notification Types

1. **Update Enum**
```typescript
// src/models/enums/NotificationType.ts
export enum NotificationType {
  // ... existing types
  NEW_TYPE = 'new_type',
}
```

2. **Update Database Enum**
```sql
ALTER TYPE notification_type ADD VALUE 'new_type';
```

3. **Create Service Method**
```typescript
// src/core/services/notifications/NotificationService.ts
static async notifyNewType(
  referenceId: string,
  message: string
): Promise<Notification> {
  return NotificationRepository.create({
    type: NotificationType.NEW_TYPE,
    title: 'New Type',
    message,
    priority: NotificationPriority.NORMAL,
    reference_id: referenceId,
    role: 'manager',
  });
}
```

### Customizing Notification Icons

Edit the icon mapping in `NotificationBell.tsx`:

```typescript
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.NEW_TYPE:
      return CustomIcon; // Import from lucide-react
    // ... other cases
  }
};
```

---

## Troubleshooting

### Notifications Not Appearing

1. **Check Realtime Connection**
```javascript
// Browser console
supabase.channel('test').subscribe((status) => {
  console.log('Realtime status:', status);
});
```

2. **Verify RLS Policies**
```sql
SELECT * FROM notifications 
WHERE user_id = 'your-user-id' OR role = 'your-role';
```

3. **Check Browser Console**
Look for errors related to Supabase or realtime subscriptions.

### Sound Not Playing

1. Check browser autoplay policy
2. Verify notification is not muted
3. Ensure audio file exists at `/sounds/notification.mp3`

### Notifications Not Triggering

1. **Verify Triggers Exist**
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname LIKE 'trigger_notify%';
```

2. **Test Trigger Manually**
```sql
INSERT INTO orders (order_number, total_amount, cashier_id, status)
VALUES ('TEST-001', 100, 'user-id', 'pending');
```

---

## Performance Considerations

### Auto-cleanup

Old read notifications are automatically cleaned up:
- Read notifications older than 30 days are deleted
- Expired notifications are removed daily

### Pagination

- Default limit: 50 notifications
- Increase only if needed
- Use unread filter for better performance

### Realtime Subscriptions

- One subscription per user session
- Automatically cleaned up on logout
- Reconnects automatically on connection loss

---

## Best Practices

### Do's ✅
- Use appropriate priority levels
- Target specific roles when possible
- Keep messages concise and clear
- Use reference IDs for linking
- Test notification triggers

### Don'ts ❌
- Don't create notifications for every minor event
- Don't use URGENT priority excessively
- Don't send notifications without targets
- Don't store sensitive data in notifications
- Don't forget to test realtime updates

---

## Testing

### Manual Testing Checklist

- [ ] Create an order → Check order_created notification
- [ ] Complete an order → Check order_completed notification
- [ ] Mark kitchen order as ready → Check food_ready notification
- [ ] Reduce stock below reorder point → Check low_stock notification
- [ ] Mark notification as read → Verify UI update
- [ ] Mark all as read → Verify all cleared
- [ ] Toggle mute → Verify sound stops
- [ ] Delete notification → Verify removal
- [ ] Test on different roles
- [ ] Test browser notifications permission

### Automated Tests

```typescript
// Example test
describe('NotificationService', () => {
  it('should create order notification', async () => {
    const notification = await NotificationService.notifyOrderCreated(
      'order-id',
      'ORD-001',
      500
    );
    
    expect(notification.type).toBe(NotificationType.ORDER_CREATED);
    expect(notification.priority).toBe(NotificationPriority.NORMAL);
  });
});
```

---

## Migration from Old System

If upgrading from a previous notification system:

1. **Export existing notifications**
2. **Map to new notification types**
3. **Import using SQL**
4. **Update frontend references**
5. **Test thoroughly**

---

## Support & Maintenance

### Monitoring

Monitor notification system health:
- Check notification creation rate
- Monitor realtime connection status
- Track unread count trends
- Review cleanup job performance

### Logs

Key log locations:
- Browser console: Realtime events
- Supabase logs: Database triggers
- Server logs: API endpoints

---

## Future Enhancements

Potential improvements:
- [ ] Email notifications for critical alerts
- [ ] SMS notifications for urgent issues
- [ ] Notification categories/filters
- [ ] Custom notification preferences per user
- [ ] Notification scheduling
- [ ] Rich media notifications (images, actions)
- [ ] Notification analytics dashboard

---

## Conclusion

The notification system provides a robust, real-time alerting mechanism that keeps users informed without being intrusive. The subtle UI design, mute functionality, and role-based targeting ensure users receive relevant information efficiently.

For questions or issues, refer to the codebase documentation or contact the development team.

---

**Related Documentation:**
- [Database Structure](./Database%20Structure.sql)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Realtime Setup](./REALTIME_SETUP.md)
