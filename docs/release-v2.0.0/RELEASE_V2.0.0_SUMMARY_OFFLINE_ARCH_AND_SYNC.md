# v2.0.0 Summary – Offline-First Architecture & Data Sync

## 1. Goal

Make the POS module **pure offline-first**:

- IndexedDB is the **single source of truth** for all POS UI data.
- The UI **never calls APIs directly** or checks `navigator.onLine`.
- Background services handle all **sync between Supabase and IndexedDB**.

Covered documents:

- `PURE_OFFLINE_FIRST_ARCHITECTURE.md`
- `DATA_CONSISTENCY_STRATEGY.md`
- `IMPLEMENTATION_PHASE1_DATA_CONSISTENCY.md`
- `IMPLEMENTATION_POS_OFFLINE_FIX.md`
- `BUGFIX_OFFLINE_SERVICES_NOT_INITIALIZING.md`
- `BUGFIX_POS_OFFLINE_LOADING_ISSUE.md`
- `TESTING_PHASE1_DATA_CONSISTENCY.md`
- `TODO_DATA_CONSISTENCY_IMPROVEMENTS.md`
- `FEATURE_MANUAL_CATALOG_SYNC.md`
- `UI_IMPROVEMENT_SYNC_STATUS_HEADER.md`
- `UI_IMPROVEMENT_SYNC_STATUS_POSITION.md`

---

## 2. Core Architecture

### 2.1 Responsibilities

- **POSInterface.tsx**
  - Reads **only from IndexedDB** via `DataBatchingService.getCatalogSnapshot()`.
  - Renders products, categories, packages, tables from cached data.
  - Does not perform any network calls.

- **DataBatchingService**
  - Syncs `products`, `categories`, `packages`, `tables` from Supabase → IndexedDB.
  - Implements full sync, incremental sync, batching, and periodic refresh.
  - Exposes diagnostics (`getSyncStatus`, `getCatalogSnapshot`, etc.).

- **MutationSyncService**
  - Queues offline mutations (orders, etc.) and syncs them when online.
  - Works independently of the read-path caching.

### 2.2 Pure Offline-First Pattern

**Before (hybrid):**

- POS sometimes read from IndexedDB, sometimes fell back to `/api/*` when cache was empty.
- `navigator.onLine` checks and API calls existed in `POSInterface.tsx`.
- Offline behavior was a fallback, not the default.

**After (pure offline-first):**

```ts
// Pseudo-pattern used in POSInterface
const snapshot = await dataBatching.getCatalogSnapshot();

if (snapshot.products.length > 0) {
  // Map offline entities to UI models and render
  setProducts(mappedProducts);
  stockTracker.initializeStock(mappedProducts);
} else {
  // First-time or pre-sync state
  console.warn('IndexedDB is empty - waiting for initial sync');
  toast({ title: 'Loading Initial Data', description: 'Waiting for catalog sync…' });
}

// No API calls and no navigator.onLine checks here.
```

UI behavior is **identical online or offline**; the only difference is how fresh the cached data is.

---

## 3. OfflineRuntime & Service Initialization

### 3.1 Original Bug (Dev Mode)

File: `OfflineRuntimeContext.tsx`

- In dev mode, code decided to **skip Service Worker registration** and returned early from `useEffect`.
- Because of that early `return`, both:
  - `MutationSyncService.initialize()` and
  - `DataBatchingService.initialize()`
  never ran.

**Symptoms:**

- No `DataBatchingService` logs.
- IndexedDB empty.
- POS showed "waiting for sync" and no products ever loaded.

### 3.2 Fix

- Move service initialization **before** the Service Worker logic:
  - Always call `mutationSync.initialize()` and `dataBatching.initialize()` when `window` exists.
- Remove early returns that prevented later initialization code from executing.
- Restrict SW registration to production only, but keep offline services active in both dev & prod.

**Result:**

- In both dev and production:
  - Offline services start immediately.
  - IndexedDB is populated.
  - POS can load from cache even without a Service Worker.

---

## 4. Phase 1 – Data Consistency Improvements

Phase 1 focuses on preventing data drift between Supabase and IndexedDB while keeping performance acceptable.

### 4.1 Full Sync on First Load

**Problem:**

- If IndexedDB or sync cursors are missing or corrupted, incremental sync can run but leave **stale records**.

**Implementation:**

- On `syncEntity(entity)`:
  - Read `lastSync.<entity>` cursor from metadata.
  - If not found:
    - `clearStore(entity)` to drop any stale local data.
    - Fetch **all** records from Supabase for that entity.
    - Bulk write to IndexedDB.
    - Set `lastSync.<entity>` to the last record's `updated_at`.

**Effect:**

- First sync (or after cache reset) always produces a clean, complete local snapshot.

### 4.2 Periodic Full Refresh (24h)

**Problem:**

- Over time, incremental sync alone may miss edge cases (e.g. deletes, rare drift).

**Implementation:**

- On `initialize()`:
  - Read `lastFullSync` from metadata.
  - If never set or older than 24 hours:
    - Log and run `fullSyncAll()` for all entities.
    - Update `lastFullSync`.
  - Otherwise run normal incremental `syncAllEntities()`.

**Effect:**

- Ensures a fresh baseline roughly once per day.
- Mitigates long-term drift at low complexity.

### 4.3 Stock Quantity Authority

**Problem:**

- Multiple devices and offline orders can cause **local stock values to drift**.

**Decision:**

- The **server is the single authority for stock**.

**Implementation:**

- In `fetchProducts` mapping:
  - Always assign `current_stock` directly from server values.
  - Track `stock_synced_at` for debugging.

**Result:**

- After each sync, all devices converge to consistent `current_stock` based on the database.

### 4.4 Batch Checkpoints

**Problem:**

- Long syncs could fail mid-way; on restart, incremental sync would start over, re-downloading everything.

**Implementation:**

- Sync each entity in **batches** (e.g. 100 records):
  - For each batch:
    - Write batch to IndexedDB.
    - Update cursor to last record's `updated_at`.
    - Log checkpoint.
  - On failure, cursor still points to last successful batch → restart continues from there.

**Result:**

- Efficient resume behavior.
- No redundant downloading after partial failures.

### 4.5 Sync Status Metadata

**Implementation:**

- `getSyncStatus()` returns:
  - `lastSync` (oldest per-entity cursor).
  - `lastFullSync`.
  - `syncing` + `currentSyncEntity`.
  - `lastError` (if any).
  - Record counts for `products`, `categories`, `packages`, `tables`.

**Usage:**

- Powers diagnostics UIs and status indicators.
- Supports future admin/QA tools.

---

## 5. Manual Catalog Sync & Global Sync Indicator

### 5.1 Manual Catalog Sync

**Feature:** "Sync Catalog" button in the global sync dropdown.

**Behavior:**

- When invoked (and online):
  - Clears or resets per-entity cursors.
  - Forces a full re-sync of all catalog entities.
  - Notifies listeners so POS and other screens refresh from the updated cache.

**Use cases:**

- Fixing stale or incomplete package data.
- Quickly reflecting new or edited products.
- Recovery after suspected cache corruption or schema changes.

### 5.2 Global Sync Status in Header

**Component:** `SyncStatusIndicator` in the global header.

**Features:**

- Status icon:
  - Online & healthy (checkmark).
  - Syncing (animated WiFi).
  - Offline (WiFi off).
  - Attention needed (alert icon).
- Badge showing counts of pending and failed sync mutations.
- Dropdown actions:
  - Refresh sync status.
  - Retry failed mutations.
  - Trigger manual catalog sync.

**Reasoning:**

- Sync state is a **system-level concern**, not POS-only.
- Users can see sync health from any page.
- Reduces duplication of status UI on the POS screen itself.

---

## 6. Testing & Remaining Work (High-Level)

### 6.1 Key Tests

- Full sync on first load with empty IndexedDB.
- Periodic full refresh behavior with manipulated `lastFullSync`.
- Stock authority behavior when server stock changes.
- Batch checkpoint recovery under simulated network outages.
- End-to-end: initial full sync → incremental sync → catalog refresh.

Dedicated instructions and scripts are documented in:

- `TESTING_PHASE1_DATA_CONSISTENCY.md`

### 6.2 Future Improvements

From `DATA_CONSISTENCY_STRATEGY.md` and `TODO_DATA_CONSISTENCY_IMPROVEMENTS.md`:

- Soft deletes (`deleted_at`) for all synced entities; filter deleted records in UI.
- Expose sync status and manual refresh controls in more admin surfaces.
- Add a sync diagnostics page with counts, last sync times, and manual full refresh.
- Longer-term:
  - Supabase Realtime subscriptions for near-real-time updates.
  - Conflict detection/resolution for multi-device edits.
  - Optimistic UI with rollback.

---

## 7. Net Effect

- POS now uses a **clean offline-first design**: UI reads cache, sync service talks to Supabase.
- IndexedDB data is **more trustworthy** thanks to full sync, periodic refresh, server-authoritative stock, and batch checkpoints.
- Operators gain **more control and visibility** through manual catalog sync and header-level sync status.
