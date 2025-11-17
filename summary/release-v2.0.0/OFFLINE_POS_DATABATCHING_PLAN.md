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

### Why Offline-First Now?
- **Field feedback**: Cashiers reported “connected but unusable” Wi‑Fi—requests take several seconds or time out entirely. Each stalled transaction risks abandoned orders and measurable revenue loss.
- **Service quality**: Long waits at the bar feel like poor customer service; we need sub-second cart + payment UX even if the uplink is congested.
- **Business roadmap**: We still rely on a centralized Supabase backend (multiple branches sharing inventory/reporting), so the solution must queue locally yet reconcile to the remote source of truth automatically.

Going offline-first lets the POS write every operation to IndexedDB first (orders, payments, stock adjustments). Network sync becomes an asynchronous concern so the UI never blocks on connectivity.

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
1. ✅ Confirm PWA baseline (Service Worker registration, web manifest, install prompt).
   - ✅ `public/manifest.json` now declares BeerHive POS as standalone PWA, exposes icons, colors, and scope so install banners can appear across Chromium/Edge.
   - ✅ `public/service-worker.js` ships with cache-first strategy for the shell plus navigation fallback, ensuring POS boots when offline.
   - ✅ `OfflineRuntimeProvider` registers the Service Worker after load, tracks install prompts, and exposes `useOfflineRuntime` so UI can surface install/offline status.
2. ✅ Define IndexedDB schema (object stores + key columns):
   - `products`: `id` (PK), `name`, `sku`, `category_id`, `package_ids`, `price`, `tax_group`, `stock_qty`, `updated_at`.
   - `categories`: `id` (PK), `name`, `parent_id`, `sort_order`, `updated_at`.
   - `packages`: `id` (PK), `name`, `product_id`, `unit_size`, `price`, `barcode`, `updated_at`.
   - `tables`: `id` (PK), `label`, `capacity`, `status`, `updated_at`.
   - `orders`: `id` (PK), `status`, `items[]`, `totals`, `payments`, `synced_at`, `updated_at`.
   - `syncQueue`: auto `id` (PK), `mutationType`, `payload`, `created_at`, `retry_count`, `last_attempt_at`, `status` (`pending`, `failed`, `synced`).
   - `metadata`: `key` (PK), `value`, `updated_at` (e.g., `lastSync.products`).
3. ✅ Document data retention policies (e.g., catalog full copy, order history X days).
   - Catalog (`products`, `categories`, `packages`, `tables`) keeps the full active dataset but evicts entries older than 30 days that remain inactive, keeping the quota < 35 MB.
   - Orders persist 14 days of history per device; confirmed/synced orders older than 7 days are compacted to header-only snapshots, and drafts older than 48 h are purged.
   - `syncQueue` retains failed mutations indefinitely until explicitly retried, while successfully synced envelopes are deleted immediately after confirmation.
4. ✅ Specify Supabase service contracts (REST/GraphQL views, RPCs) and required indexes/RLS policies to support incremental fetch and offline mutation replay without full table scans.
   - Read side will rely on delta endpoints exposed through RPCs (`pos_fetch_products_delta(last_updated timestamptz)` etc.) that filter by `updated_at > :cursor` and are backed by composite indexes on `(tenant_id, updated_at)` for each entity table.
   - Mutation replay occurs via `pos_mutation_ingest(mutation_type text, payload jsonb)` edge function enforcing cashier/table ownership using RLS policies tied to `auth.uid()`, ensuring conflict detection executes server-side and short-circuits on stale `updated_at` stamps.
   - Reports/monitoring views log ingestion metrics (volume, conflict counts) to `pos_data_sync_events`, allowing dashboards to alert if offline clients lag >5 minutes.

### Phase 1 – DataBatchingService (Read Pipeline)
1. ✅ Create a root-level singleton/module that initializes at app bootstrap and inside the Service Worker.
2. ✅ Implement per-entity fetchers using Supabase REST/GraphQL; support pagination/chunking to avoid blocking UI.
3. ✅ Normalize records before storage (strip unused columns, add `updated_at` timestamps).
4. ✅ Write bulk upsert helpers for IndexedDB (Dexie.js or `idb`), wrapped in transactions.
5. ✅ Capture last-sync metadata to drive incremental refresh (e.g., `lastUpdated` table).
6. ✅ Expose subscription mechanism so UI contexts (Cart, StockTracker) hydrate from IndexedDB first, then live Supabase fallback when online.
7. ✅ Provision Supabase views or RPCs that emit delta-friendly payloads (filter by `updated_at > :lastSync`) so the client can hydrate quickly without over-fetching.
8. ✅ Add backend monitoring on these read endpoints (log volume, latency, error rates) to detect sync regressions early.

### Phase 2 – Mutation & Sync Queue
1. ✅ Define mutation envelope schema (order create, payment complete, stock adjustments).
2. ✅ Capture POS operations as mutations saved to IndexedDB before hitting the network.
3. ✅ Implement queue processor that flushes mutations when online; include retry/circuit-breaker logic and dead-letter handling.
4. ✅ Reconcile Supabase responses back into IndexedDB (mark orders as `synced`, update stock).
5. ✅ Provide UI hooks to surface sync status and retry controls.
6. ✅ Implement Supabase edge functions/RPCs that accept mutation envelopes idempotently, perform conflict detection, and return authoritative order/stock states.
7. ✅ Add database triggers or stored procedures that publish reconciliation events (e.g., `orders_synced`) for telemetry and downstream reporting alignment.

#### Phase 2 – Remaining TODOs
- [x] Close-tab offline receipt parity: pass `sessionData` (with `orders` + `order_items`) into `PaymentPanel` and ensure both POS and `/order-sessions/[sessionId]/close` render receipts from the queued snapshot before any network fetch.
- [x] Offline status telemetry: ship `OfflineStatusBadge`, wire it to `MutationSyncService` (`subscribe/getSyncStatus/retryFailedMutations`) and surface it in the POS header so cashiers see pending/failed queue counts plus retry controls.
- [ ] Backend ingest + monitoring: reuse the existing Supabase REST/RPC endpoints that already power online POS transactions for queued mutation replay, then add conflict/latency dashboards plus cron checks that alert when devices have >5 min of unsynced mutations (edge function remains optional and is deferred for now to avoid extra layers).
  - ✅ Mutation envelopes already call the same `/api/orders` + `/api/order-sessions/:id/close` paths when `MutationSyncService.processPendingMutations()` runs, so no new ingest function is required.
  - [x] Add a lightweight `pos_sync_events` table/RPC that each API route writes to (columns: `device_id`, `mutation_type`, `queue_id`, `latency_ms`, `result`, `conflict_reason`). This feeds Supabase dashboards for conflict / failure tracking. (Migration: `migrations/release-v2.0.0/add_pos_sync_events.sql`).
  - [x] Create Supabase Saved Queries or a simple dashboard (e.g., using SQL Editor charts) showing: pending queue count per device, average ingest latency, conflict rate over time. Base these on the new `pos_sync_event_rollups` view.
    - Saved Query 1: `select * from pos_sync_event_rollups order by last_event_at desc limit 50;` (table chart) to monitor per-device lag + conflicts.
    - Saved Query 2: `select date_trunc('hour', created_at) as hour, count(*) filter (where result <> 'success') as failures, avg(latency_ms) as avg_latency_ms from pos_sync_events where created_at > now() - interval '24 hours' group by 1 order by 1;` visualized as combo line/bar.
    - Saved Query 3: `select mutation_type, count(*) as total from pos_sync_events where created_at > now() - interval '7 days' group by 1 order by total desc;` pie/bar chart for mutation volume mix.
  - [ ] Schedule a Supabase Cron job (Edge Function or SQL task) every 5 minutes that scans `syncQueue` metadata by device; if `pending > 0` and `created_at` oldest entry > 5 minutes, insert into `pos_sync_alerts` (and eventually notify via email/Slack).
  - [ ] Expose a lightweight `/api/sync/status` endpoint that surfaces the latest telemetry so the POS header badge can show “⚠️ Pending for 6m+” when the cron raises alerts.
- [ ] Regression coverage: add MutationSyncService unit tests and offline payment/close-tab integration tests (POS + Tabs module) to block regressions.

### Phase 3 – Background Sync & Connectivity Strategy
1. ✅ Integrate `navigator.onLine` and heartbeat checks to detect connectivity changes.
2. ✅ For browsers with Background Sync API, register periodic/sync events; fallback to manual triggers on page focus/login.
3. ✅ Leverage Supabase real-time when available to receive deltas; queue them for IndexedDB upsert.
4. ✅ Emit telemetry/logging (IndexedDB size, last sync time, pending mutations) for observability.
5. ✅ Schedule Supabase cron/Edge Functions that periodically verify pending mutations per device, auto-retry failed items, and alert when SLAs (e.g., >5 min unsynced) are breached.

### Phase 4 – Validation & Rollout
1. Build test harnesses that simulate offline mode (DevTools throttling, Cypress tests with Service Worker mocks).
2. Add regression tests for IndexedDB migrations and queue processing.
3. Pilot rollout on staging with controlled data sizes; monitor quota usage and conflicts.
4. Document recovery procedures (clear cache, manual re-sync) and train cashiers on offline indicators.
5. Build Supabase-side monitoring dashboards (queries per endpoint, mutation failure rates, sync SLA adherence) and document on-call runbooks for backend incidents.

---
**Next Steps**: Align stakeholders on the plan, size engineering tasks for Phase 0/1, and create ADR covering offline-first architecture decisions.
