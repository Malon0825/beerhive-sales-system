'use client';

import { supabase } from '@/data/supabase/client';
import {
  OfflineCategory,
  OfflinePackage,
  OfflineProduct,
  OfflineTable,
  OfflineOrderSession,
  bulkPut,
  getMetadataValue,
  readAllRecords,
  setMetadataValue,
  clearStore,
  putOrderSession,
  getOrderSessionById,
  getActiveOrderSessions,
} from './offlineDb';

const ENTITY_CURSOR_PREFIX = 'lastSync';
const FULL_SYNC_METADATA_KEY = 'lastFullSync';
const FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const INCREMENTAL_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (optional background sync)
const BATCH_SIZE = 100;

type BatchEntity = 'products' | 'categories' | 'packages' | 'tables' | 'order_sessions';

type CatalogSnapshot = {
  products: OfflineProduct[];
  categories: OfflineCategory[];
  packages: OfflinePackage[];
  tables: OfflineTable[];
  order_sessions: OfflineOrderSession[];
};

type CatalogListener = () => void;

export interface SyncStatus {
  lastSync: Date | null;
  lastFullSync: Date | null;
  syncing: boolean;
  entity: BatchEntity | null;
  error: string | null;
  recordCounts: Record<BatchEntity, number>;
}

const entityList: BatchEntity[] = ['products', 'categories', 'packages', 'tables', 'order_sessions'];

export class DataBatchingService {
  private static instance: DataBatchingService;
  private initialized = false;
  private listeners = new Set<CatalogListener>();
  private syncingPromise: Promise<void> | null = null;
  private currentSyncEntity: BatchEntity | null = null;
  private lastError: string | null = null;
  private incrementalSyncTimer: NodeJS.Timeout | null = null;

  static getInstance(): DataBatchingService {
    if (!DataBatchingService.instance) {
      DataBatchingService.instance = new DataBatchingService();
    }
    return DataBatchingService.instance;
  }

  /**
   * Initialize the DataBatchingService with periodic full sync support.
   * Phase 1.2: Check if 24 hours elapsed since last full sync.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    // Phase 1.2: Check if we need periodic full refresh
    const lastFullSync = await getMetadataValue<string>(FULL_SYNC_METADATA_KEY);
    const now = new Date();
    const needsFullSync = !lastFullSync || 
      (now.getTime() - new Date(lastFullSync).getTime() > FULL_SYNC_INTERVAL_MS);

    if (needsFullSync) {
      console.log('[DataBatchingService] Triggering periodic full sync (24h elapsed)...');
      await this.fullSyncAll();
      await setMetadataValue(FULL_SYNC_METADATA_KEY, now.toISOString());
    } else {
      console.log('[DataBatchingService] Doing incremental sync...');
      await this.syncAllEntities();
    }

    // Register network event listener for reconnection sync
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
    }

    // Start background incremental sync timer (only fetches changed records)
    // This is CHEAP because it only retrieves records updated since last sync
    this.startIncrementalSyncTimer();
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
    }
    this.stopIncrementalSyncTimer();
    this.listeners.clear();
    this.initialized = false;
  }

  /**
   * Start background incremental sync timer.
   * Runs every 5 minutes to fetch only changed records (very cheap).
   * Only syncs if device is online to avoid wasted attempts.
   */
  private startIncrementalSyncTimer() {
    // Clear any existing timer
    this.stopIncrementalSyncTimer();

    // Set up recurring timer
    this.incrementalSyncTimer = setInterval(() => {
      // Only sync if online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        console.log('[DataBatchingService] Running background incremental sync...');
        this.syncAllEntities().catch((error) => {
          console.error('[DataBatchingService] Background sync failed:', error);
        });
      }
    }, INCREMENTAL_SYNC_INTERVAL_MS);

    console.log(`[DataBatchingService] Background incremental sync enabled (every ${INCREMENTAL_SYNC_INTERVAL_MS / 1000 / 60} minutes)`);
  }

  /**
   * Stop background incremental sync timer
   */
  private stopIncrementalSyncTimer() {
    if (this.incrementalSyncTimer) {
      clearInterval(this.incrementalSyncTimer);
      this.incrementalSyncTimer = null;
    }
  }

  subscribe(listener: CatalogListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getCatalogSnapshot(): Promise<CatalogSnapshot> {
    const [products, categories, packages, tables, order_sessions] = await Promise.all([
      readAllRecords('products'),
      readAllRecords('categories'),
      readAllRecords('packages'),
      readAllRecords('tables'),
      readAllRecords('order_sessions'),
    ]);

    return { products, categories, packages, tables, order_sessions };
  }

  async getLastSyncMap(): Promise<Record<BatchEntity, string | null>> {
    const entries = await Promise.all(
      entityList.map(async (entity) => ({
        entity,
        cursor: await getMetadataValue<string>(`${ENTITY_CURSOR_PREFIX}.${entity}`),
      }))
    );

    return entries.reduce((acc, { entity, cursor }) => {
      acc[entity] = cursor;
      return acc;
    }, {} as Record<BatchEntity, string | null>);
  }

  /**
   * Phase 1.5: Get comprehensive sync status for monitoring.
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const recordCounts: Record<BatchEntity, number> = {
      products: 0,
      categories: 0,
      packages: 0,
      tables: 0,
      order_sessions: 0,
    };

    // Get record counts from IndexedDB
    for (const entity of entityList) {
      const records = await readAllRecords(entity);
      recordCounts[entity] = records.length;
    }

    // Get last sync timestamps
    const lastSyncTimestamps = await Promise.all(
      entityList.map(e => getMetadataValue<string>(`${ENTITY_CURSOR_PREFIX}.${e}`))
    );

    const validTimestamps = lastSyncTimestamps
      .filter((ts): ts is string => ts !== null)
      .map(ts => new Date(ts));

    const lastSync = validTimestamps.length > 0
      ? validTimestamps.sort((a, b) => a.getTime() - b.getTime())[0]
      : null;

    const lastFullSyncStr = await getMetadataValue<string>(FULL_SYNC_METADATA_KEY);
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

  /**
   * Force a full catalog sync by clearing all sync timestamps and re-fetching all data
   * This is useful for manual refresh or when cache is suspected to be stale
   */
  async forceFullSync(): Promise<void> {
    console.log('🔄 [DataBatchingService] Force full sync initiated...');
    
    // Clear all entity sync timestamps to force re-fetch
    await Promise.all(
      entityList.map(entity => 
        setMetadataValue(`${ENTITY_CURSOR_PREFIX}.${entity}`, null)
      )
    );
    
    console.log('✅ [DataBatchingService] Cleared all sync timestamps');
    
    // Trigger full sync
    await this.syncAllEntities();
    
    console.log('✅ [DataBatchingService] Force full sync completed');
  }

  async syncAllEntities(): Promise<void> {
    if (this.syncingPromise) {
      return this.syncingPromise;
    }

    this.syncingPromise = (async () => {
      for (const entity of entityList) {
        await this.syncEntity(entity);
      }
      this.notifyListeners();
      this.syncingPromise = null;
    })();

    return this.syncingPromise;
  }

  /**
   * Phase 1.2: Full sync all entities (clear + fetch all).
   */
  async fullSyncAll(): Promise<void> {
    console.log('[DataBatchingService] Starting full sync for all entities...');

    for (const entity of entityList) {
      try {
        await this.fullSyncEntity(entity);
      } catch (error) {
        console.error(`[DataBatchingService] Full sync failed for ${entity}:`, error);
        this.lastError = error instanceof Error ? error.message : 'Unknown error';
        // Continue with other entities even if one fails
      }
    }

    console.log('[DataBatchingService] Full sync complete for all entities');
    this.notifyListeners();
  }

  private handleOnline = () => {
    if (navigator.onLine) {
      this.syncAllEntities().catch((error) => {
        console.error('[DataBatchingService] Online sync failed', error);
      });
    }
  };

  /**
   * Phase 1.1: Full sync a single entity (clear + fetch all).
   */
  private async fullSyncEntity(entity: BatchEntity): Promise<void> {
    console.log(`[DataBatchingService] Full sync starting for ${entity}...`);

    // Clear existing data to prevent stale records
    await clearStore(entity);

    // Fetch ALL records (no cursor filter)
    const { records, latestUpdatedAt } = await this.fetchEntityDataBatch(entity, undefined, 1000);

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

  /**
   * Phase 1.1 & 1.4: Sync entity with full sync on first load and batch checkpoints.
   */
  private async syncEntity(entity: BatchEntity): Promise<void> {
    this.currentSyncEntity = entity;
    this.lastError = null;

    try {
      const cursorKey = `${ENTITY_CURSOR_PREFIX}.${entity}`;
      let cursor = await getMetadataValue<string>(cursorKey);

      // Phase 1.1: If no cursor, do full sync (first load or cursor lost)
      if (!cursor) {
        console.log(`[DataBatchingService] First sync for ${entity}, doing full sync...`);
        await this.fullSyncEntity(entity);
        return;
      }

      // Phase 1.4: Batch sync with checkpoints
      let totalSynced = 0;

      while (true) {
        console.log(`[DataBatchingService] Syncing ${entity} batch from cursor: ${cursor}`);

        // Fetch batch
        const { records, latestUpdatedAt } = await this.fetchEntityDataBatch(
          entity,
          cursor,
          BATCH_SIZE
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

        // If batch was smaller than BATCH_SIZE, we're done
        if (records.length < BATCH_SIZE) {
          break;
        }
      }

      if (totalSynced > 0) {
        console.log(`[DataBatchingService] Sync complete for ${entity}: ${totalSynced} total records`);
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[DataBatchingService] Failed to sync ${entity}`, error);
      throw error;
    } finally {
      this.currentSyncEntity = null;
    }
  }

  /**
   * Phase 1.4: Fetch entity data with batch limit support.
   */
  private async fetchEntityDataBatch(
    entity: BatchEntity,
    lastUpdated: string | undefined,
    limit: number
  ) {
    switch (entity) {
      case 'products':
        return this.fetchProducts(lastUpdated, limit);
      case 'categories':
        return this.fetchCategories(lastUpdated, limit);
      case 'packages':
        return this.fetchPackages(lastUpdated, limit);
      case 'tables':
        return this.fetchTables(lastUpdated, limit);
      case 'order_sessions':
        return this.fetchOrderSessions(lastUpdated, limit);
      default:
        throw new Error(`Unknown entity: ${entity satisfies never}`);
    }
  }

  private getTableName(entity: BatchEntity): string {
    switch (entity) {
      case 'products':
        return 'products';
      case 'categories':
        return 'product_categories';
      case 'packages':
        return 'packages';
      case 'tables':
        return 'restaurant_tables';
      case 'order_sessions':
        return 'order_sessions';
      default:
        throw new Error(`Unknown entity: ${entity}`);
    }
  }

  /**
   * Phase 1.3: Fetch products with stock authority (server stock is always trusted).
   * Phase 1.4: Support batch size limit.
   */
  private async fetchProducts(lastUpdated?: string, limit: number = 1000) {
    let query = supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (lastUpdated) {
      query = query.gt('updated_at', lastUpdated);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const records = (data || []).map((product: any): OfflineProduct => ({
      id: product.id,
      name: product.name,
      sku: product.sku ?? '',
      category_id: product.category_id ?? null,
      category_name: null, // TODO: join with category if needed
      category_color: null,
      package_ids: Array.isArray(product.package_ids) ? product.package_ids : [],
      base_price: Number(product.base_price ?? product.price ?? 0),
      vip_price: product.vip_price ? Number(product.vip_price) : null,
      tax_group: product.tax_group ?? null,
      
      // Phase 1.3: CRITICAL - Always use server stock as authority
      current_stock: Number(product.current_stock ?? product.stock_qty ?? 0),
      reorder_point: Number(product.reorder_point ?? 0),
      
      // Phase 1.3: Track when stock was synced for debugging
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

  /**
   * Phase 1.4: Fetch categories with batch size limit.
   */
  private async fetchCategories(lastUpdated?: string, limit: number = 1000) {
    let query = supabase
      .from('product_categories')
      .select('*')
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (lastUpdated) {
      query = query.gt('updated_at', lastUpdated);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const records = (data || []).map((category: any): OfflineCategory => ({
      id: category.id,
      name: category.name,
      parent_id: category.parent_category_id ?? null,
      color_code: category.color_code ?? null,
      default_destination: category.default_destination ?? null,
      sort_order: Number(category.display_order ?? 0),
      updated_at: category.updated_at ?? new Date().toISOString(),
    }));

    return {
      records,
      latestUpdatedAt: records.at(-1)?.updated_at ?? lastUpdated ?? null,
    };
  }

  /**
   * Phase 1.4: Fetch packages with batch size limit.
   * CRITICAL FIX: Now includes package_items relationship
   */
  private async fetchPackages(lastUpdated?: string, limit: number = 1000) {
    let query = supabase
      .from('packages')
      .select(`
        *,
        package_items (
          id,
          product_id,
          quantity,
          is_choice_item,
          choice_group,
          display_order,
          products (
            id,
            name
          )
        )
      `)
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (lastUpdated) {
      query = query.gt('updated_at', lastUpdated);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const records = (data || []).map((pkg: any): OfflinePackage => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description ?? null,
      package_code: pkg.package_code ?? null,
      product_id: pkg.product_id ?? null,
      unit_size: pkg.unit_size ?? null,
      base_price: Number(pkg.base_price ?? pkg.price ?? 0),
      vip_price: pkg.vip_price ? Number(pkg.vip_price) : null,
      package_type: pkg.package_type ?? null,
      barcode: pkg.barcode ?? null,
      updated_at: pkg.updated_at ?? new Date().toISOString(),
      // ✅ FIXED: Now properly maps package items
      items: (pkg.package_items || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity ?? 1,
        is_choice_item: item.is_choice_item ?? false,
        choice_group: item.choice_group ?? null,
        display_order: item.display_order ?? 0,
        product: item.products ? {
          id: item.products.id,
          name: item.products.name,
        } : undefined,
      })),
    }));

    console.log(`[DataBatchingService] Fetched ${records.length} packages with items`);
    
    return {
      records,
      latestUpdatedAt: records.at(-1)?.updated_at ?? lastUpdated ?? null,
    };
  }

  /**
   * Phase 1.4: Fetch tables with batch size limit.
   */
  private async fetchTables(lastUpdated?: string, limit: number = 1000) {
    let query = supabase
      .from('restaurant_tables')
      .select('*')
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (lastUpdated) {
      query = query.gt('updated_at', lastUpdated);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const records = (data || []).map((table: any): OfflineTable => ({
      id: table.id,
      label: table.label ?? table.table_number ?? 'Table',
      table_number: table.table_number ?? null,
      capacity: Number(table.capacity ?? 0),
      status: table.status ?? table.table_status ?? 'available',
      updated_at: table.updated_at ?? new Date().toISOString(),
    }));

    return {
      records,
      latestUpdatedAt: records.at(-1)?.updated_at ?? lastUpdated ?? null,
    };
  }

  /**
   * Fetch order sessions (Tab module) with batch size limit
   * Only fetches active sessions to keep cache lean
   */
  private async fetchOrderSessions(lastUpdated?: string, limit: number = 1000) {
    try {
      let query = supabase
        .from('order_sessions')
        .select(`
          *,
          table:restaurant_tables!table_id(id, table_number, area),
          customer:customers(id, full_name, tier)
        `)
        .eq('status', 'open') // Only sync active sessions
        .order('updated_at', { ascending: true })
        .limit(limit);

      if (lastUpdated) {
        query = query.gt('updated_at', lastUpdated);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[DataBatchingService] Supabase error fetching order_sessions:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new Error(`Failed to fetch order_sessions: ${error.message}`);
      }
      
      if (!data) {
        console.warn('[DataBatchingService] No data returned from order_sessions query');
        return { records: [], latestUpdatedAt: null };
      }

      const records = (data || []).map((session: any): OfflineOrderSession => ({
        id: session.id,
        session_number: session.session_number,
        table_id: session.table_id,
        customer_id: session.customer_id ?? undefined,
        status: session.status,
        opened_at: session.opened_at,
        closed_at: session.closed_at ?? undefined,
        updated_at: session.updated_at ?? new Date().toISOString(),
        subtotal: Number(session.subtotal ?? 0),
        discount_amount: Number(session.discount_amount ?? 0),
        tax_amount: Number(session.tax_amount ?? 0),
        total_amount: Number(session.total_amount ?? 0),
        payment_method: session.payment_method ?? undefined,
        notes: session.notes ?? undefined,
        opened_by: session.opened_by ?? undefined,
        closed_by: session.closed_by ?? undefined,
        table: session.table ? {
          id: session.table.id,
          table_number: session.table.table_number,
          area: session.table.area ?? undefined,
        } : undefined,
        customer: session.customer ? {
          id: session.customer.id,
          full_name: session.customer.full_name,
          tier: session.customer.tier ?? undefined,
        } : undefined,
        synced_at: new Date().toISOString(),
      }));

      // Store in IndexedDB with defensive merging to prevent data loss
      // CRITICAL FIX: If local session has higher totals than server, preserve local totals
      // This handles race conditions where server trigger hasn't finished calculating totals
      for (const serverSession of records) {
        const localSession = await getOrderSessionById(serverSession.id);
        
        if (localSession && localSession._pending_sync) {
          // Local session has pending changes - preserve local totals if higher
          const mergedSession: OfflineOrderSession = {
            ...serverSession,
            // Preserve higher totals (local is more up-to-date if pending sync)
            subtotal: Math.max(localSession.subtotal ?? 0, serverSession.subtotal),
            total_amount: Math.max(localSession.total_amount ?? 0, serverSession.total_amount),
            discount_amount: Math.max(localSession.discount_amount ?? 0, serverSession.discount_amount),
            tax_amount: Math.max(localSession.tax_amount ?? 0, serverSession.tax_amount),
            // Keep pending sync flag until sync completes
            _pending_sync: localSession._pending_sync,
            _temp_id: localSession._temp_id,
          };
          
          console.log(
            `🛡️ [DataBatchingService] Defensive merge for session ${serverSession.session_number}: ` +
            `local total=₱${localSession.total_amount}, server total=₱${serverSession.total_amount}, ` +
            `using=₱${mergedSession.total_amount}`
          );
          
          await putOrderSession(mergedSession);
        } else {
          // No local session or no pending changes - use server data as-is
          await putOrderSession(serverSession);
        }
      }

      if (records.length === 0) {
        console.log('[DataBatchingService] No open order_sessions found (this is normal if no tabs are open)');
      } else {
        console.log(`[DataBatchingService] Fetched ${records.length} order session(s)`);
      }

      return {
        records,
        latestUpdatedAt: records.at(-1)?.updated_at ?? lastUpdated ?? null,
      };
    } catch (error) {
      console.error('[DataBatchingService] Error in fetchOrderSessions:', error);
      console.error('[DataBatchingService] This may indicate a database permissions issue or missing table');
      // Return empty result to allow system to continue functioning
      return { records: [], latestUpdatedAt: null };
    }
  }

  /**
   * Get cached tables from IndexedDB
   * Used by TabManagementDashboard for instant display
   */
  async getCachedTables(): Promise<OfflineTable[]> {
    try {
      const tables = await readAllRecords('tables');
      console.log(`📊 Retrieved ${tables.length} tables from cache`);
      return tables;
    } catch (error) {
      console.error('Failed to get cached tables:', error);
      return [];
    }
  }

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

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error('[DataBatchingService] Listener failed', error);
      }
    }
  }
}

export type { CatalogSnapshot };
