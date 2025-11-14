# Offline-First POS DataBatchingService Plan

## 1. Current Flow Snapshot (v1.0.2)
- POS loads via `POSInterface` and immediately fetches products, packages, and categories.
- Product grids now sort alphabetically (top-seller popularity queries removed), reducing load on `order_items`/`orders`.
- Cart operations are local-first: `CartContext` persists to IndexedDB, and `StockTracker` manages in-memory reservations until payment.
- Orders complete online-only; there is no resilient background sync if the network drops.

## 2. Desired Outcome
Deliver a POS that functions without connectivity by:
- Prefetching all POS-critical reference data (products, categories, packages, tables, pricing metadata) into IndexedDB via a root-level `DataBatchingService`.
- Serving catalog searches, product lookups, and cart mutations directly from the local cache.
- Queuing order mutations and pushing them to Supabase once the device reconnects, with conflict safeguards.

## 3. Purpose
Provide engineering with an actionable blueprint for building `DataBatchingService`, aligning browser runtime services (Service Worker / IndexedDB) with the existing React + Supabase stack.

## 4. Scope
- **In scope**: Client-side data sync orchestrator, IndexedDB schema design, mutation queue, background sync triggers, telemetry and UI feedback for offline/online transitions.
- **Out of scope**: Native desktop/mobile apps, comprehensive analytics backfill to IndexedDB, Supabase schema overhauls, extending offline mode to customer/kitchen displays in this iteration.

## 5. Limitations & Assumptions
1. IndexedDB quota varies; expect ~50 MB safe capacity without prompts—cache only POS-critical data.
2. Service Worker requires at least one online session for install/seed; plan must bootstrap gracefully.
3. Background Sync API lacks universal support (Safari). Fallbacks (manual retry, app resume triggers) are mandatory.
4. Supabase real-time events may lag post-outage; reconciliation relies on timestamped deltas and conflict rules.

## 6. Plan Goals
- Keep checkout responsive and consistent during network disruptions.
- Guarantee eventual consistency between local caches and Supabase without double-selling.
- Maintain clear separation of concerns so business logic stays framework-agnostic.

## 7. Implementation Plan

### Phase 0 – Prerequisites & Architecture
1. Confirm PWA baseline (Service Worker registration, web manifest, install prompt).
2. Define IndexedDB schema (object stores for `products`, `categories`, `packages`, `tables`, `orders`, `syncQueue`, metadata store).
3. Document data retention policies (e.g., catalog full copy, order history X days).

### Phase 1 – DataBatchingService (Read Pipeline)
1. Create a root-level singleton/module that initializes at app bootstrap and inside the Service Worker.
2. Implement per-entity fetchers using Supabase REST/GraphQL; support pagination/chunking to avoid blocking UI.
3. Normalize records before storage (strip unused columns, add `updated_at` timestamps).
4. Write bulk upsert helpers for IndexedDB (Dexie.js or `idb`), wrapped in transactions.
5. Capture last-sync metadata to drive incremental refresh (e.g., `lastUpdated` table).
6. Expose subscription mechanism so UI contexts (Cart, StockTracker) hydrate from IndexedDB first, then live Supabase fallback when online.

### Phase 2 – Mutation & Sync Queue
1. Define mutation envelope schema (order create, payment complete, stock adjustments).
2. Capture POS operations as mutations saved to IndexedDB before hitting the network.
3. Implement queue processor that flushes mutations when online; include retry/circuit-breaker logic and dead-letter handling.
4. Reconcile Supabase responses back into IndexedDB (mark orders as `synced`, update stock).
5. Provide UI hooks to surface sync status and retry controls.

### Phase 3 – Background Sync & Connectivity Strategy
1. Integrate `navigator.onLine` and heartbeat checks to detect connectivity changes.
2. For browsers with Background Sync API, register periodic/sync events; fallback to manual triggers on page focus/login.
3. Leverage Supabase real-time when available to receive deltas; queue them for IndexedDB upsert.
4. Emit telemetry/logging (IndexedDB size, last sync time, pending mutations) for observability.

### Phase 4 – Validation & Rollout
1. Build test harnesses that simulate offline mode (DevTools throttling, Cypress tests with Service Worker mocks).
2. Add regression tests for IndexedDB migrations and queue processing.
3. Pilot rollout on staging with controlled data sizes; monitor quota usage and conflicts.
4. Document recovery procedures (clear cache, manual re-sync) and train cashiers on offline indicators.

---
**Next Steps**: Align stakeholders on the plan, size engineering tasks for Phase 0/1, and create ADR covering offline-first architecture decisions.
