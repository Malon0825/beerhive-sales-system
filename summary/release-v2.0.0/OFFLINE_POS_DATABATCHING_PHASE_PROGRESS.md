# Offline POS DataBatching Implementation Summary

## Scope
Summarizes the work completed during this chat for the Offline POS initiative, covering Phase 0 (Prerequisites & Architecture), Phase 1 (Read Pipeline), and Phase 2 (Mutation & Sync Queue) of the DataBatchingService roadmap.

## Phase 0 Highlights
1. **PWA Baseline Confirmed**
   - Added `public/manifest.json` with standalone display, icons, and colors for install prompts.
   - Shipped `public/service-worker.js` implementing cache-first shell loading with offline navigation fallback.
   - Wrapped the app in `OfflineRuntimeProvider` to register the Service Worker, expose install prompts, and broadcast online/offline status.

2. **IndexedDB Schema Defined**
   - Created `offlineDb.ts` describing stores for products, categories, packages, tables, orders, syncQueue, and metadata.
   - Implemented helpers for opening the DB, ensuring stores exist, and managing metadata values.

3. **Data Retention Policies Documented**
   - Catalog data keeps full active datasets while evicting inactive entries older than 30 days.
   - Orders retain 14 days of history (with compaction/purges) and sync queues keep failed mutations until retried.

4. **Supabase Contracts Outlined**
   - Planned delta RPCs (e.g., `pos_fetch_products_delta`) plus mutation ingest functions with RLS enforcement and monitoring views for lag detection.

## Phase 1 Highlights
1. **DataBatchingService Bootstrap**
   - Added `DataBatchingService` singleton that initializes once, syncs at startup, and listens for `online` events to resync.
   - Provides subscription hooks and snapshot APIs so UI contexts can hydrate from IndexedDB first.

2. **Per-Entity Fetchers & Normalization**
   - Implemented Supabase fetchers for products, categories, packages, and tables with incremental (cursor-based) queries.
   - Normalized each record into offline-friendly shapes capturing POS-critical fields (e.g., category colors, package items, VIP prices, table numbers).

3. **IndexedDB Upsert & Metadata Tracking**
   - `bulkPut`, `readAllRecords`, `get/setMetadataValue`, and `clearStore` utilities manage transactional writes and last-sync cursors.
   - Metadata keys (`lastSync.products`, etc.) guarantee incremental refreshes instead of full scans.

4. **Plan Documentation Updated**
   - Phase 0 and Phase 1 checklists marked complete in `OFFLINE_POS_DATABATCHING_PLAN.md`, ensuring stakeholders see current status.

## Phase 2 Highlights
1. **Strict Offline-First Mutations**
   - `PaymentPanel` now *always* writes orders/tab closures to `syncQueue` before returning control, guaranteeing sub-second UX even on poor Wi-Fi.
   - Offline completion metadata (temporary IDs + cart snapshots) is passed back to `POSInterface`/tab flows so receipts render immediately without `/api/orders/:id`.

2. **MutationSyncService Implementation**
   - Built `MutationSyncService` singleton to drain `syncQueue`, apply retries, and expose `subscribe/getSyncStatus/retryFailedMutations` APIs for UI telemetry.
   - `OfflineRuntimeProvider` initializes/destroys the service so queue flushing is automatic when connectivity returns.

3. **Queue Telemetry & Guardrails**
   - IndexedDB helpers now cover full lifecycle (enqueue, update, delete, count) enabling MutationSyncService + future instrumentation.
   - Payments trigger an immediate toast plus, when online, a background sync attempt; failed retries stay in `failed` status for manual intervention.

4. **Pending UI & Backend Work**
   - Offline receipts still need the POS/tab views to consume the provided `localOrder` snapshot (work in progress).
   - The planned `OfflineStatusBadge` (pending/failed indicator + manual retry) and Supabase ingest endpoints remain outstanding to close the loop.

## Next Recommended Steps
- Start **Phase 3** (Background Sync & Connectivity): heartbeat/Background Sync integration, telemetry, and Supabase cron checks for stuck mutations.
- Build automated test harnesses for mutation queue migrations and processor edge cases ahead of Phase 4 rollout.
