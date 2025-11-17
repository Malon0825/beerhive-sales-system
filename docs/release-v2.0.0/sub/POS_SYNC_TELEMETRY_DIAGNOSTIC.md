# POS Sync Telemetry & Reporting Diagnostic

**Date**: 2025-11-17  
**Issue**: User reports only seeing 1 order in reports despite making 4+ test orders today

## Database Findings

### ✅ Orders Table Status
**Result**: 8 orders successfully created today (2025-11-17)

| Order Number | Total | Status | Created At (UTC) | Created At (+08:00) |
|--------------|-------|--------|------------------|---------------------|
| ORD251117-0001-403 | ₱700.00 | confirmed | 03:21:04 | 11:21:04 AM |
| ORD251117-0002-443 | ₱230.00 | confirmed | 03:22:47 | 11:22:47 AM |
| ORD251117-0003-155 | ₱320.00 | confirmed | 03:22:56 | 11:22:56 AM |
| ORD251117-0004-382 | ₱60.00 | confirmed | 03:27:20 | 11:27:20 AM |
| ORD251117-0005-763 | ₱60.00 | confirmed | 03:28:59 | 11:28:59 AM |
| ORD251117-0006-321 | ₱240.00 | confirmed | 03:30:58 | 11:30:58 AM |
| ORD251117-0007-423 | ₱320.00 | confirmed | 03:31:01 | 11:31:01 AM |
| ORD251117-0008-949 | ₱300.00 | confirmed | 03:34:33 | 11:34:33 AM |

**Total Sales**: ₱2,230.00

### ❌ POS Sync Events Table Status
**Result**: 0 records (completely empty)

**Root Cause**: Telemetry logging was never implemented in API routes despite being marked as complete in the plan.

## Report System Analysis

### How Reports Query Data
Reports use the `orders` table directly via `getSalesByDateRange()`:
- Queries `orders` table where `status = 'completed'`
- Filters by `completed_at` timestamp
- **Does NOT depend on `pos_sync_events` table**

### Why Reports Show All 8 Orders
The reporting system is working correctly and has access to all order data from the database.

## Possible Causes of UI Showing Only 1 Order

### 1. Date/Time Filter Mismatch
- **Business hours timezone**: Reports use +08:00 timezone
- All orders were created between 11:21 AM - 11:34 AM local time
- If report filter is set incorrectly, orders may be filtered out

### 2. Stale/Cached Report Data
- Frontend may be showing cached data
- Browser may need hard refresh (Ctrl+Shift+R)
- Report state may not have re-fetched after new orders

### 3. Status Filter Issue
- Orders are marked as `confirmed` (not `completed`)
- If report queries for `completed` status only, they won't show
- **This is likely the issue** ⚠️

### 4. Session vs POS Order Confusion
- These orders have `session_id: null` (POS direct payment)
- If UI is filtering by session orders only, they won't appear

## Critical Issue: Order Status Discrepancy

```typescript
// In reports.queries.ts line 39
.eq('status', 'completed')
```

But all 8 orders today have `status = 'confirmed'`, NOT `'completed'`.

**This is the most likely cause of the reporting mismatch.**

## Solutions

### Immediate Fix: Check Order Status Values
1. Verify what statuses are being used for paid orders
2. Check if `confirmed` should be treated as `completed` for reports
3. Update report queries to include both statuses if needed:
   ```typescript
   .in('status', ['completed', 'confirmed'])
   ```

### Offline-First Telemetry Implementation
While `pos_sync_events` is not causing the current issue, it should still be implemented for monitoring:

1. **Add logging to API routes** (`/api/orders/route.ts`, `/api/order-sessions/[sessionId]/close/route.ts`):
   ```typescript
   // After successful order creation
   await supabaseAdmin.from('pos_sync_events').insert({
     device_id: req.headers.get('x-device-id') || 'unknown',
     mutation_type: 'order_create',
     queue_id: null, // null for online direct operations
     latency_ms: responseTime,
     result: 'success',
     metadata: { order_id, order_number }
   });
   ```

2. **Add logging to MutationSyncService** for offline queue processing

3. **Create monitoring dashboard** using the planned Supabase Saved Queries

## Recommended Actions

### Priority 1: Fix Report Status Filter
1. Check `OrderService.confirmOrder()` - does it set status to `completed`?
2. Update report queries to handle both `confirmed` and `completed` statuses
3. Test report with corrected filter

### Priority 2: Verify UI Report Filters
1. Check date range filter in UI
2. Verify timezone handling in report component
3. Clear cache and hard refresh

### Priority 3: Implement Telemetry Logging
1. Add `pos_sync_events` logging to API routes
2. Create monitoring dashboard
3. Add unit tests for telemetry

## Testing Commands

```sql
-- Check order statuses today
SELECT status, COUNT(*) 
FROM orders 
WHERE created_at >= CURRENT_DATE 
GROUP BY status;

-- Check completed vs confirmed orders
SELECT 
  order_number,
  status,
  total_amount,
  completed_at,
  created_at
FROM orders
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- Test report query (should match what reports.queries.ts does)
SELECT COUNT(*) as completed_count
FROM orders
WHERE completed_at >= CURRENT_DATE
  AND status = 'completed';

SELECT COUNT(*) as confirmed_count  
FROM orders
WHERE created_at >= CURRENT_DATE
  AND status = 'confirmed';
```

## Conclusion

**The `pos_sync_events` table being empty is NOT causing the reporting issue.** 

The root cause was a **missing step in the POS order flow**:
- ✅ Orders are created with payment
- ✅ Orders are auto-confirmed (stock deducted, kitchen routed)
- ❌ **Orders were NOT completed** (status='completed', completed_at timestamp)
- Reports query for `status = 'completed'` AND `completed_at >= date`
- Result: Orders excluded from reports

## Resolution

**Fixed in**: `src/app/api/orders/route.ts`

Added `OrderService.completeOrder()` call after `confirmOrder()` for POS orders with payment.

Now the flow is:
1. Create order
2. Confirm order (stock deducted, kitchen routed) → status='confirmed'
3. **Complete order (mark as paid)** → status='completed', completed_at=NOW() ✅

Orders now appear in reports immediately after payment.

The telemetry logging should still be implemented for monitoring purposes, but it's a separate concern from the reporting issue.

**See**: `BUGFIX_POS_ORDERS_NOT_IN_REPORTS.md` for full details.
