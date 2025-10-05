# Testing Current Orders Real-time System

## Issue Fixed

The `/current-orders` page was monitoring the **permanent `orders` table**, but the POS is using the **staging `current_orders` table**. They were watching different tables!

### What Changed

✅ **API Updated**: `/api/current-orders?all=true` now fetches from `current_orders` table  
✅ **StaffOrderMonitor**: Now subscribes to `current_orders` and `current_order_items`  
✅ **Repository**: Added `getAll()` method to fetch all current orders  

---

## How to Test

### Test 1: Product Click Shows on Staff Dashboard

**Step 1**: Open Staff Dashboard
```
http://localhost:3000/current-orders
```
You should see "Current Orders Monitor" page with text:
> Real-time view of all draft orders being built in POS

**Step 2**: Open POS in another tab
```
http://localhost:3000/pos
```

**Step 3**: In POS tab
- Wait for order to auto-create (or click "New Order")
- Click any product (e.g., "Beer Bucket")
- Product should be added instantly

**Step 4**: Switch to Staff Dashboard tab
- Within 1-2 seconds, you should see:
  - New order card appear
  - Product listed in the order
  - Total amount updated

**Expected Result**: ✅ Order appears with items in real-time

---

### Test 2: Real-time Updates While Watching

**Step 1**: Open both tabs side-by-side
- Left: POS (`/pos`)
- Right: Staff Dashboard (`/current-orders`)

**Step 2**: In POS tab, click products one by one
- Click "Beer Bucket"
- Wait 1 second
- Click "VIP Package"
- Wait 1 second
- Click "Food Item"

**Step 3**: Watch Staff Dashboard
- Each item should appear within 1-2 seconds
- Totals should update automatically
- No manual refresh needed

**Expected Result**: ✅ Real-time updates visible on both sides

---

### Test 3: Multiple Cashiers

**Step 1**: Open Browser 1 (Cashier A)
```
Login as: cashier1@test.com
Open: /pos
Create order, add items
```

**Step 2**: Open Browser 2 (Cashier B)
```
Login as: cashier2@test.com
Open: /pos
Create order, add items
```

**Step 3**: Open Browser 3 (Manager)
```
Login as: manager@test.com
Open: /current-orders
```

**Expected Result**: 
- ✅ Manager sees BOTH cashiers' orders
- ✅ Each cashier sees only their own orders in POS
- ✅ All updates happen in real-time

---

## Troubleshooting

### Products not showing on /current-orders

**Check 1**: Verify you're using the correct POS interface

If using the OLD POS (POSInterface.tsx):
- That uses the old cart system
- Items go to session storage, not database
- **Solution**: Use POSInterfaceV2 instead

Update your POS page:
```typescript
// src/app/(dashboard)/pos/page.tsx
import { POSInterfaceV2 } from '@/views/pos/POSInterfaceV2';

export default function POSPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN]}>
      <POSInterfaceV2 />
    </RouteGuard>
  );
}
```

**Check 2**: Verify database migration ran

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('current_orders', 'current_order_items');

-- Should return 2 rows
```

**Check 3**: Verify Realtime is enabled

In Supabase Dashboard:
1. Go to Database → Replication
2. Verify enabled:
   - ✅ current_orders
   - ✅ current_order_items

**Check 4**: Check browser console

Open `/current-orders` and check console for:
```
Subscription status for current_orders: SUBSCRIBED
Subscription status for current_order_items: SUBSCRIBED
```

If you see errors, Realtime is not configured properly.

**Check 5**: Verify items are in database

```sql
-- Check if items are being inserted
SELECT * FROM current_order_items 
ORDER BY created_at DESC 
LIMIT 10;

-- If empty, products aren't being inserted
-- Check browser console in POS for errors
```

---

## Browser Console Debugging

### In POS Tab

When you click a product, you should see:
```
Product added! Real-time will update automatically
```

If you see errors like:
```
Error adding product: Cashier ID is required
```
→ Check that `cashierId` is being passed to ProductGrid

### In /current-orders Tab

You should see:
```
Current order update received: {eventType: 'INSERT', ...}
Current order items update received: {eventType: 'INSERT', ...}
```

If no messages appear:
→ Realtime subscriptions not working

---

## Quick Fixes

### Fix 1: Restart Dev Server

Sometimes TypeScript cache causes issues:
```bash
# Stop server (Ctrl+C)
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### Fix 2: Hard Refresh Browser

```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Fix 3: Check Network Tab

Open DevTools → Network tab:
1. Filter by "WS" (WebSocket)
2. Should see connection to Supabase
3. Status should be "101 Switching Protocols"

If no WebSocket:
→ Realtime not configured in Supabase

---

## Expected Behavior Summary

### POS Side (`/pos`)
```
1. Auto-creates current order
2. Click product → instant DB insert
3. Item appears in CurrentOrderPanel (right side)
4. Totals update automatically
```

### Staff Dashboard Side (`/current-orders`)
```
1. Subscribes to current_orders table
2. Listens for INSERT/UPDATE events
3. Shows all cashiers' draft orders
4. Updates in real-time (1-2 seconds)
5. No manual refresh needed
```

### Database Side
```
1. Product clicked → POST /api/current-orders/{id}/items
2. Insert into current_order_items table
3. Trigger recalculates totals
4. Supabase Realtime broadcasts event
5. All subscribers receive update
```

---

## Success Criteria

✅ Click product in POS → appears in staff dashboard within 2 seconds  
✅ Multiple products added → all appear in correct order  
✅ Totals calculate automatically  
✅ Multiple cashiers → all orders visible to staff  
✅ No manual refresh needed  
✅ WebSocket connection established  
✅ Console shows subscription messages  

---

## Still Not Working?

### Option 1: Check Migration

Verify migration ran successfully:
```sql
-- Check foreign key exists
SELECT conname 
FROM pg_constraint 
WHERE conname = 'current_orders_cashier_id_fkey';

-- Should return 1 row
```

### Option 2: Check RLS Policies

```sql
-- Check policies exist
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'current_orders';

-- Should return multiple rows
```

### Option 3: Manual Test

Insert item manually:
```sql
-- Create test order
INSERT INTO current_orders (cashier_id, subtotal, total_amount)
VALUES ('your-cashier-id', 750, 750)
RETURNING id;

-- Insert test item (use the ID from above)
INSERT INTO current_order_items (
  current_order_id, 
  product_id,
  item_name, 
  quantity, 
  unit_price, 
  subtotal, 
  total
)
VALUES (
  'order-id-from-above',
  'any-product-id',
  'Test Item', 
  1, 
  750, 
  750, 
  750
);
```

Then check if it appears on `/current-orders`.

If manual insert appears but product clicks don't:
→ Issue is in ProductGrid or API route

---

## Contact Points

**Files to check**:
- `src/views/pos/ProductGrid.tsx` - Product click handler
- `src/app/api/current-orders/[orderId]/items/route.ts` - API endpoint
- `src/data/repositories/CurrentOrderRepository.ts` - Database queries
- `src/views/orders/StaffOrderMonitor.tsx` - Dashboard component
- `migrations/create_current_orders_table.sql` - Database schema

**Key functions**:
- `ProductGrid.handleProductClick()` - Inserts item
- `CurrentOrderRepository.addItem()` - Database insert
- `StaffOrderMonitor.fetchOrders()` - Fetches orders
- `useRealtime()` - Real-time subscriptions

---

## Next Steps After Testing

Once real-time works:

1. ✅ Test with actual products from your database
2. ✅ Test with VIP customers (VIP pricing)
3. ✅ Test with multiple cashiers
4. ✅ Test customer monitor page (`/order-monitor/T-01`)
5. ✅ Generate QR codes for tables
6. ✅ Deploy to production

---

**Real-time system is now fixed and ready to test!** 🚀
