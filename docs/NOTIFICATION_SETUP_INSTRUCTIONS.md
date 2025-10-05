# Notification System - Quick Setup Instructions

## Step-by-Step Setup

### Step 1: Install Dependencies

```bash
npm install @radix-ui/react-scroll-area
```

### Step 2: Run Database Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy contents from `migrations/create_notifications_table.sql`
3. Paste into SQL Editor
4. Click **Run**
5. Verify success message

### Step 3: Enable Realtime

1. Go to **Database** → **Replication** in Supabase
2. Find `notifications` table
3. Toggle **Enable** for Realtime
4. Save changes

### Step 4: Add Notification Sound (Optional)

Create a subtle notification sound file:
1. Create folder: `public/sounds/`
2. Add `notification.mp3` (short, subtle ping sound)
3. Keep file size small (<50KB)

**Alternative**: Use browser's built-in notification sound by removing the sound file reference.

### Step 5: Test the System

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Login to system**
   - Navigate to http://localhost:3000
   - Login with any user account

3. **Test notifications**
   - Create a new order (should show notification)
   - Check bell icon in top right corner
   - Click bell to view notifications
   - Test mark as read
   - Test mute toggle

4. **Test role-based notifications**
   - Login as Manager
   - Manually reduce product stock below reorder point:
     ```sql
     UPDATE products 
     SET current_stock = 5 
     WHERE reorder_point = 10 
     LIMIT 1;
     ```
   - Check for low stock notification

### Step 6: Verify Triggers

Run this query in Supabase SQL Editor:

```sql
-- Check if all triggers are enabled
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname LIKE 'trigger_notify%'
ORDER BY tgname;
```

Expected output: 4 triggers (all enabled)
- `trigger_notify_kitchen_order_ready`
- `trigger_notify_low_stock`
- `trigger_notify_new_order`
- `trigger_notify_order_completed`

---

## Troubleshooting

### Issue: "Cannot find module @radix-ui/react-scroll-area"

**Solution:**
```bash
npm install @radix-ui/react-scroll-area
# or
npm install
```

### Issue: Notifications not appearing

**Solution:**
1. Check Realtime is enabled for `notifications` table
2. Verify user has correct role in database
3. Check browser console for errors
4. Verify triggers are enabled (see Step 6)

### Issue: Sound not playing

**Solution:**
1. Check browser autoplay policy (click page first)
2. Verify notification is not muted
3. Optional: Remove sound feature if not needed

### Issue: "RLS policy violation"

**Solution:**
Run this query to verify RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

Should show 3 policies:
- Users can view their own notifications
- Users can update their own notifications  
- Service role can insert notifications

---

## Configuration Options

### Disable Browser Notifications

Edit `src/core/services/notifications/NotificationService.ts`:

```typescript
static async showBrowserNotification() {
  // Comment out or remove this function
  return; // Disable browser notifications
}
```

### Change Notification Limit

Edit `src/lib/contexts/NotificationContext.tsx`:

```typescript
const notifications = await NotificationService.getNotifications(
  user.id, 
  100, // Change from 50 to 100
  false
);
```

### Adjust Auto-cleanup Period

Edit migration file and change cleanup period:

```sql
-- Change from 30 days to 60 days
DELETE FROM notifications
WHERE is_read = true 
AND read_at < NOW() - INTERVAL '60 days'; -- Changed from 30
```

---

## Next Steps

After setup:
1. ✅ Test all notification types
2. ✅ Configure notification preferences per role
3. ✅ Add custom notification types as needed
4. ✅ Monitor notification performance
5. ✅ Review [Full Documentation](./NOTIFICATION_SYSTEM_GUIDE.md)

---

## Quick Reference

### Create Custom Notification

```typescript
import { NotificationService } from '@/core/services/notifications/NotificationService';

await NotificationService.notifySystemAlert(
  'Custom Alert',
  'Your custom message here',
  NotificationPriority.NORMAL,
  'cashier' // or specific userId
);
```

### Check Unread Count

```typescript
const { unreadCount } = useNotifications();
console.log(`Unread: ${unreadCount}`);
```

### Toggle Mute

```typescript
const { toggleMute, isMuted } = useNotifications();
toggleMute(); // Toggle current state
```

---

**Need Help?** Refer to [NOTIFICATION_SYSTEM_GUIDE.md](./NOTIFICATION_SYSTEM_GUIDE.md) for detailed documentation.
