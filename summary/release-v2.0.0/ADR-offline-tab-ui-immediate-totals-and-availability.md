# ADR: Offline Tab UI – Immediate Totals & Table Availability

- **Status**: Accepted
- **Date**: 2025-11-20
- **Owner**: Tab Module / Offline Runtime

## 1. Context

The Tab Management Dashboard is built on an offline-first architecture:

- IndexedDB (`offlineDb.ts`) caches:
  - `tables`
  - `order_sessions` (tabs)
  - `session_orders`
- `MutationSyncService` manages a mutation queue (`syncQueue`) for operations like:
  - `orderSessions.create`
  - `orders.create`
  - `orders.confirm`
  - `orderSessions.close`
- `DataBatchingService` periodically syncs data between Supabase and IndexedDB.

Issues observed:

1. After adding orders and returning to `/tabs`, **tab totals** sometimes lag and only reflect correctly after some delay.
2. After closing a tab and confirming payment, the **table status** often stays `Occupied` in the UI, even though the backend correctly sets the Supabase `restaurant_tables.status` to `available`.
3. Manual browser refreshes fix the display, but this is unacceptable in an offline-first, multi-cashier environment.

Goals:

- Update tab totals and table availability **immediately** on the client.
- Preserve **eventual consistency** with the server.
- Remain compatible with multiple cashiers/browsers and queued/offline mutations.

---

## 2. Decision

1. **Tab totals**:  
   Implement a **UI-side session selection strategy** in `TabManagementDashboard` that chooses the “best” session per table, preferring up-to-date temp/pending data but converging to real synced data.

2. **Table availability on close**:  
   When a tab is closed, **optimistically update the table status in IndexedDB to `available`** immediately, in addition to queuing `orderSessions.close`. Allow the next server sync to confirm or override this.

3. **Do not** implement a queue/DB-level session selection mechanism at this time, and **do not** fundamentally change `MutationSyncService` or `DataBatchingService` behavior beyond using them as-is.

---

## 3. Details

### 3.1 UI-side best session per table

**Files**:
- `src/views/tabs/TabManagementDashboard.tsx`

Changes:

- Added a helper: `selectBestSessionForTable(tableId: string)` and used it to build `tablesWithSessions`.

Behavior:

- For a given `tableId`:
  - Collect all sessions with `s.table_id === tableId`.
  - Partition into:
    - **Temp / pending sessions**:
      - `s._temp_id === true`, or
      - `id` is a string starting with `offline-session-`, or
      - `s._pending_sync === true`
    - **Real sessions**: everything else.
  - For each group, compute the session with the **maximum `total_amount`**.
- Selection rules:
  - If only temp sessions exist → return the best temp session.
  - If only real sessions exist → return the best real session.
  - If both exist:
    - If the best real session is fully synced (`!bestReal._pending_sync`) **and** `realTotal >= tempTotal` → prefer the real session.
    - Otherwise → prefer the temp/pending session (optimistic display).
  - If no sessions match, fall back to the first found or `null`.

Result:

- After adding orders and returning to `/tabs`, totals reflect the latest local state (including temp and `_pending_sync` sessions) without waiting for remote sync.
- Once the server sync completes and real sessions are up-to-date, the UI naturally shifts to displaying the real, fully synced session.

---

### 3.2 Optimistic table status update on close

**Files**:
- `src/lib/data-batching/offlineDb.ts`
- `src/services/OfflineTabService.ts`

#### 3.2.1 New helper: `updateTableStatus`

In `offlineDb.ts`:

- Defined `OfflineTable`:

  ```ts
  export interface OfflineTable {
    id: string;
    label: string;
    table_number: string | null;
    capacity: number;
    status: string;
    updated_at: string;
  }
  ```

- Added:

  ```ts
  export async function updateTableStatus(
    tableId: string,
    status: string
  ): Promise<void> {
    await withOfflineDb(async (db) => {
      if (!db.objectStoreNames.contains('tables')) {
        console.warn('⚠️ Store "tables" does not exist in database. Skipping updateTableStatus.');
        return;
      }

      const transaction = db.transaction(['tables'], 'readwrite');
      const store = transaction.objectStore('tables');

      const table = await new Promise<OfflineTable | undefined>((resolve, reject) => {
        const getRequest = store.get(tableId);
        getRequest.onsuccess = () => resolve(getRequest.result as OfflineTable | undefined);
        getRequest.onerror = () =>
          reject(getRequest.error ?? new Error('Failed to get table for updateTableStatus'));
      });

      if (!table) {
        return;
      }

      const updated: OfflineTable = {
        ...table,
        status,
        updated_at: new Date().toISOString(),
      };

      store.put(updated);
      await waitForTransaction(transaction);
      console.log(`✅ Updated table status in IndexedDB: ${tableId} → ${status}`);
    });
  }
  ```

#### 3.2.2 Use in `OfflineTabService.closeTab`

In `OfflineTabService.ts`:

- Import:

  ```ts
  import {
    // ...
    updateTableStatus,
  } from '@/lib/data-batching/offlineDb';
  ```

- After updating the local session to `closed` in `closeTab`:

  ```ts
  await updateOrderSession(sessionId, {
    status: 'closed',
    closed_at: new Date().toISOString(),
    ...(paymentData.closed_by ? { closed_by: paymentData.closed_by } : {}),
    discount_amount: finalDiscount,
    total_amount: finalTotal,
    payment_method: paymentData.payment_method,
    _pending_sync: true,
  });

  if (session.table_id) {
    await updateTableStatus(session.table_id, 'available');
  }
  ```

- The method still queues the `orderSessions.close` mutation as before.

Result:

- The moment a tab is closed, the corresponding table is immediately set to `available` **in IndexedDB**.
- `TabManagementDashboard` reads tables via `DataBatchingService.getCachedTables()` (IndexedDB), so `/tabs` shows the table as **Available** immediately when the user returns.
- The backend (`OrderSessionService.closeTab` → `OrderSessionRepository.updateTableSession`) separately updates `restaurant_tables.status` to `available`. A subsequent data sync from Supabase keeps client and server in agreement.

---

### 3.3 Ancillary: number input scroll handling

**File**:
- `src/views/shared/ui/input.tsx`

Problem:

- Existing code called `event.preventDefault()` in a `wheel` handler to prevent scroll-wheel changes on `type="number"` inputs.
- React attaches `wheel` listeners as passive by default, which cannot call `preventDefault`, causing console warnings.

Change:

- Replaced `preventDefault` with a blur-based approach:

  ```ts
  const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    if (type === 'number' && document.activeElement === event.currentTarget) {
      event.currentTarget.blur()
    }
    onWheel?.(event)
  }
  ```

Effect:

- Prevents accidental value changes via scroll for focused numeric inputs.
- Eliminates the passive event listener warning.

---

## 4. Consequences

### 4.1 Positive

- **Improved UX**:
  - Tab totals and table availability update immediately after user actions, without requiring manual refresh.
- **Offline-first correctness**:
  - All changes are first applied to IndexedDB; server remains authoritative.
  - Behavior integrates cleanly with existing mutation queue and sync services.
- **Multi-cashier robustness**:
  - If another cashier re-opens a table or changes state, the next sync overwrites local state with server truth.
  - UI-side session selection prefers real synced sessions once they are consistent and up-to-date.

### 4.2 Trade-offs and risks

- **Temporary divergence**:
  - There can be short-lived divergence between local status (e.g. `available`) and server status if other clients act on the same table concurrently.
  - This is acceptable within an eventual-consistency offline-first design.
- **Heuristic complexity**:
  - The `selectBestSessionForTable` logic relies on heuristics (`_temp_id`, `offline-session-*`, `_pending_sync`, `total_amount`).
  - Future changes to session structure or ID patterns must keep this logic in sync.

---

## 5. Alternatives Considered

1. **Queue/DB-level best-session logic**  
   Implement smarter merging and selection at the mutation or data-batching layer (e.g. always rewrite a single canonical “active session per table” record).
   - Rejected for now due to higher complexity and risk in core sync services.
   - UI-side selection is simpler and sufficient for current requirements.

2. **Force full sync before returning to `/tabs`**  
   After closing a tab, call `dataBatching.syncAllEntities()` and wait before navigating back.
   - Would guarantee server-aligned state but introduces visible latency.
   - Chosen approach gives immediate UX feedback and relies on background sync.

---

## 6. Follow-ups

- Consider reusing `updateTableStatus` for other flows that directly impact table status (e.g. zero-amount auto-close path) for consistency.
- Add tests or logging assertions around:
  - Multi-cashier scenarios (two browsers working on the same table).
  - Long offline periods followed by reconnection and full sync.
