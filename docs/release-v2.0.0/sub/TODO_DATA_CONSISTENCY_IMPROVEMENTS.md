# TODO: Data Consistency Improvements

**Date Created**: 2025-11-17  
**Priority**: HIGH  
**Related**: `DATA_CONSISTENCY_STRATEGY.md`

---

## Overview

Action items to ensure IndexedDB stays consistent with Supabase database in our offline-first POS architecture.

**Current Status**: ⚠️ Basic incremental sync implemented, but has consistency gaps  
**Target Status**: ✅ Production-ready sync with consistency guarantees

---

## 🔴 Phase 1: Critical (Implement Immediately)

### 1.1 Add Full Sync on First Load
**Priority**: CRITICAL  
**Effort**: 2-3 hours  
**Status**: ✅ DONE

**Problem**: When IndexedDB is empty or cursor is lost, incremental sync doesn't remove stale data.

**Task**:
```typescript
// File: src/lib/data-batching/DataBatchingService.ts

private async syncEntity(entity: BatchEntity): Promise<void> {
  try {
    const cursorKey = `${ENTITY_CURSOR_PREFIX}.${entity}`;
    const lastCursor = await getMetadataValue<string>(cursorKey);
    
    // NEW: Check if this is first sync or cursor lost
    if (!lastCursor) {
      console.log(`[DataBatchingService] First sync for ${entity}, doing full sync...`);
      await this.fullSyncEntity(entity);
      return;
    }
    
    // Existing incremental sync logic...
  } catch (error) {
    console.error(`[DataBatchingService] Failed to sync ${entity}`, error);
  }
}

// NEW: Add full sync method
private async fullSyncEntity(entity: BatchEntity): Promise<void> {
  console.log(`[DataBatchingService] Full sync starting for ${entity}...`);
  
  // Clear existing data to prevent stale records
  await clearStore(entity);
  
  // Fetch ALL records (no cursor filter)
  const { records, latestUpdatedAt } = await this.fetchEntityData(entity, undefined);
  
  if (records.length === 0) {
    console.warn(`[DataBatchingService] No records fetched for ${entity}`);
    return;
  }
  
  // Write to IndexedDB
  await bulkPut(entity, records as any);
  
  // Set cursor for future incremental syncs
  if (latestUpdatedAt) {
    await setMetadataValue(`${ENTITY_CURSOR_PREFIX}.${entity}`, latestUpdatedAt);
  }
  
  console.log(`[DataBatchingService] Full sync complete for ${entity}: ${records.length} records`);
}
```

**Files to Modify**:
- `src/lib/data-batching/DataBatchingService.ts`
- `src/lib/data-batching/offlineDb.ts` (add `clearStore` function if missing)

**Testing**:
- [ ] Clear IndexedDB
- [ ] Load app
- [ ] Verify full sync triggered
- [ ] Verify all records loaded
- [ ] Verify cursor set correctly
- [ ] Verify subsequent syncs are incremental

---

### 1.2 Implement Periodic Full Refresh
**Priority**: CRITICAL  
**Effort**: 3-4 hours  
**Status**: ✅ DONE

**Problem**: Over time, cache can drift due to deleted records, missed updates, or data corruption.

**Task**:
```typescript
// File: src/lib/data-batching/DataBatchingService.ts

async initialize(): Promise<void> {
  if (this.initialized) return;
  this.initialized = true;
  
  // NEW: Check if we need periodic full refresh
  const lastFullSync = await getMetadataValue<string>('lastFullSync');
  const now = new Date();
  const dayInMs = 24 * 60 * 60 * 1000;
  
  const needsFullSync = !lastFullSync || 
    (now.getTime() - new Date(lastFullSync).getTime() > dayInMs);
  
  if (needsFullSync) {
    console.log('[DataBatchingService] Triggering periodic full sync (24h elapsed)...');
    await this.fullSyncAll();
    await setMetadataValue('lastFullSync', now.toISOString());
  } else {
    console.log('[DataBatchingService] Doing incremental sync...');
    await this.syncAllEntities();
  }
  
  // Existing initialization code...
  if (typeof window !== 'undefined') {
    window.addEventListener('online', this.handleOnline);
  }
}

// NEW: Full sync all entities
private async fullSyncAll(): Promise<void> {
  console.log('[DataBatchingService] Starting full sync for all entities...');
  
  const entities: BatchEntity[] = ['products', 'categories', 'packages', 'tables'];
  
  for (const entity of entities) {
    try {
      await this.fullSyncEntity(entity);
    } catch (error) {
      console.error(`[DataBatchingService] Full sync failed for ${entity}:`, error);
      // Continue with other entities even if one fails
    }
  }
  
  console.log('[DataBatchingService] Full sync complete for all entities');
}
```

**Configuration Options** (add to constants):
```typescript
// src/lib/data-batching/constants.ts
export const FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const FULL_SYNC_METADATA_KEY = 'lastFullSync';
```

**Files to Modify**:
- `src/lib/data-batching/DataBatchingService.ts`
- `src/lib/data-batching/constants.ts` (optional)

**Testing**:
- [ ] Set lastFullSync to 2 days ago
- [ ] Restart app
- [ ] Verify full sync triggered
- [ ] Set lastFullSync to 1 hour ago
- [ ] Restart app
- [ ] Verify incremental sync triggered
- [ ] Monitor logs over 24 hours

---

### 1.3 Stock Quantity Authority
**Priority**: CRITICAL  
**Effort**: 1-2 hours  
**Status**: ✅ DONE

**Problem**: Stock quantities can drift between devices. Server should always be the authority.

**Task**:
```typescript
// File: src/lib/data-batching/DataBatchingService.ts

private async fetchProducts(lastUpdated?: string) {
  let query = supabase
    .from('products')
    .select('*')
    .order('updated_at', { ascending: true })
    .limit(1000);

  if (lastUpdated) {
    query = query.gt('updated_at', lastUpdated);
  }

  const { data, error } = await query;
  if (error) throw error;

  const records = (data || []).map((product: any): OfflineProduct => ({
    id: product.id,
    name: product.name,
    sku: product.sku ?? '',
    category_id: product.category_id ?? null,
    category_name: product.category?.name ?? null,
    category_color: product.category?.color_code ?? null,
    package_ids: Array.isArray(product.package_ids) ? product.package_ids : [],
    base_price: Number(product.base_price ?? 0),
    vip_price: product.vip_price ? Number(product.vip_price) : null,
    tax_group: product.tax_group ?? null,
    
    // CRITICAL: Always use server stock as authority
    current_stock: Number(product.current_stock ?? 0),
    reorder_point: Number(product.reorder_point ?? 0),
    
    // NEW: Track when stock was synced for debugging
    stock_synced_at: product.updated_at ?? new Date().toISOString(),
    
    image_url: product.image_url ?? null,
    is_featured: product.is_featured ?? false,
    updated_at: product.updated_at ?? new Date().toISOString(),
  }));

  return {
    records,
    latestUpdatedAt: records.at(-1)?.updated_at ?? lastUpdated ?? null,
  };
}
```

**Update IndexedDB Schema**:
```typescript
// File: src/lib/data-batching/offlineDb.ts

export interface OfflineProduct {
  id: string;
  name: string;
  sku: string;
  // ... existing fields ...
  current_stock: number;
  reorder_point: number;
  stock_synced_at: string; // NEW: When stock was last synced
  updated_at: string;
}
```

**Files to Modify**:
- `src/lib/data-batching/DataBatchingService.ts`
- `src/lib/data-batching/offlineDb.ts`

**Testing**:
- [ ] Create order on Device A → stock = 95
- [ ] Verify Supabase has stock = 95
- [ ] Sync Device B
- [ ] Verify Device B shows stock = 95 (not old value)
- [ ] Check `stock_synced_at` timestamp updated

---

### 1.4 Add Batch Commit with Checkpoints
**Priority**: HIGH  
**Effort**: 2-3 hours  
**Status**: ✅ DONE

**Problem**: If sync fails midway, progress is lost and next sync starts from beginning.

**Task**:
```typescript
// File: src/lib/data-batching/DataBatchingService.ts

private async syncEntity(entity: BatchEntity): Promise<void> {
  try {
    const cursorKey = `${ENTITY_CURSOR_PREFIX}.${entity}`;
    let cursor = await getMetadataValue<string>(cursorKey);
    
    if (!cursor) {
      await this.fullSyncEntity(entity);
      return;
    }
    
    // NEW: Batch sync with checkpoints
    let totalSynced = 0;
    const batchSize = 100;
    
    while (true) {
      console.log(`[DataBatchingService] Syncing ${entity} batch from cursor: ${cursor}`);
      
      // Fetch batch
      const { records, latestUpdatedAt } = await this.fetchEntityDataBatch(
        entity, 
        cursor, 
        batchSize
      );
      
      if (records.length === 0) {
        console.log(`[DataBatchingService] No more records for ${entity}, sync complete`);
        break;
      }
      
      // Write batch to IndexedDB
      await bulkPut(entity, records as any);
      totalSynced += records.length;
      
      // CHECKPOINT: Update cursor immediately after each batch
      if (latestUpdatedAt) {
        cursor = latestUpdatedAt;
        await setMetadataValue(cursorKey, cursor);
        console.log(`[DataBatchingService] Checkpoint: ${totalSynced} ${entity} synced`);
      }
      
      // If batch was smaller than batchSize, we're done
      if (records.length < batchSize) {
        break;
      }
    }
    
    console.log(`[DataBatchingService] Sync complete for ${entity}: ${totalSynced} total records`);
    
  } catch (error) {
    console.error(`[DataBatchingService] Failed to sync ${entity}`, error);
    throw error; // Let caller handle retry logic
  }
}

// NEW: Fetch with batch limit
private async fetchEntityDataBatch(
  entity: BatchEntity, 
  lastUpdated: string, 
  limit: number
) {
  const baseQuery = supabase
    .from(this.getTableName(entity))
    .select('*')
    .gt('updated_at', lastUpdated)
    .order('updated_at', { ascending: true })
    .limit(limit);
  
  const { data, error } = await baseQuery;
  if (error) throw error;
  
  const records = this.mapEntityData(entity, data || []);
  
  return {
    records,
    latestUpdatedAt: records.at(-1)?.updated_at ?? lastUpdated,
  };
}

private getTableName(entity: BatchEntity): string {
  switch (entity) {
    case 'products': return 'products';
    case 'categories': return 'product_categories';
    case 'packages': return 'packages';
    case 'tables': return 'restaurant_tables';
    default: throw new Error(`Unknown entity: ${entity}`);
  }
}
```

**Files to Modify**:
- `src/lib/data-batching/DataBatchingService.ts`

**Testing**:
- [ ] Simulate network failure mid-sync
- [ ] Verify cursor saved at last successful batch
- [ ] Resume sync
- [ ] Verify sync continues from checkpoint (not from start)

---

### 1.5 Add Sync Status Tracking
**Priority**: HIGH  
**Effort**: 2 hours  
**Status**: ✅ DONE

**Problem**: No visibility into sync health, last sync time, or record counts.

**Task**:
```typescript
// File: src/lib/data-batching/DataBatchingService.ts

export interface SyncStatus {
  lastSync: Date | null;
  lastFullSync: Date | null;
  syncing: boolean;
  entity: BatchEntity | null;
  error: string | null;
  recordCounts: Record<BatchEntity, number>;
}

export class DataBatchingService {
  private currentSyncEntity: BatchEntity | null = null;
  private lastError: string | null = null;
  
  async getSyncStatus(): Promise<SyncStatus> {
    const entities: BatchEntity[] = ['products', 'categories', 'packages', 'tables'];
    const recordCounts: Record<BatchEntity, number> = {
      products: 0,
      categories: 0,
      packages: 0,
      tables: 0,
    };
    
    // Get record counts from IndexedDB
    for (const entity of entities) {
      const records = await readAllRecords(entity);
      recordCounts[entity] = records.length;
    }
    
    // Get last sync timestamps
    const lastSyncTimestamps = await Promise.all(
      entities.map(e => getMetadataValue<string>(`${ENTITY_CURSOR_PREFIX}.${e}`))
    );
    
    const lastSync = lastSyncTimestamps
      .filter(Boolean)
      .map(ts => new Date(ts!))
      .sort((a, b) => a.getTime() - b.getTime())[0] || null;
    
    const lastFullSyncStr = await getMetadataValue<string>('lastFullSync');
    const lastFullSync = lastFullSyncStr ? new Date(lastFullSyncStr) : null;
    
    return {
      lastSync,
      lastFullSync,
      syncing: this.syncingPromise !== null,
      entity: this.currentSyncEntity,
      error: this.lastError,
      recordCounts,
    };
  }
  
  private async syncEntity(entity: BatchEntity): Promise<void> {
    this.currentSyncEntity = entity;
    this.lastError = null;
    
    try {
      // ... existing sync logic ...
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      this.currentSyncEntity = null;
    }
  }
}
```

**Files to Modify**:
- `src/lib/data-batching/DataBatchingService.ts`

**Testing**:
- [ ] Call `getSyncStatus()` before sync
- [ ] Call during sync
- [ ] Call after sync
- [ ] Verify all fields populated correctly
- [ ] Test with sync error

---

## 🟡 Phase 2: Enhanced Consistency (Next Sprint)

### 2.1 Implement Soft Deletes
**Priority**: MEDIUM  
**Effort**: 4-6 hours  
**Status**: ⏳ TODO

**Task**: Add `deleted_at` column to all synced tables and update sync logic.

**Migration**:
```sql
-- File: migrations/add_soft_deletes_to_synced_tables.sql

-- Add deleted_at columns
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE product_categories ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE packages ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE restaurant_tables ADD COLUMN deleted_at TIMESTAMPTZ;

-- Update function to soft delete instead of hard delete
CREATE OR REPLACE FUNCTION soft_delete_record(
  table_name TEXT,
  record_id UUID
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1',
    table_name
  ) USING record_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_categories_deleted_at ON product_categories(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_packages_deleted_at ON packages(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_tables_deleted_at ON restaurant_tables(deleted_at) WHERE deleted_at IS NOT NULL;
```

**Update Application**:
- Update `OfflineProduct`, `OfflineCategory`, etc. interfaces
- Sync includes soft-deleted records
- Filter deleted records in UI queries
- Admin panel uses soft delete function

**Files to Create**:
- `migrations/add_soft_deletes_to_synced_tables.sql`

**Files to Modify**:
- `src/lib/data-batching/offlineDb.ts` (add `deleted_at` fields)
- `src/lib/data-batching/DataBatchingService.ts` (sync deleted records)
- `src/views/pos/POSInterface.tsx` (filter out deleted)

---

### 2.2 Add Sync Status UI Indicator
**Priority**: MEDIUM  
**Effort**: 3-4 hours  
**Status**: ⏳ TODO

**Task**: Create UI component showing sync status and manual refresh button.

```typescript
// File: src/components/pos/SyncStatusIndicator.tsx

'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataBatchingService } from '@/lib/data-batching/DataBatchingService';
import { useOnlineStatus } from '@/lib/contexts/OfflineRuntimeContext';
import { toast } from '@/components/ui/use-toast';

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const isOnline = useOnlineStatus();
  const dataBatching = DataBatchingService.getInstance();
  
  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);
  
  async function loadStatus() {
    const syncStatus = await dataBatching.getSyncStatus();
    setStatus(syncStatus);
  }
  
  async function handleManualSync() {
    try {
      setSyncing(true);
      toast({ title: 'Syncing...', description: 'Refreshing data from server' });
      
      await dataBatching.syncAllEntities();
      await loadStatus();
      
      toast({ title: 'Sync Complete', description: 'Data refreshed successfully' });
    } catch (error) {
      toast({ 
        title: 'Sync Failed', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSyncing(false);
    }
  }
  
  const lastSyncText = status?.lastSync 
    ? getRelativeTime(status.lastSync)
    : 'Never';
  
  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Indicator */}
      <Badge variant={isOnline ? 'default' : 'secondary'}>
        {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
      
      {/* Last Sync Time */}
      <span className="text-sm text-muted-foreground">
        Last synced: {lastSyncText}
      </span>
      
      {/* Error Indicator */}
      {status?.error && (
        <AlertCircle className="w-4 h-4 text-destructive" title={status.error} />
      )}
      
      {/* Manual Refresh Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleManualSync}
        disabled={!isOnline || syncing || status?.syncing}
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
```

**Files to Create**:
- `src/components/pos/SyncStatusIndicator.tsx`

**Files to Modify**:
- `src/views/pos/POSInterface.tsx` (add indicator to header)

---

### 2.3 Add Sync Diagnostics Page
**Priority**: LOW  
**Effort**: 3-4 hours  
**Status**: ⏳ TODO

**Task**: Create admin page showing detailed sync status and diagnostics.

```typescript
// File: src/app/(dashboard)/admin/sync-diagnostics/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataBatchingService } from '@/lib/data-batching/DataBatchingService';

export default function SyncDiagnosticsPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const dataBatching = DataBatchingService.getInstance();
  
  useEffect(() => {
    loadStatus();
  }, []);
  
  async function loadStatus() {
    const syncStatus = await dataBatching.getSyncStatus();
    setStatus(syncStatus);
  }
  
  async function handleFullRefresh() {
    setLoading(true);
    try {
      await dataBatching.fullSyncAll();
      await loadStatus();
      alert('Full refresh complete');
    } catch (error) {
      alert('Failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Sync Diagnostics</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Last Incremental Sync</p>
              <p className="text-lg font-semibold">
                {status?.lastSync?.toLocaleString() || 'Never'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Last Full Sync</p>
              <p className="text-lg font-semibold">
                {status?.lastFullSync?.toLocaleString() || 'Never'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Products</p>
              <p className="text-lg font-semibold">{status?.recordCounts.products || 0}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Categories</p>
              <p className="text-lg font-semibold">{status?.recordCounts.categories || 0}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Packages</p>
              <p className="text-lg font-semibold">{status?.recordCounts.packages || 0}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Tables</p>
              <p className="text-lg font-semibold">{status?.recordCounts.tables || 0}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-lg font-semibold">
              {status?.syncing ? `Syncing ${status.entity}...` : 'Idle'}
            </p>
          </div>
          
          {status?.error && (
            <div className="p-4 bg-destructive/10 rounded-md">
              <p className="text-sm font-semibold text-destructive">Error</p>
              <p className="text-sm">{status.error}</p>
            </div>
          )}
          
          <Button 
            onClick={handleFullRefresh} 
            disabled={loading || status?.syncing}
            className="w-full"
          >
            {loading ? 'Syncing...' : 'Force Full Refresh'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Files to Create**:
- `src/app/(dashboard)/admin/sync-diagnostics/page.tsx`

---

## 🟢 Phase 3: Real-time Sync (Future)

### 3.1 Implement Supabase Realtime Subscriptions
**Priority**: LOW  
**Effort**: 6-8 hours  
**Status**: ⏳ TODO

**Task**: Subscribe to database changes and update IndexedDB in real-time.

**Benefits**:
- Instant updates across all devices
- No need to wait for periodic sync
- Better multi-device experience

**Note**: Requires Supabase Realtime enabled and proper RLS policies.

---

### 3.2 Implement Conflict Detection
**Priority**: LOW  
**Effort**: 8-10 hours  
**Status**: ⏳ TODO

**Task**: Detect when same record modified on multiple devices offline, queue for manual resolution.

---

### 3.3 Implement Optimistic UI
**Priority**: LOW  
**Effort**: 6-8 hours  
**Status**: ⏳ TODO

**Task**: Show changes immediately in UI, rollback if sync fails.

---

## Testing Checklist

### Phase 1 Testing
- [ ] Full sync on first load
- [ ] Periodic 24-hour refresh
- [ ] Stock sync accuracy
- [ ] Batch commit with checkpoints
- [ ] Sync status tracking
- [ ] Multi-device scenarios
- [ ] Network failure recovery
- [ ] Large dataset handling (1000+ products)

### Phase 2 Testing
- [ ] Soft delete propagation
- [ ] Sync status UI updates
- [ ] Manual refresh button
- [ ] Diagnostics page accuracy

### Phase 3 Testing
- [ ] Real-time subscription reliability
- [ ] Conflict detection accuracy
- [ ] Optimistic UI rollback

---

## Dependencies

### Required
- IndexedDB browser support ✅
- Supabase client configured ✅
- TypeScript ✅

### Optional (for Phase 3)
- Supabase Realtime enabled
- WebSocket support
- BroadcastChannel API

---

## Success Metrics

### Phase 1 Goals
- [ ] 0 stale records in IndexedDB
- [ ] 100% stock accuracy across devices
- [ ] < 1% sync failures
- [ ] Sync recovers from failures automatically
- [ ] Full sync completes in < 30 seconds

### Phase 2 Goals
- [ ] Users aware of sync status
- [ ] < 5 seconds for manual refresh
- [ ] Deleted records removed within 24 hours

### Phase 3 Goals
- [ ] < 1 second for real-time updates
- [ ] 0 data conflicts (detected and resolved)
- [ ] Optimistic UI feels instant

---

## Implementation Order

**Week 1** (Critical):
1. Full sync on first load (1.1)
2. Stock authority (1.3)
3. Sync status tracking (1.5)

**Week 2** (Critical):
4. Periodic full refresh (1.2)
5. Batch commit with checkpoints (1.4)

**Week 3** (Enhanced):
6. Soft deletes migration and sync (2.1)
7. Sync status UI (2.2)

**Week 4** (Polish):
8. Diagnostics page (2.3)
9. Testing and refinement

**Future** (As needed):
10. Real-time subscriptions (3.1)
11. Conflict detection (3.2)
12. Optimistic UI (3.3)

---

## Risk Mitigation

### Risk 1: Full Sync Takes Too Long
**Mitigation**: Implement pagination (100 records per batch), show progress indicator

### Risk 2: IndexedDB Quota Exceeded
**Mitigation**: Implement data retention policy, purge old data, monitor quota usage

### Risk 3: Sync During Active POS Session
**Mitigation**: Background sync doesn't interrupt UI, use non-blocking updates

### Risk 4: Data Corruption
**Mitigation**: Add checksum verification, ability to clear and re-sync

---

## Questions to Resolve

1. **Full sync interval**: 24 hours optimal? Consider 12 hours or on-demand?
2. **Batch size**: 100 records per batch? Test with actual data volume
3. **Soft delete retention**: How long to keep deleted records? 30 days? 90 days?
4. **Conflict resolution**: Automatic (last-write-wins) or manual? Depends on use case
5. **Real-time priority**: When to implement? After Phase 1-2 stable?

---

## Notes

- All changes should be backward compatible
- Add feature flags for easy rollback
- Monitor performance impact of full sync
- Document all metadata keys used
- Add logging for debugging
- Consider adding sync metrics to analytics

---

**Status**: Ready for implementation  
**Next Action**: Start with 1.1 (Full sync on first load)  
**Review Date**: After Phase 1 completion
