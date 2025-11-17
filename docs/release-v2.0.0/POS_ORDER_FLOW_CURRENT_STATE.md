# POS Order Flow - Current System State

**Date**: 2025-11-17  
**Version**: v2.0.0 (Post-Fix)

## Complete POS Direct Payment Flow

### User Action: Customer Pays at POS

```
Customer → Cashier → POS Interface → Payment
```

### 1. Order Creation (`POST /api/orders`)

**Trigger**: User clicks "Pay" in POS with payment method selected

**Request**:
```json
{
  "items": [
    { "product_id": "...", "quantity": 2, "unit_price": 60 }
  ],
  "payment_method": "cash",
  "amount_tendered": 200,
  "customer_id": "...",
  "table_id": "..."
}
```

**What Happens**:
```typescript
// Step 1: Validate user (cashier)
cashierId = request.headers.get('x-user-id') || defaultPOSUser

// Step 2: Execute CreateOrder use case
order = await CreateOrder.execute(dto, cashierId)
```

### 2. CreateOrder Use Case

**File**: `src/core/use-cases/orders/CreateOrder.ts`

**Flow**:
```
┌─────────────────────────────────────────┐
│ 1. Validate Order                       │
│    - Check required fields              │
│    - Validate items array               │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. Validate Stock Availability          │
│    - Check current_stock for products   │
│    - Skip packages (handled separately) │
│    - Block if insufficient              │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. Process Order Items                  │
│    - Apply VIP pricing if customer      │
│    - Calculate item totals              │
│    - Handle product/package items       │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 4. Calculate Order Totals               │
│    - Subtotal from items                │
│    - Apply discounts                    │
│    - Calculate tax                      │
│    - Calculate total                    │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 5. Create Order Record                  │
│    - Insert into orders table           │
│    - Insert order_items                 │
│    - Status: PENDING (initial)          │
│    - completed_at: NULL                 │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 6. Update Table Status (if table_id)   │
│    - Mark table as OCCUPIED             │
│    - Link table to order                │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 7. Update Customer Stats (if customer) │
│    - Increment visit_count              │
│    - Update total_spent                 │
│    - Set last_visit_date                │
└─────────────────┬───────────────────────┘
                  ↓
                RETURN order
```

**Result**: Order created with `status = PENDING/NULL`, `completed_at = NULL`

---

### 3. Auto-Confirm Order (NEW FIX APPLIED)

**File**: `src/app/api/orders/route.ts` (Lines 134-146)

**Condition**: `if (body.payment_method)` - Payment was provided

**What Happens**:
```typescript
// Step 1: Confirm order (deduct stock, route to kitchen)
await OrderService.confirmOrder(order.id, cashierId);
```

#### 3a. OrderService.confirmOrder()

**File**: `src/core/services/orders/OrderService.ts`

**Flow**:
```
┌─────────────────────────────────────────┐
│ 1. Get Order with Items                 │
│    - Fetch from orders table            │
│    - Include order_items array          │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. Validate Order Status                │
│    - Must be DRAFT or PENDING           │
│    - Cannot confirm COMPLETED/VOIDED    │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. Check Stock Availability (Again)     │
│    - Double-check stock still available │
│    - Block if insufficient              │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 4. DEDUCT STOCK IMMEDIATELY             │
│    - Call StockDeduction.deductForOrder │
│    - Insert inventory_movements records │
│    - UPDATE products SET current_stock  │
│    - CRITICAL: Stock reserved now!      │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 5. Update Order Status to CONFIRMED     │
│    - UPDATE orders SET status           │
│    - completed_at: STILL NULL           │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 6. Route to Kitchen/Bartender           │
│    - Insert kitchen_orders records      │
│    - Status: PENDING                    │
│    - Real-time notification sent        │
└─────────────────────────────────────────┘
```

**Result**: Order status = `CONFIRMED`, stock deducted, kitchen notified

---

### 4. Complete Order (FIX - NEWLY ADDED)

**File**: `src/app/api/orders/route.ts` (Lines 143-146)

**What Happens**:
```typescript
// Step 2: Complete order (mark as paid/completed with timestamp)
await OrderService.completeOrder(order.id, cashierId);
```

#### 4a. OrderService.completeOrder()

**File**: `src/core/services/orders/OrderService.ts`

**Flow**:
```
┌─────────────────────────────────────────┐
│ 1. Get Order                            │
│    - Fetch from orders table            │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. Validate Order Status                │
│    - Cannot be COMPLETED (already done) │
│    - Cannot be VOIDED                   │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. Update Order Status to COMPLETED     │
│    - UPDATE orders SET:                 │
│      status = 'completed'               │
│      completed_at = NOW()   ← CRITICAL! │
│      updated_at = NOW()                 │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 4. Stock Already Deducted               │
│    - No stock changes needed            │
│    - Stock was reserved at confirm      │
└─────────────────────────────────────────┘
```

**Result**: Order status = `COMPLETED`, `completed_at = NOW()`

✅ **ORDER NOW VISIBLE IN REPORTS**

---

### 5. Response to Frontend

**File**: `src/app/api/orders/route.ts` (Lines 154-161)

```typescript
// Reload order to get updated status
const updatedOrder = await OrderRepository.getById(order.id);

return NextResponse.json({
  success: true,
  data: updatedOrder,
  message: 'Order created, confirmed, and completed',
}, { status: 201 });
```

**Frontend Receives**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "order_number": "ORD251117-0009-XXX",
    "status": "completed",
    "completed_at": "2025-11-17T11:47:00.000Z",
    "total_amount": "120.00",
    "payment_method": "cash",
    ...
  },
  "message": "Order created, confirmed, and completed"
}
```

---

## Impact on Other Systems

### Kitchen Display

**Status**: ✅ Working

**Flow**:
1. Kitchen orders created during `confirmOrder()` step
2. Kitchen display polls `/api/kitchen/orders`
3. Shows orders with `status = 'pending'`
4. Kitchen staff can mark as `preparing`, `ready`, `served`

**Note**: Kitchen flow unchanged, still works correctly

---

### Inventory System

**Status**: ✅ Working

**Flow**:
1. Stock deducted during `confirmOrder()` step
2. Inventory movements recorded with reason `'order_deduction'`
3. Products table `current_stock` updated immediately
4. No additional deduction at `completeOrder()`

**Critical**: Stock deduction happens at CONFIRM, not COMPLETE

---

### Reports System

**Status**: ✅ NOW FIXED

**Query**: `src/data/queries/reports.queries.ts`

```typescript
// Sales Report Query
await supabase
  .from('orders')
  .select('*')
  .is('session_id', null)           // POS orders only
  .gte('completed_at', startDate)   // ← Requires completed_at
  .lte('completed_at', endDate)     // ← Requires completed_at
  .eq('status', 'completed')        // ← Requires completed status
```

**Before Fix**: Orders had `completed_at = NULL`, `status = 'confirmed'` → **0 matches**  
**After Fix**: Orders have `completed_at = NOW()`, `status = 'completed'` → **✅ Matches**

---

## Order Status Lifecycle

### POS Direct Payment Orders (Current Flow)

```
┌──────────┐
│ PENDING  │  Order created by CreateOrder.execute()
└────┬─────┘
     │
     │ if (payment_method) → Auto-confirm
     ↓
┌──────────┐
│CONFIRMED │  Stock deducted, kitchen routed
└────┬─────┘  completeOrder() called
     │
     │ NEW FIX: completeOrder() now called
     ↓
┌──────────┐
│COMPLETED │  ✅ Visible in reports
└──────────┘  completed_at timestamp set
```

### Tab/Session Orders (Different Flow)

```
┌──────────┐
│  DRAFT   │  Order created without payment
└────┬─────┘
     │
     │ Customer adds more orders
     ↓
┌──────────┐
│  DRAFT   │  Multiple orders in session
└────┬─────┘
     │
     │ Customer requests bill
     ↓
┌──────────┐
│CONFIRMED │  All orders confirmed together
└────┬─────┘
     │
     │ Payment received (tab close)
     ↓
┌──────────┐
│COMPLETED │  Session closed, all orders completed
└──────────┘
```

---

## Database State After Fix

### Before Creating Order
```sql
-- Products table
current_stock = 100

-- Orders table
(no record)

-- Kitchen orders table
(no record)
```

### After CreateOrder.execute()
```sql
-- Orders table
INSERT INTO orders (
  status = 'PENDING',
  completed_at = NULL,
  total_amount = 120,
  payment_method = 'cash',
  ...
)

-- Order items table
INSERT INTO order_items (...)

-- Products table
current_stock = 100  ← NOT YET DEDUCTED
```

### After confirmOrder()
```sql
-- Orders table
UPDATE orders SET status = 'CONFIRMED'
-- completed_at STILL NULL

-- Inventory movements table
INSERT INTO inventory_movements (
  product_id = '...',
  quantity = -2,
  reason = 'order_deduction',
  movement_type = 'deduction'
)

-- Products table
UPDATE products SET current_stock = 98  ← DEDUCTED

-- Kitchen orders table
INSERT INTO kitchen_orders (
  order_id = '...',
  status = 'pending',
  ...
)
```

### After completeOrder() ← FIX APPLIED HERE
```sql
-- Orders table
UPDATE orders SET 
  status = 'COMPLETED',
  completed_at = '2025-11-17 11:47:00+00'  ← SET NOW
-- ✅ NOW MATCHES REPORT QUERY
```

---

## Key Differences: Before vs After Fix

### Before Fix
```
Create → Confirm → STOP
          ↓
    Stock deducted ✅
    Kitchen routed ✅
    status='confirmed' ❌
    completed_at=NULL ❌
    Reports: NOT visible ❌
```

### After Fix
```
Create → Confirm → Complete
          ↓         ↓
    Stock deducted ✅
    Kitchen routed ✅
                status='completed' ✅
                completed_at=NOW() ✅
                Reports: VISIBLE ✅
```

---

## Testing Scenarios

### Scenario 1: POS Cash Payment
```
1. Add items to cart
2. Click "Pay Cash"
3. Enter amount tendered
4. Submit payment

Expected Result:
- ✅ Order created
- ✅ Stock deducted immediately
- ✅ Kitchen receives order
- ✅ Order appears in today's report
- ✅ Order status = 'completed'
- ✅ completed_at = current timestamp
```

### Scenario 2: POS Card Payment
```
Same flow as cash

Expected Result: Same as above
```

### Scenario 3: Tab Order (No Payment Yet)
```
1. Add items to cart
2. Add to tab (no payment)

Expected Result:
- ✅ Order created
- ❌ Stock NOT deducted (draft order)
- ❌ Kitchen NOT notified
- ❌ Order NOT in reports
- ✅ Order status = 'DRAFT'
- ✅ completed_at = NULL
```

### Scenario 4: Close Tab with Payment
```
1. Customer has open tab with orders
2. Request bill
3. Customer pays
4. Close tab

Expected Result:
- ✅ All tab orders confirmed
- ✅ Stock deducted for all orders
- ✅ Kitchen notified
- ✅ All orders completed
- ✅ All orders in reports
- ✅ Session status = 'closed'
```

---

## Configuration & Settings

### Required Headers
```
x-user-id: <cashier_user_id>
```

If not provided, system uses default POS user.

### Environment Variables
No specific environment variables for this flow.

### Database Triggers
- `update_order_sessions_on_order_change`: Updates session totals
- `update_restaurant_tables_updated_at`: Updates table timestamps

---

## Error Handling

### Stock Validation Fails
```
Request → CreateOrder → Stock check fails
                         ↓
                   Throw AppError(400)
                         ↓
                   Order NOT created
                         ↓
            Response: { error: "Insufficient stock" }
```

### Confirm Fails (Non-Fatal)
```
Order created ✅
    ↓
confirmOrder() fails ❌
    ↓
Order exists but status = 'PENDING'
Stock NOT deducted
Kitchen NOT notified
    ↓
Response still returns order
Message: "Order created but may not be fully processed"
```

### Complete Fails (Non-Fatal)
```
Order created ✅
Order confirmed ✅
    ↓
completeOrder() fails ❌
    ↓
Order exists with status = 'CONFIRMED'
Stock deducted ✅
Kitchen notified ✅
BUT: Not visible in reports ❌
```

---

## Monitoring & Logging

### Console Logs (Development)
```
🔍 [CreateOrder] Received DTO
✅ [CreateOrder] Stock validation passed
✅ [CreateOrder] Order created successfully
🎯 [OrderService.confirmOrder] Confirming order
📦 [OrderService.confirmOrder] Deducting stock
✅ [OrderService.confirmOrder] Stock deducted
🍳 [OrderService.confirmOrder] Routing to kitchen
✅ [OrderService.confirmOrder] Kitchen routing completed
🎯 [OrderService.completeOrder] Completing order
✅ [OrderService.completeOrder] Order marked as COMPLETED
```

### Future: pos_sync_events Table
**Status**: Not yet implemented

**Planned**:
```sql
INSERT INTO pos_sync_events (
  device_id,
  mutation_type,
  result,
  latency_ms,
  created_at
)
```

For monitoring offline sync operations.

---

## Related Documentation

- `BUGFIX_POS_ORDERS_NOT_IN_REPORTS.md` - Bug fix details
- `POS_SYNC_TELEMETRY_DIAGNOSTIC.md` - Investigation findings
- `OFFLINE_POS_DATABATCHING_PLAN.md` - Offline-first roadmap
- `OFFLINE_POS_DATABATCHING_PHASE_PROGRESS.md` - Implementation progress

---

## Summary

**Current POS Order Flow** (Post-Fix):
1. **Create** → Order record + items in database
2. **Confirm** → Stock deducted + kitchen routed
3. **Complete** → Mark as paid + set timestamp ← **FIX APPLIED HERE**
4. **Report** → Order visible in sales reports ✅

**Key Fix**: Added `completeOrder()` call after `confirmOrder()` for paid orders, ensuring proper status and timestamp for report queries.
