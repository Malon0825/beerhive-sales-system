# Offline-First Tab Module Refactoring Plan

## 1. Executive Summary
Refactor the Tab / Order Session module to adopt a "Local-First" architecture. This ensures the POS remains fully functional during network interruptions and improves UI responsiveness by removing network latency from critical user actions.

**Core Philosophy:**
1.  **Write Local**: All user actions (Open Tab, Add Order, Pay) write immediately to IndexedDB.
2.  **Queue Remote**: Actions are queued as mutations to be replayed against the server.
3.  **Sync Background**: The `MutationSyncService` handles the replay and reconciliation invisible to the user.

## 2. Target Architecture

### The "Offline Layer" (`OfflineTabService`)
A new service layer that acts as the single source of truth for the UI. It abstracts the complexity of:
*   Generating temporary IDs (UUID v4 or timestamp-based).
*   Calculating session totals locally (mirroring server logic).
*   Updating IndexedDB (`offlineDb`).
*   Enqueuing mutations for `MutationSyncService`.

### Component Interaction
`[UI Component]` -> `[OfflineTabService]` -> `[offlineDb (IndexedDB)]` -> `[MutationSyncService]` -> `[Supabase API]`

## 3. Implementation Plan

### Phase 1: Core Service Implementation (`OfflineTabService`)
Create `src/services/OfflineTabService.ts` to centralize business logic.

**Key Responsibilities:**
*   **`openSession(tableId, customerId)`**:
    *   Generates `offline-session-{uuid}`.
    *   Creates entry in `order_sessions` store.
    *   Queues `orderSessions.create`.
*   **`addOrder(sessionId, items)`**:
    *   Generates `offline-order-{uuid}`.
    *   Calculates totals (VIP pricing, tax).
    *   Deducts stock locally (optimistic).
    *   Updates session totals in IDB.
    *   Queues `orders.create` and `orders.confirm`.
*   **`closeSession(sessionId, paymentData)`**:
    *   Validates payment.
    *   Updates session status to `closed`.
    *   Queues `orderSessions.close`.

### Phase 2: Session Creation Refactor
**Targets:** `QuickOpenTabModal.tsx`, `TableCard.tsx`
*   Replace direct `apiPost('/api/order-sessions')` calls with `OfflineTabService.openSession()`.
*   Update Table Grid to read "Occupied" status from `useOfflineData` (IndexedDB) instead of only API.

### Phase 3: Order Management Refactor
**Targets:** `SessionOrderFlow.tsx`, `SessionProductSelector.tsx`
*   Refactor `confirmOrder` in `SessionOrderFlow` to use `OfflineTabService.addOrder()`.
*   Remove inline stock deduction logic from the view; move it to the service.
*   Ensure `cart` state is robust against page reloads (already largely handled by local state, but ensure persistence).

### Phase 4: Payment & Closure Refactor
**Targets:** `PaymentPanel.tsx`, `CloseTabModal.tsx`
*   Replace direct API calls with `OfflineTabService.closeSession()`.
*   Ensure receipt generation uses local data snapshot, not waiting for server response.
*   Handle "Partial Payments" or "Split Bill" scenarios if applicable (keep simple for v1: full payment).

### Phase 5: Data Reconciliation & ID Swapping
*   Enhance `MutationSyncService` to robustly handle the swap of `offline-session-X` to `Real-UUID-Y` in queued mutations.
*   Ensure that when the real ID comes back from the server, the local IDB record is updated so the user doesn't see "phantom" sessions.

## 4. Detailed Task List

### 4.1 Service Methods
- [x] `OfflineTabService.openTab(data)`
- [x] `OfflineTabService.addToTab(sessionId, items)`
- [x] `OfflineTabService.closeTab(sessionId, payment)`
- [x] `OfflineTabService.getTabDetails(sessionId)` (reads from IDB with fallback)

### 4.2 UI Integration
- [x] Update `QuickOpenTabModal` to use `OfflineTabService`.
- [x] Update `SessionOrderFlow` to use `OfflineTabService`.
- [x] Update `PaymentPanel` to use `OfflineTabService`.
- [x] Add "Sync Status" indicators to Tab Cards (e.g., "Saving...", "Saved").

### 4.3 Robustness Improvements
- [x] **Stock Integrity**: Implement a "re-check" of stock when online sync happens. If stock is low on server but okay locally (race condition), decide policy (Force accept vs. Reject). *Decision: Force accept for offline orders to avoid blocking sales, flag for manager review.*
- [x] **ID Collision Prevention**: Use UUIDs for offline IDs to practically eliminate collision risks.

## 5. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **ID Conflicts** | Use standard UUIDs for temp IDs. `MutationSyncService` handles mapping. |
| **Stock Drift** | Optimistic decrement locally. Server is authority. Negative stock allowed for offline sales if config permits. |
| **Browser Storage Limit** | Prune closed sessions > 24h. Keep only active catalogs. |
| **Sync Failures** | `MutationSyncService` has retry logic (3x). Failed mutations stay in queue for manual retry. |

## 6. Developer Workflow
1.  Devs should use `OfflineTabService` for ALL tab operations.
2.  Do NOT use `fetch('/api/...')` for mutations in UI components.
3.  Always assume `sessionId` might be temporary (`offline-session-...`).
