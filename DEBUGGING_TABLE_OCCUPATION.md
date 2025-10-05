# Debugging Table Occupation Feature

**Issue**: Table not marked as occupied after successful order  
**Status**: Code implemented ✅, Server restarted ✅  
**Next**: Verify it's working

---

## Quick Test Steps

### 1. Open Browser Developer Tools (F12)

Before testing, open the console to see logs:
- Press **F12** in your browser
- Go to **Console** tab
- Clear any old messages

---

### 2. Create Order with Table

1. **Go to**: http://localhost:3000/pos
2. **Add products** to cart
3. **Select a table** (e.g., Table 1)
4. **Click Checkout**
5. **Complete payment**

---

### 3. Check Console Logs

**Look for these SUCCESS messages**:
```
✅ POST /api/orders 201
✅ Table {uuid} marked as OCCUPIED for order {uuid}
```

**If you see these, it's working!** ✓

---

### 4. Verify in Database

Open your Supabase dashboard or run this SQL:

```sql
-- Check table status
SELECT 
  table_number,
  status,
  current_order_id,
  updated_at
FROM restaurant_tables
ORDER BY table_number;
```

**Expected**: Table you selected should show:
- `status` = `'occupied'`
- `current_order_id` = order UUID (not null)

---

## Troubleshooting

### Problem 1: Console Shows "Table not found"

**Message**:
```
⚠️ Table {id} not found, creating order without table
```

**Cause**: table_id from cart is invalid or table doesn't exist

**Check**:
1. In browser console, before clicking checkout, type:
   ```javascript
   // Check cart state
   console.log('Cart:', localStorage.getItem('cart'));
   ```

2. Verify table exists:
   ```sql
   SELECT id, table_number, is_active 
   FROM restaurant_tables 
   WHERE table_number = '1';
   ```

**Solution**: Make sure you're selecting a valid, active table

---

### Problem 2: Console Shows "Table assignment error"

**Message**:
```
⚠️ Table assignment error (non-fatal): [error details]
```

**Cause**: Database error when updating table

**Check**:
1. Look at the full error message in console
2. Common causes:
   - RLS policy blocking update
   - Table not found
   - Network error

**Debug Query**:
```sql
-- Check RLS policies on restaurant_tables
SELECT * FROM pg_policies WHERE tablename = 'restaurant_tables';
```

---

### Problem 3: No Console Logs at All

**Cause**: Server didn't restart properly or code not compiled

**Solution**:
1. Check terminal where `npm run dev` is running
2. Should see: `✓ Compiled successfully`
3. If not, restart manually:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

---

### Problem 4: table_id is undefined

**Cause**: Cart context not storing table properly

**Debug**:
1. Open browser console
2. Before checkout, check cart state:
   ```javascript
   // Access cart context (if available)
   console.log('Cart table:', cart.table);
   ```

3. Should show:
   ```javascript
   {
     id: "uuid-here",
     table_number: "1",
     status: "available",
     ...
   }
   ```

---

## Expected Flow with Logs

### Successful Order Creation

**Browser Console**:
```
1. POST /api/orders 201 (Created)
2. {success: true, data: {id: "...", order_number: "..."}}
```

**Server Console** (Terminal):
```
1. POST /api/orders
2. ✅ Table {uuid} marked as OCCUPIED for order {uuid}
```

**Database**:
```sql
-- Table status
status = 'occupied'
current_order_id = [order UUID]

-- Order record
table_id = [table UUID]
```

---

## Manual Testing Checklist

- [ ] Browser DevTools open (F12)
- [ ] Console tab visible
- [ ] POS page loaded (http://localhost:3000/pos)
- [ ] Products added to cart
- [ ] Table selected from UI
- [ ] Payment completed
- [ ] Check console for success messages
- [ ] Verify database table status changed

---

## Common Issues & Solutions

### Issue: "Cannot read property 'id' of undefined"

**Location**: PaymentPanel sending table_id

**Cause**: cart.table is undefined

**Check in PaymentPanel.tsx**:
```typescript
console.log('Cart table:', cart.table);
console.log('Table ID being sent:', cart.table?.id);
```

---

### Issue: Order created but table not updated

**Cause**: Table assignment is non-fatal, so order succeeds even if update fails

**Check**:
1. Look for warning in console: `⚠️ Table assignment error (non-fatal)`
2. Check server terminal for full error
3. Verify RLS policies allow table updates

**Manual Fix**:
```sql
-- Manually mark table as occupied
UPDATE restaurant_tables 
SET 
  status = 'occupied',
  current_order_id = '[order-uuid-here]',
  updated_at = NOW()
WHERE id = '[table-uuid-here]';
```

---

### Issue: Table shows as occupied but order not linked

**Cause**: current_order_id not set correctly

**Check**:
```sql
SELECT 
  t.id as table_id,
  t.current_order_id,
  o.id as actual_order_id,
  o.order_number
FROM restaurant_tables t
LEFT JOIN orders o ON t.current_order_id = o.id
WHERE t.table_number = '1';
```

**Fix**:
```sql
UPDATE restaurant_tables 
SET current_order_id = '[correct-order-uuid]'
WHERE table_number = '1';
```

---

## Verify Code is Running

### Check CreateOrder.ts

Look at the server terminal when creating an order. You should see:

```
✅ Table {uuid} marked as OCCUPIED for order {uuid}
```

This comes from line 96 in `src/core/use-cases/orders/CreateOrder.ts`

If you DON'T see this:
1. Server might not have restarted
2. TypeScript not compiled
3. Code path not executing (e.g., no table_id)

---

## Add More Debugging (If Needed)

If the issue persists, add these console.logs:

### In CreateOrder.ts (line 93)

```typescript
if (dto.table_id) {
  console.log('🔍 DEBUG: About to assign table:', dto.table_id);
  try {
    await TableRepository.assignOrder(dto.table_id, order.id);
    console.log(`✅ Table ${dto.table_id} marked as OCCUPIED for order ${order.id}`);
  } catch (tableError) {
    console.error('⚠️ Table assignment error (non-fatal):', tableError);
  }
}
```

### In PaymentPanel.tsx (line 157)

```typescript
const orderData = {
  customer_id: cart.customer?.id,
  table_id: cart.table?.id,
  items: cart.items.map((item) => ({
    product_id: item.product.id,
    quantity: item.quantity,
    notes: item.notes,
  })),
  payment_method: selectedMethod,
  amount_tendered: selectedMethod === PaymentMethod.CASH 
    ? parseFloat(amountTendered) 
    : total,
  change_amount: selectedMethod === PaymentMethod.CASH ? changeAmount : 0,
  notes: referenceNumber ? `Ref: ${referenceNumber}` : undefined,
};

// Add this debug line
console.log('🔍 DEBUG: Sending order data:', orderData);
```

---

## Quick SQL Checks

### Check if table exists and is active
```sql
SELECT id, table_number, status, is_active 
FROM restaurant_tables 
WHERE table_number = '1';
```

### Check recent orders with tables
```sql
SELECT 
  o.order_number,
  o.table_id,
  t.table_number,
  t.status as table_status,
  o.created_at
FROM orders o
LEFT JOIN restaurant_tables t ON o.table_id = t.id
ORDER BY o.created_at DESC
LIMIT 5;
```

### Check if any tables are occupied
```sql
SELECT 
  table_number,
  status,
  current_order_id,
  updated_at
FROM restaurant_tables
WHERE status = 'occupied';
```

---

## Success Indicators

### ✅ Everything is working when you see:

1. **Browser Console**:
   - `POST /api/orders 201`
   - No errors

2. **Server Terminal**:
   - `✅ Table {id} marked as OCCUPIED for order {id}`

3. **Database**:
   - `restaurant_tables.status = 'occupied'`
   - `restaurant_tables.current_order_id = [order UUID]`
   - `orders.table_id = [table UUID]`

---

## Contact Points

If still not working after all checks:

1. **Share**:
   - Browser console logs (screenshot)
   - Server terminal output (screenshot)
   - SQL query results for table status

2. **Check**:
   - Is table_id being sent in the request?
   - Is server logging the "marked as OCCUPIED" message?
   - What error appears (if any)?

---

**Expected Result**: After completing purchase with a selected table, the table should automatically be marked as OCCUPIED in the database and show the correct status in the UI.
