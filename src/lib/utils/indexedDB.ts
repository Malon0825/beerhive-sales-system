/**
 * IndexedDB Utility for Local Order Storage
 * 
 * Provides a simple interface for storing temporary order data in the browser's
 * IndexedDB. This allows for instant updates without network latency and reduces
 * database costs by only syncing to Supabase when orders are finalized.
 * 
 * Database Structure:
 * - orders: Stores current order headers (table, customer, totals)
 * - order_items: Stores individual order items
 * 
 * Auto-cleanup: Orders are automatically cleaned up after confirmation
 */

const DB_NAME = 'beerhive_local_orders';
const DB_VERSION = 1;
const ORDERS_STORE = 'orders';
const ORDER_ITEMS_STORE = 'order_items';

/**
 * Order interface for local storage
 */
export interface LocalOrder {
  id: string;
  cashierId?: string; // NEW: Track which cashier/manager/admin created the order
  tableNumber?: string; // UPDATED: Optional for takeout orders
  customerId?: string;
  customerName?: string;
  customerTier?: string;
  orderNumber?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: 'draft' | 'confirmed' | 'paid'; // NEW: Added 'paid' status for completed orders
  createdAt: string;
  updatedAt: string;
}

/**
 * Order item interface for local storage
 */
export interface LocalOrderItem {
  id: string;
  orderId: string;
  productId?: string;  // Actual product ID from database
  packageId?: string;  // Actual package ID from database
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  notes?: string;
  isVipPrice: boolean;
  isComplimentary: boolean;
  createdAt: string;
}

/**
 * Initialize IndexedDB database
 * Creates object stores and indexes if they don't exist
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create orders store if it doesn't exist
      if (!db.objectStoreNames.contains(ORDERS_STORE)) {
        const ordersStore = db.createObjectStore(ORDERS_STORE, { keyPath: 'id' });
        ordersStore.createIndex('tableNumber', 'tableNumber', { unique: false });
        ordersStore.createIndex('status', 'status', { unique: false });
        ordersStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create order_items store if it doesn't exist
      if (!db.objectStoreNames.contains(ORDER_ITEMS_STORE)) {
        const itemsStore = db.createObjectStore(ORDER_ITEMS_STORE, { keyPath: 'id' });
        itemsStore.createIndex('orderId', 'orderId', { unique: false });
      }
    };
  });
}

/**
 * Save or update an order in IndexedDB
 */
export async function saveOrder(order: LocalOrder): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDERS_STORE], 'readwrite');
    const store = transaction.objectStore(ORDERS_STORE);
    
    const request = store.put({
      ...order,
      updatedAt: new Date().toISOString(),
    });

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save order'));
    };
  });
}

/**
 * Get an order by ID
 */
export async function getOrder(orderId: string): Promise<LocalOrder | null> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDERS_STORE], 'readonly');
    const store = transaction.objectStore(ORDERS_STORE);
    const request = store.get(orderId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to get order'));
    };
  });
}

/**
 * Get order by table number
 * Returns the most recent draft order for the table
 */
export async function getOrderByTable(tableNumber: string): Promise<LocalOrder | null> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDERS_STORE], 'readonly');
    const store = transaction.objectStore(ORDERS_STORE);
    const index = store.index('tableNumber');
    const request = index.getAll(tableNumber);

    request.onsuccess = () => {
      const orders = request.result as LocalOrder[];
      // Get the most recent draft order
      const draftOrders = orders
        .filter(order => order.status === 'draft')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      resolve(draftOrders[0] || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to get order by table'));
    };
  });
}

/**
 * Get all orders
 */
export async function getAllOrders(): Promise<LocalOrder[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDERS_STORE], 'readonly');
    const store = transaction.objectStore(ORDERS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get all orders'));
    };
  });
}

/**
 * Delete an order
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDERS_STORE], 'readwrite');
    const store = transaction.objectStore(ORDERS_STORE);
    const request = store.delete(orderId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete order'));
    };
  });
}

/**
 * Save or update an order item
 */
export async function saveOrderItem(item: LocalOrderItem): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDER_ITEMS_STORE], 'readwrite');
    const store = transaction.objectStore(ORDER_ITEMS_STORE);
    const request = store.put(item);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save order item'));
    };
  });
}

/**
 * Get all items for an order
 */
export async function getOrderItems(orderId: string): Promise<LocalOrderItem[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDER_ITEMS_STORE], 'readonly');
    const store = transaction.objectStore(ORDER_ITEMS_STORE);
    const index = store.index('orderId');
    const request = index.getAll(orderId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get order items'));
    };
  });
}

/**
 * Delete an order item
 */
export async function deleteOrderItem(itemId: string): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDER_ITEMS_STORE], 'readwrite');
    const store = transaction.objectStore(ORDER_ITEMS_STORE);
    const request = store.delete(itemId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete order item'));
    };
  });
}

/**
 * Delete all items for an order
 */
export async function deleteOrderItems(orderId: string): Promise<void> {
  const items = await getOrderItems(orderId);
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDER_ITEMS_STORE], 'readwrite');
    const store = transaction.objectStore(ORDER_ITEMS_STORE);
    
    let completed = 0;
    const total = items.length;

    if (total === 0) {
      resolve();
      return;
    }

    items.forEach(item => {
      const request = store.delete(item.id);
      
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to delete order items'));
      };
    });
  });
}

/**
 * Clear all orders and items (useful for cleanup/reset)
 */
export async function clearAllOrders(): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ORDERS_STORE, ORDER_ITEMS_STORE], 'readwrite');
    
    const ordersStore = transaction.objectStore(ORDERS_STORE);
    const itemsStore = transaction.objectStore(ORDER_ITEMS_STORE);
    
    ordersStore.clear();
    itemsStore.clear();

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to clear orders'));
    };
  });
}

/**
 * Clean up confirmed orders older than specified hours
 * Useful for automatic cleanup of finalized orders
 */
export async function cleanupOldOrders(hoursOld: number = 24): Promise<void> {
  const orders = await getAllOrders();
  const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);
  
  const oldConfirmedOrders = orders.filter(order => {
    const orderTime = new Date(order.createdAt).getTime();
    return order.status === 'confirmed' && orderTime < cutoffTime;
  });

  // Delete old confirmed orders and their items
  for (const order of oldConfirmedOrders) {
    await deleteOrderItems(order.id);
    await deleteOrder(order.id);
  }

  console.log(`Cleaned up ${oldConfirmedOrders.length} old confirmed orders`);
}
