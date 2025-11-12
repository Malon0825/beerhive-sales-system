# Tab Discount Reporting Fix

**Date:** 2025-11-12  
**Issue:** Tab discounts not appearing in Discount Analysis Reports  
**Status:** ✅ Fixed

---

## Problem Summary

Tab discounts were being successfully logged to the `discounts` table for reporting, but the `order_sessions.discount_amount` field was being reset to 0 after tab closure. This caused:
- Reports showing discount records correctly
- Session totals appearing incorrect (discount = 0)
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
-- Recalculates totals from all orders in session
SELECT 
    COALESCE(SUM(discount_amount), 0) as discount_amount
FROM orders
WHERE session_id = NEW.session_id
    AND status NOT IN ('voided');

-- Overwrites session discount with sum from orders
UPDATE order_sessions
SET discount_amount = session_record.discount_amount
WHERE id = NEW.session_id;
```

### The Problem

**Original Code Flow (BROKEN):**

```typescript
// 1. Update session with tab-level discount
await OrderSessionRepository.update(sessionId, {
  discount_amount: finalDiscountTotal,  // ✅ Set to 100
});

// 2. Loop through orders and update each one
for (const order of orders) {
  await OrderRepository.update(order.id, {
    cashier_id: performedByUserId,
    payment_method: paymentData.payment_method,
  });
  // ⚠️ Trigger fires → sums order discounts (= 0) → overwrites session to 0!
}

// 3. Create discount record
await DiscountRepository.create({...});  // ✅ Record created
// But order_sessions.discount_amount = 0 ❌
```

**Why Individual Orders Have Zero Discount:**
- Tab-level discounts apply to the **entire session**, not individual orders
- Individual orders have `orders.discount_amount = 0`
- When trigger sums order discounts, it gets **0**, overwriting the tab discount

**Database Evidence:**
```sql
-- Discount records exist (correct)
SELECT * FROM discounts WHERE created_at >= NOW() - INTERVAL '1 day';
-- discount_amount = 350.00 ✅

-- But sessions show zero (incorrect)
SELECT * FROM order_sessions WHERE closed_at >= NOW() - INTERVAL '1 day';  
-- discount_amount = 0.00 ❌
```

---

## Solution Implemented

### Reorder Operations to Avoid Trigger Conflict

**Fixed Code Flow:**

```typescript
// 1. Calculate discount (but don't persist to database yet)
const finalDiscountTotal = existingDiscount + additionalDiscount;
const finalTotalAmount = OrderCalculation.calculateTotal(baseSubtotal, finalDiscountTotal, taxAmount);

// Update in-memory only for receipt generation
session.discount_amount = finalDiscountTotal;
session.total_amount = finalTotalAmount;

// NOTE: Session discount will be persisted AFTER order updates
// to prevent database trigger from overwriting it

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

// 4. CRITICAL FIX: Update session discount AFTER order updates
// This overwrites the trigger's reset with the correct tab-level discount
if (additionalDiscount > 0 || finalDiscountTotal !== (closedSession.discount_amount || 0)) {
  await OrderSessionRepository.update(sessionId, {
    discount_amount: finalDiscountTotal,  // ✅ Final value preserved
    total_amount: finalTotalAmount,
  });
}

// 5. Create discount record for reporting
if (additionalDiscount > 0) {
  await DiscountRepository.create({
    discount_amount: additionalDiscount,
    discount_type: discountType,
    discount_value: discountValue,
    reason: 'Tab discount applied at closure',
    cashier_id: paymentData.closed_by,
    order_id: orders[0]?.id ?? null,
  });
}
```

### Key Changes

**File:** `src/core/services/orders/OrderSessionService.ts`

1. **Removed early session discount update** (line ~252):
   - Deleted database update before order processing
   - Kept in-memory update for receipt generation
   - Added comment explaining deferred persistence

2. **Added session discount update AFTER order processing** (line ~347):
   - Moved session discount update to after all order updates
   - Added detailed comment explaining trigger conflict
   - Update happens after `OrderSessionRepository.close()`
   - Final write wins, preserving the tab-level discount

### Why This Solution Works

1. **Trigger runs first:** When orders are updated, trigger recalculates session totals from order sums (= 0)
2. **Final update wins:** Immediately after, we explicitly set the correct discount value
3. **No more updates:** Since all order processing is complete, no more triggers fire
4. **Discount preserved:** The final session update is the last write, preserving the tab discount

### Order of Operations

```
Calculate → Process orders → Trigger resets → Update session → Create record
discount      (cashier_id)     (discount=0)    (discount=100)    (✅ correct)
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

### 3. Check session table (CRITICAL TEST)

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

**Expected:** `discount_amount = 100.00` (NOT 0.00!), `total_amount = 400.00`

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
- ✅ Tab discounts appear in the list
- ✅ Discount amounts are correct
- ✅ Cashier names are displayed
- ✅ Date filters work correctly

### Success Criteria

**✅ All tests must pass:**
- `discounts` table has record with correct amount
- `order_sessions.discount_amount` is NOT 0 (this was the bug!)
- Both amounts match
- Reports display the discount
- No errors in server logs

---

## Technical Details

### Database Trigger

```sql
CREATE OR REPLACE FUNCTION public.update_session_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    session_record RECORD;
BEGIN
    -- Recalculate totals for the session by summing all orders
    SELECT 
        COALESCE(SUM(subtotal), 0) as subtotal,
        COALESCE(SUM(discount_amount), 0) as discount_amount,
        COALESCE(SUM(tax_amount), 0) as tax_amount,
        COALESCE(SUM(total_amount), 0) as total_amount
    INTO session_record
    FROM orders
    WHERE session_id = NEW.session_id
        AND status NOT IN ('voided');
    
    -- Update session with calculated totals
    UPDATE order_sessions
    SET 
        subtotal = session_record.subtotal,
        discount_amount = session_record.discount_amount,  -- ⚠️ This overwrites!
        tax_amount = session_record.tax_amount,
        total_amount = session_record.total_amount,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    
    RETURN NULL;
END;
$function$
```

**Why This Trigger Exists:**
- Automatically keeps session totals in sync with order changes
- Useful when orders are added, removed, or modified
- BUT conflicts with tab-level discounts applied at closure

### Alternative Solutions Considered

#### Option 1: Disable trigger during tab closure
❌ **Rejected:** Too risky; trigger serves important purpose for order updates

#### Option 2: Modify trigger to preserve manual discounts
❌ **Rejected:** Complex logic, hard to maintain, unclear how to detect "manual" vs "calculated"

#### Option 3: Store discount on first order
❌ **Rejected:** Breaks single-responsibility; tab discount is session-level concept

#### Option 4: Move session update after order processing
✅ **Chosen:** Minimal change, preserves existing logic, clear intent

### Impact Assessment

**What Changed:**
- Order of database writes in `OrderSessionService.closeTab`
- Timing of session discount update (moved to end)

**What Didn't Change:**
- Discount calculation logic
- Discount repository insertion
- Frontend payment flow
- Report queries
- Database schema
- Database triggers

**Backward Compatibility:** ✅ Fully compatible - No breaking changes

**Performance Impact:** ✅ Negligible - Same number of database calls, just reordered

---

## Summary

The fix ensures tab-level discounts are correctly persisted to both:
1. **`order_sessions.discount_amount`** - For session financial totals
2. **`discounts` table** - For audit and reporting

By updating the session discount **AFTER** all order updates complete, we prevent the `update_session_totals()` database trigger from overwriting the tab-level discount with a calculated sum of zero.

**Key Insight:** The trigger sums `orders.discount_amount` (which is 0 for tab orders) and overwrites the session. Moving the session update to the end ensures our explicit tab discount is the final write and is preserved.
