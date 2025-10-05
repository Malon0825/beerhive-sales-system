# Notification System - Testing & Implementation Guide

## 🎯 Overview

The notification system is **fully implemented** and ready for testing. This guide will help you set up, test, and verify all features.

---

## 📋 Pre-Testing Checklist

### 1. Install Dependencies

```bash
npm install
```

**Verify**: Check that `@radix-ui/react-scroll-area` is installed in `package.json`.

### 2. Run Database Migration

**IMPORTANT**: The migration must be executed before testing!

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file: `migrations/create_notifications_table.sql`
3. Copy the entire SQL content
4. Paste into Supabase SQL Editor
5. Click **RUN**
6. Verify success message

**Expected Output**:
- ✅ `notifications` table created
- ✅ 4 triggers created
- ✅ RLS policies enabled
- ✅ Helper functions created

### 3. Enable Realtime

1. Go to **Supabase Dashboard** → **Database** → **Replication**
2. Find `notifications` table
3. Toggle **Enable** for Realtime
4. Save changes

### 4. Regenerate Database Types

After running the migration, update your TypeScript types:

```bash
# If using Supabase CLI
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/models/database.types.ts
```

This will resolve all TypeScript errors in `NotificationRepository.ts`.

### 5. Notification Sound (Optional)

Follow instructions in `public/sounds/README.md` to add a notification sound, or skip this step for visual-only notifications.

---

## 🧪 Testing Scenarios

### Test 1: Order Created Notification

**Target Role**: Cashier

**Steps**:
1. Login as a **Cashier** user
2. Navigate to POS/Sales page
3. Create a new order with items
4. Submit the order
5. Check the notification bell icon in the top-right corner

**Expected Result**:
- ✅ Bell icon shows unread badge (red circle with number)
- ✅ Ping animation appears on the bell
- ✅ Notification sound plays (if enabled)
- ✅ Clicking bell shows: "New Order - Order #XXX created - Total: ₱XXX.XX"
- ✅ Notification has blue background (unread)
- ✅ Order icon visible

### Test 2: Order Completed Notification

**Target Role**: Cashier

**Steps**:
1. Login as **Cashier**
2. Complete a pending order (mark as completed)
3. Check notification bell

**Expected Result**:
- ✅ Notification shows: "Order Completed - Order #XXX completed - ₱XXX.XX"
- ✅ Unread count increases by 1

### Test 3: Food Ready Notification

**Target Role**: Waiter

**Steps**:
1. Create an order with food items
2. Login as **Kitchen** user
3. Mark food items as "Ready"
4. Logout and login as **Waiter**
5. Check notifications

**Expected Result**:
- ✅ Notification shows: "Food Ready - Order #XXX is ready for delivery"
- ✅ Kitchen/Utensils icon visible
- ✅ Notification priority: Normal (blue)

### Test 4: Beverage Ready Notification

**Target Role**: Waiter

**Steps**:
1. Create an order with beverage items
2. Login as **Bartender** user
3. Mark beverages as "Ready"
4. Logout and login as **Waiter**
5. Check notifications

**Expected Result**:
- ✅ Notification shows: "Beverage Ready - Order #XXX drinks are ready for delivery"
- ✅ Glass/Beverage icon visible

### Test 5: Low Stock Notification

**Target Role**: Manager

**Steps**:
1. Login as **Manager**
2. Go to **Inventory/Products**
3. Find a product with reorder point (e.g., reorder_point = 10)
4. Manually update stock to below reorder point:
   ```sql
   UPDATE products 
   SET current_stock = 5 
   WHERE id = 'PRODUCT_ID';
   ```
5. Check notifications

**Expected Result**:
- ✅ Notification shows: "Low Stock Alert - [Product Name] is running low (5.00 remaining)"
- ✅ Priority: HIGH (orange background)
- ✅ Package icon visible

### Test 6: Out of Stock Notification

**Target Role**: Manager

**Steps**:
1. Login as **Manager**
2. Update a product stock to 0:
   ```sql
   UPDATE products 
   SET current_stock = 0 
   WHERE id = 'PRODUCT_ID';
   ```
3. Check notifications

**Expected Result**:
- ✅ Notification shows: "OUT OF STOCK - [Product Name] is out of stock!"
- ✅ Priority: URGENT (red background)
- ✅ More prominent alert

---

## 🎛️ UI Feature Testing

### Test 7: Mark as Read

**Steps**:
1. Have unread notifications
2. Click notification bell
3. Hover over a notification
4. Click the checkmark icon (✓) on the right

**Expected Result**:
- ✅ Blue background disappears
- ✅ Blue dot indicator disappears
- ✅ Unread count decreases by 1

### Test 8: Mark All as Read

**Steps**:
1. Have multiple unread notifications
2. Click notification bell
3. Click the double-check icon (✓✓) in the header

**Expected Result**:
- ✅ All notifications marked as read
- ✅ Unread badge disappears
- ✅ Ping animation stops

### Test 9: Mute Functionality

**Steps**:
1. Click notification bell
2. Click the bell icon in the header (mute toggle)
3. Create a new order (trigger notification)
4. Observe behavior

**Expected Result**:
- ✅ Bell icon changes to "bell with slash" (muted state)
- ✅ No sound plays for new notifications
- ✅ Visual notifications still appear
- ✅ Mute state persists after page refresh

### Test 10: Delete Notification

**Steps**:
1. Have notifications
2. Click notification bell
3. Hover over a notification
4. Click the X icon on the right

**Expected Result**:
- ✅ Notification immediately removed from list
- ✅ Unread count updates if it was unread

### Test 11: Real-time Updates

**Steps**:
1. Open two browser windows
2. Login as **Cashier** in Window 1
3. Login as different user in Window 2
4. In Window 2, create an order
5. Observe Window 1 (Cashier)

**Expected Result**:
- ✅ Notification appears **instantly** in Window 1
- ✅ No page refresh needed
- ✅ Unread count updates automatically
- ✅ Ping animation triggers

---

## 🐛 Troubleshooting

### Issue: No Notifications Appear

**Solutions**:
1. Verify migration was executed successfully
2. Check Realtime is enabled for `notifications` table
3. Check browser console for errors
4. Verify user role matches notification target role

**Verify Triggers**:
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname LIKE 'trigger_notify%';
```

Should show 4 triggers enabled.

### Issue: TypeScript Errors

**Solution**:
Regenerate database types after running migration:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/models/database.types.ts
```

### Issue: Sound Not Playing

**Solutions**:
1. Check browser autoplay policy (user must interact with page first)
2. Verify notification is not muted
3. Check that sound file exists at `/public/sounds/notification.mp3`
4. Try a different browser (Chrome/Firefox)

### Issue: Wrong User Sees Notification

**Check Role Targeting**:
- Order notifications → Cashiers
- Kitchen/Bartender notifications → Waiters
- Inventory notifications → Managers

**Verify User Role**:
```sql
SELECT id, username, role FROM users WHERE id = 'USER_ID';
```

### Issue: Real-time Not Working

**Solutions**:
1. Check Supabase Realtime is enabled
2. Verify no firewall/network issues
3. Check browser console for WebSocket errors
4. Try refreshing the page

---

## 🔍 Database Verification

### Check Notifications

```sql
-- View all notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Count by type
SELECT type, COUNT(*) as count FROM notifications GROUP BY type;

-- Unread count for specific user
SELECT COUNT(*) FROM notifications 
WHERE (user_id = 'USER_ID' OR role = 'USER_ROLE') 
AND is_read = false;
```

### Check Triggers

```sql
-- Verify all triggers exist
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname LIKE 'trigger_notify%'
ORDER BY tgname;
```

### Manual Notification Test

```sql
-- Create a test notification
INSERT INTO notifications (
    type,
    title,
    message,
    priority,
    role
) VALUES (
    'system_alert',
    'Test Notification',
    'This is a test message',
    'normal',
    'cashier'
);
```

---

## 📊 Performance Testing

### Load Test

1. Create 50+ notifications
2. Check loading speed
3. Verify pagination works
4. Check scroll performance

### Cleanup Test

```sql
-- Run cleanup function
SELECT cleanup_old_notifications();

-- Verify old read notifications are deleted
SELECT COUNT(*) FROM notifications 
WHERE is_read = true 
AND read_at < NOW() - INTERVAL '30 days';
```

---

## ✅ Final Checklist

Before deploying to production:

- [ ] Migration executed successfully
- [ ] Realtime enabled for notifications table
- [ ] All 4 triggers verified and enabled
- [ ] RLS policies tested with different roles
- [ ] TypeScript errors resolved
- [ ] Order notifications working
- [ ] Kitchen/Bartender notifications working
- [ ] Inventory notifications working
- [ ] Mark as read functionality working
- [ ] Mark all as read working
- [ ] Mute toggle persists
- [ ] Delete notification works
- [ ] Real-time updates instant
- [ ] UI displays correctly on mobile
- [ ] Browser notification permissions handled
- [ ] Sound plays (if enabled)
- [ ] No console errors
- [ ] Performance acceptable with 50+ notifications

---

## 📝 Integration Points

### Where Notifications Are Triggered

1. **Orders** → `src/app/api/orders/route.ts` or OrderRepository
2. **Kitchen** → `src/app/api/kitchen/route.ts` or KitchenOrderRepository
3. **Inventory** → Database trigger (automatic on stock update)

### Manually Triggering Notifications

If needed, you can manually create notifications in your code:

```typescript
import { NotificationService } from '@/core/services/notifications/NotificationService';

// In your API route or service
await NotificationService.notifyOrderCreated(
  orderId,
  orderNumber,
  totalAmount
);
```

---

## 🚀 Deployment Notes

### Environment Variables

Ensure these are set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### Database

1. Run migration on production database
2. Enable Realtime on production
3. Monitor notification creation rate
4. Set up cleanup job (cron)

### Monitoring

Monitor these metrics:
- Notification creation rate
- Realtime connection status
- Unread count trends
- User engagement with notifications

---

## 📚 Additional Resources

- [NOTIFICATION_SYSTEM_GUIDE.md](./docs/NOTIFICATION_SYSTEM_GUIDE.md) - Full documentation
- [NOTIFICATION_QUICK_REFERENCE.md](./docs/NOTIFICATION_QUICK_REFERENCE.md) - Quick reference
- [NOTIFICATION_SETUP_INSTRUCTIONS.md](./docs/NOTIFICATION_SETUP_INSTRUCTIONS.md) - Setup guide

---

## 🎉 Success Criteria

Your notification system is working correctly when:

✅ Notifications appear instantly without page refresh  
✅ All user roles see appropriate notifications  
✅ Sound plays subtly (if enabled)  
✅ Visual feedback is clear but not distracting  
✅ Mark as read works reliably  
✅ Mute state persists across sessions  
✅ No performance degradation  
✅ Mobile UI is responsive  

---

**Last Updated**: 2025-10-06  
**Status**: Ready for Testing  
**Version**: 1.0
