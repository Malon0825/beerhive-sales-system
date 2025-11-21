import {
  enqueueSyncMutation,
  putOrderSession,
  putSessionOrder,
  updateOrderSession,
  decreaseStockForOrder,
  getOrderSessionById,
  withOfflineDb,
  type OfflineOrderSession,
  type OfflineSessionOrder,
  type OfflinePackage,
  updateTableStatus,
} from '@/lib/data-batching/offlineDb';
import { MutationSyncService } from '@/lib/data-batching/MutationSyncService';
import { OrderCalculation } from '@/core/services/orders/OrderCalculation';
import { OrderStatus } from '@/models/enums/OrderStatus';
import { SessionStatus } from '@/models/enums/SessionStatus';
import { toast } from '@/lib/hooks/useToast';

export interface TabItem {
  product_id?: string;
  package_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
  is_package?: boolean;
  // Store package component details for stock release/expansion
  package_components?: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
  }>;
}

export class OfflineTabService {
  /**
   * Open a new tab (session) offline-first
   */
  static async openTab(
    tableId: string,
    options?: {
      customerId?: string;
      tableNumber?: string;
      notes?: string;
      area?: string;
      customerSnapshot?: {
        id: string;
        full_name: string;
        tier?: string;
      };
    }
  ): Promise<OfflineOrderSession> {
    const { customerId, tableNumber, notes, area, customerSnapshot } = options ?? {};

    // 1. Generate Temp ID
    const tempId = `offline-session-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    // 2. Create Session Object
    const session: OfflineOrderSession = {
      id: tempId,
      session_number: `TAB-${tableNumber || 'OFF'}`, // Temp number
      table_id: tableId,
      customer_id: customerId,
      status: 'open',
      opened_at: timestamp,
      updated_at: timestamp,
      subtotal: 0,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 0,
      notes: notes || undefined,
      // Offline Metadata
      _pending_sync: true,
      _temp_id: true,
      origin: 'offline',
      table: tableNumber
        ? {
            id: tableId,
            table_number: tableNumber,
            area,
          }
        : undefined,
      customer: customerSnapshot
        ? {
            id: customerSnapshot.id,
            full_name: customerSnapshot.full_name,
            tier: customerSnapshot.tier,
          }
        : undefined,
    };

    // 3. Save to IndexedDB
    await putOrderSession(session);
    console.log(`💾 [OfflineTabService] Created temp session: ${tempId}`);

    // 4. Queue Mutation
    await enqueueSyncMutation('orderSessions.create', {
      endpoint: '/api/order-sessions',
      method: 'POST',
      body: {
        table_id: tableId,
        customer_id: customerId,
        notes: notes || undefined,
      },
      local_id: tempId,
      created_at: timestamp,
    });

    // 5. Trigger Sync (if online)
    this.triggerSync();

    return session;
  }

  /**
   * Add order to tab (Add items + Confirm)
   * Wraps the entire "Add to Cart -> Confirm" flow into one atomic offline action
   */
  static async addOrderToTab(
    sessionId: string,
    items: TabItem[]
  ): Promise<OfflineSessionOrder> {
    if (items.length === 0) {
      throw new Error('No items to add');
    }

    const timestamp = new Date().toISOString();
    const tempOrderId = `offline-order-${crypto.randomUUID()}`;
    const tempOrderNumber = `ORD-OFF-${Date.now().toString().slice(-4)}`;

    // 1. Calculate Order Totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    // Note: Tax calculation logic can be added here if needed locally
    // For now we rely on server to correct totals eventually, but keep consistent sum locally

    // 2. Create Order Object
    const order: OfflineSessionOrder = {
      id: tempOrderId,
      session_id: sessionId,
      order_number: tempOrderNumber,
      status: OrderStatus.CONFIRMED, // Immediately confirmed in offline flow
      created_at: timestamp,
      confirmed_at: timestamp,
      updated_at: timestamp,
      subtotal: subtotal,
      discount_amount: 0,
      total_amount: subtotal,
      items: items.map(item => ({
        id: `item-${crypto.randomUUID()}`,
        order_id: tempOrderId,
        product_id: item.product_id,
        package_id: item.package_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        notes: item.notes,
      })),
      _pending_sync: true,
      _temp_id: true,
    };

    // 3. Save Order to IndexedDB
    await putSessionOrder(order);

    // 4. Update Session Totals in IndexedDB (Optimistic)
    const session = await getOrderSessionById(sessionId);
    if (session) {
      await updateOrderSession(sessionId, {
        subtotal: (session.subtotal || 0) + subtotal,
        total_amount: (session.total_amount || 0) + subtotal,
        _pending_sync: true,
      });
    }

    // 5. Deduct Stock Locally
    await this.deductLocalStock(items);

    // 6. Queue Mutations (Create + Confirm)
    // We queue them sequentially
    const createMutationId = await enqueueSyncMutation('orders.create', {
      endpoint: '/api/orders',
      method: 'POST',
      body: {
        session_id: sessionId,
        items: items.map(item => ({
          product_id: item.product_id,
          package_id: item.package_id,
          quantity: item.quantity,
          notes: item.notes,
        })),
      },
      local_order_id: tempOrderId,
      created_at: timestamp,
    });

    // Confirm immediately depends on create
    await enqueueSyncMutation('orders.confirm', {
      endpoint: '/api/orders/{{ORDER_ID}}/confirm',
      method: 'PATCH',
      body: {},
      depends_on: createMutationId,
      local_order_id: tempOrderId,
      created_at: timestamp,
    });

    // 7. Trigger Sync
    this.triggerSync();

    return order;
  }

  /**
   * Close tab and process payment
   */
  static async closeTab(
    sessionId: string,
    paymentData: {
      amount_tendered: number;
      payment_method: string;
      discount_type?: 'percentage' | 'fixed_amount';
      discount_value?: number;
      notes?: string;
      closed_by?: string;
    }
  ): Promise<{ queueId: number }> {
    const session = await getOrderSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // 1. Calculate Finals Locally
    const subtotal = session.subtotal;
    const currentDiscount = session.discount_amount || 0;
    const netBeforeNewDiscount = Math.max(0, subtotal - currentDiscount);
    
    let additionalDiscount = 0;
    if (paymentData.discount_type && paymentData.discount_value) {
      const { discountAmount } = OrderCalculation.applyDiscount(
        netBeforeNewDiscount,
        paymentData.discount_type,
        paymentData.discount_value
      );
      additionalDiscount = discountAmount;
    }

    const finalDiscount = currentDiscount + additionalDiscount;
    const finalTotal = OrderCalculation.calculateTotal(subtotal, finalDiscount, session.tax_amount);

    if (paymentData.amount_tendered < finalTotal) {
      throw new Error(`Insufficient payment. Required: ${finalTotal}`);
    }

    // 2. Update Session Status Locally (Close it)
    // We DON'T delete it yet, we update it to closed so the UI updates
    // The MutationSyncService will delete it after successful sync.
    const closeUpdates: Partial<OfflineOrderSession> = {
      status: 'closed' as any, // Cast to any if strict enum prevents string
      closed_at: new Date().toISOString(),
      // Preserve existing closed_by if none provided
      ...(paymentData.closed_by ? { closed_by: paymentData.closed_by } : {}),
      discount_amount: finalDiscount,
      total_amount: finalTotal,
      payment_method: paymentData.payment_method,
      _pending_sync: true,
    };

    // Always close the session referenced by sessionId
    await updateOrderSession(sessionId, closeUpdates);

    // If this is a temp/offline session that has already been synced to a real
    // server ID, also close the real session record locally. This prevents the
    // real alias from still appearing as an open tab on the initiating browser.
    if ((session as any)._synced_id && (session as any)._synced_id !== sessionId) {
      const realId = (session as any)._synced_id as string;
      try {
        await updateOrderSession(realId, closeUpdates);
        console.log(
          `✅ [OfflineTabService] Also closed synced real session locally: ${sessionId} → ${realId}`
        );
      } catch (e) {
        console.warn(
          `⚠️ [OfflineTabService] Failed to close synced real session locally for ${sessionId} → ${realId}`,
          e
        );
      }
    } else {
      // Reverse lookup: If we are closing a REAL session, check if there is a TEMP session
      // that points to this real session and close it too.
      try {
        const { getActiveOrderSessions } = await import('@/lib/data-batching/offlineDb');
        const activeSessions = await getActiveOrderSessions();
        const linkedTempSession = activeSessions.find(
          s => (s._synced_id === sessionId && s.id !== sessionId) ||
               // Fallback: Match by table_id if temp session exists for same table
               (session.table_id && s.table_id === session.table_id && s._temp_id && s.id !== sessionId)
        );

        if (linkedTempSession) {
          await updateOrderSession(linkedTempSession.id, closeUpdates);
          console.log(
            `✅ [OfflineTabService] Also closed linked temp session locally: ${linkedTempSession.id} → ${sessionId}`
          );
        }
      } catch (e) {
        console.warn(
          `⚠️ [OfflineTabService] Failed to close linked temp session locally for real session ${sessionId}`,
          e
        );
      }
    }

    // 2b. Optimistically mark table as available in IndexedDB so UI updates immediately
    if (session.table_id) {
      await updateTableStatus(session.table_id, 'available');
    }

    // 3. Queue Close Mutation
    const queueId = await enqueueSyncMutation('orderSessions.close', {
      endpoint: `/api/order-sessions/${sessionId}/close`,
      method: 'POST',
      body: {
        amount_tendered: paymentData.amount_tendered,
        payment_method: paymentData.payment_method,
        discount_type: paymentData.discount_type,
        discount_value: paymentData.discount_value,
        discount_amount: additionalDiscount, // Pass calculated amount just in case
        notes: paymentData.notes,
        ...(paymentData.closed_by ? { closed_by: paymentData.closed_by } : {}),
      },
      session_id: sessionId, // For ID swapping
      created_at: new Date().toISOString(),
    });

    console.log(`✅ [OfflineTabService] Tab closed locally: ${sessionId}`);

    // 4. Trigger Sync
    this.triggerSync();

    return { queueId };
  }

  /**
   * Get session details with offline fallback
   */
  static async getSessionDetails(sessionId: string): Promise<OfflineOrderSession | null> {
    // 1. Try Offline DB
    const session = await getOrderSessionById(sessionId);
    if (session) {
      return session;
    }

    // 2. Fallback to Server if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
       try {
         const { apiGet } = await import('@/lib/utils/apiClient');
         const response = await apiGet(`/api/order-sessions/${sessionId}`);
         if (response.success && response.data) {
            return response.data as OfflineOrderSession;
         }
       } catch (e) {
         console.warn('Failed to fetch session from server', e);
       }
    }

    return null;
  }

  /**
   * Helper to trigger background sync
   */
  private static triggerSync() {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const syncService = MutationSyncService.getInstance();
      void syncService.processPendingMutations();
    }
  }

  /**
   * Deduct stock locally for immediate UI feedback
   * Handles both Products and Packages
   */
  private static async deductLocalStock(items: TabItem[]) {
    const finalDeductions: Array<{ productId: string; quantity: number; itemName: string }> = [];
    
    for (const item of items) {
      if (item.product_id && !item.is_package) {
        // Direct Product
        finalDeductions.push({
          productId: item.product_id,
          quantity: item.quantity,
          itemName: item.item_name
        });
      } else if (item.package_id) {
        // Package
        if (item.package_components && item.package_components.length > 0) {
            item.package_components.forEach(comp => {
            finalDeductions.push({
              productId: comp.product_id,
              quantity: comp.quantity * item.quantity, // Multiply per-package component qty by number of packages
              itemName: `${comp.product_name} (Pkg)`
            });
            });
        } else {
          const pkg = await this.getPackageFromDb(item.package_id);
          if (pkg && pkg.items) {
            pkg.items.forEach(pItem => {
              finalDeductions.push({
                productId: pItem.product_id,
                quantity: pItem.quantity * item.quantity,
                itemName: `${pkg.name} component`
              });
            });
          }
        }
      }
    }

    if (finalDeductions.length > 0) {
      await decreaseStockForOrder(finalDeductions);
    }
  }

  /**
   * Helper to get package from IDB
   */
  private static async getPackageFromDb(packageId: string): Promise<OfflinePackage | null> {
    return withOfflineDb(async (db) => {
       if (!db.objectStoreNames.contains('packages')) return null;
       return new Promise((resolve) => {
         const tx = db.transaction('packages', 'readonly');
         const req = tx.objectStore('packages').get(packageId);
         req.onsuccess = () => resolve(req.result);
         req.onerror = () => resolve(null);
       });
    });
  }
}
