# Tab Payment Fix - Testing Guide

**Version:** v1.0.2  
**Date:** October 17, 2025  
**Purpose:** Verify Tab payment duplication bug is fixed

---

## Pre-Deployment Testing

### Test 1: Single Order Tab
**Objective:** Verify single-order tabs work correctly

**Steps:**
1. Open a new tab (assign to Table 1)
2. Add 1 order with items totaling $50
3. Confirm the order
4. Close the tab with $50 cash payment
5. Check the database

**Expected Results:**
```sql
-- Query the order
SELECT 
    o.order_number,
    o.session_id,
    o.total_amount,
    o.amount_tendered,
    o.change_amount,
    o.payment_method,
    o.status
FROM orders o
WHERE o.order_number = '[ORDER_NUMBER]';

-- Expected:
-- total_amount: 50.00
-- amount_tendered: NULL  ✅
-- change_amount: NULL    ✅
-- payment_method: 'cash'
-- status: 'completed'

-- Query the session
SELECT 
    session_number,
    total_amount,
    status
FROM order_sessions
WHERE id = '[SESSION_ID]';

-- Expected:
-- total_amount: 50.00
-- status: 'closed'
```

**Pass Criteria:** ✅ Order has NULL payment amounts, session is closed

---

### Test 2: Multiple Order Tab
**Objective:** Verify multi-order tabs don't duplicate payment amounts

**Steps:**
1. Open a new tab (assign to Table 2)
2. Add Order 1: Items totaling $30
3. Confirm Order 1
4. Add Order 2: Items totaling $40
5. Confirm Order 2
6. Add Order 3: Items totaling $30
7. Confirm Order 3
8. Close the tab with $100 cash payment
9. Check the database

**Expected Results:**
```sql
-- Query all orders in the session
SELECT 
    o.order_number,
    o.total_amount,
    o.amount_tendered,
    o.change_amount,
    o.status
FROM orders o
WHERE o.session_id = '[SESSION_ID]'
ORDER BY o.created_at;

-- Expected (3 rows):
-- Order 1: total_amount: 30.00, amount_tendered: NULL ✅
-- Order 2: total_amount: 40.00, amount_tendered: NULL ✅
-- Order 3: total_amount: 30.00, amount_tendered: NULL ✅

-- Verify no duplication
SELECT 
    COUNT(*) as order_count,
    SUM(o.total_amount) as sum_of_orders,
    SUM(COALESCE(o.amount_tendered, 0)) as sum_of_payments
FROM orders o
WHERE o.session_id = '[SESSION_ID]';

-- Expected:
-- order_count: 3
-- sum_of_orders: 100.00
-- sum_of_payments: 0.00  ✅ (should be 0, not 300!)
```

**Pass Criteria:** ✅ All orders have NULL payment amounts, sum is 0

---

### Test 3: POS Order (No Session)
**Objective:** Verify POS orders still work correctly (unchanged behavior)

**Steps:**
1. Create a POS order (no table, no session)
2. Add items totaling $50
3. Pay immediately with $50 cash
4. Check the database

**Expected Results:**
```sql
-- Query the POS order
SELECT 
    o.order_number,
    o.session_id,
    o.total_amount,
    o.amount_tendered,
    o.change_amount,
    o.payment_method,
    o.status
FROM orders o
WHERE o.order_number = '[ORDER_NUMBER]';

-- Expected:
-- session_id: NULL
-- total_amount: 50.00
-- amount_tendered: 50.00  ✅ (should have value for POS)
-- change_amount: 0.00
-- payment_method: 'cash'
-- status: 'completed'
```

**Pass Criteria:** ✅ POS order has payment amounts (unchanged)

---

### Test 4: Sales Report Accuracy
**Objective:** Verify sales reports show correct totals

**Steps:**
1. Note current date and time
2. Perform Test 2 (multi-order tab: $100)
3. Perform Test 3 (POS order: $50)
4. Run daily sales report for today
5. Verify totals

**Expected Results:**
```
Daily Sales Report
------------------
Total Revenue: $150.00  ✅
Transaction Count: 4    ✅ (3 tab orders + 1 POS order)
```

**Manual Verification:**
- Physical cash collected: $150
- System report: $150
- **Match:** ✅

**Pass Criteria:** ✅ Report matches physical payments

---

## Post-Deployment Testing

### Test 5: Data Migration Verification
**Objective:** Verify existing data was cleaned up correctly

**Steps:**
1. Run migration script verification queries
2. Check for any remaining duplicates

**Query:**
```sql
-- Should return 0 rows
SELECT 
    o.id,
    o.order_number,
    o.session_id,
    o.amount_tendered,
    o.change_amount
FROM orders o
WHERE 
    o.session_id IS NOT NULL 
    AND o.amount_tendered IS NOT NULL;
```

**Expected:** 0 rows returned ✅

**Pass Criteria:** ✅ No session-based orders have payment amounts

---

### Test 6: Historical Sales Report
**Objective:** Verify historical reports are still accurate

**Steps:**
1. Run sales report for yesterday
2. Compare with physical cash/card records
3. Verify totals match

**Expected:**
- Report uses `total_amount` (not `amount_tendered`)
- Totals should be accurate regardless of migration

**Pass Criteria:** ✅ Historical reports remain accurate

---

## Edge Case Testing

### Test 7: Tab with Cash Payment and Change
**Steps:**
1. Open tab with order totaling $47.50
2. Close tab with $50 cash payment
3. Verify change calculation

**Expected:**
```sql
-- Session should have:
-- total_amount: 47.50
-- Payment recorded at session level (not on order)

-- Order should have:
-- total_amount: 47.50
-- amount_tendered: NULL  ✅
-- change_amount: NULL    ✅
```

**Pass Criteria:** ✅ Change calculated correctly, not duplicated

---

### Test 8: Tab with Non-Cash Payment
**Steps:**
1. Open tab with order totaling $75
2. Close tab with card payment
3. Verify payment method recorded

**Expected:**
```sql
-- Order should have:
-- payment_method: 'card'
-- amount_tendered: NULL  ✅
-- change_amount: NULL    ✅
```

**Pass Criteria:** ✅ Payment method recorded, amounts NULL

---

## Regression Testing

### Test 9: Receipt Printing
**Steps:**
1. Close a multi-order tab
2. Print receipt
3. Verify receipt shows correct totals

**Expected:**
- Receipt shows all orders
- Subtotals for each order
- Grand total matches session total
- Payment method displayed
- Change amount displayed (if cash)

**Pass Criteria:** ✅ Receipt displays correctly

---

### Test 10: Cashier Performance Report
**Steps:**
1. Close multiple tabs as different cashiers
2. Run cashier performance report
3. Verify each cashier's sales are correct

**Expected:**
- Each cashier credited for tabs they closed
- Sales totals accurate (not inflated)
- Transaction counts correct

**Pass Criteria:** ✅ Cashier reports accurate

---

## Automated Test Checklist

### Unit Tests to Add
- [ ] Test `OrderSessionService.closeTab()` with single order
- [ ] Test `OrderSessionService.closeTab()` with multiple orders
- [ ] Verify payment amounts not set on individual orders
- [ ] Verify session totals calculated correctly

### Integration Tests to Add
- [ ] End-to-end tab creation and closure
- [ ] Sales report generation with tab orders
- [ ] Receipt generation for multi-order tabs

---

## Test Results Template

```
Test Date: _______________
Tester: _______________
Environment: [ ] Dev [ ] Staging [ ] Production

Test 1: Single Order Tab          [ ] Pass [ ] Fail
Test 2: Multiple Order Tab         [ ] Pass [ ] Fail
Test 3: POS Order                  [ ] Pass [ ] Fail
Test 4: Sales Report Accuracy      [ ] Pass [ ] Fail
Test 5: Data Migration             [ ] Pass [ ] Fail
Test 6: Historical Reports         [ ] Pass [ ] Fail
Test 7: Cash with Change           [ ] Pass [ ] Fail
Test 8: Non-Cash Payment           [ ] Pass [ ] Fail
Test 9: Receipt Printing           [ ] Pass [ ] Fail
Test 10: Cashier Report            [ ] Pass [ ] Fail

Overall Result: [ ] All Pass [ ] Some Failed

Notes:
_________________________________
_________________________________
_________________________________

Approved for Production: [ ] Yes [ ] No
Signature: _______________
```

---

## Troubleshooting

### Issue: Test 2 fails - orders still have amount_tendered
**Cause:** Code not deployed or cached
**Solution:** 
1. Clear application cache
2. Restart application server
3. Verify code version deployed

### Issue: Test 5 fails - old records still have duplicates
**Cause:** Migration script not run
**Solution:**
1. Run data migration script
2. Verify with Step 5 query

### Issue: Sales reports don't match
**Cause:** Reports using wrong field
**Solution:**
1. Verify reports use `total_amount` not `amount_tendered`
2. Check report queries in `reports.queries.ts`

---

## Sign-Off

**Developer:** _______________  Date: _______________  
**QA Lead:** _______________  Date: _______________  
**Manager:** _______________  Date: _______________

**Approved for Production:** [ ] Yes [ ] No
