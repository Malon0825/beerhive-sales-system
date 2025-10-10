# 🧪 Notification System - Testing Checklist

Use this checklist to verify that the notification system is working correctly.

---

## 📋 Pre-Testing Setup

### ✅ Installation Checklist

- [ ] **Dependencies installed**
  ```bash
  npm install @radix-ui/react-scroll-area
  ```

- [ ] **Database migration executed**
  - File: `migrations/create_notifications_table.sql`
  - Location: Supabase Dashboard → SQL Editor
  - Status: All queries executed successfully

- [ ] **Realtime enabled**
  - Location: Supabase Dashboard → Database → Replication
  - Table: `notifications`
  - Status: Realtime toggle is ON

- [ ] **Development server running**
  ```bash
  npm run dev
  ```

- [ ] **User logged in**
  - Can see dashboard
  - Bell icon visible in top-right header

---

## 🔔 UI Component Tests

### Test 1: Notification Bell Icon

- [ ] Bell icon appears in header (top-right corner)
- [ ] Icon is clickable
- [ ] Dropdown opens when clicked
- [ ] Dropdown closes when clicking outside
- [ ] UI is responsive on mobile

**Expected Result**: Bell icon visible and functional

---

### Test 2: Empty State

- [ ] Click bell icon with no notifications
- [ ] See "No notifications" message
- [ ] See "You're all caught up!" text
- [ ] Empty state icon displays correctly

**Expected Result**: Clean empty state UI

---

### Test 3: Unread Badge

- [ ] Create a test notification (see SQL below)
- [ ] Red badge appears on bell icon
- [ ] Badge shows correct number (1)
- [ ] Badge updates in real-time

```sql
-- Create test notification
INSERT INTO notifications (type, title, message, role)
VALUES ('system_alert', 'Test', 'This is a test', 'cashier');
```

**Expected Result**: Badge shows unread count

---

### Test 4: Notification List

- [ ] Click bell icon
- [ ] See notification in list
- [ ] Title displays correctly
- [ ] Message displays correctly
- [ ] Timestamp shows (e.g., "Just now")
- [ ] Unread indicator (blue dot) visible

**Expected Result**: Notification displays with all information

---

### Test 5: Mark as Read

- [ ] Hover over unread notification
- [ ] See checkmark (✓) button appear
- [ ] Click checkmark button
- [ ] Blue dot disappears
- [ ] Badge count decreases
- [ ] Notification background changes to gray

**Expected Result**: Notification marked as read, UI updates

---

### Test 6: Mark All as Read

- [ ] Create multiple test notifications (3-5)
- [ ] Badge shows correct count
- [ ] Click "CheckCheck" icon in header
- [ ] All notifications marked as read
- [ ] Badge disappears
- [ ] All blue dots gone

**Expected Result**: All marked as read simultaneously

---

### Test 7: Delete Notification

- [ ] Hover over notification
- [ ] See X button appear
- [ ] Click X button
- [ ] Notification removed from list
- [ ] Badge count updates (if was unread)

**Expected Result**: Notification deleted, UI updates

---

### Test 8: Mute Toggle

- [ ] Click bell icon in dropdown header
- [ ] Icon changes to BellOff (🔕)
- [ ] Create new test notification
- [ ] No sound plays
- [ ] Notification still appears in list
- [ ] Click bell icon again to unmute
- [ ] Icon changes back to Bell (🔔)

**Expected Result**: Mute state toggles, persists after refresh

---

### Test 9: Scroll Functionality

- [ ] Create 20+ test notifications
- [ ] Dropdown list becomes scrollable
- [ ] Scrollbar appears
- [ ] Can scroll through all notifications
- [ ] No UI glitches

**Expected Result**: List scrolls smoothly with many items

---

## 📊 Notification Type Tests

### Test 10: Order Created Notification

```sql
-- Create test order
INSERT INTO orders (
    order_number,
    cashier_id,
    subtotal,
    total_amount,
    status,
    payment_method
) VALUES (
    'TEST-001',
    (SELECT id FROM users WHERE role = 'cashier' LIMIT 1),
    500.00,
    500.00,
    'pending',
    'cash'
);
```

- [ ] Notification appears automatically
- [ ] Type: "New Order"
- [ ] Message includes order number
- [ ] Message includes total amount
- [ ] Target: Cashiers
- [ ] Priority: Normal (blue)

**Expected Result**: Order notification created automatically

---

### Test 11: Order Completed Notification

```sql
-- Complete test order
UPDATE orders 
SET status = 'completed', completed_at = NOW()
WHERE order_number = 'TEST-001';
```

- [ ] Notification appears automatically
- [ ] Type: "Order Completed"
- [ ] Message includes order number
- [ ] Message includes total amount
- [ ] Target: Cashiers
- [ ] Priority: Normal (blue)

**Expected Result**: Completion notification triggered by status change

---

### Test 12: Low Stock Notification

```sql
-- Trigger low stock
UPDATE products 
SET current_stock = 3
WHERE current_stock > 5 
AND reorder_point = 10
LIMIT 1;
```

- [ ] Notification appears automatically
- [ ] Type: "Low Stock Alert"
- [ ] Message includes product name
- [ ] Message includes current stock level
- [ ] Target: Managers
- [ ] Priority: High (orange)

**Expected Result**: Low stock alert triggered by stock update

---

### Test 13: Out of Stock Notification (URGENT)

```sql
-- Trigger out of stock
UPDATE products 
SET current_stock = 0
WHERE current_stock > 0
LIMIT 1;
```

- [ ] Notification appears automatically
- [ ] Type: "OUT OF STOCK"
- [ ] Message: "{Product} is out of stock!"
- [ ] Target: Managers
- [ ] Priority: Urgent (red)
- [ ] More prominent visual styling

**Expected Result**: Urgent notification for critical stock issue

---

### Test 14: Kitchen Order Ready Notification

```sql
-- Mark kitchen order as ready
UPDATE kitchen_orders 
SET status = 'ready', ready_at = NOW()
WHERE status = 'pending' 
AND destination = 'kitchen'
LIMIT 1;
```

- [ ] Notification appears automatically
- [ ] Type: "Food Ready"
- [ ] Message includes order number
- [ ] Target: Waiters
- [ ] Priority: Normal

**Expected Result**: Waiter notified when food is ready

---

### Test 15: Custom System Alert

```sql
-- Create custom alert
INSERT INTO notifications (
    type,
    title,
    message,
    priority,
    role
) VALUES (
    'system_alert',
    'Test Alert',
    'This is a custom system alert',
    'high',
    'admin'
);
```

- [ ] Notification appears
- [ ] Custom title displays
- [ ] Custom message displays
- [ ] Target role receives it
- [ ] Priority level correct

**Expected Result**: Manual notification created successfully

---

## ⚡ Real-time Tests

### Test 16: Real-time Updates

- [ ] Open app in two browser windows
- [ ] Login as same user in both
- [ ] Create notification in SQL Editor
- [ ] Notification appears in BOTH windows
- [ ] No page refresh needed
- [ ] Badge updates in both windows

**Expected Result**: Real-time sync across sessions

---

### Test 17: Role-based Targeting

- [ ] Login as Cashier
- [ ] Create notification targeting "manager"
- [ ] Cashier does NOT see notification
- [ ] Login as Manager
- [ ] Manager DOES see notification

```sql
INSERT INTO notifications (type, title, message, role)
VALUES ('system_alert', 'Manager Only', 'Test', 'manager');
```

**Expected Result**: Only target role sees notification

---

### Test 18: User-specific Notification

```sql
-- Replace with actual user ID
INSERT INTO notifications (type, title, message, user_id)
VALUES ('system_alert', 'Personal', 'Test', 'YOUR_USER_ID');
```

- [ ] Login as target user
- [ ] User sees notification
- [ ] Login as different user
- [ ] Different user does NOT see it

**Expected Result**: Only target user sees notification

---

## 🎨 Visual Tests

### Test 19: Priority Colors

Create notifications with different priorities:

```sql
INSERT INTO notifications (type, title, message, priority, role) VALUES
('system_alert', 'Urgent', 'Test', 'urgent', 'cashier'),
('system_alert', 'High', 'Test', 'high', 'cashier'),
('system_alert', 'Normal', 'Test', 'normal', 'cashier'),
('system_alert', 'Low', 'Test', 'low', 'cashier');
```

- [ ] Urgent: Red background/icon
- [ ] High: Orange background/icon
- [ ] Normal: Blue background/icon
- [ ] Low: Gray background/icon

**Expected Result**: Each priority has distinct color

---

### Test 20: Timestamp Display

- [ ] Create notification
- [ ] Immediately shows "Just now"
- [ ] Wait 2 minutes, shows "2m ago"
- [ ] Wait longer, shows "1h ago"
- [ ] Old notifications show date

**Expected Result**: Relative timestamps update correctly

---

### Test 21: Icon Mapping

- [ ] Order notification shows shopping cart icon
- [ ] Food notification shows utensils icon
- [ ] Beverage notification shows glass icon
- [ ] Stock notification shows package icon

**Expected Result**: Each type has appropriate icon

---

## 🔧 Functional Tests

### Test 22: Pagination/Limit

```sql
-- Create 100 test notifications
INSERT INTO notifications (type, title, message, role)
SELECT 
    'system_alert',
    'Test ' || generate_series,
    'Message ' || generate_series,
    'cashier'
FROM generate_series(1, 100);
```

- [ ] Only 50 notifications load initially
- [ ] UI remains responsive
- [ ] No performance issues
- [ ] Scrolling works smoothly

**Expected Result**: System handles many notifications

---

### Test 23: Persistence After Refresh

- [ ] Create notification
- [ ] Mark as read
- [ ] Refresh page
- [ ] Notification still marked as read
- [ ] Mute state persists
- [ ] Unread count accurate

**Expected Result**: State persists after reload

---

### Test 24: Sound Notification

- [ ] Unmute notifications
- [ ] Click somewhere on page (browser autoplay)
- [ ] Create new notification
- [ ] Subtle sound plays
- [ ] Mute notifications
- [ ] Create another notification
- [ ] No sound plays

**Expected Result**: Sound plays when unmuted only

---

### Test 25: Browser Notification

- [ ] Allow browser notifications permission
- [ ] Create new notification
- [ ] Browser popup appears
- [ ] Shows title and message
- [ ] Clicking opens app
- [ ] Works even when tab not focused

**Expected Result**: Browser notification displays

---

## 🗄️ Database Tests

### Test 26: Triggers Verification

```sql
-- Verify all triggers enabled
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname LIKE 'trigger_notify%';
```

- [ ] `trigger_notify_new_order` - enabled
- [ ] `trigger_notify_order_completed` - enabled
- [ ] `trigger_notify_kitchen_order_ready` - enabled
- [ ] `trigger_notify_low_stock` - enabled

**Expected Result**: All 4 triggers enabled

---

### Test 27: RLS Policies

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

- [ ] 3 policies exist
- [ ] Users can view their own
- [ ] Users can update their own
- [ ] Service role can insert

**Expected Result**: RLS properly configured

---

### Test 28: Auto-cleanup

```sql
-- Create old read notification
INSERT INTO notifications (
    type, title, message, role, 
    is_read, read_at, created_at
) VALUES (
    'system_alert', 'Old', 'Test', 'cashier',
    true, NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days'
);

-- Run cleanup
SELECT cleanup_old_notifications();

-- Verify deleted
SELECT * FROM notifications WHERE title = 'Old';
```

- [ ] Old notification created
- [ ] Cleanup function runs
- [ ] Old notification deleted
- [ ] Recent notifications remain

**Expected Result**: Old notifications cleaned up

---

## 🚀 Performance Tests

### Test 29: Query Performance

```sql
-- Test query speed
EXPLAIN ANALYZE
SELECT * FROM notifications 
WHERE role = 'cashier' 
AND is_read = false
ORDER BY created_at DESC 
LIMIT 50;
```

- [ ] Query uses indexes
- [ ] Execution time < 10ms
- [ ] No sequential scans
- [ ] Index scan on role/is_read

**Expected Result**: Fast queries with index usage

---

### Test 30: Realtime Connection

```javascript
// In browser console
supabase.channel('test').subscribe((status) => {
  console.log('Realtime status:', status);
});
```

- [ ] Status: "SUBSCRIBED"
- [ ] Connection established
- [ ] No errors in console
- [ ] Events received

**Expected Result**: Realtime connection successful

---

## 📱 Mobile Tests

### Test 31: Mobile Responsive

- [ ] Open on mobile device/emulator
- [ ] Bell icon visible
- [ ] Click opens dropdown
- [ ] Dropdown fills width appropriately
- [ ] Scrolling works
- [ ] Touch interactions work
- [ ] No horizontal scroll

**Expected Result**: Fully functional on mobile

---

## 🎯 Integration Tests

### Test 32: Complete Order Flow

1. [ ] Create order → Notification appears
2. [ ] Kitchen marks ready → Notification appears
3. [ ] Waiter delivers → Notification appears
4. [ ] Order completed → Notification appears
5. [ ] All notifications have correct targets
6. [ ] All timestamps correct

**Expected Result**: Full notification flow works

---

### Test 33: Inventory Flow

1. [ ] Stock above reorder point
2. [ ] Sell items, stock decreases
3. [ ] Stock hits reorder point → Notification
4. [ ] Continue selling
5. [ ] Stock hits 0 → URGENT notification
6. [ ] Restock product
7. [ ] Notifications stop

**Expected Result**: Inventory alerts trigger correctly

---

## ✅ Final Verification

### All Tests Passed?

- [ ] All UI tests passed (Tests 1-9)
- [ ] All notification type tests passed (Tests 10-15)
- [ ] All real-time tests passed (Tests 16-18)
- [ ] All visual tests passed (Tests 19-21)
- [ ] All functional tests passed (Tests 22-25)
- [ ] All database tests passed (Tests 26-28)
- [ ] All performance tests passed (Tests 29-30)
- [ ] Mobile tests passed (Test 31)
- [ ] Integration tests passed (Tests 32-33)

### Cleanup Test Data

```sql
-- Remove test notifications
DELETE FROM notifications WHERE title LIKE '%Test%';

-- Remove test orders
DELETE FROM orders WHERE order_number LIKE 'TEST-%';

-- Reset product stock
UPDATE products SET current_stock = 100 WHERE current_stock < 10;
```

---

## 📝 Test Results

**Date Tested**: _______________  
**Tested By**: _______________  
**Total Tests**: 33  
**Passed**: _____ / 33  
**Failed**: _____ / 33  

**Issues Found**:
_______________________________________
_______________________________________
_______________________________________

**Notes**:
_______________________________________
_______________________________________
_______________________________________

---

## 🎉 Sign-off

- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Documentation reviewed
- [ ] Ready for production

**Approved By**: _______________  
**Date**: _______________

---

**Status**: [ ] ✅ PASSED  [ ] ❌ FAILED  [ ] ⏸️ PENDING
