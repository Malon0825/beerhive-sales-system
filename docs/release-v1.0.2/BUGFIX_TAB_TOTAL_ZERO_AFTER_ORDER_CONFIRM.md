# Bug Fix: Tab Total Becoming 0 After Confirming Orders

**Date:** 2024-11-18  
**Issue:** Tab totals reset to ₱0.00 after confirming orders in offline-first Tab module  
**Status:** ✅ Fixed  
**Priority:** Critical  
**Module:** Tab Management (Offline-First)

---

## Problem Description

When confirming orders on tabs in the offline-first flow, the tab remained open but the total became ₱0.00 instead of accumulating the order amounts.

### Symptoms
- User adds order to tab → order confirmed successfully
- Tab remains open (correct behavior)
- Tab total shows ₱0.00 instead of actual order total
- Orders are correctly saved and visible
- Issue occurs due to race condition between local updates and server sync

### Root Cause

Race condition in the offline-first synchronization flow:

1. **Local Update (Correct):** SessionOrderFlow updates session totals locally when order is confirmed
2. **Server Sync:** MutationSyncService syncs order creation and confirmation to server
3. **Database Trigger:** Server's `update_session_totals()` trigger recalculates session totals
4. **Background Fetch:** DataBatchingService fetches sessions from server to refresh cache
5. **Race Condition:** Background fetch sometimes executes before database trigger completes, returning stale/zero totals
6. **Overwrite:** Stale server data overwrites correct local totals in IndexedDB

The issue was that `DataBatchingService.fetchOrderSessions()` blindly overwrote local session data with server data, even when local data was more up-to-date.

---

## Solution

Implemented a **defensive merging strategy** with three components:

### 1. Defensive Merging in DataBatchingService (Primary Fix)

**File:** `src/lib/data-batching/DataBatchingService.ts`

Added logic to preserve higher local totals when syncing sessions from server:

```typescript
// Store in IndexedDB with defensive merging to prevent data loss
// CRITICAL FIX: If local session has higher totals than server, preserve local totals
for (const serverSession of records) {
  const localSession = await getOrderSessionById(serverSession.id);
  
  if (localSession && localSession._pending_sync) {
    // Local session has pending changes - preserve local totals if higher
    const mergedSession: OfflineOrderSession = {
      ...serverSession,
      // Preserve higher totals (local is more up-to-date if pending sync)
      subtotal: Math.max(localSession.subtotal ?? 0, serverSession.subtotal),
      total_amount: Math.max(localSession.total_amount ?? 0, serverSession.total_amount),
      discount_amount: Math.max(localSession.discount_amount ?? 0, serverSession.discount_amount),
      tax_amount: Math.max(localSession.tax_amount ?? 0, serverSession.tax_amount),
      // Keep pending sync flag until sync completes
      _pending_sync: localSession._pending_sync,
      _temp_id: localSession._temp_id,
    };
    
    console.log(
      `🛡️ [DataBatchingService] Defensive merge for session ${serverSession.session_number}: ` +
      `local total=₱${localSession.total_amount}, server total=₱${serverSession.total_amount}, ` +
      `using=₱${mergedSession.total_amount}`
    );
    
    await putOrderSession(mergedSession);
  } else {
    // No local session or no pending changes - use server data as-is
    await putOrderSession(serverSession);
  }
}
```

**Key Points:**
- Only applies defensive merging when `_pending_sync` flag is set
- Preserves higher totals (assumes local is more recent)
- Logs defensive merge operations for debugging
- Maintains other server data (status, timestamps, etc.)

### 2. Pending Sync Flag in SessionOrderFlow

**File:** `src/views/pos/SessionOrderFlow.tsx`

Mark session as having pending changes when updating totals locally:

```typescript
// Update session totals locally with pending sync flag
// This ensures defensive merging preserves these totals during background sync
await updateOrderSession(sessionId, {
  subtotal: (session?.subtotal || 0) + subtotal,
  total_amount: (session?.total_amount || 0) + subtotal,
  _pending_sync: true, // Mark as pending until orders fully sync
});
```

**Purpose:**
- Signals to DataBatchingService that local data is authoritative
- Prevents premature overwriting of local totals
- Gets cleared after successful sync

### 3. Session Refresh After Order Confirmation

**File:** `src/lib/data-batching/MutationSyncService.ts`

Fetch updated session from server after order confirmation to clear `_pending_sync` flag:

```typescript
// CRITICAL FIX: After order confirmation, fetch the updated session from server
// to get correct totals calculated by database trigger, and clear _pending_sync flag
try {
  const orderData = response.data;
  if (orderData && orderData.session_id) {
    console.log(`🔄 [MutationSyncService] Fetching updated session totals for: ${orderData.session_id}`);
    
    const { apiGet } = await import('@/lib/utils/apiClient');
    const sessionResponse = await apiGet(`/api/order-sessions/${orderData.session_id}`);
    
    if (sessionResponse && sessionResponse.success && sessionResponse.data) {
      const serverSession = sessionResponse.data;
      await updateOrderSession(serverSession.id, {
        subtotal: serverSession.subtotal ?? 0,
        discount_amount: serverSession.discount_amount ?? 0,
        tax_amount: serverSession.tax_amount ?? 0,
        total_amount: serverSession.total_amount ?? 0,
        _pending_sync: false, // Clear pending flag - server now has correct totals
        synced_at: new Date().toISOString(),
      });
      console.log(
        `✅ [MutationSyncService] Session totals refreshed: ` +
        `${serverSession.session_number} = ₱${serverSession.total_amount}`
      );
    }
  }
} catch (refreshError) {
  // Log but don't fail the mutation - order is already confirmed
  console.warn('⚠️ [MutationSyncService] Failed to refresh session totals (non-fatal):', refreshError);
}
```

**Purpose:**
- Ensures local cache has server-calculated totals after sync completes
- Clears `_pending_sync` flag to allow normal sync behavior
- Non-fatal - doesn't fail mutation if refresh fails

---

## Flow Diagram

### Before Fix (Broken)
```
1. User confirms order
   → SessionOrderFlow updates local session: total = ₱100
2. MutationSyncService syncs order to server
3. Background: DataBatchingService fetches sessions
   → Server trigger not yet done, returns total = ₱0
4. ❌ DataBatchingService overwrites local total: ₱100 → ₱0
```

### After Fix (Correct)
```
1. User confirms order
   → SessionOrderFlow updates local session: total = ₱100, _pending_sync = true
2. MutationSyncService syncs order to server
3. Background: DataBatchingService fetches sessions
   → Server returns total = ₱0 (trigger not done)
   → ✅ Defensive merge: Math.max(₱100 local, ₱0 server) = ₱100 (preserved)
4. After sync completes:
   → MutationSyncService fetches updated session: total = ₱100
   → Clears _pending_sync flag
   → ✅ Session now in sync with server
```

---

## Testing

### Manual Test Cases

1. **Basic Order Confirmation**
   - Open a tab
   - Add order with items (e.g., ₱100 total)
   - Confirm order
   - ✅ Verify tab total shows ₱100 (not ₱0)
   - Tab remains open

2. **Multiple Orders**
   - Open a tab
   - Add and confirm first order: ₱100
   - Add and confirm second order: ₱50
   - ✅ Verify tab total accumulates: ₱150

3. **Offline Mode**
   - Disconnect from network
   - Open a tab
   - Add and confirm order: ₱100
   - ✅ Verify tab total shows ₱100 locally
   - Reconnect to network
   - ✅ Verify tab total remains ₱100 after sync

4. **Network Race Condition**
   - Open a tab on slow network
   - Add and confirm order quickly: ₱100
   - Observe console logs for defensive merge
   - ✅ Verify tab total never drops to ₱0

### Console Log Verification

Look for these console messages to verify the fix is working:

```
🛡️ [DataBatchingService] Defensive merge for session TAB-001: 
   local total=₱100, server total=₱0, using=₱100

✅ [MutationSyncService] Session totals refreshed: TAB-001 = ₱100
```

---

## Database Trigger Context

The underlying database trigger that calculates session totals:

```sql
-- From migrations/release-v1.0.0/add_tab_system.sql
CREATE OR REPLACE FUNCTION update_session_totals()
RETURNS TRIGGER AS $$
DECLARE
    session_record RECORD;
BEGIN
    IF NEW.session_id IS NOT NULL THEN
        -- Recalculate totals for the session
        SELECT 
            COALESCE(SUM(subtotal), 0) as subtotal,
            COALESCE(SUM(discount_amount), 0) as discount_amount,
            COALESCE(SUM(tax_amount), 0) as tax_amount,
            COALESCE(SUM(total_amount), 0) as total_amount
        INTO session_record
        FROM orders
        WHERE session_id = NEW.session_id
            AND status NOT IN ('voided');
        
        -- Update session
        UPDATE order_sessions
        SET 
            subtotal = session_record.subtotal,
            discount_amount = session_record.discount_amount,
            tax_amount = session_record.tax_amount,
            total_amount = session_record.total_amount,
            updated_at = NOW()
        WHERE id = NEW.session_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

This trigger runs asynchronously and may not complete before background sync fetches the session.

---

## Files Changed

1. **src/lib/data-batching/DataBatchingService.ts**
   - Added defensive merging logic in `fetchOrderSessions()`
   
2. **src/views/pos/SessionOrderFlow.tsx**
   - Added `_pending_sync: true` flag when updating session totals
   
3. **src/lib/data-batching/MutationSyncService.ts**
   - Added session refresh after order confirmation in `processOrderConfirmMutation()`

---

## Related Issues

- Related to offline-first Tab module implementation
- Follows same defensive pattern as stock deduction handling
- Aligns with eventual consistency model of offline-first architecture

---

## Best Practices Applied

1. **Defensive Programming:** Never blindly overwrite local data with server data
2. **Optimistic UI:** Keep user-facing data correct while sync happens in background
3. **Race Condition Handling:** Use flags (`_pending_sync`) to track data freshness
4. **Non-blocking Sync:** Session refresh is non-fatal and doesn't block order confirmation
5. **Detailed Logging:** Console logs help diagnose sync issues in production

---

## Future Improvements

1. **Timestamp-Based Merging:** Could compare `updated_at` timestamps instead of relying solely on `_pending_sync` flag
2. **Version Numbers:** Add version counter to detect conflicts more reliably
3. **Sync Queue Priority:** Prioritize session refresh mutations after order confirmations
4. **Realtime Updates:** Consider using Supabase realtime to push session updates instead of polling

---

## Rollback Plan

If this fix causes issues, revert these changes:

```bash
git checkout HEAD~1 -- src/lib/data-batching/DataBatchingService.ts
git checkout HEAD~1 -- src/views/pos/SessionOrderFlow.tsx
git checkout HEAD~1 -- src/lib/data-batching/MutationSyncService.ts
```

The previous behavior will resume (with the original bug).
