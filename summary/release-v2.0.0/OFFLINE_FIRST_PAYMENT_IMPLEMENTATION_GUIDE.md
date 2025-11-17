# Offline-First Payment Implementation Guide

## Executive Summary

This guide implements the offline-first transaction flow to address field reports of poor connectivity causing transaction delays and revenue loss. The solution ensures all POS operations write to IndexedDB first, making the UI instantly responsive regardless of network conditions, while background sync handles remote reconciliation.

**Target**: Sub-second payment completion even with degraded Wi-Fi  
**Scope**: POS transactions (orders, tab closures, stock adjustments)  
**Status**: Implementation in progress – strict write-ahead queueing & MutationSyncService shipped; receipt/UI polish in progress.

---

## 1. Current State Analysis

### What Works ✅
- **Phase 0**: PWA infrastructure (Service Worker, manifest) operational
- **Phase 1**: Catalog data (products, categories, packages, tables) syncs to IndexedDB on app load and when connectivity returns
- **Phase 3**: Connectivity monitoring (`navigator.onLine`, heartbeat checks) active
- Cart operations persist locally via `CartContext` and IndexedDB

### Critical Gaps 🔴
1. **Offline receipts still partial**: POS/tab flows must consistently use the queued snapshot instead of `/api/orders/:id` when `options.isOffline` is true (tab close UI still pending).
2. **No sync telemetry UI**: We need an `OfflineStatusBadge` in the POS header to surface pending/failed counts + manual retry.
3. **Backend ingest contracts**: Supabase `pos_mutation_ingest` + monitoring views remain a design-only artifact and must be implemented before production rollout.

---

## 2. Implementation Tasks

### Task 2.1: Refactor PaymentPanel for Offline-First ✅

**File**: `src/views/pos/PaymentPanel.tsx`

**Changes** (current implementation):
1. Import offline utilities:
   ```typescript
   import { enqueueSyncMutation } from '@/lib/data-batching/offlineDb';
   import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
   import { toast } from '@/lib/hooks/useToast';
   ```

2. Add offline detection:
   ```typescript
   const { isOnline } = useOfflineRuntime();
   ```

3. Wrap payment logic in offline-first handler (queue-first):
   ```typescript
   const handlePayment = async () => {
     // ... existing validation ...
     
     try {
       setProcessing(true);
       
       // Build payload (existing code)
       const requestBody = { /* ... */ };
       const mutationType = mode === 'pos' ? 'orders.create' : 'orderSessions.close';
       const apiUrl = mode === 'pos' ? '/api/orders' : `/api/order-sessions/${sessionId}/close`;
       
       // Always write-ahead to IndexedDB to guarantee sub-second UX
       const queueId = await enqueueSyncMutation(mutationType, {
         endpoint: apiUrl,
         method: 'POST',
         body: requestBody,
         timestamp: new Date().toISOString(),
       });
       const tempOrderId = mode === 'pos' ? `offline-${queueId}-${Date.now()}` : sessionId ?? `session-offline-${queueId}`;

       toast({
         title: '💾 Transaction Queued',
         description: isOnline
           ? 'Synced orders will appear automatically once Supabase confirms.'
           : 'Device is offline. Order will sync when connection returns.',
       });

       onPaymentComplete(tempOrderId, {
         isOffline: true,
         queueId,
         localOrder: buildOfflineSnapshot(tempOrderId, queueId, cart, paymentState),
       });

       cart?.clearCart();
       resetForm();
       onOpenChange(false);

       if (isOnline) {
         MutationSyncService.getInstance().processPendingMutations().catch(console.error);
       }
     } catch (err: any) {
       console.error('[PaymentPanel] Fatal error:', err);
       setError(err.message || 'Failed to process payment');
     } finally {
       setProcessing(false);
     }
   };
   ```

**Testing**:
- With online connection: Payment should succeed normally
- With offline (DevTools → Network → Offline): Payment should enqueue and show offline toast
- With poor connection (DevTools → Network → Slow 3G): Should timeout and fallback to queue

---

### Task 2.2: Create MutationSyncService ✅

**File**: `src/lib/data-batching/MutationSyncService.ts` (new)

```typescript
'use client';

import { apiPost, apiPatch, apiPut } from '@/lib/utils/apiClient';
import {
  getMutationsByStatus,
  updateSyncQueueEntry,
  deleteSyncQueueEntry,
  countMutationsByStatus,
  type SyncQueueEntry,
} from './offlineDb';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export class MutationSyncService {
  private static instance: MutationSyncService;
  private syncing = false;
  private listeners = new Set<(status: SyncStatus) => void>();

  static getInstance(): MutationSyncService {
    if (!MutationSyncService.instance) {
      MutationSyncService.instance = new MutationSyncService();
    }
    return MutationSyncService.instance;
  }

  /**
   * Initialize sync service - listens for online events
   */
  async initialize(): Promise<void> {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      
      // Attempt initial sync if online
      if (navigator.onLine) {
        await this.processPendingMutations();
      }
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
    }
    this.listeners.clear();
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleOnline = async () => {
    if (navigator.onLine) {
      console.log('[MutationSyncService] Network restored, processing queue...');
      await this.processPendingMutations();
    }
  };

  /**
   * Process all pending mutations in the queue
   */
  async processPendingMutations(): Promise<void> {
    if (this.syncing) {
      console.log('[MutationSyncService] Sync already in progress, skipping...');
      return;
    }

    try {
      this.syncing = true;
      this.notifyListeners({ syncing: true, pendingCount: 0 });

      const pending = await getMutationsByStatus('pending', 50);
      
      if (pending.length === 0) {
        console.log('[MutationSyncService] No pending mutations');
        return;
      }

      console.log(`[MutationSyncService] Processing ${pending.length} pending mutations`);

      for (const mutation of pending) {
        await this.processMutation(mutation);
      }

      // Check for any remaining pending
      const remainingCount = await countMutationsByStatus('pending');
      this.notifyListeners({ syncing: false, pendingCount: remainingCount });

    } catch (error) {
      console.error('[MutationSyncService] Queue processing failed:', error);
      this.notifyListeners({ syncing: false, pendingCount: -1 });
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Process a single mutation
   */
  private async processMutation(mutation: SyncQueueEntry): Promise<void> {
    if (!mutation.id) {
      console.warn('[MutationSyncService] Mutation missing ID, skipping');
      return;
    }

    try {
      const { endpoint, method, body } = mutation.payload as any;

      // Mark attempt
      await updateSyncQueueEntry(mutation.id, {
        last_attempt_at: new Date().toISOString(),
        retry_count: mutation.retry_count + 1,
      });

      // Execute network request
      let response;
      switch (method?.toUpperCase()) {
        case 'POST':
          response = await apiPost(endpoint, body);
          break;
        case 'PATCH':
          response = await apiPatch(endpoint, body);
          break;
        case 'PUT':
          response = await apiPut(endpoint, body);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      if (!response.success) {
        throw new Error(response.error || 'Mutation replay failed');
      }

      // Success - delete from queue
      console.log(`[MutationSyncService] ✅ Mutation ${mutation.id} synced successfully`);
      await deleteSyncQueueEntry(mutation.id);

    } catch (error: any) {
      console.error(`[MutationSyncService] ❌ Mutation ${mutation.id} failed:`, error);

      // Check retry limit
      if (mutation.retry_count >= MAX_RETRIES) {
        console.warn(`[MutationSyncService] Mutation ${mutation.id} exceeded retry limit, marking as failed`);
        await updateSyncQueueEntry(mutation.id, {
          status: 'failed',
          error: error.message || 'Max retries exceeded',
        });
      } else {
        // Will retry on next sync
        console.log(`[MutationSyncService] Mutation ${mutation.id} will retry (${mutation.retry_count}/${MAX_RETRIES})`);
      }
    }
  }

  /**
   * Manual retry for failed mutations
   */
  async retryFailedMutations(): Promise<void> {
    try {
      const failed = await getMutationsByStatus('failed', 50);
      
      if (failed.length === 0) {
        console.log('[MutationSyncService] No failed mutations to retry');
        return;
      }

      console.log(`[MutationSyncService] Retrying ${failed.length} failed mutations`);

      // Reset to pending for retry
      for (const mutation of failed) {
        if (mutation.id) {
          await updateSyncQueueEntry(mutation.id, {
            status: 'pending',
            retry_count: 0,
            error: null,
          });
        }
      }

      // Process queue
      await this.processPendingMutations();

    } catch (error) {
      console.error('[MutationSyncService] Failed mutation retry error:', error);
      throw error;
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const [pending, failed] = await Promise.all([
      countMutationsByStatus('pending'),
      countMutationsByStatus('failed'),
    ]);

    return {
      syncing: this.syncing,
      pendingCount: pending,
      failedCount: failed,
    };
  }

  private notifyListeners(status: SyncStatus): void {
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (error) {
        console.error('[MutationSyncService] Listener error:', error);
      }
    }
  }
}

export interface SyncStatus {
  syncing: boolean;
  pendingCount: number;
  failedCount?: number;
}
```

**Integration**:
Add to `OfflineRuntimeContext.tsx`:
```typescript
import { MutationSyncService } from '@/lib/data-batching/MutationSyncService';

// In initialize effect:
const mutationSync = MutationSyncService.getInstance();
await mutationSync.initialize();
```

---

### Task 2.3: Update POSInterface Receipt Flow (in progress)

**File**: `src/views/pos/POSInterface.tsx`

**Changes**:
```typescript
const handlePaymentComplete = async (orderId: string, options?: PaymentCompleteOptions) => {
  try {
    if (options?.isOffline) {
      const receiptOrder = transformOfflineSnapshotToReceipt(options.localOrder, orderId);
      setReceiptData({ order: receiptOrder });
      setShowReceipt(true);
      toast({ title: '💾 Offline Order Saved', description: 'Receipt generated locally. Queue will sync automatically.' });
      cart.clearCart();
      return;
    }

    // Online path – mark as complete server-side, then fetch authoritative order for receipt
    await fetch(`/api/orders/${orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete' }) });
    const orderResponse = await fetch(`/api/orders/${orderId}`);
    const result = await orderResponse.json();
    if (result.success) {
      setReceiptData({ order: result.data });
      setShowReceipt(true);
    }
    cart.clearCart();
  } catch (error) {
    console.error('Error completing order:', error);
    setSuccessMessage(`Order saved (ID: ${orderId}). Will sync when online.`);
    cart.clearCart();
  }
};
```

> **Status**: POS flow updated; tab close route still needs the same `localOrder` handling.

---

### Task 2.4: Add Offline Status UI (pending)

**File**: `src/views/pos/components/OfflineStatusBadge.tsx` (new)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { MutationSyncService } from '@/lib/data-batching/MutationSyncService';
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
import { toast } from '@/lib/hooks/useToast';

export function OfflineStatusBadge() {
  const { isOnline } = useOfflineRuntime();
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const syncService = MutationSyncService.getInstance();
    
    // Subscribe to sync status changes
    const unsubscribe = syncService.subscribe((status) => {
      setSyncing(status.syncing);
      setPendingCount(status.pendingCount);
      setFailedCount(status.failedCount || 0);
    });

    // Load initial status
    syncService.getSyncStatus().then((status) => {
      setPendingCount(status.pendingCount);
      setFailedCount(status.failedCount || 0);
    });

    return () => unsubscribe();
  }, []);

  const handleRetry = async () => {
    try {
      const syncService = MutationSyncService.getInstance();
      await syncService.retryFailedMutations();
      toast({
        title: "Sync Retry Initiated",
        description: "Attempting to sync failed transactions...",
      });
    } catch (error) {
      toast({
        title: "Retry Failed",
        description: "Could not retry sync. Check connection.",
        variant: "destructive",
      });
    }
  };

  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null; // All synced, nothing to show
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          <WifiOff className="w-3 h-3 mr-1" />
          Offline Mode
        </Badge>
      )}
      
      {pendingCount > 0 && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          {syncing ? (
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          {pendingCount} Pending Sync
        </Badge>
      )}
      
      {failedCount > 0 && (
        <>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {failedCount} Failed
          </Badge>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleRetry}
            className="h-6 text-xs"
          >
            Retry Now
          </Button>
        </>
      )}
    </div>
  );
}
```

**Add to POS header**:
```typescript
// In POSInterface.tsx header section
import { OfflineStatusBadge } from './components/OfflineStatusBadge';

// Add to header JSX
<div className="flex items-center justify-between">
  <h1>POS Terminal</h1>
  <OfflineStatusBadge />
</div>
```

---

## 3. Testing Strategy

### 3.1 Unit Tests

**File**: `src/lib/data-batching/__tests__/MutationSyncService.test.ts`

```typescript
describe('MutationSyncService', () => {
  it('should enqueue mutations when offline', async () => {
    // Mock navigator.onLine = false
    // Trigger payment
    // Assert mutation in syncQueue
  });

  it('should process queue when online returns', async () => {
    // Enqueue mutations
    // Trigger online event
    // Assert API calls made
    // Assert queue cleared
  });

  it('should mark failed mutations after max retries', async () => {
    // Enqueue mutation
    // Mock API failure
    // Process queue MAX_RETRIES times
    // Assert status = 'failed'
  });
});
```

### 3.2 Integration Tests

1. **Offline Payment Flow**:
   - Open DevTools → Network → Offline
   - Add items to cart
   - Complete payment
   - Verify: Toast shows "Order Saved Offline"
   - Verify: Receipt displays with "OFFLINE" prefix
   - Verify: Cart clears
   - Check IndexedDB → `syncQueue` → Entry exists with `status: 'pending'`

2. **Sync on Reconnect**:
   - With offline payments in queue
   - DevTools → Network → Online
   - Verify: Status badge shows "Syncing..."
   - Verify: API requests fired to `/api/orders`
   - Verify: Queue entries deleted after success
   - Verify: Status badge clears

3. **Retry Failed Mutations**:
   - Enqueue payment
   - Mock API to return 500 error
   - Trigger sync 3 times
   - Verify: Mutation marked as `failed`
   - Click "Retry Now" button
   - Mock API success
   - Verify: Mutation clears from queue

### 3.3 Manual Testing Checklist

- [ ] Online payment works normally
- [ ] Offline payment stores locally and shows toast
- [ ] Receipt prints with offline data
- [ ] Status badge appears when offline
- [ ] Pending count increments with each offline payment
- [ ] Reconnect triggers automatic sync
- [ ] Failed mutations show in UI
- [ ] Retry button processes failed mutations
- [ ] Multiple offline payments queue correctly
- [ ] Cart clears after offline payment

---

## 4. Rollout Plan

### Phase 1: Development
- [ ] Implement Task 2.1 (PaymentPanel refactor)
- [ ] Implement Task 2.2 (MutationSyncService)
- [ ] Run unit tests
- [ ] Run integration tests

### Phase 2: Staging Validation
- [ ] Deploy to staging environment
- [ ] Test with real devices on poor Wi-Fi
- [ ] Verify IndexedDB quota usage
- [ ] Monitor sync latency
- [ ] Test edge cases (rapid offline/online toggling)

### Phase 3: Production Rollout
- [ ] Enable for single branch (pilot)
- [ ] Monitor for 48 hours
- [ ] Collect cashier feedback
- [ ] Roll out to remaining branches
- [ ] Document recovery procedures for support team

---

## 5. Monitoring & Observability

### Client-Side Telemetry
- Log sync queue size on app load
- Track mutation retry counts
- Measure time-to-sync after reconnect
- Alert if failed mutations > 5

### Server-Side Monitoring
- Track `/api/orders` latency by source
- Monitor for duplicate order detection
- Alert on conflict resolution failures
- Dashboard for sync SLA compliance

---

## 6. Recovery Procedures

### Stuck Mutations
If mutations won't sync:
1. Check browser console for errors
2. Verify network connectivity
3. Open IndexedDB (DevTools → Application → IndexedDB → `beerhive_pos_offline` → `syncQueue`)
4. Manually retry via UI "Retry Now" button
5. If still failing, export queue data and contact support

### Clear Local Cache
If IndexedDB corrupted:
```javascript
// Run in console
indexedDB.deleteDatabase('beerhive_pos_offline');
location.reload();
```

---

## 7. Success Metrics

- **Payment completion time**: Target < 1s even on degraded network
- **Sync success rate**: Target > 99.5% within 5 minutes of reconnect
- **Offline transaction adoption**: Track % of payments processed offline
- **Revenue impact**: Measure abandoned cart reduction vs. pre-offline baseline

---

## 8. Next Steps

1. **Immediate**: Finish Task 2.3 (tab/offline receipts) and Task 2.4 (status badge)
2. **Week 1**: Verification pass (unit/integration), Supabase ingest endpoints, staging deployment
3. **Week 2**: Testing and staging validation
4. **Week 3**: Pilot rollout to first branch
5. **Month 1**: Full production rollout + monitoring dashboard

---

**Document Owner**: Engineering Team  
**Last Updated**: 2025-01-16  
**Status**: Implementation Guide - Ready for Development
