# Debug Kitchen Orders - Step by Step Guide

## Problem
Orders created from POS are not appearing on the kitchen page.

## Enhanced Logging Added

I've added extensive logging to track the entire order → kitchen routing flow:

### Logging Points Added:

1. **CreateOrder.ts** (lines 133-154)
   - Logs when fetching full order details
   - Logs order items count
   - Logs kitchen routing start/completion
   - Logs any routing errors

2. **KitchenRouting.ts** (lines 17-66)
   - Logs all order items being processed
   - Logs destination determination for each item
   - Logs database creation of kitchen orders
   - Logs any errors with full stack trace

3. **KitchenRouting.determineDestination** (lines 77-128)
   - Logs product lookup
   - Logs category information
   - Logs destination selection logic
   - Logs fallback to name inference

## Testing Steps

### Step 1: Open Browser Console
1. Open Chrome/Edge DevTools (F12)
2. Go to **Console** tab
3. Clear the console (Ctrl+L or click 🚫 icon)

### Step 2: Create an Order
1. Navigate to `http://localhost:3000/pos`
2. Add at least one product to cart
3. Click **Complete Order**
4. Process payment

### Step 3: Watch the Console Logs

You should see logs like this:

```
🔍 [POST /api/orders] Received request: {...}
🔍 [CreateOrder] Received DTO: {...}
✅ [CreateOrder] Table validation passed: {...}
✅ [POST /api/orders] Order created: {...}

🔍 [CreateOrder] Fetching full order details for routing...
🔍 [CreateOrder] Full order fetched: {
  order_id: "xxx",
  has_order_items: true,
  order_items_count: 2
}

🍳 [CreateOrder] Starting kitchen routing for 2 items...
🍳 [KitchenRouting] Starting routing for order xxx
🍳 [KitchenRouting] Order items: [...]

🔍 [KitchenRouting] Processing item: San Miguel Beer (yyy)
🔍 [KitchenRouting.determineDestination] Checking item: {...}
🔍 [KitchenRouting.determineDestination] Fetching product zzz...
📦 [KitchenRouting.determineDestination] Product fetched: {
  id: "zzz",
  name: "San Miguel Beer",
  has_category: true,
  category_name: "Beers",
  default_destination: "bartender"  ← THIS IS KEY!
}
✅ [KitchenRouting.determineDestination] Using category destination: bartender
📍 [KitchenRouting] Destination for "San Miguel Beer": bartender

📋 [KitchenRouting] Prepared 2 kitchen orders
💾 [KitchenRouting] Creating kitchen orders in database...
✅ [KitchenRouting] Routed 2 items for order xxx
✅ [CreateOrder] Kitchen routing completed successfully
```

### Step 4: Identify the Problem

#### ✅ **Success Case - Kitchen Orders Created**
If you see:
- ✅ `Kitchen routing completed successfully`
- Orders appear on `http://localhost:3000/kitchen`
- **→ Everything is working!**

#### ⚠️ **Problem 1: No Category Destination**
If you see:
```
⚠️ [KitchenRouting.determineDestination] No category destination, analyzing product name...
🔍 [KitchenRouting.determineDestination] Inferred from name: kitchen
```

**Cause**: Product categories don't have `default_destination` set

**Fix**:
```bash
# Run the fix script
npx tsx scripts/fix-category-destinations.ts

# Then create a new order
```

#### ⚠️ **Problem 2: No Order Items**
If you see:
```
⚠️ [CreateOrder] No order items to route or fullOrder not found
```

**Cause**: Order items not being fetched correctly

**Fix**: Check database query
```sql
-- Verify order items exist
SELECT oi.* FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.order_number = 'ORD-001'  -- Replace with your order number
```

#### ⚠️ **Problem 3: Routing Error**
If you see:
```
❌ [CreateOrder] Kitchen routing error (non-fatal): ...
Stack trace: ...
```

**Cause**: Error in routing logic (check the stack trace)

**Common causes**:
- Product not found in database
- Category relationship broken
- Database connection issue

#### ⚠️ **Problem 4: No Kitchen Orders Created**
If you see:
```
⚠️ [KitchenRouting] No kitchen orders to create for order xxx
```

**Cause**: All items had `destination = null`

**Fix**: 
1. Check if products have categories
2. Run `npx tsx scripts/test-kitchen-orders.ts`
3. Manually set category destinations

### Step 5: Verify Kitchen Orders Table

Check if kitchen orders were actually created:

```sql
-- Check recent kitchen orders
SELECT 
  ko.id,
  ko.destination,
  ko.status,
  ko.created_at,
  o.order_number,
  oi.item_name
FROM kitchen_orders ko
JOIN orders o ON ko.order_id = o.id
JOIN order_items oi ON ko.order_item_id = oi.id
ORDER BY ko.created_at DESC
LIMIT 10;
```

### Step 6: Check Kitchen Page

1. Open `http://localhost:3000/kitchen`
2. Open browser console (F12)
3. Look for realtime subscription logs:

```
Kitchen orders subscription status: SUBSCRIBED
Realtime event on kitchen_orders: {...}
```

## Common Issues & Solutions

### Issue 1: Console Shows Success But No Orders on Kitchen Page

**Possible Causes:**
1. Realtime not enabled on `kitchen_orders` table
2. Kitchen page subscribed to wrong destination
3. Browser tab needs refresh

**Solutions:**
```bash
# 1. Enable realtime in Supabase Dashboard
# Go to: Database → Replication → Enable kitchen_orders

# 2. Hard refresh the kitchen page
# Ctrl+Shift+R or Cmd+Shift+R

# 3. Check subscription in console
# Should see: "Kitchen orders subscription status: SUBSCRIBED"
```

### Issue 2: TypeScript/Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
npm install

# Rebuild
npm run dev
```

### Issue 3: No Logs Appearing

**Cause**: Browser console might be filtering logs

**Fix**:
1. In DevTools Console, check filter dropdown
2. Ensure "All levels" is selected
3. Ensure "Default" levels includes Info, Warnings, Errors

### Issue 4: Order Created But Routing Skipped

If you see the order created but no routing logs at all:

**Check**: `CreateOrder.ts` line 132-154
- Ensure the code is calling `KitchenRouting.routeOrder()`
- Check if there's a try-catch swallowing the error

## Manual Test Queries

### Check Order Items
```sql
SELECT 
  o.order_number,
  o.created_at,
  oi.item_name,
  oi.product_id,
  p.name as product_name,
  pc.name as category_name,
  pc.default_destination
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN product_categories pc ON p.category_id = pc.id
WHERE o.created_at > NOW() - INTERVAL '1 hour'
ORDER BY o.created_at DESC;
```

### Check Kitchen Orders
```sql
SELECT 
  ko.id,
  ko.destination,
  ko.status,
  o.order_number,
  oi.item_name,
  ko.created_at
FROM kitchen_orders ko
JOIN orders o ON ko.order_id = o.id
JOIN order_items oi ON ko.order_item_id = oi.id
WHERE ko.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ko.created_at DESC;
```

### Check Categories
```sql
SELECT 
  id,
  name,
  default_destination,
  (SELECT COUNT(*) FROM products WHERE category_id = pc.id) as product_count
FROM product_categories pc
ORDER BY name;
```

## Expected Flow (All Good)

```
1. User completes order at POS
   ↓
2. POST /api/orders
   ↓
3. CreateOrder.execute()
   ↓
4. Order created in orders table
   ↓
5. Order items created in order_items table
   ↓
6. KitchenRouting.routeOrder() called
   ↓
7. For each order item:
   - Fetch product
   - Check category → default_destination
   - Create kitchen_order entry
   ↓
8. kitchen_orders table updated
   ↓
9. Supabase realtime triggers
   ↓
10. Kitchen display receives update
   ↓
11. Order appears on kitchen page ✅
```

## Next Steps After Debugging

Once you identify where the flow breaks:

1. **If categories missing destinations**:
   ```bash
   npx tsx scripts/fix-category-destinations.ts
   ```

2. **If products missing categories**:
   - Update products in database
   - Assign them to proper categories

3. **If routing logic broken**:
   - Check error logs
   - Share the error with me
   - I'll fix the code

4. **If realtime not working**:
   - Enable realtime in Supabase
   - Refresh kitchen page
   - Check subscription logs

## Contact Points

Share these with me if you need help:

1. **Console logs** from order creation
2. **SQL query results** from above queries
3. **Supabase table data** screenshots
4. **Any error messages** you see

---

**Remember**: The logging is now very detailed. Every step will show in the console. Look for the ⚠️ and ❌ symbols to find where things go wrong!
