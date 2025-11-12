# Tab Discount Trigger Conflict Fix

**Date:** 2025-11-12  
**Issue:** Tab discounts inserted into `discounts` table but `order_sessions.discount_amount` reset to 0  
**Status:** ✅ Fixed

---

## Problem Summary

Tab discounts were being successfully logged to the `discounts` table for reporting, but the `order_sessions.discount_amount` field was being reset to 0 after tab closure. This caused:
- Reports showing discount records but session totals appearing incorrect
- Mismatch between discount audit trail and session financial totals

## Root Cause Analysis

### Database Trigger Conflict

The `update_session_totals()` database trigger fires on **ANY** order UPDATE and recalculates session totals by summing individual order amounts:

```sql
CREATE TRIGGER trigger_update_session_totals 
AFTER INSERT OR DELETE OR UPDATE ON public.orders 
FOR EACH ROW EXECUTE FUNCTION update_session_totals();
```

**Trigger Logic:**
```sql
-- Recalculate totals from all orders in session
SELECT 
    COALESCE(SUM(subtotal), 0) as subtotal,
    COALESCE(SUM(discount_amount), 0) as discount_amount,  -- ⚠️ Problem!
    COALESCE(SUM(tax_amount), 0) as tax_amount,
    COALESCE(SUM(total_amount), 0) as total_amount
FROM orders
WHERE session_id = NEW.session_id
    AND status NOT IN ('voided');

-- Update session with calculated totals
UPDATE order_sessions
SET 
    discount_amount = session_record.discount_amount,  -- ⚠️ Overwrites tab discount!
    total_amount = session_record.total_amount
WHERE id = NEW.session_id;
```

### Original Code Flow (BROKEN)

```typescript
// 1. Update session with tab-level discount
await OrderSessionRepository.update(sessionId, {
  discount_amount: finalDiscountTotal,  // ✅ Set to 100
  total_amount: finalTotalAmount,
});

// 2. Loop through orders and update each one
for (const order of orders) {
  await OrderRepository.update(order.id, {
    cashier_id: performedByUserId,
    payment_method: paymentData.payment_method,
    completed_at: new Date().toISOString(),
  });
  // ⚠️ Trigger fires here and resets discount_amount to 0!
}

// 3. Create discount record
await DiscountRepository.create({...});  // ✅ Record created, but session is wrong
```

**Problem:** 
1. Session updated with `discount_amount = 100`
2. Order updated → trigger fires → sums order discounts (= 0) → overwrites session to `discount_amount = 0`
3. Discount record created in `discounts` table, but session shows 0

### Why Individual Orders Have Zero Discount

Tab-level discounts apply to the **entire session**, not individual orders. Individual orders in a tab have:
- `orders.discount_amount = 0` (no item-level discount)
- The discount is applied at payment closure and stored in `order_sessions.discount_amount`

When the trigger sums `orders.discount_amount` for the session, it gets **0**, overwriting the tab discount.

---

## Solution Implemented

### Fixed Code Flow

Reorder operations so the session discount is set **AFTER** all order updates:

```typescript
// 1. Calculate discount (but don't persist yet)
const finalDiscountTotal = existingDiscount + additionalDiscount;
const finalTotalAmount = OrderCalculation.calculateTotal(baseSubtotal, finalDiscountTotal, taxAmount);

// Update in-memory only for receipt generation
session.discount_amount = finalDiscountTotal;
session.total_amount = finalTotalAmount;

// 2. Loop through orders and update each one
for (const order of orders) {
  await OrderRepository.update(order.id, {
    cashier_id: performedByUserId,
    payment_method: paymentData.payment_method,
    completed_at: new Date().toISOString(),
  });
  // ⚠️ Trigger fires here and sets discount_amount to 0 (from summing orders)
}

// 3. Close the session (sets status, timestamps)
const closedSession = await OrderSessionRepository.close(sessionId, paymentData.closed_by);

// 4. NOW update session with correct discount (overwrites trigger's reset)
if (additionalDiscount > 0 || finalDiscountTotal !== (closedSession.discount_amount || 0)) {
  await OrderSessionRepository.update(sessionId, {
    discount_amount: finalDiscountTotal,  // ✅ Final value preserved
    total_amount: finalTotalAmount,
  });
}

// 5. Create discount record for reporting
await DiscountRepository.create({...});  // ✅ Record created, session is correct
```

### Key Changes

**File:** `src/core/services/orders/OrderSessionService.ts`

1. **Removed early session update** (line ~252):
   ```diff
   - // Persist updated discount + total if a new discount was applied
   - session.discount_amount = finalDiscountTotal;
   - session.total_amount = finalTotalAmount;
   - 
   - if (additionalDiscount > 0) {
   -   await OrderSessionRepository.update(sessionId, {
   -     discount_amount: finalDiscountTotal,
   -     total_amount: finalTotalAmount,
   -   });
   - }
   + // Update in-memory session object for receipt generation
   + session.discount_amount = finalDiscountTotal;
   + session.total_amount = finalTotalAmount;
   + 
   + // NOTE: Session discount will be persisted AFTER order updates
   + // to prevent database trigger from overwriting it
   ```

2. **Added session update AFTER order processing** (line ~347):
   ```diff
   + // CRITICAL FIX: Update session discount and total AFTER all order updates
   + // The update_session_totals() trigger recalculates totals when orders are updated
   + // If we set the discount before order updates, the trigger overwrites it to 0
   + // By updating AFTER order completion, we preserve the tab-level discount
   + if (additionalDiscount > 0 || finalDiscountTotal !== (closedSession.discount_amount || 0)) {
   +   console.log(`💰 [OrderSessionService.closeTab] Updating session totals with discount:`, {
   +     finalDiscountTotal,
   +     finalTotalAmount,
   +     additionalDiscount,
   +   });
   +   
   +   await OrderSessionRepository.update(sessionId, {
   +     discount_amount: finalDiscountTotal,
   +     total_amount: finalTotalAmount,
   +   });
   + }
   ```

---

## Verification Steps

### 1. Close a tab with a discount

Apply a ₱100 discount to a ₱500 tab and close it.

### 2. Check discount table

```sql
SELECT 
  id, 
  discount_amount, 
  discount_type, 
  discount_value, 
  order_id,
  created_at
FROM public.discounts 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:** Record exists with `discount_amount = 100.00`

### 3. Check session table

```sql
SELECT 
  id,
  session_number,
  subtotal,
  discount_amount,
  total_amount,
  status,
  closed_at
FROM public.order_sessions 
WHERE closed_at >= NOW() - INTERVAL '1 hour'
ORDER BY closed_at DESC 
LIMIT 5;
```

**Expected:** `discount_amount = 100.00`, `total_amount = 400.00`

### 4. Verify relationship

```sql
SELECT 
  d.discount_amount as discount_record_amount,
  os.discount_amount as session_discount_amount,
  os.session_number,
  o.order_number
FROM public.discounts d
JOIN public.orders o ON d.order_id = o.id
JOIN public.order_sessions os ON o.session_id = os.id
WHERE d.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY d.created_at DESC;
```

**Expected:** Both amounts match (e.g., both = 100.00)

### 5. Check Discount Analysis Report

Navigate to Reports → Discount Analysis and verify:
- Tab discounts appear in the list
- Discount amounts are correct
- Cashier names are displayed
- Date filters work correctly

---

## Technical Details

### Why This Solution Works

1. **Trigger runs first:** When orders are updated, trigger recalculates session totals from order sums (= 0)
2. **Final update wins:** Immediately after, we explicitly set the correct discount value
3. **No more updates:** Since all order processing is complete, no more triggers fire
4. **Discount preserved:** The final session update is the last write, preserving the tab discount

### Order of Operations

```
Calculate discount → Process orders → Trigger resets → Update session → Create discount record
       ↓                   ↓              ↓               ↓                    ↓
    discount=100      cashier_id    discount=0      discount=100         discounts table
                                   (trigger)        (final update)        ✅ correct
```

### Alternative Solutions Considered

#### Option 1: Disable trigger during tab closure
❌ **Rejected:** Too risky; trigger serves important purpose for order updates

#### Option 2: Modify trigger to detect manual discounts
❌ **Rejected:** Complex logic, hard to maintain, unclear intent

#### Option 3: Store discount on first order
❌ **Rejected:** Breaks single-responsibility; tab discount is session-level concept

#### Option 4: Move session update after order processing
✅ **Chosen:** Minimal change, preserves existing logic, clear intent

---

## Impact Assessment

### What Changed
- Order of database writes in `OrderSessionService.closeTab`
- Timing of session discount update (moved to end)

### What Didn't Change
- Discount calculation logic
- Discount repository insertion
- Frontend payment flow
- Report queries
- Database schema

### Backward Compatibility
✅ **Fully compatible:** No breaking changes to API or database schema

### Performance Impact
✅ **Negligible:** Same number of database calls, just reordered

---

## Testing Checklist

- [x] Tab discount applied and shows in `order_sessions.discount_amount`
- [x] Tab discount record created in `discounts` table
- [x] Discount Analysis Report shows tab discounts
- [x] Session totals correctly reflect discount
- [x] Receipt shows correct discount and total
- [x] POS discounts still work (unaffected)
- [x] Multiple orders in tab handled correctly
- [x] Zero-discount tab closures work
- [x] Date range filters in reports work

---

## Summary

The fix ensures tab-level discounts are correctly persisted to both:
1. `order_sessions.discount_amount` (for session financial totals)
2. `discounts` table (for audit and reporting)

By updating the session discount **after** all order updates complete, we prevent the `update_session_totals()` database trigger from overwriting the tab-level discount with a calculated sum of zero.

This brings tab discount behavior into full parity with POS discounts, ensuring all discounts appear correctly in the Discount Analysis Report.
