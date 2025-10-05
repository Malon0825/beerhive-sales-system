# Debug Cart Persistence - Quick Checklist

## Issue: "No existing cart found"

This message means the cart is trying to load but can't find data in the database.

### Quick Debug Steps

#### Step 1: Check Cashier ID

Open browser console (F12) and run:

```javascript
// Check if userId is being passed correctly
console.log('User ID:', document.cookie);
```

Look for console messages:
```
[CartContext] Initializing cart for cashier: <should see UUID here>
[CartContext] Loading existing cart for cashier: <UUID>
```

**If you see `undefined` or `null`**: The cashier is not logged in properly.

---

#### Step 2: Verify Items Are Being Saved

1. Add an item to cart
2. Open browser console
3. Look for messages:

```
[CartContext] Creating new current order for cashier: <UUID>
[CartContext] Current order created: <order-ID>
[CartContext] Item added to current order: <item-ID>
```

**If you DON'T see these messages**: Items aren't being saved to database.

---

#### Step 3: Check Database Directly

Open Supabase dashboard and run this SQL:

```sql
-- Check current orders
SELECT 
  co.id,
  co.cashier_id,
  co.created_at,
  u.full_name as cashier_name,
  COUNT(coi.id) as item_count
FROM current_orders co
LEFT JOIN users u ON u.id = co.cashier_id
LEFT JOIN current_order_items coi ON coi.current_order_id = co.id
GROUP BY co.id, co.cashier_id, co.created_at, u.full_name
ORDER BY co.created_at DESC
LIMIT 10;
```

**Expected**: You should see a row for your cashier with item_count > 0

**If no rows**: Cart is not being saved to database.

---

#### Step 4: Check API Endpoint

Open Network tab in browser DevTools:

1. Add item to cart
2. Check for POST request to `/api/current-orders`
3. Check for POST request to `/api/current-orders/<id>/items`

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "cashier_id": "uuid"
  }
}
```

**If 403 or 401 error**: RLS policies blocking access
**If 404 error**: API endpoint missing
**If 500 error**: Server error - check logs

---

## Common Issues & Fixes

### Issue 1: Cashier ID is Undefined

**Cause**: User not logged in or userId not passed to CartProvider

**Fix**: Check `POSPage` component:

```typescript
// Should look like this:
function POSPage() {
  const { user } = useAuth();

  return (
    <CartProvider userId={user?.id}>  {/* userId must be passed */}
      <POSInterface />
    </CartProvider>
  );
}
```

---

### Issue 2: API Returns 403 Forbidden

**Cause**: RLS policies blocking access

**Fix**: Run this SQL to check policies:

```sql
-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('current_orders', 'current_order_items');
```

**Should have policies**:
- "Cashiers can view own current orders"
- "Cashiers can create own current orders"
- "Cashiers can update own current orders"

---

### Issue 3: Items Added But Not Saved

**Cause**: Error in addItem function

**Fix**: Open console and add an item. Look for errors:

```
[CartContext] Error adding item: <error message>
```

Common errors:
- "User must be logged in to create orders" → Not logged in
- "Failed to create current order" → Database error
- "Order not found or access denied" → RLS issue

---

## Testing Script

Run this in browser console to test manually:

```javascript
// Test 1: Check if user is logged in
const checkAuth = async () => {
  const response = await fetch('/api/current-orders?cashierId=test');
  console.log('Auth test:', response.status);
};
checkAuth();

// Test 2: Create test order
const createTestOrder = async () => {
  const response = await fetch('/api/current-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cashierId: 'YOUR_USER_ID_HERE' // Replace with actual user ID
    })
  });
  const result = await response.json();
  console.log('Create order result:', result);
};
// createTestOrder();

// Test 3: Fetch current orders
const fetchOrders = async () => {
  const response = await fetch('/api/current-orders?cashierId=YOUR_USER_ID_HERE');
  const result = await response.json();
  console.log('Fetch orders result:', result);
};
// fetchOrders();
```

---

## Quick Fix: Manual Test

1. **Open Supabase SQL Editor**
2. **Create test order manually**:

```sql
-- Replace 'YOUR_CASHIER_ID' with actual user UUID
INSERT INTO current_orders (cashier_id, subtotal, total_amount)
VALUES ('YOUR_CASHIER_ID', 0, 0)
RETURNING *;

-- Note the order ID, then insert test item
INSERT INTO current_order_items (
  current_order_id,
  item_name,
  quantity,
  unit_price,
  subtotal,
  discount_amount,
  total
)
VALUES (
  'ORDER_ID_FROM_ABOVE',
  'Test Beer',
  2,
  75.00,
  150.00,
  0,
  150.00
);
```

3. **Refresh POS page**
4. **Check if test item appears**

If test item appears: Cart loading works ✅  
If test item doesn't appear: Cart loading broken ❌

---

## Next Steps Based on Results

### If items appear with manual SQL insert:
→ Problem is with SAVING to database  
→ Check `addItem` function  
→ Check API endpoints  
→ Check RLS policies for INSERT

### If items don't appear even with manual insert:
→ Problem is with LOADING from database  
→ Check `loadExistingCart` function  
→ Check cashier ID is correct  
→ Check RLS policies for SELECT

### If no errors but cart still empty:
→ Check browser local storage  
→ Try incognito/private window  
→ Clear all cookies and cache  
→ Check if user.id exists

---

## Contact for Help

When reporting issues, provide:

1. **Console logs** (all messages with [CartContext])
2. **Network tab** (requests to /api/current-orders)
3. **SQL query results** (SELECT * FROM current_orders)
4. **User ID** from console logs
5. **Browser and version**

---

**Created**: October 6, 2024  
**Status**: Debug Guide
