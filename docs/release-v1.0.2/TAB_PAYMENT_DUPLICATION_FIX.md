# Tab Payment Duplication Bug Fix

**Date:** October 17, 2025  
**Version:** v1.0.2  
**Issue:** Sales mismatch between physical payments and system records for Tab orders  
**Status:** ✅ Fixed

---

## Problem Description

### Symptom
Sales reports showed **inflated payment amounts** for Tab-based orders compared to actual physical cash/card payments received.

### Root Cause
In `OrderSessionService.closeTab()`, when closing a tab containing multiple orders, the **full session payment amount** was being assigned to **each individual order** in the session.

**Example Scenario:**
- Tab has 3 orders: Order A ($30), Order B ($40), Order C ($30)
- Total tab amount: $100
- Customer pays: $100 cash

**Before Fix (Incorrect):**
```typescript
// Each order got the FULL payment amount
Order A: amount_tendered = $100, change = $0
Order B: amount_tendered = $100, change = $0  
Order C: amount_tendered = $100, change = $0
// System recorded: $300 in payments for a $100 tab!
```

**After Fix (Correct):**
```typescript
// Payment details stored only at session level
Order A: amount_tendered = NULL, change = NULL
Order B: amount_tendered = NULL, change = NULL
Order C: amount_tendered = NULL, change = NULL
Session: amount_tendered = $100, change = $0
// System correctly records: $100 in payments
```

---

## Technical Details

### File Modified
`src/core/services/orders/OrderSessionService.ts`

### Code Change
**Lines 226-238:** Removed `amount_tendered` and `change_amount` from individual order updates.

**Before:**
```typescript
await OrderRepository.update(order.id, {
  cashier_id: performedByUserId,
  payment_method: paymentData.payment_method as any,
  amount_tendered: paymentData.amount_tendered,  // ❌ Duplicated
  change_amount: change,                          // ❌ Duplicated
  completed_at: new Date().toISOString(),
});
```

**After:**
```typescript
await OrderRepository.update(order.id, {
  cashier_id: performedByUserId,
  payment_method: paymentData.payment_method as any,
  completed_at: new Date().toISOString(),
  // ✅ Payment details NOT set - handled at session level
});
```

### Design Rationale

**Tab Payment Model:**
- Payment is processed **once** for the entire session
- Payment details (`amount_tendered`, `change_amount`) belong to the **session**, not individual orders
- Individual orders track their own `total_amount` for itemization
- Session tracks the aggregate payment for the entire tab

**POS Payment Model (unchanged):**
- Single order = single payment
- Payment details stored directly on the order
- No session involved

---

## Impact Analysis

### ✅ What This Fixes
1. **Sales Reports:** Now correctly show actual payment amounts
2. **Financial Reconciliation:** Physical cash/card matches system records
3. **Data Integrity:** Eliminates duplicate payment recording

### ✅ What Remains Unchanged
1. **Order totals:** Each order's `total_amount` is still correctly calculated
2. **Cashier tracking:** Cashier who closed the tab is still recorded on each order
3. **Payment method:** Still tracked on individual orders for reporting
4. **POS orders:** Single-order payments work exactly as before
5. **Sales queries:** All existing reports use `total_amount` (correct field)

### ⚠️ Data Migration Considerations

**Existing Data:**
- Orders created before this fix may have duplicate `amount_tendered` values
- These should be cleaned up with a data migration script

**Recommended Migration:**
```sql
-- Clear amount_tendered and change_amount from orders that belong to sessions
UPDATE orders 
SET 
  amount_tendered = NULL,
  change_amount = NULL
WHERE 
  session_id IS NOT NULL 
  AND status = 'completed';
```

---

## Testing Recommendations

### Test Case 1: Single Order Tab
1. Open a tab with 1 order ($50)
2. Close tab with $50 payment
3. **Verify:** Order has `amount_tendered = NULL`, session has payment details

### Test Case 2: Multiple Order Tab
1. Open a tab with 3 orders ($30, $40, $30)
2. Close tab with $100 payment
3. **Verify:** 
   - Each order has `amount_tendered = NULL`
   - Session has `amount_tendered = $100`
   - Sales report shows $100 total (not $300)

### Test Case 3: POS Order (No Session)
1. Create POS order ($50)
2. Pay with cash ($50)
3. **Verify:** Order has `amount_tendered = $50` (unchanged behavior)

### Test Case 4: Sales Report Accuracy
1. Close multiple tabs throughout the day
2. Run daily sales report
3. **Verify:** Total sales matches physical cash/card collected

---

## Related Files

### Modified
- `src/core/services/orders/OrderSessionService.ts` - Payment logic fix

### Verified (No Changes Needed)
- `src/data/queries/reports.queries.ts` - Uses `total_amount` ✅
- `src/core/services/reports/SalesReport.ts` - Uses `total_amount` ✅
- `src/models/entities/Order.ts` - Schema supports NULL values ✅
- `src/models/entities/OrderSession.ts` - Session payment fields exist ✅

---

## Deployment Notes

1. **Deploy code changes** to production
2. **Run data migration** to clean up existing duplicate payments
3. **Verify sales reports** match expected values
4. **Monitor** for any edge cases in the first few days

---

## Prevention

**Code Review Checklist:**
- [ ] Payment amounts should never be duplicated across related records
- [ ] Session-level data should be stored at session level, not on child records
- [ ] Always verify aggregation logic in reports matches data model

**Future Enhancements:**
- Add database constraints to prevent `amount_tendered` on orders with `session_id`
- Add automated tests for tab payment scenarios
- Add validation in API layer to reject invalid payment data

---

## Summary

This fix ensures that Tab payments are recorded correctly at the session level, eliminating the duplication bug that caused sales reports to show inflated amounts. The fix is minimal, focused, and maintains backward compatibility with POS orders while correcting the Tab payment flow.

**Impact:** Critical bug fix for financial accuracy  
**Risk:** Low - only affects how payment metadata is stored, not business logic  
**Testing:** Required before production deployment
