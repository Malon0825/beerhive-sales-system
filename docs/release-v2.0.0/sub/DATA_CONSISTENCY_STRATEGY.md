# Data Consistency Strategy: IndexedDB ↔ Supabase

**Date**: 2025-11-17  
**Version**: v2.0.0  
**Priority**: CRITICAL

## Problem Statement

In a pure offline-first architecture:
- **IndexedDB is the single source of truth for the UI**
- **Supabase is the source of truth for persistent storage**
- **These two sources MUST stay synchronized**

**Challenge**: How do we ensure IndexedDB accurately reflects Supabase, especially when:
- Multiple devices access the same data
- Orders are placed on other devices (stock changes)
- Data is modified in the admin panel
- Network interruptions occur
- Sync failures happen

---

## Current Sync Mechanism

### How DataBatchingService Works

```typescript
// src/lib/data-batching/DataBatchingService.ts

private async syncEntity(entity: 'products' | 'categories' | 'packages' | 'tables') {
  // 1. Get last sync timestamp from metadata
  const lastCursor = await getMetadataValue(`lastSync.${entity}`);
  
  // 2. Fetch only records updated since last sync
  const query = supabase
    .from('products')
    .select('*')
    .gt('updated_at', lastCursor)  // Incremental sync
    .order('updated_at', { ascending: true })
    .limit(1000);
  
  // 3. Write to IndexedDB
  await bulkPut(entity, records);
  
  // 4. Update cursor for next sync
  await setMetadataValue(`lastSync.${entity}`, latestUpdatedAt);
}
```

### Current Strategy: Incremental Timestamp-Based Sync

**Pros** ✅:
- Efficient (only fetches changed records)
- Low bandwidth
- Fast sync times
- Scales well

**Cons** ❌:
- Doesn't detect deleted records
- Can get out of sync if cursor is lost
- No verification of existing data
- Stock quantities can drift
- No conflict detection

---

## Consistency Issues & Solutions

### Issue 1: Deleted Records Not Propagated

**Problem**:
```
Supabase: Product A deleted
IndexedDB: Product A still exists
POS: Shows deleted product ❌
```

**Solution 1a: Soft Deletes (Recommended)**
```sql
-- Add deleted_at column to all synced tables
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE product_categories ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE packages ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE restaurant_tables ADD COLUMN deleted_at TIMESTAMPTZ;

-- Don't DELETE, just mark as deleted
UPDATE products SET deleted_at = NOW() WHERE id = 'xxx';
```

```typescript
// Sync includes soft-deleted records
const query = supabase
  .from('products')
  .select('*')
  .gt('updated_at', lastCursor)  // Catches soft deletes too
  .order('updated_at', { ascending: true });

// Filter out deleted records in UI
const activeProducts = await readAllRecords('products')
  .then(products => products.filter(p => !p.deleted_at));
```

**Solution 1b: Full Sync Periodically**
```typescript
// Every 24 hours or on app startup once per day
if (shouldDoFullSync()) {
  await fullSyncEntity('products');  // Fetch ALL, replace cache
}
```

---

### Issue 2: Stock Quantity Drift

**Problem**:
```
Device A: Sells 5 units → stock = 95
Device B (offline): Still shows stock = 100 ❌
Device B syncs: Gets product update, but stock already wrong
```

**Why It Happens**:
- Stock is updated on order creation
- Product `updated_at` changes
- But sync might miss interim updates
- Multiple concurrent orders cause race conditions

**Solution 2a: Always Trust Server Stock (Current Best)**
```typescript
// When syncing products, ALWAYS overwrite local stock
const syncedProduct = {
  ...localProduct,
  current_stock: serverProduct.current_stock,  // Server is authority
  updated_at: serverProduct.updated_at,
};
```

**Solution 2b: Stock Sync Events Table (Better)**
```sql
-- Track every stock change with reason
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  quantity_change INT,  -- Can be negative
  reason TEXT,  -- 'order', 'adjustment', 'restock'
  order_id UUID,  -- If from order
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```typescript
// Sync stock movements instead of stock snapshots
async syncStockMovements(since: string) {
  const movements = await supabase
    .from('stock_movements')
    .select('*')
    .gt('created_at', since);
  
  // Apply movements to local stock
  for (const movement of movements) {
    await adjustLocalStock(movement.product_id, movement.quantity_change);
  }
}
```

**Solution 2c: Realtime Subscriptions (Best - Real-time)**
```typescript
// Subscribe to stock changes
supabase
  .channel('stock-changes')
  .on('postgres_changes', 
    { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'products',
      filter: 'current_stock=neq.null'
    }, 
    (payload) => {
      // Update IndexedDB immediately
      updateLocalProduct(payload.new);
      
      // Refresh POS if open
      notifyPOSToRefresh();
    }
  )
  .subscribe();
```

---

### Issue 3: Sync Cursor Lost/Corrupted

**Problem**:
```
IndexedDB metadata lost (cleared by user/browser)
lastSync cursor = null
Sync fetches ALL records again
But doesn't remove old/stale records
Result: Duplicate or stale data
```

**Solution 3a: Full Replace on First Sync**
```typescript
async syncEntity(entity: BatchEntity) {
  const lastCursor = await getMetadataValue(`lastSync.${entity}`);
  
  if (!lastCursor) {
    // First sync or cursor lost - do full replace
    console.log(`[Sync] No cursor found, doing FULL sync for ${entity}`);
    await clearStore(entity);  // Clear everything
    await fullSyncEntity(entity);  // Fetch all, fresh start
  } else {
    // Incremental sync
    await incrementalSyncEntity(entity, lastCursor);
  }
}
```

**Solution 3b: Checksum Verification**
```typescript
// Add checksum to metadata
interface SyncMetadata {
  lastCursor: string;
  recordCount: number;
  checksum: string;  // Hash of all record IDs
}

async verifySyncIntegrity(entity: BatchEntity) {
  const local = await getLocalChecksum(entity);
  const remote = await getRemoteChecksum(entity);
  
  if (local !== remote) {
    console.warn(`[Sync] Checksum mismatch for ${entity}, forcing full sync`);
    await fullSyncEntity(entity);
  }
}
```

---

### Issue 4: Multi-Device Conflicts

**Problem**:
```
Device A (offline): Modifies order #123
Device B (offline): Modifies order #123
Both sync: Which version is correct? ❌
```

**Solution 4a: Last-Write-Wins (Simple)**
```typescript
// When syncing, newest updated_at wins
if (serverRecord.updated_at > localRecord.updated_at) {
  // Server is newer, overwrite local
  await updateLocal(serverRecord);
} else {
  // Local is newer, keep local (will sync up later)
}
```

**Solution 4b: Vector Clocks (Complex but Correct)**
```sql
-- Add version vector to detect concurrent edits
ALTER TABLE orders ADD COLUMN version_vector JSONB;

-- Example: {"device_a": 5, "device_b": 3}
```

**Solution 4c: Conflict Queue (Recommended)**
```typescript
// Detect conflicts during sync
if (isConflict(localRecord, serverRecord)) {
  await storeConflict({
    entity: 'orders',
    localVersion: localRecord,
    serverVersion: serverRecord,
    detectedAt: new Date(),
  });
  
  // Show conflict to user for manual resolution
  notifyConflict();
}
```

---

### Issue 5: Partial Sync Failures

**Problem**:
```
Syncing 1000 products...
Network fails at product 456
Next sync starts from product 1 again
Wastes bandwidth, time
```

**Solution 5a: Batch Commits**
```typescript
async syncEntity(entity: BatchEntity) {
  let cursor = await getMetadataValue(`lastSync.${entity}`);
  
  while (true) {
    // Fetch in small batches
    const batch = await fetchBatch(entity, cursor, 100);
    
    if (batch.length === 0) break;
    
    // Write batch
    await bulkPut(entity, batch);
    
    // Update cursor immediately (checkpoint)
    cursor = batch[batch.length - 1].updated_at;
    await setMetadataValue(`lastSync.${entity}`, cursor);
    
    console.log(`[Sync] Synced ${batch.length} ${entity}, cursor: ${cursor}`);
  }
}
```

**Solution 5b: Retry with Exponential Backoff**
```typescript
async syncWithRetry(entity: BatchEntity, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await syncEntity(entity);
      return;  // Success
    } catch (error) {
      retries++;
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      console.warn(`[Sync] Failed, retry ${retries}/${maxRetries} in ${delay}ms`);
      await sleep(delay);
    }
  }
  
  throw new Error(`Failed to sync ${entity} after ${maxRetries} retries`);
}
```

---

## Recommended Implementation

### Phase 1: Immediate Improvements (Do Now)

#### 1.1 Add Full Sync on First Load
```typescript
// src/lib/data-batching/DataBatchingService.ts

private async syncEntity(entity: BatchEntity): Promise<void> {
  try {
    const cursorKey = `${ENTITY_CURSOR_PREFIX}.${entity}`;
    const lastCursor = await getMetadataValue<string>(cursorKey);
    
    // NEW: If no cursor, do full sync (clear + fetch all)
    if (!lastCursor) {
      console.log(`[DataBatchingService] First sync for ${entity}, fetching all...`);
      await clearStore(entity);
      await this.fullSyncEntity(entity);
      return;
    }
    
    // Existing incremental sync
    const { records, latestUpdatedAt } = await this.fetchEntityData(entity, lastCursor);
    if (records.length === 0) return;
    
    await bulkPut(entity, records as any);
    
    if (latestUpdatedAt) {
      await setMetadataValue(cursorKey, latestUpdatedAt);
    }
  } catch (error) {
    console.error(`[DataBatchingService] Failed to sync ${entity}`, error);
  }
}

private async fullSyncEntity(entity: BatchEntity): Promise<void> {
  // Fetch ALL records (no cursor filter)
  const { records, latestUpdatedAt } = await this.fetchEntityData(entity, undefined);
  
  await bulkPut(entity, records as any);
  
  if (latestUpdatedAt) {
    await setMetadataValue(`${ENTITY_CURSOR_PREFIX}.${entity}`, latestUpdatedAt);
  }
  
  console.log(`[DataBatchingService] Full sync complete for ${entity}: ${records.length} records`);
}
```

#### 1.2 Add Periodic Full Refresh
```typescript
// Trigger full sync every 24 hours
private async initialize(): Promise<void> {
  if (this.initialized) return;
  this.initialized = true;
  
  // NEW: Check if we should do full sync
  const lastFullSync = await getMetadataValue<string>('lastFullSync');
  const now = new Date();
  const dayInMs = 24 * 60 * 60 * 1000;
  
  if (!lastFullSync || (now.getTime() - new Date(lastFullSync).getTime() > dayInMs)) {
    console.log('[DataBatchingService] Triggering periodic full sync...');
    await this.fullSyncAll();
    await setMetadataValue('lastFullSync', now.toISOString());
  } else {
    await this.syncAllEntities();
  }
  
  // ... rest of initialization
}

private async fullSyncAll(): Promise<void> {
  for (const entity of entityList) {
    await clearStore(entity);
    await this.fullSyncEntity(entity);
  }
}
```

#### 1.3 Add Stock Verification
```typescript
// Always trust server stock on sync
private async fetchProducts(lastUpdated?: string) {
  // ... existing code ...
  
  const records = (data || []).map((product: any): OfflineProduct => ({
    id: product.id,
    name: product.name,
    // ... other fields ...
    current_stock: Number(product.current_stock ?? 0),  // Server is authority
    stock_updated_at: product.updated_at,  // Track when stock was synced
    updated_at: product.updated_at,
  }));
  
  return { records, latestUpdatedAt: records.at(-1)?.updated_at ?? lastUpdated ?? null };
}
```

---

### Phase 2: Enhanced Consistency (Next Sprint)

#### 2.1 Add Soft Deletes
```sql
-- Migration: Add deleted_at columns
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE product_categories ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE packages ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE restaurant_tables ADD COLUMN deleted_at TIMESTAMPTZ;

-- Create function to soft delete
CREATE OR REPLACE FUNCTION soft_delete_product(product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products 
  SET deleted_at = NOW(), 
      updated_at = NOW()  -- Triggers sync
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// Update IndexedDB schema
export interface OfflineProduct {
  id: string;
  // ... existing fields ...
  deleted_at: string | null;  // NEW
}

// Filter out deleted in UI
async getActiveProducts(): Promise<OfflineProduct[]> {
  const allProducts = await readAllRecords('products');
  return allProducts.filter(p => !p.deleted_at);
}
```

#### 2.2 Add Sync Status Indicator
```typescript
interface SyncStatus {
  lastSync: Date | null;
  syncing: boolean;
  error: string | null;
  recordCounts: Record<BatchEntity, number>;
}

// Expose to UI
export class DataBatchingService {
  async getSyncStatus(): Promise<SyncStatus> {
    const lastSyncMap = await this.getLastSyncMap();
    const snapshot = await this.getCatalogSnapshot();
    
    return {
      lastSync: this.getOldestSyncDate(lastSyncMap),
      syncing: this.syncingPromise !== null,
      error: null,
      recordCounts: {
        products: snapshot.products.length,
        categories: snapshot.categories.length,
        packages: snapshot.packages.length,
        tables: snapshot.tables.length,
      },
    };
  }
}
```

#### 2.3 Add Manual Refresh
```typescript
// In POSInterface
import { DataBatchingService } from '@/lib/data-batching/DataBatchingService';

const handleManualSync = async () => {
  toast({ title: 'Syncing...', description: 'Refreshing data from server' });
  
  await dataBatching.syncAllEntities();
  
  // Reload POS data
  await fetchProducts();
  await fetchCategories();
  await fetchPackages();
  
  toast({ title: 'Sync Complete', description: 'Data refreshed successfully' });
};

// UI button
<Button onClick={handleManualSync}>
  <RefreshCw className="w-4 h-4 mr-2" />
  Refresh Data
</Button>
```

---

### Phase 3: Real-time Sync (Future Enhancement)

#### 3.1 Supabase Realtime Subscriptions
```typescript
// Subscribe to real-time changes
export class DataBatchingService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  
  async enableRealtime() {
    // Subscribe to product changes
    const productsChannel = supabase
      .channel('products-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        async (payload) => {
          console.log('[Realtime] Product changed:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            await this.upsertLocalProduct(payload.new);
          } else if (payload.eventType === 'DELETE') {
            await this.deleteLocalProduct(payload.old.id);
          }
          
          // Notify POS to refresh
          this.notifyListeners();
        }
      )
      .subscribe();
    
    this.subscriptions.set('products', productsChannel);
  }
  
  private async upsertLocalProduct(product: any) {
    const mapped = this.mapToOfflineProduct(product);
    await bulkPut('products', [mapped]);
  }
}
```

#### 3.2 Optimistic UI with Rollback
```typescript
// When creating order offline
async createOrder(orderData: CreateOrderDTO) {
  const optimisticOrder = {
    ...orderData,
    id: generateTempId(),
    status: 'pending_sync',
  };
  
  // Show in UI immediately
  await addToLocalOrders(optimisticOrder);
  
  try {
    // Sync to server
    const serverOrder = await apiCreateOrder(orderData);
    
    // Replace optimistic with real
    await replaceLocalOrder(optimisticOrder.id, serverOrder);
  } catch (error) {
    // Rollback on failure
    await removeLocalOrder(optimisticOrder.id);
    throw error;
  }
}
```

---

## Monitoring & Verification

### Health Check Queries

```typescript
// Check if local cache is stale
async isCacheStale(): Promise<boolean> {
  const lastSync = await getMetadataValue<string>('lastSync.products');
  if (!lastSync) return true;
  
  const ageMs = Date.now() - new Date(lastSync).getTime();
  const maxAgeMs = 60 * 60 * 1000;  // 1 hour
  
  return ageMs > maxAgeMs;
}

// Verify record counts match
async verifyRecordCounts() {
  const local = await readAllRecords('products');
  const { count: remote } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  if (local.length !== remote) {
    console.warn(`[Verification] Record count mismatch: local=${local.length}, remote=${remote}`);
    return false;
  }
  
  return true;
}

// Check for orphaned records (exist locally but not in DB)
async findOrphanedRecords(): Promise<string[]> {
  const local = await readAllRecords('products');
  const localIds = local.map(p => p.id);
  
  const { data: remote } = await supabase
    .from('products')
    .select('id')
    .in('id', localIds);
  
  const remoteIds = new Set(remote?.map(p => p.id) || []);
  const orphaned = localIds.filter(id => !remoteIds.has(id));
  
  if (orphaned.length > 0) {
    console.warn(`[Verification] Found ${orphaned.length} orphaned records`);
  }
  
  return orphaned;
}
```

### Diagnostic UI Component

```typescript
// Debug component for admins
export function SyncDiagnostics() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const dataBatching = DataBatchingService.getInstance();
  
  useEffect(() => {
    loadStatus();
  }, []);
  
  async function loadStatus() {
    const status = await dataBatching.getSyncStatus();
    setStatus(status);
  }
  
  async function handleFullRefresh() {
    await dataBatching.fullSyncAll();
    await loadStatus();
    toast({ title: 'Full refresh complete' });
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p>Last Sync: {status?.lastSync?.toLocaleString() || 'Never'}</p>
          <p>Products: {status?.recordCounts.products}</p>
          <p>Categories: {status?.recordCounts.categories}</p>
          <p>Packages: {status?.recordCounts.packages}</p>
          <p>Status: {status?.syncing ? 'Syncing...' : 'Idle'}</p>
        </div>
        <Button onClick={handleFullRefresh} className="mt-4">
          Force Full Refresh
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## Testing Strategy

### Test 1: Verify Initial Sync
```bash
# Clear IndexedDB
# Load app
# Check console logs for full sync
# Verify all records loaded
# Check metadata cursor set
```

### Test 2: Incremental Sync
```bash
# With populated cache
# Add product in Supabase
# Trigger sync
# Verify new product appears
# Check cursor updated
```

### Test 3: Deleted Records
```bash
# Soft delete product in Supabase
# Trigger sync
# Verify product marked deleted in IndexedDB
# Verify product hidden in UI
```

### Test 4: Stock Accuracy
```bash
# Create order on Device A
# Check stock updated in Supabase
# Sync Device B
# Verify Device B shows correct stock
```

### Test 5: Multi-Device Consistency
```bash
# Make change on Device A (offline)
# Make different change on Device B (offline)
# Bring both online
# Verify last-write-wins or conflict detected
```

---

## Summary

### Current State ✅
- Incremental timestamp-based sync
- Efficient for normal operations
- Works for most use cases

### Critical Improvements Needed ❌
1. **Full sync on first load** (prevents stale data)
2. **Periodic full refresh** (ensures long-term consistency)
3. **Soft deletes** (propagates deletions)
4. **Stock verification** (server is authority)
5. **Sync status indicator** (user feedback)

### Long-term Enhancements 🚀
1. **Real-time subscriptions** (instant updates)
2. **Conflict resolution** (multi-device safety)
3. **Optimistic UI** (better UX)
4. **Checksum verification** (detect corruption)

### Key Principle
> **"Server is the source of truth, but the client can make optimistic updates that eventually reconcile."**

---

## Recommended Next Steps

1. ✅ **Implement Phase 1 (Immediate)** - Full sync + periodic refresh
2. ⏳ **Test thoroughly** - Multi-device scenarios
3. ⏳ **Add monitoring** - Track sync health
4. 📅 **Plan Phase 2** - Soft deletes + realtime
5. 📅 **Plan Phase 3** - Real-time subscriptions

This ensures IndexedDB stays consistent with Supabase while maintaining offline-first benefits.
