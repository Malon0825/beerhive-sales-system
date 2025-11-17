/**
 * Offline Catalog + Mutation Cache
 * --------------------------------
 * Provides a centralized IndexedDB schema for the Offline POS initiative.
 * Phase 0 calls for defining stores used by the DataBatchingService so that
 * future phases can hydrate and replay data without schema churn.
 */

export const OFFLINE_DB_NAME = 'beerhive_pos_offline';
export const OFFLINE_DB_VERSION = 1;

export type SyncQueueStatus = 'pending' | 'failed' | 'synced';

export interface OfflineProduct {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  package_ids: string[];
  base_price: number;
  vip_price: number | null;
  tax_group: string | null;
  current_stock: number;
  reorder_point: number;
  stock_synced_at: string; // Track when stock was last synced for debugging
  image_url: string | null;
  is_featured: boolean;
  updated_at: string;
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function bulkPut<K extends Exclude<OfflineEntityStore, 'metadata'>>(storeName: K, records: OfflineStoreMap[K][]): Promise<void> {
  if (!records || records.length === 0) {
    return;
  }

  await withOfflineDb(async (db) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    records.forEach((record) => store.put(record));
    await waitForTransaction(transaction);
  });
}

export async function readAllRecords<K extends OfflineEntityStore>(storeName: K): Promise<OfflineStoreMap[K][]> {
  return withOfflineDb(async (db) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    return new Promise<OfflineStoreMap[K][]>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as OfflineStoreMap[K][]) ?? []);
      request.onerror = () => reject(request.error ?? new Error('Failed to read records from IndexedDB.'));
    });
  });
}

export async function getMetadataValue<T = unknown>(key: string): Promise<T | null> {
  return withOfflineDb(async (db) => {
    const transaction = db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');
    const request = store.get(key);

    return new Promise<T | null>((resolve, reject) => {
      request.onsuccess = () => {
        if (!request.result) {
          resolve(null);
          return;
        }
        resolve((request.result.value as T) ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error('Failed to read metadata.'));
    });
  });
}

export async function setMetadataValue(key: string, value: MetadataEntry['value']): Promise<void> {
  await withOfflineDb(async (db) => {
    const transaction = db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');
    store.put({ key, value, updated_at: new Date().toISOString() });
    await waitForTransaction(transaction);
  });
}

export async function clearStore(storeName: OfflineEntityStore): Promise<void> {
  await withOfflineDb(async (db) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    store.clear();
    await waitForTransaction(transaction);
  });
}

function normalizeMutationPayload(payload: Record<string, unknown>): Record<string, unknown> {
  // Ensure payload is serializable by stripping undefined values recursively if needed in the future.
  return payload;
}

export async function enqueueSyncMutation(
  mutationType: string,
  payload: Record<string, unknown>
): Promise<number> {
  return withOfflineDb(async (db) => {
    return new Promise<number>((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add({
        mutationType,
        payload: normalizeMutationPayload(payload),
        created_at: new Date().toISOString(),
        retry_count: 0,
        last_attempt_at: null,
        status: 'pending' as SyncQueueStatus,
        error: null,
      });

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error ?? new Error('Failed to enqueue mutation.'));
    });
  });
}

export async function getMutationsByStatus(
  status: SyncQueueStatus,
  limit: number = 25
): Promise<SyncQueueEntry[]> {
  return withOfflineDb(async (db) => {
    return new Promise<SyncQueueEntry[]>((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.openCursor(status);

      const results: SyncQueueEntry[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value as SyncQueueEntry);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error ?? new Error('Failed to read sync queue.'));
    });
  });
}

export async function countMutationsByStatus(status: SyncQueueStatus): Promise<number> {
  return withOfflineDb(async (db) => {
    return new Promise<number>((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.count(status);

      request.onsuccess = () => resolve(request.result ?? 0);
      request.onerror = () => reject(request.error ?? new Error('Failed to count sync queue entries.'));
    });
  });
}

export async function updateSyncQueueEntry(
  id: number,
  updates: Partial<SyncQueueEntry>
): Promise<void> {
  await withOfflineDb(async (db) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const existing = await new Promise<SyncQueueEntry | undefined>((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => resolve(getRequest.result as SyncQueueEntry | undefined);
      getRequest.onerror = () => reject(getRequest.error ?? new Error('Failed to read sync queue entry.'));
    });

    if (!existing) {
      return;
    }

    const updated: SyncQueueEntry = {
      ...existing,
      ...updates,
      payload: updates.payload ? normalizeMutationPayload(updates.payload) : existing.payload,
    };

    store.put(updated);
    await waitForTransaction(transaction);
  });
}

export async function deleteSyncQueueEntry(id: number): Promise<void> {
  await withOfflineDb(async (db) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    store.delete(id);
    await waitForTransaction(transaction);
  });
}

export interface OfflineCategory {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  color_code: string | null;
  default_destination: string | null;
  updated_at: string;
}

export interface OfflinePackageItem {
  id: string;
  product_id: string;
  quantity: number;
  is_choice_item: boolean;
  choice_group: string | null;
  display_order: number;
  product?: {
    id: string;
    name: string;
  };
}

export interface OfflinePackage {
  id: string;
  name: string;
  description: string | null;
  package_code: string | null;
  product_id: string | null;
  unit_size: string | null;
  base_price: number;
  vip_price: number | null;
  package_type: string | null;
  barcode: string | null;
  updated_at: string;
  items: OfflinePackageItem[];
}

export interface OfflineTable {
  id: string;
  label: string;
  table_number: string | null;
  capacity: number;
  status: string;
  updated_at: string;
}

export interface OfflineOrder {
  id: string;
  status: string;
  items: unknown[];
  totals: Record<string, number>;
  payments: unknown[];
  synced_at: string | null;
  updated_at: string;
}

export interface SyncQueueEntry {
  id?: number;
  mutationType: string;
  payload: Record<string, unknown>;
  created_at: string;
  retry_count: number;
  last_attempt_at: string | null;
  status: SyncQueueStatus;
  error?: string | null;
}

export interface MetadataEntry {
  key: string;
  value: Record<string, unknown> | string | number | null;
  updated_at: string;
}

type OfflineStoreMap = {
  products: OfflineProduct;
  categories: OfflineCategory;
  packages: OfflinePackage;
  tables: OfflineTable;
  orders: OfflineOrder;
  syncQueue: SyncQueueEntry;
  metadata: MetadataEntry;
};

export type OfflineEntityStore = keyof OfflineStoreMap;

/**
 * Opens the offline database and ensures object stores exist.
 */
export function openOfflineDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open offline IndexedDB instance.'));
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      ensureProductsStore(db);
      ensureCategoriesStore(db);
      ensurePackagesStore(db);
      ensureTablesStore(db);
      ensureOrdersStore(db);
      ensureSyncQueueStore(db);
      ensureMetadataStore(db);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function ensureProductsStore(db: IDBDatabase) {
  if (db.objectStoreNames.contains('products')) {
    return;
  }

  const store = db.createObjectStore('products', { keyPath: 'id' });
  store.createIndex('category_id', 'category_id', { unique: false });
  store.createIndex('updated_at', 'updated_at', { unique: false });
}

function ensureCategoriesStore(db: IDBDatabase) {
  if (db.objectStoreNames.contains('categories')) {
    return;
  }

  const store = db.createObjectStore('categories', { keyPath: 'id' });
  store.createIndex('parent_id', 'parent_id', { unique: false });
  store.createIndex('updated_at', 'updated_at', { unique: false });
}

function ensurePackagesStore(db: IDBDatabase) {
  if (db.objectStoreNames.contains('packages')) {
    return;
  }

  const store = db.createObjectStore('packages', { keyPath: 'id' });
  store.createIndex('product_id', 'product_id', { unique: false });
  store.createIndex('updated_at', 'updated_at', { unique: false });
}

function ensureTablesStore(db: IDBDatabase) {
  if (db.objectStoreNames.contains('tables')) {
    return;
  }

  const store = db.createObjectStore('tables', { keyPath: 'id' });
  store.createIndex('status', 'status', { unique: false });
  store.createIndex('updated_at', 'updated_at', { unique: false });
}

function ensureOrdersStore(db: IDBDatabase) {
  if (db.objectStoreNames.contains('orders')) {
    return;
  }

  const store = db.createObjectStore('orders', { keyPath: 'id' });
  store.createIndex('status', 'status', { unique: false });
  store.createIndex('synced_at', 'synced_at', { unique: false });
  store.createIndex('updated_at', 'updated_at', { unique: false });
}

function ensureSyncQueueStore(db: IDBDatabase) {
  if (db.objectStoreNames.contains('syncQueue')) {
    return;
  }

  const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
  store.createIndex('mutationType', 'mutationType', { unique: false });
  store.createIndex('status', 'status', { unique: false });
  store.createIndex('created_at', 'created_at', { unique: false });
}

function ensureMetadataStore(db: IDBDatabase) {
  if (db.objectStoreNames.contains('metadata')) {
    return;
  }

  db.createObjectStore('metadata', { keyPath: 'key' });
}

/**
 * Utility wrapper for running logic that needs a DB instance while ensuring
 * the connection is closed afterward.
 */
export async function withOfflineDb<T>(handler: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openOfflineDb();
  try {
    return await handler(db);
  } finally {
    db.close();
  }
}

/**
 * Get a single product by ID from IndexedDB
 */
export async function getProductById(productId: string): Promise<OfflineProduct | null> {
  return withOfflineDb(async (db) => {
    return new Promise<OfflineProduct | null>((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const request = store.get(productId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error ?? new Error('Failed to get product'));
    });
  });
}

/**
 * Update a single product's stock quantity in IndexedDB
 * This is for optimistic local updates - server stock is still the source of truth
 * 
 * @param productId - Product ID to update
 * @param quantityDelta - Amount to add/subtract (negative for deduction)
 * @returns Updated product or null if not found
 */
export async function updateProductStock(
  productId: string,
  quantityDelta: number
): Promise<OfflineProduct | null> {
  return withOfflineDb(async (db) => {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    
    return new Promise<OfflineProduct | null>((resolve, reject) => {
      const getRequest = store.get(productId);
      
      getRequest.onsuccess = () => {
        const product = getRequest.result as OfflineProduct | undefined;
        
        if (!product) {
          resolve(null);
          return;
        }

        // Update stock (prevent negative)
        const newStock = Math.max(0, product.current_stock + quantityDelta);
        
        const updatedProduct: OfflineProduct = {
          ...product,
          current_stock: newStock,
          stock_synced_at: new Date().toISOString(),
        };

        const putRequest = store.put(updatedProduct);
        
        putRequest.onsuccess = () => {
          console.log(`📉 [OfflineDB] Stock updated for ${product.name}: ${product.current_stock} → ${newStock} (${quantityDelta >= 0 ? '+' : ''}${quantityDelta})`);
          resolve(updatedProduct);
        };
        
        putRequest.onerror = () => reject(putRequest.error ?? new Error('Failed to update product stock'));
      };
      
      getRequest.onerror = () => reject(getRequest.error ?? new Error('Failed to get product for stock update'));
    });
  });
}

/**
 * Decrease stock for multiple products in a single transaction (for order items)
 * This ensures atomic stock updates when an order is placed
 * 
 * @param items - Array of { productId, quantity } to deduct
 */
export async function decreaseStockForOrder(
  items: Array<{ productId: string; quantity: number; itemName?: string }>
): Promise<void> {
  return withOfflineDb(async (db) => {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    
    console.log(`📦 [OfflineDB] Decreasing stock for ${items.length} products...`);
    
    // Process all items in the same transaction
    const updates = items.map((item) => {
      return new Promise<void>((resolve, reject) => {
        const getRequest = store.get(item.productId);
        
        getRequest.onsuccess = () => {
          const product = getRequest.result as OfflineProduct | undefined;
          
          if (!product) {
            console.warn(`⚠️ [OfflineDB] Product not found in IndexedDB: ${item.productId}`);
            resolve(); // Don't fail the entire transaction
            return;
          }

          // Calculate new stock (prevent negative)
          const newStock = Math.max(0, product.current_stock - item.quantity);
          
          const updatedProduct: OfflineProduct = {
            ...product,
            current_stock: newStock,
            stock_synced_at: new Date().toISOString(),
          };

          const putRequest = store.put(updatedProduct);
          
          putRequest.onsuccess = () => {
            console.log(`  ✅ ${item.itemName || product.name}: ${product.current_stock} → ${newStock} (-${item.quantity})`);
            resolve();
          };
          
          putRequest.onerror = () => reject(putRequest.error ?? new Error(`Failed to update stock for ${item.productId}`));
        };
        
        getRequest.onerror = () => reject(getRequest.error ?? new Error(`Failed to get product ${item.productId}`));
      });
    });
    
    // Wait for all updates to complete
    await Promise.all(updates);
    await waitForTransaction(transaction);
    
    console.log(`✅ [OfflineDB] Stock decreased for ${items.length} products`);
  });
}
