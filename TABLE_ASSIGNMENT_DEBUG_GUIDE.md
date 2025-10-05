# Table Assignment Debug Guide

## 🔍 Testing the Table Occupation Feature

I've added comprehensive logging throughout the order creation flow. Follow these steps to identify where the table assignment is failing.

---

## Step 1: Open Developer Tools

### Browser (Frontend Logs)
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Clear any old messages (click 🚫 icon)

### Terminal (Backend Logs)
1. Make sure your dev server is running: `npm run dev`
2. Keep the terminal visible to see server-side logs

---

## Step 2: Test the Flow

1. **Navigate to POS**: http://localhost:3000/pos
2. **Add products** to cart (at least 1 item)
3. **Select a table**: Click "Select Table" button
   - Choose an **available** table (green)
   - Note which table number you selected
4. **Click "Proceed to Payment"**
5. **Select payment method** (e.g., Cash)
6. **Click "Confirm Payment"** button ← This is the button you mentioned
7. **Watch the logs** in both browser console and terminal

---

## Step 3: Check the Logs

### Expected Log Sequence

#### 📱 Browser Console (look for these in order):

```
🔍 [PaymentPanel] Sending order data: {
  table_id: "uuid-here",
  table_info: {
    id: "uuid-here",
    table_number: "1",
    status: "available"
  },
  ...
}

🔍 [PaymentPanel] Order API response: {
  status: 201,
  success: true,
  order_id: "uuid-here",
  table_id: "uuid-here"
}

✅ [PaymentPanel] Order created successfully, order ID: uuid-here
```

#### 🖥️ Terminal/Server Console (look for these in order):

```
🔍 [POST /api/orders] Received request: {
  table_id: "uuid-here",
  customer_id: "...",
  items_count: 1,
  payment_method: "cash"
}

🔍 [CreateOrder] Received DTO: {
  table_id: "uuid-here",
  customer_id: "...",
  items_count: 1,
  payment_method: "cash"
}

🔍 [CreateOrder] Assigning table uuid-here to order uuid-here...

🔍 [TableRepository.assignOrder] Updating table uuid-here with order uuid-here

✅ [TableRepository.assignOrder] Successfully updated table: {
  id: "uuid-here",
  table_number: "1",
  status: "occupied",
  current_order_id: "order-uuid-here"
}

✅ [CreateOrder] Table uuid-here marked as OCCUPIED for order uuid-here
🔍 [CreateOrder] Updated table status: {
  table_id: "uuid-here",
  status: "occupied",
  current_order_id: "order-uuid-here"
}

✅ [POST /api/orders] Order created: {
  order_id: "uuid-here",
  order_number: "ORD...",
  table_id: "uuid-here",
  status: "pending"
}
```

---

## Step 4: Identify the Issue

### ❌ Problem 1: `table_id` is `undefined` or `null`

**Browser Console shows:**
```javascript
table_info: 'No table selected'
// or
table_id: undefined
```

**Cause**: Table not being stored in cart context

**Fix needed**: Check `CartContext` and table selection

---

### ❌ Problem 2: No table assignment logs

**Terminal shows:**
```
ℹ️ [CreateOrder] No table_id provided, skipping table assignment
```

**Cause**: `table_id` is not reaching the backend

**Fix needed**: Check if `table_id` is included in the request body

---

### ❌ Problem 3: Database error in assignment

**Terminal shows:**
```
❌ [TableRepository.assignOrder] Database error: { ... }
⚠️ [CreateOrder] Table assignment error (non-fatal): ...
```

**Cause**: Database update failed (possibly RLS policy issue)

**Fix needed**: Check database permissions and RLS policies

---

### ❌ Problem 4: Table not found

**Terminal shows:**
```
⚠️ Table {id} not found, creating order without table
```

**Cause**: Invalid table_id or table doesn't exist

**Fix needed**: Verify table exists in database

---

## Step 5: Verify in Database

After testing, check the database:

```sql
-- Check if table was updated
SELECT 
  id,
  table_number,
  status,
  current_order_id,
  updated_at
FROM restaurant_tables
WHERE table_number = '1';  -- Use your selected table number

-- Check the created order
SELECT 
  id,
  order_number,
  table_id,
  status,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- `restaurant_tables.status` = `'occupied'`
- `restaurant_tables.current_order_id` = order UUID
- `orders.table_id` = table UUID

---

## Step 6: Report Findings

**Please share:**

1. **Browser console logs** (screenshot or copy-paste)
2. **Terminal/server logs** (screenshot or copy-paste)
3. **Database query results** (if possible)
4. **Which step failed** based on the log sequence above

This will help me identify the exact issue and provide a targeted fix.

---

## Quick Checks

### Is the table actually selected?
- After selecting a table, the button should show "Table X" instead of "Select Table"
- Check browser console for the table_info in the order data

### Is the server running?
- Terminal should show: `✓ Compiled successfully`
- No compilation errors

### Is the database accessible?
- Previous orders should create successfully
- Tables should be visible in the POS

---

## Common Issues & Quick Fixes

### Issue: Logs show everything succeeded but table is still available

**Check if another process is resetting the table:**
- Real-time subscriptions updating table status
- Another API call releasing the table
- Database triggers

**Verify:**
```sql
-- Check table history (if you have audit logs)
SELECT * FROM audit_logs 
WHERE entity_type = 'restaurant_tables' 
ORDER BY created_at DESC LIMIT 10;
```

### Issue: "Table not found" but table exists

**Possible causes:**
- Table ID mismatch (check UUIDs match)
- Table `is_active = false`
- Wrong database/schema

---

## Next Steps

Once you have the logs, I can:
1. Identify the exact failure point
2. Implement the correct fix
3. Add any missing validations
4. Ensure tables stay occupied after orders

Please run the test and share the logs! 🔍
