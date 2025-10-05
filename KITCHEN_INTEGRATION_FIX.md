# Kitchen Page Integration Fix

## Problem
Orders are not appearing on the kitchen page (`http://localhost:3000/kitchen`) even though orders are being created.

## Root Cause
Product categories don't have `default_destination` set, so the kitchen routing system doesn't know where to send order items.

## Solution

### Step 1: Test Current State
Run the diagnostic script to see what's missing:

```bash
npx tsx scripts/test-kitchen-orders.ts
```

This will show you:
- How many kitchen orders exist
- Which categories have `default_destination` set
- Recent orders and whether they have kitchen orders

### Step 2: Fix Category Destinations
Run the fix script to automatically set destinations for all categories:

```bash
npx tsx scripts/fix-category-destinations.ts
```

This script will:
- ✅ Set `default_destination = 'bartender'` for beverage categories
- ✅ Set `default_destination = 'kitchen'` for food categories  
- ✅ Set `default_destination = 'both'` for combo/platter categories

### Step 3: Create a Test Order
1. Open POS: `http://localhost:3000/pos`
2. Create a new order with food and/or beverage items
3. Complete the order (process payment)

### Step 4: Verify Kitchen Display
1. Open kitchen page: `http://localhost:3000/kitchen`
2. Orders should appear automatically with realtime updates
3. You can change status: Pending → Preparing → Ready → Served

## How the System Works

### Order Flow
```
Customer → Cashier creates order → Order completed
    ↓
System analyzes each order item
    ↓
Checks product → category → default_destination
    ↓
Creates kitchen_order entry with destination
    ↓
Realtime: Kitchen display receives update
    ↓
Order appears on kitchen page 🎉
```

### Database Tables

**orders** (Main transaction)
- Contains: customer, table, payment, totals
- Status: pending, completed, voided

**order_items** (What was ordered)
- Links to: order_id, product_id
- Contains: item name, quantity, price

**kitchen_orders** (Kitchen work queue)
- Links to: order_id, order_item_id
- Contains: destination, status, timing
- Destination: 'kitchen' | 'bartender' | 'both'

### Destination Logic

The `KitchenRouting` service determines destination:

1. **Category has default_destination** → Use that
2. **No category** → Analyze product name for keywords
3. **Fallback** → Default to 'kitchen'

## Manual Category Update (Alternative)

If you want to manually set destinations:

```sql
-- Update specific category
UPDATE product_categories 
SET default_destination = 'kitchen' 
WHERE name = 'Food';

-- Update multiple categories
UPDATE product_categories 
SET default_destination = 'bartender' 
WHERE name IN ('Beers', 'Beverages', 'Cocktails');

-- Verify
SELECT name, default_destination 
FROM product_categories 
ORDER BY name;
```

## Troubleshooting

### No orders appearing on kitchen page

**Check 1: Categories have destinations?**
```bash
npx tsx scripts/test-kitchen-orders.ts
```

**Check 2: Kitchen orders being created?**
```sql
SELECT ko.id, ko.destination, ko.status, o.order_number, oi.item_name
FROM kitchen_orders ko
JOIN orders o ON ko.order_id = o.id
JOIN order_items oi ON ko.order_item_id = oi.id
ORDER BY ko.created_at DESC
LIMIT 10;
```

**Check 3: Realtime enabled?**
1. Go to Supabase Dashboard
2. Database → Replication
3. Enable `kitchen_orders` table

**Check 4: Check browser console**
1. Open `http://localhost:3000/kitchen`
2. Press F12 → Console tab
3. Look for realtime subscription logs
4. Should see: "Kitchen orders subscription status: SUBSCRIBED"

### Orders created but not routing

Check `CreateOrder.ts` line 136:
```typescript
await KitchenRouting.routeOrder(order.id, fullOrder.order_items);
```

Check console logs when creating order:
- Should see: "Routed X items for order {orderId}"
- If error: Check the error message

### Kitchen routing errors

Check `KitchenRouting.ts`:
- Line 64: `ProductRepository.getById()` should fetch category
- Line 72: Category should have `default_destination`
- Line 77: Fallback to name analysis

## Testing Checklist

- [ ] Run `npx tsx scripts/test-kitchen-orders.ts`
- [ ] Run `npx tsx scripts/fix-category-destinations.ts`
- [ ] Verify all categories have `default_destination` set
- [ ] Create a test order from POS
- [ ] Check order appears on kitchen page
- [ ] Test status updates (Pending → Preparing → Ready)
- [ ] Test realtime: Create order in one browser, see it in another
- [ ] Test filtering by status tabs

## Expected Behavior After Fix

✅ **Create Order**
- Cashier creates order at POS
- Order items routed to kitchen/bartender automatically
- Console log: "Routed X items for order {id}"

✅ **Kitchen Display**
- Orders appear immediately (realtime)
- Toast notification: "New order received!"
- Order cards show: table, order number, items, time

✅ **Status Updates**
- Click "Start Preparing" → moves to Preparing tab
- Click "Mark Ready" → moves to Ready tab
- Click "Mark Served" → removed from display
- All displays update in realtime

## Files Modified/Created

**New Scripts:**
- `scripts/test-kitchen-orders.ts` - Diagnostic tool
- `scripts/fix-category-destinations.ts` - Automatic fix

**Existing Code (already implemented):**
- `src/core/use-cases/orders/CreateOrder.ts` - Line 136 routes orders
- `src/core/services/kitchen/KitchenRouting.ts` - Routing logic
- `src/data/repositories/ProductRepository.ts` - Fetches category data
- `src/views/kitchen/KitchenDisplay.tsx` - Realtime display

## Next Steps

1. Run the diagnostic script
2. Run the fix script
3. Create a test order
4. Verify it appears on kitchen page
5. If still not working, share the console output from the diagnostic script

---

📝 **Note**: The kitchen order routing is already implemented in the code. The only missing piece was setting the `default_destination` on product categories, which the fix script handles automatically.
