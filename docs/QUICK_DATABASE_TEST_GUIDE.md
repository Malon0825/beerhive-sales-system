# Quick Database Test Guide
## Current Orders System Testing

**Purpose:** Verify database implementation works correctly  
**Estimated Time:** 5-10 minutes

---

## Prerequisites

- ✅ Database migrations applied
- ✅ User with cashier role exists
- ✅ At least one product exists in database

---

## Test 1: Create Current Order (30 seconds)

### SQL Test
```sql
-- Replace 'your-cashier-uuid' with actual cashier ID
INSERT INTO current_orders (cashier_id)
VALUES ('your-cashier-uuid')
RETURNING id, cashier_id, subtotal, total_amount, created_at;
```

**Expected Result:**
- ✅ Returns new order with ID
- ✅ `subtotal` = 0
- ✅ `total_amount` = 0

---

## Test 2: Add Item to Order (30 seconds)

### SQL Test
```sql
-- Replace order-uuid with result from Test 1
-- Replace product-uuid with actual product ID
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
    'order-uuid',
    'product-uuid',
    'San Miguel Beer',
    3,
    75.00,
    225.00,
    225.00
)
RETURNING id, item_name, quantity, total;
```

**Expected Result:**
- ✅ Returns new item with ID
- ✅ Item created successfully

---

## Test 3: Verify Auto-Calculation (30 seconds)

### SQL Test
```sql
-- Check if order totals updated automatically
SELECT 
    id,
    subtotal,
    discount_amount,
    total_amount,
    updated_at
FROM current_orders
WHERE id = 'order-uuid';
```

**Expected Result:**
- ✅ `subtotal` = 225.00 (auto-calculated)
- ✅ `total_amount` = 225.00 (auto-calculated)
- ✅ `updated_at` updated automatically

**If totals are still 0, trigger may not be working!**

---

## Test 4: Add Second Item (30 seconds)

### SQL Test
```sql
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
    'order-uuid',
    'product-uuid',
    'Red Horse Beer',
    2,
    80.00,
    160.00,
    160.00
);

-- Verify totals updated
SELECT subtotal, total_amount FROM current_orders WHERE id = 'order-uuid';
```

**Expected Result:**
- ✅ `subtotal` = 385.00 (225 + 160)
- ✅ `total_amount` = 385.00

---

## Test 5: Update Item Quantity (30 seconds)

### SQL Test
```sql
-- Get item ID first
SELECT id, item_name, quantity, total FROM current_order_items 
WHERE current_order_id = 'order-uuid';

-- Update quantity
UPDATE current_order_items
SET 
    quantity = 5,
    subtotal = 5 * 75.00,
    total = 5 * 75.00
WHERE id = 'item-uuid';

-- Verify order total updated
SELECT subtotal, total_amount FROM current_orders WHERE id = 'order-uuid';
```

**Expected Result:**
- ✅ Order totals recalculated automatically
- ✅ New total reflects quantity change

---

## Test 6: Remove Item (30 seconds)

### SQL Test
```sql
-- Delete one item
DELETE FROM current_order_items 
WHERE id = 'item-uuid';

-- Verify totals updated
SELECT subtotal, total_amount FROM current_orders WHERE id = 'order-uuid';
```

**Expected Result:**
- ✅ Item deleted successfully
- ✅ Order totals recalculated
- ✅ Total decreased appropriately

---

## Test 7: Cashier Isolation (2 minutes)

### SQL Test
```sql
-- As Cashier A: Create order
-- (Use Supabase auth or SET session)
INSERT INTO current_orders (cashier_id)
VALUES ('cashier-a-uuid')
RETURNING id;

-- As Cashier B: Try to view Cashier A's order
SET request.jwt.claim.sub = 'cashier-b-uuid';

SELECT * FROM current_orders 
WHERE cashier_id = 'cashier-a-uuid';
```

**Expected Result:**
- ❌ Cashier B should see 0 rows (RLS blocking)
- ✅ RLS policies working correctly

---

## Test 8: Clear All Items (30 seconds)

### SQL Test
```sql
-- Delete all items from order
DELETE FROM current_order_items 
WHERE current_order_id = 'order-uuid';

-- Verify totals reset to 0
SELECT subtotal, total_amount FROM current_orders WHERE id = 'order-uuid';
```

**Expected Result:**
- ✅ All items deleted
- ✅ `subtotal` = 0
- ✅ `total_amount` = 0

---

## Test 9: Delete Order (30 seconds)

### SQL Test
```sql
-- Delete the order
DELETE FROM current_orders WHERE id = 'order-uuid';

-- Verify it's gone
SELECT * FROM current_orders WHERE id = 'order-uuid';
```

**Expected Result:**
- ✅ Order deleted
- ✅ All associated items deleted (cascade)

---

## Test 10: Realtime Verification (1 minute)

### Browser Console Test
```javascript
// In browser console on your app
const { createClient } = supabase;

// Subscribe to changes
const subscription = supabase
  .channel('current_orders_test')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'current_orders',
    filter: `cashier_id=eq.${yourCashierId}`
  }, (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();

// In another tab: Add an item to your current order
// You should see console log with the change
```

**Expected Result:**
- ✅ Console logs show real-time updates
- ✅ WebSocket connection established
- ✅ Changes received instantly

---

## Troubleshooting

### Problem: Totals Not Auto-Calculating

**Check Trigger Exists:**
```sql
SELECT 
    tgname as trigger_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_current_order_items_totals';
```

**Expected:** Should return 1 row with `enabled = 'O'`

**Manual Trigger:**
```sql
SELECT calculate_current_order_totals('order-uuid');
```

---

### Problem: RLS Blocking Own Orders

**Check Auth:**
```sql
SELECT auth.uid(); -- Should return your user UUID
```

**Check Role:**
```sql
SELECT id, email, role FROM users WHERE id = auth.uid()::uuid;
```

---

### Problem: Realtime Not Working

**Check Replication:**
```sql
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('current_orders', 'current_order_items');
```

**Expected:** Should return 2 rows

---

## Quick Cleanup Script

```sql
-- Clean up test data
DELETE FROM current_orders WHERE cashier_id = 'your-cashier-uuid';
-- Items will cascade delete automatically
```

---

## Success Checklist

After running all tests:

- [ ] ✅ Can create current orders
- [ ] ✅ Can add items to orders
- [ ] ✅ Totals auto-calculate correctly
- [ ] ✅ Can update item quantities
- [ ] ✅ Can remove items
- [ ] ✅ Can delete orders
- [ ] ✅ RLS prevents unauthorized access
- [ ] ✅ Cascading deletes work
- [ ] ✅ Realtime updates work
- [ ] ✅ Triggers fire correctly

---

## Next: Frontend Integration Testing

Once database tests pass, proceed to:
1. Test API endpoints
2. Test CartContext integration
3. Test POS interface
4. Test multi-cashier scenarios

Refer to `TESTING_CHECKLIST.md` for complete frontend testing.

---

**Time to Complete:** ~10 minutes  
**Prerequisites:** Database access, cashier account  
**Success Rate:** Should be 100% if migrations applied correctly
