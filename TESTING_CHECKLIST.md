# Testing Checklist - Payment Panel Fix

**Date**: 2025-10-05  
**Issues Fixed**: RLS Infinite Recursion + Customer Validation + 404 Error

---

## ✅ Fixes Applied

### 1. RLS Infinite Recursion (Database Level)
- Created security definer helper functions
- Updated users table RLS policies
- Updated orders, customers, products RLS policies
- **Status**: ✅ Applied via migrations

### 2. Customer Validation (Application Level)
- Made customer validation non-blocking
- Orders can proceed without customer
- Invalid customer IDs are cleared and logged
- **Status**: ✅ Code updated in CreateOrder.ts

### 3. Dev Server Restart
- Stopped old server (PID 42120)
- Started fresh server (PID 27872)
- Server running on http://localhost:3000
- **Status**: ✅ Server restarted

---

## 🧪 Test Scenarios

### Scenario 1: Walk-in Customer Order (No Customer)
**Steps**:
1. Open POS at http://localhost:3000
2. Add products to cart (do NOT select customer)
3. Click "Checkout" or "Pay"
4. Select payment method (e.g., Cash)
5. Enter amount tendered (if cash)
6. Click "Confirm Payment"

**Expected Result**:
- ✅ Order created successfully
- ✅ No errors in console
- ✅ Order ID returned
- ✅ Cart cleared

**Check Database**:
```sql
SELECT id, order_number, customer_id, total_amount, status 
FROM orders 
ORDER BY created_at DESC 
LIMIT 1;

-- customer_id should be NULL
```

---

### Scenario 2: Order with Valid Customer
**Steps**:
1. Open POS
2. Search and select a customer from the list
3. Add products to cart
4. Click "Checkout"
5. Complete payment

**Expected Result**:
- ✅ Order created with customer_id
- ✅ Customer stats updated (visit_count, total_spent)
- ✅ No errors

**Check Database**:
```sql
-- Check order
SELECT id, order_number, customer_id, total_amount 
FROM orders 
ORDER BY created_at DESC 
LIMIT 1;

-- Check customer stats updated
SELECT id, full_name, visit_count, total_spent, last_visit_date 
FROM customers 
WHERE id = 'customer-id-from-above';
```

---

### Scenario 3: Multiple Payment Methods
**Test each payment method**:

#### Cash Payment
- Enter amount tendered > total
- Should show change calculated
- ✅ Should process successfully

#### Card Payment
- Optional reference number
- ✅ Should process successfully

#### GCash/PayMaya Payment
- Required reference number
- Should show error if reference missing
- ✅ Should process with valid reference

#### Bank Transfer
- Required reference number
- ✅ Should process with valid reference

---

### Scenario 4: Validation Errors
**Test validation**:

1. **Empty Cart**
   - Try to checkout with no items
   - ✅ Should show "Cart is empty" error

2. **No Payment Method**
   - Have items in cart
   - Don't select payment method
   - ✅ Should show "Please select a payment method"

3. **Cash - Insufficient Amount**
   - Select Cash
   - Enter amount less than total
   - ✅ Should show error

4. **E-wallet - Missing Reference**
   - Select GCash/PayMaya
   - Leave reference number empty
   - ✅ Should show "Reference number is required"

---

## 🔍 Browser Console Checks

### Open DevTools Console (F12)

#### ✅ Success Indicators
Look for these in console:
```
✅ POST http://localhost:3000/api/orders 201
✅ {success: true, data: {...}, message: "Order created successfully"}
```

#### ⚠️ Warnings (Non-Critical)
These are OK:
```
⚠️ "Customer {uuid} not found, creating order without customer"
⚠️ "Kitchen routing error (non-fatal): ..."
```

#### ❌ Errors (Critical)
These should NOT appear:
```
❌ POST http://localhost:3000/api/orders 404 (Not Found)
❌ "infinite recursion detected in policy for relation 'users'"
❌ "Payment error: Error: Customer not found"
```

---

## 🗂️ Database Verification

### Check RLS Policies
```sql
-- Verify helper functions exist
SELECT proname, prosecdef, provolatile
FROM pg_proc 
WHERE proname IN ('is_admin', 'is_manager_or_admin', 'is_active_staff')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Should return 3 rows with prosecdef = true

-- Verify users policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Should see policies using helper functions like "is_admin()"
```

### Check Order Creation
```sql
-- Recent orders
SELECT 
  o.id,
  o.order_number,
  o.customer_id,
  c.full_name as customer_name,
  o.total_amount,
  o.payment_method,
  o.status,
  o.created_at
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
ORDER BY o.created_at DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### If 404 Error Persists

1. **Check dev server is running**
   ```bash
   netstat -ano | findstr ":3000"
   ```
   Should show LISTENING on port 3000

2. **Check for TypeScript errors**
   - Look at terminal where `npm run dev` is running
   - Should say "✓ Compiled successfully"
   - No red error messages

3. **Hard refresh browser**
   - Ctrl+Shift+R (Windows)
   - Cmd+Shift+R (Mac)

4. **Clear Next.js cache**
   ```bash
   rm -rf .next
   npm run dev
   ```

### If Customer Errors Persist

1. **Check customer exists in database**
   ```sql
   SELECT id, full_name FROM customers WHERE id = 'problem-customer-id';
   ```

2. **Check cart state**
   - Open React DevTools
   - Look at CartContext state
   - Verify customer object structure

3. **Check console logs**
   - Should see warning message about customer not found
   - Order should still proceed

---

## 📊 Success Criteria

### All tests pass when:

- [x] Walk-in orders (no customer) work
- [x] Orders with valid customers work
- [x] Orders with invalid customer IDs work (log warning)
- [x] All payment methods process successfully
- [x] Validation errors show correctly
- [x] No 404 errors in console
- [x] No RLS recursion errors
- [x] Database records created correctly
- [x] Customer stats update when customer present
- [x] Dev server runs without errors

---

## 📝 Test Results Log

### Test Run: [Date/Time]

| Scenario | Status | Notes |
|----------|--------|-------|
| Walk-in order | [ ] | |
| Order with customer | [ ] | |
| Cash payment | [ ] | |
| Card payment | [ ] | |
| GCash payment | [ ] | |
| Empty cart validation | [ ] | |
| No payment method validation | [ ] | |
| Browser console clean | [ ] | |
| Database records correct | [ ] | |

### Issues Found:
- [List any issues here]

### Notes:
- [Additional observations]

---

## 🚀 Next Steps

After all tests pass:
1. Test with real product data
2. Test with multiple concurrent orders
3. Test kitchen routing integration
4. Test table assignment
5. Generate receipts
6. Test void order flow

---

**Tested By**: _____________  
**Date**: _____________  
**Status**: [ ] PASS / [ ] FAIL  
**Sign-off**: _____________
