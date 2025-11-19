# Tab Offline-First - Implementation Guide (Phase 1: Foundation)

**Estimated Time:** 3-4 days  
**Priority:** Critical  
**Dependencies:** None (builds on existing POS offline infrastructure)

---

## Overview

Phase 1 establishes the foundation for offline Tab management by:
1. Extending IndexedDB schema for sessions and orders
2. Adding session sync to DataBatchingService
3. Refactoring TabManagementDashboard to read from IndexedDB

---

## Step 1: Extend IndexedDB Schema (2-3 hours)

### 1.1 Update Database Version

**File:** `src/lib/data-batching/offlineDb.ts`

**Action:** Increment database version and add new stores

```typescript
const DB_NAME = 'beerhive_pos_offline';
const DB_VERSION = 3; // ← INCREMENT from 2 to 3

// Add new stores to schema
const STORES = {
  products: 'id, updated_at',
  categories: 'id, updated_at',
  packages: 'id, updated_at',
  tables: 'id, updated_at',
  mutations: '++id, status, created_at',
  metadata: 'key',
  
  // NEW: Tab module stores
  order_sessions: 'id, table_id, status, updated_at',
  session_orders: 'id, session_id, status, updated_at',
};
```

### 1.2 Define TypeScript Interfaces

**File:** `src/lib/data-batching/offlineDb.ts`

```typescript
/**
 * Offline Order Session (Tab)
 * Cached representation of an active or recent session
 */
export interface OfflineOrderSession {
  // Core fields
  id: string;
  session_number: string;
  table_id: string;
  customer_id?: string;
  status: 'open' | 'closed' | 'abandoned';
  
  // Timestamps
  opened_at: string;
  closed_at?: string;
  updated_at: string;
  
  // Financial
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method?: string;
  
  // Metadata
  notes?: string;
  opened_by?: string;
  closed_by?: string;
  
  // Denormalized for offline display
  table?: {
    id: string;
    table_number: string;
    area?: string;
  };
  customer?: {
    id: string;
    full_name: string;
    tier?: string;
  };
  
  // Offline sync metadata
  _pending_sync?: boolean;
  _temp_id?: boolean;
  synced_at?: string;
}

/**
 * Offline Session Order
 * Individual order within a session
 */
export interface OfflineSessionOrder {
  // Core fields
  id: string;
  session_id: string;
  order_number: string;
  status: string;
  
  // Timestamps
  created_at: string;
  confirmed_at?: string;
  updated_at: string;
  
  // Financial
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  
  // Items
  items: OfflineOrderItem[];
  
  // Offline sync metadata
  _pending_sync?: boolean;
  _temp_id?: boolean;
  synced_at?: string;
}

/**
 * Offline Order Item
 * Individual product/package in an order
 */
export interface OfflineOrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  package_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
  complex_product_metadata?: any;
}
```

### 1.3 Implement Migration Handler

**File:** `src/lib/data-batching/offlineDb.ts`

```typescript
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      console.log(`📦 Upgrading IndexedDB from v${oldVersion} to v${DB_VERSION}`);

      // Create stores that don't exist
      Object.entries(STORES).forEach(([storeName, keyPath]) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: keyPath.split(',')[0] });
          
          // Create indexes for additional fields
          const indexes = keyPath.split(',').slice(1).map(k => k.trim());
          indexes.forEach(indexName => {
            if (indexName) {
              store.createIndex(indexName, indexName, { unique: false });
            }
          });
          
          console.log(`✅ Created store: ${storeName}`);
        }
      });
      
      // Version-specific migrations
      if (oldVersion < 3) {
        console.log('🔄 Running v3 migration: Adding Tab module stores');
        // Stores already created above
      }
    };
  });
}
```

### 1.4 Add CRUD Methods for Sessions

**File:** `src/lib/data-batching/offlineDb.ts`

```typescript
/**
 * Put order session into IndexedDB
 * Creates or updates a session record
 */
export async function putOrderSession(session: OfflineOrderSession): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('order_sessions', 'readwrite');
  const store = tx.objectStore('order_sessions');
  
  await store.put(session);
  await tx.complete;
  
  console.log(`💾 Saved session to IndexedDB: ${session.id}`);
}

/**
 * Get order session by ID from IndexedDB
 */
export async function getOrderSessionById(sessionId: string): Promise<OfflineOrderSession | null> {
  const db = await openDatabase();
  const tx = db.transaction('order_sessions', 'readonly');
  const store = tx.objectStore('order_sessions');
  
  const session = await store.get(sessionId);
  return session || null;
}

/**
 * Get all active order sessions from IndexedDB
 * Returns sessions with status='open'
 */
export async function getActiveOrderSessions(): Promise<OfflineOrderSession[]> {
  const db = await openDatabase();
  const tx = db.transaction('order_sessions', 'readonly');
  const store = tx.objectStore('order_sessions');
  const index = store.index('status');
  
  const sessions = await index.getAll('open');
  return sessions || [];
}

/**
 * Get all order sessions (active and closed) from IndexedDB
 */
export async function getAllOrderSessions(): Promise<OfflineOrderSession[]> {
  const db = await openDatabase();
  const tx = db.transaction('order_sessions', 'readonly');
  const store = tx.objectStore('order_sessions');
  
  const sessions = await store.getAll();
  return sessions || [];
}

/**
 * Update session ID (used when temp session syncs to real session)
 */
export async function updateSessionId(tempId: string, realId: string): Promise<void> {
  const db = await openDatabase();
  
  // Get the temp session
  const session = await getOrderSessionById(tempId);
  if (!session) {
    console.warn(`⚠️ Temp session not found: ${tempId}`);
    return;
  }
  
  // Delete temp session and create with real ID
  const tx = db.transaction('order_sessions', 'readwrite');
  const store = tx.objectStore('order_sessions');
  
  await store.delete(tempId);
  session.id = realId;
  await store.put(session);
  await tx.complete;
  
  console.log(`✅ Updated session ID: ${tempId} → ${realId}`);
}

/**
 * Update order session fields
 */
export async function updateOrderSession(
  sessionId: string,
  updates: Partial<OfflineOrderSession>
): Promise<void> {
  const db = await openDatabase();
  const session = await getOrderSessionById(sessionId);
  
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  const updated = { ...session, ...updates, updated_at: new Date().toISOString() };
  
  const tx = db.transaction('order_sessions', 'readwrite');
  const store = tx.objectStore('order_sessions');
  await store.put(updated);
  await tx.complete;
  
  console.log(`✅ Updated session: ${sessionId}`, Object.keys(updates));
}

/**
 * Delete order session from IndexedDB
 */
export async function deleteOrderSession(sessionId: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('order_sessions', 'readwrite');
  const store = tx.objectStore('order_sessions');
  
  await store.delete(sessionId);
  await tx.complete;
  
  console.log(`🗑️ Deleted session: ${sessionId}`);
}
```

### 1.5 Add CRUD Methods for Session Orders

**File:** `src/lib/data-batching/offlineDb.ts`

```typescript
/**
 * Put session order into IndexedDB
 */
export async function putSessionOrder(order: OfflineSessionOrder): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('session_orders', 'readwrite');
  const store = tx.objectStore('session_orders');
  
  await store.put(order);
  await tx.complete;
  
  console.log(`💾 Saved session order to IndexedDB: ${order.id}`);
}

/**
 * Get session order by ID
 */
export async function getSessionOrderById(orderId: string): Promise<OfflineSessionOrder | null> {
  const db = await openDatabase();
  const tx = db.transaction('session_orders', 'readonly');
  const store = tx.objectStore('session_orders');
  
  const order = await store.get(orderId);
  return order || null;
}

/**
 * Get all orders for a session
 */
export async function getOrdersBySession(sessionId: string): Promise<OfflineSessionOrder[]> {
  const db = await openDatabase();
  const tx = db.transaction('session_orders', 'readonly');
  const store = tx.objectStore('session_orders');
  const index = store.index('session_id');
  
  const orders = await index.getAll(sessionId);
  return orders || [];
}

/**
 * Migrate orders from temp session to real session
 * Used when temp session ID is replaced with real ID after sync
 */
export async function migrateOrdersToSession(
  tempSessionId: string,
  realSessionId: string
): Promise<void> {
  const orders = await getOrdersBySession(tempSessionId);
  
  if (orders.length === 0) {
    return;
  }
  
  const db = await openDatabase();
  const tx = db.transaction('session_orders', 'readwrite');
  const store = tx.objectStore('session_orders');
  
  for (const order of orders) {
    order.session_id = realSessionId;
    await store.put(order);
  }
  
  await tx.complete;
  console.log(`✅ Migrated ${orders.length} orders: ${tempSessionId} → ${realSessionId}`);
}
```

### 1.6 Testing Step 1

**Create test file:** `src/lib/data-batching/__tests__/offlineDb.sessions.test.ts`

```typescript
import {
  putOrderSession,
  getOrderSessionById,
  getActiveOrderSessions,
  updateSessionId,
} from '../offlineDb';

describe('offlineDb - Order Sessions', () => {
  beforeEach(async () => {
    // Clear IndexedDB before each test
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });

  it('should create and retrieve a session', async () => {
    const session = {
      id: 'test-session-1',
      session_number: 'TAB-001',
      table_id: 'table-1',
      status: 'open' as const,
      opened_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subtotal: 500,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 500,
    };

    await putOrderSession(session);
    const retrieved = await getOrderSessionById('test-session-1');

    expect(retrieved).toBeDefined();
    expect(retrieved?.session_number).toBe('TAB-001');
  });

  it('should get active sessions only', async () => {
    await putOrderSession({ ...mockSession, id: 's1', status: 'open' });
    await putOrderSession({ ...mockSession, id: 's2', status: 'open' });
    await putOrderSession({ ...mockSession, id: 's3', status: 'closed' });

    const active = await getActiveOrderSessions();
    expect(active).toHaveLength(2);
  });

  it('should update session ID from temp to real', async () => {
    const tempSession = {
      ...mockSession,
      id: 'offline-session-123',
      _temp_id: true,
    };

    await putOrderSession(tempSession);
    await updateSessionId('offline-session-123', 'real-uuid-456');

    const oldSession = await getOrderSessionById('offline-session-123');
    const newSession = await getOrderSessionById('real-uuid-456');

    expect(oldSession).toBeNull();
    expect(newSession).toBeDefined();
    expect(newSession?.id).toBe('real-uuid-456');
  });
});
```

**Run tests:**
```bash
npm test offlineDb.sessions.test.ts
```

---

## Step 2: Extend DataBatchingService (3-4 hours)

### 2.1 Add Session Sync Method

**File:** `src/lib/data-batching/DataBatchingService.ts`

```typescript
/**
 * Sync order sessions from Supabase to IndexedDB
 * Fetches active sessions with related data
 */
async syncOrderSessions(lastCursor?: string): Promise<void> {
  try {
    console.log('🔄 Syncing order sessions from Supabase...');

    const cursor = lastCursor || (await this.getLastSync('sessions'));
    const query = supabaseAdmin
      .from('order_sessions')
      .select(`
        *,
        table:restaurant_tables(id, table_number, area),
        customer:customers(id, full_name, tier)
      `)
      .eq('status', 'open')  // Only sync active sessions
      .order('updated_at', { ascending: true });

    if (cursor) {
      query.gt('updated_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('✅ No new sessions to sync');
      return;
    }

    // Store in IndexedDB
    for (const session of data) {
      const offlineSession: OfflineOrderSession = {
        id: session.id,
        session_number: session.session_number,
        table_id: session.table_id,
        customer_id: session.customer_id,
        status: session.status,
        opened_at: session.opened_at,
        closed_at: session.closed_at,
        updated_at: session.updated_at,
        subtotal: session.subtotal || 0,
        discount_amount: session.discount_amount || 0,
        tax_amount: session.tax_amount || 0,
        total_amount: session.total_amount || 0,
        payment_method: session.payment_method,
        notes: session.notes,
        opened_by: session.opened_by,
        closed_by: session.closed_by,
        table: session.table,
        customer: session.customer,
        synced_at: new Date().toISOString(),
      };

      await putOrderSession(offlineSession);
    }

    // Update cursor
    const lastUpdatedAt = data[data.length - 1].updated_at;
    await this.setLastSync('sessions', lastUpdatedAt);

    console.log(`✅ Synced ${data.length} sessions`);
  } catch (error) {
    console.error('❌ Failed to sync order sessions:', error);
    throw error;
  }
}
```

### 2.2 Add Session Snapshot Method

**File:** `src/lib/data-batching/DataBatchingService.ts`

```typescript
/**
 * Get snapshot of active sessions from IndexedDB
 * Used by TabManagementDashboard for instant display
 */
async getActiveSessionsSnapshot(): Promise<OfflineOrderSession[]> {
  try {
    const sessions = await getActiveOrderSessions();
    console.log(`📊 Retrieved ${sessions.length} active sessions from cache`);
    return sessions;
  } catch (error) {
    console.error('Failed to get sessions snapshot:', error);
    return [];
  }
}

/**
 * Get single session by ID from IndexedDB
 */
async getSessionById(sessionId: string): Promise<OfflineOrderSession | null> {
  try {
    const session = await getOrderSessionById(sessionId);
    return session;
  } catch (error) {
    console.error(`Failed to get session ${sessionId}:`, error);
    return null;
  }
}
```

### 2.3 Add Session to Periodic Sync

**File:** `src/lib/data-batching/DataBatchingService.ts`

```typescript
/**
 * Sync all catalog entities (products, categories, packages, tables, sessions)
 */
async syncAllEntities(): Promise<void> {
  console.log('🔄 Starting incremental sync for all entities...');

  try {
    await Promise.all([
      this.syncProducts(),
      this.syncCategories(),
      this.syncPackages(),
      this.syncTables(),
      this.syncOrderSessions(),  // ← ADD THIS
    ]);

    console.log('✅ All entities synced successfully');
  } catch (error) {
    console.error('❌ Failed to sync all entities:', error);
    throw error;
  }
}
```

### 2.4 Add Session to Force Full Sync

**File:** `src/lib/data-batching/DataBatchingService.ts`

```typescript
/**
 * Force full sync of all entities
 * Clears cursors and re-fetches everything
 */
async forceFullSync(): Promise<void> {
  console.log('🔄 Force full sync triggered');

  // Clear all cursors
  await this.setLastSync('products', null);
  await this.setLastSync('categories', null);
  await this.setLastSync('packages', null);
  await this.setLastSync('tables', null);
  await this.setLastSync('sessions', null);  // ← ADD THIS

  // Sync all entities
  await this.syncAllEntities();

  // Update last full sync timestamp
  await this.setLastFullSync();

  console.log('✅ Force full sync complete');
}
```

### 2.5 Testing Step 2

**Manual test:**

```typescript
// In browser console or test file
import { DataBatchingService } from '@/lib/data-batching/DataBatchingService';

const service = DataBatchingService.getInstance();

// Test session sync
await service.syncOrderSessions();

// Test snapshot retrieval
const sessions = await service.getActiveSessionsSnapshot();
console.log('Sessions:', sessions);

// Test force full sync (includes sessions)
await service.forceFullSync();
```

---

## Step 3: Refactor TabManagementDashboard (2-3 hours)

### 3.1 Replace API Calls with IndexedDB Reads

**File:** `src/views/tabs/TabManagementDashboard.tsx`

**Before:**
```typescript
const fetchSessions = useCallback(async () => {
  try {
    const data = await apiGet('/api/order-sessions');  // ❌ Blocking API call
    
    if (data.success) {
      setSessions(data.data || []);
    }
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
  } finally {
    setLoading(false);
  }
}, []);
```

**After:**
```typescript
const { dataBatching, isOnline } = useOfflineRuntime();

const loadSessions = useCallback(async () => {
  try {
    // ✅ Read from IndexedDB (instant)
    const cachedSessions = await dataBatching.getActiveSessionsSnapshot();
    setSessions(cachedSessions);
    setLoading(false);
    
    // ✅ Trigger background sync (non-blocking)
    if (isOnline) {
      dataBatching.syncOrderSessions().catch(err => {
        console.log('Background session sync failed:', err);
      });
    }
  } catch (error) {
    console.error('Failed to load sessions:', error);
    setLoading(false);
  }
}, [dataBatching, isOnline]);
```

### 3.2 Replace Table API Call

**File:** `src/views/tabs/TabManagementDashboard.tsx`

**Before:**
```typescript
const fetchTables = useCallback(async () => {
  try {
    const data = await apiGet('/api/tables');  // ❌ Blocking API call
    
    if (data.success) {
      setTables(data.data || []);
    }
  } catch (error) {
    console.error('Failed to fetch tables:', error);
  }
}, []);
```

**After:**
```typescript
const loadTables = useCallback(async () => {
  try {
    // ✅ Read from IndexedDB (instant)
    const cachedTables = await dataBatching.getCachedTables();
    setTables(cachedTables);
    
    // ✅ Trigger background sync (non-blocking)
    if (isOnline) {
      dataBatching.syncTables().catch(err => {
        console.log('Background table sync failed:', err);
      });
    }
  } catch (error) {
    console.error('Failed to load tables:', error);
  }
}, [dataBatching, isOnline]);
```

### 3.3 Add getCachedTables Method

**File:** `src/lib/data-batching/DataBatchingService.ts`

```typescript
/**
 * Get cached tables from IndexedDB
 */
async getCachedTables(): Promise<OfflineTable[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('tables', 'readonly');
    const store = tx.objectStore('tables');
    const tables = await store.getAll();
    
    console.log(`📊 Retrieved ${tables.length} tables from cache`);
    return tables || [];
  } catch (error) {
    console.error('Failed to get cached tables:', error);
    return [];
  }
}
```

### 3.4 Update Dashboard Initialization

**File:** `src/views/tabs/TabManagementDashboard.tsx`

```typescript
// Unified data loading
const loadAllData = useCallback(async () => {
  setLoading(true);
  await Promise.all([loadTables(), loadSessions()]);
  setLoading(false);
}, [loadTables, loadSessions]);

// Initial load on mount
useEffect(() => {
  loadAllData();
}, [loadAllData]);

// Refresh button
const handleRefresh = () => {
  loadAllData();
};
```

### 3.5 Add Offline Indicator

**File:** `src/views/tabs/TabManagementDashboard.tsx`

```typescript
return (
  <div>
    {/* Header with offline indicator */}
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Tab Management</h1>
      
      <div className="flex items-center gap-4">
        {/* Offline indicator */}
        {!isOnline && (
          <Badge variant="warning" className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            Offline Mode
          </Badge>
        )}
        
        {/* Refresh button */}
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>

    {/* Dashboard content... */}
  </div>
);
```

### 3.6 Testing Step 3

**Manual test:**

1. **Clear IndexedDB** via DevTools → Application → IndexedDB
2. **Load dashboard** - should see empty state
3. **Trigger sync** - wait for background sync to complete
4. **Reload dashboard** - should show cached data instantly
5. **Go offline** - disable network in DevTools
6. **Reload dashboard** - should still show cached data with "Offline Mode" badge
7. **Go online** - re-enable network
8. **Click refresh** - should trigger background sync

---

## Phase 1 Completion Checklist

- [ ] IndexedDB schema updated to v3
- [ ] New stores created: `order_sessions`, `session_orders`
- [ ] TypeScript interfaces defined
- [ ] CRUD methods implemented for sessions
- [ ] CRUD methods implemented for session orders
- [ ] Unit tests passing for IndexedDB operations
- [ ] DataBatchingService extended with session sync
- [ ] Session snapshot methods added
- [ ] Sessions included in periodic sync
- [ ] Sessions included in force full sync
- [ ] TabManagementDashboard refactored to IndexedDB-first
- [ ] Tables loaded from IndexedDB
- [ ] Sessions loaded from IndexedDB
- [ ] Background sync triggered
- [ ] Offline indicator displayed
- [ ] Manual testing complete

--- 

## Success Criteria

✅ Dashboard loads instantly from IndexedDB (0-50ms)  
✅ Dashboard works offline with cached data  
✅ Background sync updates cache when online  
✅ No blocking API calls in dashboard render  
✅ Clear offline mode indicator  
✅ Manual refresh button works  

---

## Next Steps

After Phase 1 completion, proceed to:
- **Phase 2:** Implement offline tab opening and order management
- **Phase 3:** Testing and polish

**Estimated total time for Phase 1:** 8-10 hours
