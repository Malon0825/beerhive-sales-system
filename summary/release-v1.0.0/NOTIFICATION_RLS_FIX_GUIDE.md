# Fix: Notification RLS Policy Error

## Error Message
```
new row violates row-level security policy for table "notifications"
```

## Root Cause

The notification triggers (like `notify_new_order()`) run with the **user's permissions** who triggered them. When a cashier creates an order, the trigger tries to insert a notification but fails because:

1. The RLS policy only allows **service_role** to insert notifications
2. Regular users (cashier, waiter, etc.) don't have INSERT permission
3. The trigger inherits the user's permissions, not the service role

## Solution

Make all trigger functions use `SECURITY DEFINER`, which allows them to run with elevated privileges (bypassing RLS).

---

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Open your project: https://supabase.com/dashboard/project/ljguzjsajiswslixumle
   - Navigate to **SQL Editor**

2. **Run the Fix Script**
   - Click **New query**
   - Copy the entire contents of `migrations/fix_notifications_rls.sql`
   - Paste into the SQL editor
   - Click **Run** (or press `Ctrl+Enter`)

3. **Verify Success**
   - You should see: `✅ Notifications RLS fix applied successfully!`
   - Check for any errors in the output

4. **Test**
   - Create a new order in your app
   - Check if notification is created without errors

---

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Navigate to project directory
cd d:/Projects/beerhive-sales-system

# Apply migration
supabase db push

# Or run the specific migration file
supabase db execute -f migrations/fix_notifications_rls.sql
```

---

### Option 3: Quick Fix (Copy-Paste)

If you just want to fix it quickly without reading the full script:

**Go to Supabase SQL Editor and run:**

```sql
-- Quick fix: Add SECURITY DEFINER to trigger functions

ALTER FUNCTION notify_new_order() SECURITY DEFINER;
ALTER FUNCTION notify_order_completed() SECURITY DEFINER;
ALTER FUNCTION notify_kitchen_order_ready() SECURITY DEFINER;
ALTER FUNCTION notify_low_stock() SECURITY DEFINER;
ALTER FUNCTION create_order_notification(UUID, notification_type, VARCHAR, TEXT) SECURITY DEFINER;
ALTER FUNCTION create_inventory_notification(UUID, VARCHAR, DECIMAL, DECIMAL, notification_type) SECURITY DEFINER;

-- Also set safe search_path
ALTER FUNCTION notify_new_order() SET search_path = public;
ALTER FUNCTION notify_order_completed() SET search_path = public;
ALTER FUNCTION notify_kitchen_order_ready() SET search_path = public;
ALTER FUNCTION notify_low_stock() SET search_path = public;
ALTER FUNCTION create_order_notification(UUID, notification_type, VARCHAR, TEXT) SET search_path = public;
ALTER FUNCTION create_inventory_notification(UUID, VARCHAR, DECIMAL, DECIMAL, notification_type) SET search_path = public;
```

This is faster but less comprehensive than the full script.

---

## What the Fix Does

### Before Fix
```
User (cashier) creates order
  ↓
Trigger: notify_new_order() runs with cashier permissions
  ↓
Tries to INSERT into notifications table
  ↓
❌ RLS blocks: "cashier doesn't have INSERT permission"
```

### After Fix
```
User (cashier) creates order
  ↓
Trigger: notify_new_order() runs with SECURITY DEFINER (superuser)
  ↓
Inserts into notifications table
  ↓
✅ Success: RLS bypassed by SECURITY DEFINER
```

---

## Verification

### 1. Check Function Security

Run this query in Supabase SQL Editor to verify functions have SECURITY DEFINER:

```sql
SELECT 
    p.proname AS function_name,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'notify_new_order',
    'notify_order_completed',
    'notify_kitchen_order_ready',
    'notify_low_stock',
    'create_order_notification',
    'create_inventory_notification'
);
```

**Expected output:**
All functions should show `SECURITY DEFINER`

### 2. Check RLS Policies

```sql
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'notifications';
```

**Expected policies:**
- `Users can view their own notifications` (SELECT)
- `Users can update their own notifications` (UPDATE)
- `Service role can insert notifications` (INSERT)
- `Users can delete their own notifications` (DELETE)

### 3. Test Notification Creation

Create a test order in your app:

```typescript
// In your app console or test
const order = await createOrder({
  customer_name: 'Test Customer',
  items: [...],
  total_amount: 100
});

// Check if notification was created
const notifications = await getNotifications();
console.log('Notifications:', notifications);
```

If no error occurs, the fix worked!

---

## Security Considerations

### Is SECURITY DEFINER Safe?

**YES**, in this case because:

1. ✅ **Functions only insert notifications** - They don't expose sensitive data
2. ✅ **search_path is set** - Prevents function hijacking attacks
3. ✅ **Functions are system-controlled** - Not callable by users directly
4. ✅ **RLS still protects reads** - Users can only view their own notifications

### What SECURITY DEFINER Does

- Makes the function run with the **owner's permissions** (usually postgres superuser)
- Bypasses RLS for that specific function
- Used for system triggers that need elevated privileges

### Alternative Approach (Not Recommended)

You could also:
- Add a policy: `CREATE POLICY "Authenticated users can insert" FOR INSERT TO authenticated USING (true)`

**Why not recommended:**
- Less secure - any authenticated user could manually insert notifications
- Bypasses business logic in trigger functions
- Could be abused

---

## Troubleshooting

### Error: "function does not exist"

**Solution:** The functions may not have been created yet. Run the full migration first:

```sql
-- Run: migrations/create_notifications_table.sql
-- Then run: migrations/fix_notifications_rls.sql
```

### Error: "permission denied"

**Solution:** You need to be the database owner or have superuser privileges. Make sure you're running the SQL as the project owner in Supabase Dashboard.

### Notifications still not appearing

**Possible causes:**

1. **Trigger not firing** - Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE 'trigger_notify%';
   ```

2. **Function error** - Check logs in Supabase Dashboard → Database → Logs

3. **Wrong table** - Verify trigger is on correct table:
   ```sql
   SELECT 
       t.tgname AS trigger_name,
       c.relname AS table_name,
       p.proname AS function_name
   FROM pg_trigger t
   JOIN pg_class c ON t.tgrelid = c.oid
   JOIN pg_proc p ON t.tgfoid = p.oid
   WHERE t.tgname LIKE 'trigger_notify%';
   ```

---

## Testing Checklist

After applying the fix, test these scenarios:

- [ ] Create a new order → Should create "New Order" notification
- [ ] Complete an order → Should create "Order Completed" notification  
- [ ] Mark kitchen order ready → Should create "Food Ready" notification
- [ ] Update product stock below reorder point → Should create "Low Stock" notification
- [ ] Verify notifications appear in NotificationBell component
- [ ] Mark notification as read → Should update without error
- [ ] Mark all as read → Should work for all user notifications

---

## Summary

**Problem:** Triggers couldn't insert notifications due to RLS policies

**Solution:** Add `SECURITY DEFINER` to all notification trigger functions

**Result:** Notifications are created automatically when orders/inventory changes

**Script to run:** `migrations/fix_notifications_rls.sql`

---

## Need More Help?

If you still get RLS errors after applying this fix:

1. Share the exact error message
2. Run the verification queries above
3. Check Supabase Database logs
4. Verify the fix script ran without errors

The most common issue is forgetting to set `SECURITY DEFINER` on the helper functions (`create_order_notification`, `create_inventory_notification`).
