# Bug Fix: Table Shows "Occupied + No Active Tab" After Closing Tab

**Date:** 2024-11-18  
**Issue:** After closing a tab, table shows "Occupied" status with "No active tab" message  
**Status:** ✅ Fixed  
**Priority:** Critical  
**Module:** Tab Management (Offline-First)  
**Related:** BUGFIX_TAB_TOTAL_ZERO_AFTER_ORDER_CONFIRM.md

---

## Problem Description

After successfully closing a tab (with or without payment), the table card in the UI displays:
- Status badge: "Occupied" (red)
- Content: "No active tab"
- Footer: "Table not available"

This confusing state occurs even though the tab was properly closed on the server and the table was marked as available.

### Symptoms
1. User closes tab successfully → server logs show "✅ Table marked as available"
2. Tab Management Dashboard refreshes
3. Table card shows "Occupied" + "No active tab" instead of "Available"
4. User cannot open new tab on the table (appears unavailable)
5. Issue persists until manual page refresh or app restart

### Root Cause

The issue stemmed from closed sessions remaining in IndexedDB:

1. **When tab closes:** Session status is updated to 'closed' in IndexedDB
2. **Background sync:** `DataBatchingService.fetchOrderSessions()` only fetches sessions with `status='open'`
3. **Closed sessions persist:** Closed sessions remain in IndexedDB indefinitely
4. **Table reference:** Table's `current_session_id` in local cache still points to closed session
5. **UI confusion:** TabManagementDashboard finds a session for the table, but it's closed
6. **Wrong display:** UI shows "Occupied + No active tab" hybrid state

The fundamental problem: **Closed sessions were being marked as closed but not removed from the local cache**, even though they would never be synced again (sync only handles open sessions).

---

## Solution

**Delete closed sessions from IndexedDB instead of marking them as closed.**

Since `DataBatchingService` only syncs `status='open'` sessions, closed sessions serve no purpose in the local cache and should be removed immediately.

### Changes Made

#### 1. MutationSyncService.ts - Session Close Mutation Handler

**File:** `src/lib/data-batching/MutationSyncService.ts`

```typescript
/**
 * Process orderSessions.close mutation
 * Closes session and processes payment on server, then removes from local cache.
 * CRITICAL: Closed sessions are deleted from IndexedDB (not just marked closed)
 * since DataBatchingService only syncs status='open' sessions.
 */
private async processSessionCloseMutation(params: {
  endpoint: string;
  body?: unknown;
  sessionId?: string;
}): Promise<any> {
  const { endpoint, body, sessionId } = params;

  console.log(`🔄 [MutationSyncService] Syncing session close: ${sessionId}`);

  const response = await apiPost(endpoint, body);

  if (!response || response.success === false) {
    const errorMsg = response?.error || '';
    
    // Handle idempotent case: session already closed
    if (errorMsg.toLowerCase().includes('already closed') || 
        errorMsg.toLowerCase().includes('not open') ||
        errorMsg.toLowerCase().includes('session is closed')) {
      console.log(`ℹ️ [MutationSyncService] Session ${sessionId} already closed on server (idempotent)`);
      
      // Remove from local cache since it's already closed
      if (sessionId) {
        const { deleteOrderSession } = await import('./offlineDb');
        await deleteOrderSession(sessionId);
        console.log(`🗑️ [MutationSyncService] Removed closed session from IndexedDB: ${sessionId}`);
      }
      
      // Return success - this is idempotent
      return { success: true, message: 'Session already closed (idempotent)' };
    }
    
    throw new Error(response?.error || 'Session close failed');
  }

  // CRITICAL FIX: Delete closed session from IndexedDB instead of updating status
  // This prevents UI from showing "Occupied + No active tab" state
  // DataBatchingService only syncs open sessions, so closed ones should be removed
  if (sessionId) {
    const { deleteOrderSession } = await import('./offlineDb');
    await deleteOrderSession(sessionId);
    console.log(`✅ [MutationSyncService] Session closed and removed from cache: ${sessionId}`);
  }

  return response;
}
```

**Key changes:**
- Replace `updateOrderSession()` with `deleteOrderSession()`
- Remove session immediately after successful close
- Handle idempotent case by also deleting session

#### 2. Close Tab Page - Zero Amount Auto-Close

**File:** `src/app/(dashboard)/order-sessions/[sessionId]/close/page.tsx`

```typescript
try {
  const { enqueueSyncMutation, deleteOrderSession } = await import('@/lib/data-batching/offlineDb');
  const { MutationSyncService } = await import('@/lib/data-batching/MutationSyncService');
  
  // Queue close mutation
  const queueId = await enqueueSyncMutation('orderSessions.close', {
    endpoint: `/api/order-sessions/${sessionId}/close`,
    method: 'POST',
    body: {
      payment_method: 'none',
      amount_tendered: 0,
      discount_amount: 0,
    },
    session_id: sessionId,
    created_at: new Date().toISOString(),
  });
  
  console.log(`📋 Queued zero-amount tab close: #${queueId}`);
  
  // CRITICAL FIX: Delete session from IndexedDB instead of marking as closed
  // This prevents UI from showing "Occupied + No active tab" state
  await deleteOrderSession(sessionId);
  
  console.log('✅ Session removed from IndexedDB (auto-close)');
  
  // Trigger sync if online
  if (isOnline) {
    const syncService = MutationSyncService.getInstance();
    void syncService.processPendingMutations();
  }

  alert('Tab closed successfully (No payment required - ₱0.00)');
  router.push('/tabs');
} catch (error) {
  console.error('Failed to auto-close zero-amount tab:', error);
  alert('Failed to close tab. Please try again.');
  router.push('/tabs');
}
```

**Key changes:**
- Import `deleteOrderSession` instead of `updateOrderSession`
- Delete session instead of marking as closed

#### 3. TabManagementDashboard - Zero Amount Close

**File:** `src/views/tabs/TabManagementDashboard.tsx`

Same pattern as Close Tab Page - delete session instead of updating status.

#### 4. PaymentPanel - Offline Payment Processing

**File:** `src/views/pos/PaymentPanel.tsx`

```typescript
// CRITICAL: Delete session from IndexedDB for offline-first UX
// This ensures the tab disappears from active tabs list immediately
// and prevents "Occupied + No active tab" state
if (mode === 'close-tab' && sessionId) {
  try {
    const { deleteOrderSession } = await import('@/lib/data-batching/offlineDb');
    await deleteOrderSession(sessionId);
    console.log('✅ [PaymentPanel] Session removed from IndexedDB:', sessionId);
  } catch (error) {
    console.error('⚠️ [PaymentPanel] Failed to remove session from cache:', error);
    // Don't block payment - sync will clean up eventually
  }
}
```

**Key changes:**
- Delete session immediately when payment is queued
- Ensures immediate UI feedback (tab disappears from active list)

---

## Flow Diagram

### Before Fix (Broken)
```
1. User closes tab
   → Server: Session closed, table available ✅
   → IndexedDB: Session status = 'closed' (still in cache)
2. TabManagementDashboard loads data
   → Reads sessions from IndexedDB
   → Finds closed session for table
3. ❌ UI shows "Occupied + No active tab"
   → Table appears unavailable
   → User confused
```

### After Fix (Correct)
```
1. User closes tab
   → Server: Session closed, table available ✅
   → IndexedDB: Session DELETED from cache ✅
2. TabManagementDashboard loads data
   → Reads sessions from IndexedDB
   → No session found for table ✅
3. ✅ UI shows "Available"
   → Table shows correct status
   → User can open new tab
```

---

## Why Delete Instead of Update?

### Original Approach (Broken)
```typescript
// Mark as closed but keep in cache
await updateOrderSession(sessionId, {
  status: 'closed',
  closed_at: new Date().toISOString(),
  _pending_sync: false,
});
```

**Problems:**
1. Closed sessions accumulate in IndexedDB forever
2. `fetchOrderSessions()` only syncs open sessions - closed ones never update
3. Table references (`current_session_id`) point to stale closed sessions
4. UI logic doesn't handle closed sessions properly
5. Memory bloat over time

### New Approach (Fixed)
```typescript
// Remove from cache entirely
await deleteOrderSession(sessionId);
```

**Benefits:**
1. ✅ Clean cache - only active sessions stored
2. ✅ No stale references
3. ✅ Simple UI logic - session exists = open, doesn't exist = closed
4. ✅ Aligns with sync strategy (only open sessions sync)
5. ✅ No memory bloat

---

## Testing

### Manual Test Cases

#### 1. **Normal Tab Close (With Payment)**
   - Open a tab
   - Add orders
   - Close tab with cash payment
   - ✅ Verify table immediately shows "Available" in UI
   - ✅ Verify "Close Tab & Pay" button appears for new tab

#### 2. **Zero Amount Tab Close**
   - Open a tab
   - Don't add any orders (total = ₱0)
   - Close tab
   - ✅ Verify table immediately shows "Available"
   - ✅ No "Occupied + No active tab" state

#### 3. **Offline Mode Tab Close**
   - Disconnect from network
   - Close a tab
   - ✅ Verify table shows "Available" immediately
   - Reconnect to network
   - ✅ Verify table remains "Available" after sync

#### 4. **Multiple Tabs Closed**
   - Open 3 tabs on different tables
   - Close all 3 tabs
   - ✅ Verify all 3 tables show "Available"
   - ✅ No tables stuck in "Occupied" state

#### 5. **Rapid Open/Close Cycle**
   - Open tab → immediately close → open again
   - ✅ Verify no race condition issues
   - ✅ Table status updates correctly

### Console Log Verification

Look for these console messages to verify the fix:

```
✅ [PaymentPanel] Session removed from IndexedDB: f3306567-...
✅ [MutationSyncService] Session closed and removed from cache: f3306567-...
🗑️ [MutationSyncService] Removed closed session from IndexedDB: f3306567-...
```

### Database Verification

Check that closed sessions are properly recorded on server:
```sql
SELECT id, session_number, status, closed_at, total_amount
FROM order_sessions
WHERE status = 'closed'
AND closed_at >= NOW() - INTERVAL '1 hour'
ORDER BY closed_at DESC;
```

---

## Architecture Alignment

### Sync Strategy
`DataBatchingService.fetchOrderSessions()`:
```typescript
let query = supabase
  .from('order_sessions')
  .select('*')
  .eq('status', 'open') // Only sync active sessions
  .order('updated_at', { ascending: true })
  .limit(limit);
```

**Rationale:** 
- Only active sessions need to be synced
- Closed sessions are historical (reports use server data)
- Local cache is for working data, not archives

### Cache Lifecycle
```
Session Created → putOrderSession() → status='open'
  ↓
Orders Added → updateOrderSession() → totals updated
  ↓
Orders Confirmed → updateOrderSession() → _pending_sync=true
  ↓
Session Closed → deleteOrderSession() → REMOVED from cache
```

**Key Principle:** Cache contains only actionable data (open sessions)

---

## Files Changed

1. **src/lib/data-batching/MutationSyncService.ts**
   - Updated `processSessionCloseMutation()` to delete instead of update
   
2. **src/app/(dashboard)/order-sessions/[sessionId]/close/page.tsx**
   - Changed zero-amount auto-close to delete session
   
3. **src/views/tabs/TabManagementDashboard.tsx**
   - Changed zero-amount close handler to delete session
   
4. **src/views/pos/PaymentPanel.tsx**
   - Changed offline payment handler to delete session

---

## Related Issues

- Related to offline-first Tab module implementation
- Complements BUGFIX_TAB_TOTAL_ZERO_AFTER_ORDER_CONFIRM.md
- Part of broader offline-first data consistency strategy

---

## Best Practices Applied

1. **Single Source of Truth:** Server is authority for closed sessions
2. **Cache Hygiene:** Remove stale data immediately
3. **Align with Sync Strategy:** Cache only what sync handles
4. **Optimistic UI:** Immediate feedback (session disappears)
5. **Idempotent Operations:** Handle "already closed" gracefully

---

## Future Improvements

1. **Periodic Cache Cleanup:** Background job to remove orphaned data
2. **Session Archive:** Optional local archive for recently closed sessions (last 7 days)
3. **Analytics:** Track close-to-reopen times for UX optimization
4. **Soft Delete:** Mark as deleted with timestamp, cleanup after 24h

---

## Rollback Plan

If this fix causes issues, revert these changes:

```bash
git checkout HEAD~1 -- src/lib/data-batching/MutationSyncService.ts
git checkout HEAD~1 -- src/app/(dashboard)/order-sessions/[sessionId]/close/page.tsx
git checkout HEAD~1 -- src/views/tabs/TabManagementDashboard.tsx
git checkout HEAD~1 -- src/views/pos/PaymentPanel.tsx
```

The previous behavior will resume (with the original bug).

---

## Performance Impact

### Before Fix
- **IndexedDB Size:** Grows indefinitely with closed sessions
- **Query Performance:** Slower as cache fills with closed sessions
- **Memory Usage:** Increases over time

### After Fix
- **IndexedDB Size:** Stable (only open sessions)
- **Query Performance:** Fast (fewer records)
- **Memory Usage:** Constant

---

## Security Considerations

- Closed sessions are not lost - they exist on the server
- Reports use server data, not local cache
- No PII is deleted prematurely (session data on server)
- Local deletion is cache management, not data destruction
