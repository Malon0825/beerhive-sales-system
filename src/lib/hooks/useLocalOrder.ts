'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrderBroadcast } from './useOrderBroadcast';
import {
  LocalOrder,
  LocalOrderItem,
  saveOrder,
  getOrder,
  getOrderByTable,
  getAllOrders,
  deleteOrder,
  saveOrderItem,
  getOrderItems,
  deleteOrderItem,
  deleteOrderItems,
  cleanupOldOrders,
} from '../utils/indexedDB';

/**
 * useLocalOrder Hook
 * 
 * Combines IndexedDB storage with BroadcastChannel communication for
 * local-first, real-time order management. Perfect for customer-facing
 * order displays that need instant updates without network latency.
 * 
 * Features:
 * - Store orders locally in IndexedDB
 * - Broadcast changes via BroadcastChannel
 * - Listen for updates from other tabs/windows
 * - Automatic synchronization across displays
 * - No network dependency for updates
 * - Zero infrastructure cost
 * 
 * Use Cases:
 * - Customer order monitor at tables
 * - POS terminal order management
 * - Kitchen/bar display systems
 * 
 * @param filterOptions - Optional filter (table number OR cashier ID)
 * @param autoSync - Auto-refresh when broadcast received (default: true)
 * 
 * @example
 * ```tsx
 * // In POS/Cart - Load all orders
 * const { createOrder, addItem, updateOrder } = useLocalOrder();
 * 
 * // In Customer Display - Filter by table (dine-in)
 * const { order, items, loading } = useLocalOrder({ tableNumber: 'T-01' }, true);
 * 
 * // In Customer Display - Filter by cashier (takeout)
 * const { order, items, loading } = useLocalOrder({ cashierId: 'abc-123' }, true);
 * ```
 */
export function useLocalOrder(
  filterOptions?: string | { tableNumber?: string; cashierId?: string },
  autoSync: boolean = true
) {
  // Support legacy string parameter for backward compatibility
  const tableNumber = typeof filterOptions === 'string' ? filterOptions : filterOptions?.tableNumber;
  const cashierId = typeof filterOptions === 'object' ? filterOptions?.cashierId : undefined;
  const [order, setOrder] = useState<LocalOrder | null>(null);
  const [items, setItems] = useState<LocalOrderItem[]>([]);
  const [allOrders, setAllOrders] = useState<LocalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    broadcastOrderCreated,
    broadcastOrderUpdated,
    broadcastOrderDeleted,
    broadcastItemAdded,
    broadcastItemUpdated,
    broadcastItemRemoved,
    broadcastOrderConfirmed,
  } = useOrderBroadcast('beerhive_orders');

  /**
   * Load order data from IndexedDB
   * Handles errors gracefully and provides fallback values
   */
  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if IndexedDB is supported
      if (typeof indexedDB === 'undefined') {
        throw new Error('IndexedDB is not supported in this browser. Please use a modern browser (Chrome 71+, Firefox 64+, Safari 13+, Edge 79+).');
      }

      if (tableNumber) {
        // Load order for specific table (dine-in)
        const orderData = await getOrderByTable(tableNumber);
        setOrder(orderData);

        if (orderData) {
          const itemsData = await getOrderItems(orderData.id);
          setItems(itemsData);
        } else {
          setItems([]);
        }
      } else if (cashierId) {
        // Load order for specific cashier (takeout or any cashier-specific order)
        const ordersData = await getAllOrders();
        const cashierOrders = ordersData.filter(o => 
          o.cashierId === cashierId && 
          (o.status === 'draft' || o.status === 'confirmed')
        );
        
        // Get the most recent active order for this cashier
        const sortedOrders = cashierOrders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        const activeOrder = sortedOrders[0] || null;
        setOrder(activeOrder);

        if (activeOrder) {
          const itemsData = await getOrderItems(activeOrder.id);
          setItems(itemsData);
        } else {
          setItems([]);
        }
      } else {
        // Load all orders (no filter)
        const ordersData = await getAllOrders();
        setAllOrders(ordersData.filter(o => o.status === 'draft'));
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load order from IndexedDB';
      setError(errorMessage);
      console.error('[useLocalOrder] Error loading order:', err);
      
      // Set fallback empty values
      setOrder(null);
      setItems([]);
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, [tableNumber, cashierId]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  /**
   * Listen for broadcast messages and auto-sync
   * Handles errors gracefully to prevent crashes from broadcast issues
   */
  useOrderBroadcast('beerhive_orders', (message) => {
    try {
      // Only sync if autoSync enabled and message is for our table
      if (!autoSync) return;
      
      if (tableNumber && message.tableNumber !== tableNumber) {
        return; // Not for this table
      }

      console.log(`🔄 [LocalOrder] Auto-sync triggered by ${message.event}`);
      
      // Reload order data
      loadOrder();
    } catch (err) {
      console.error('[useLocalOrder] Error processing broadcast message:', err);
      // Don't rethrow - just log the error and continue
    }
  });

  /**
   * Create a new order
   */
  const createOrder = useCallback(async (orderData: Omit<LocalOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newOrder: LocalOrder = {
        ...orderData,
        id: `local_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveOrder(newOrder);
      const broadcastTable = newOrder.tableNumber || 'takeout';
      broadcastOrderCreated(newOrder.id, broadcastTable, newOrder);
      
      // Refresh local state
      await loadOrder();
      
      return newOrder;
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      throw err;
    }
  }, [broadcastOrderCreated, loadOrder]);

  /**
   * Update an existing order
   */
  const updateOrder = useCallback(async (
    orderId: string,
    updates: Partial<LocalOrder>
  ) => {
    try {
      const existingOrder = await getOrder(orderId);
      if (!existingOrder) {
        throw new Error('Order not found');
      }

      const updatedOrder: LocalOrder = {
        ...existingOrder,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await saveOrder(updatedOrder);
      const broadcastTable = updatedOrder.tableNumber || 'takeout';
      broadcastOrderUpdated(orderId, broadcastTable, updatedOrder);
      
      // Refresh local state
      await loadOrder();
      
      return updatedOrder;
    } catch (err: any) {
      setError(err.message || 'Failed to update order');
      throw err;
    }
  }, [broadcastOrderUpdated, loadOrder]);

  /**
   * Delete an order
   */
  const removeOrder = useCallback(async (orderId: string) => {
    try {
      const existingOrder = await getOrder(orderId);
      if (!existingOrder) {
        throw new Error('Order not found');
      }

      // Delete all items first
      await deleteOrderItems(orderId);
      
      // Delete the order
      await deleteOrder(orderId);
      
      const broadcastTable = existingOrder.tableNumber || 'takeout';
      broadcastOrderDeleted(orderId, broadcastTable);
      
      // Refresh local state
      await loadOrder();
    } catch (err: any) {
      setError(err.message || 'Failed to delete order');
      throw err;
    }
  }, [broadcastOrderDeleted, loadOrder]);

  /**
   * Add item to order
   */
  const addItem = useCallback(async (
    orderId: string,
    itemData: Omit<LocalOrderItem, 'id' | 'orderId' | 'createdAt'>
  ) => {
    try {
      const existingOrder = await getOrder(orderId);
      if (!existingOrder) {
        throw new Error('Order not found');
      }

      const newItem: LocalOrderItem = {
        ...itemData,
        id: `local_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orderId,
        createdAt: new Date().toISOString(),
      };

      await saveOrderItem(newItem);
      
      // Recalculate order totals
      const allItems = await getOrderItems(orderId);
      const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discountAmount = allItems.reduce((sum, item) => sum + item.discountAmount, 0);
      const totalAmount = allItems.reduce((sum, item) => sum + item.total, 0);

      await updateOrder(orderId, {
        subtotal,
        discountAmount,
        totalAmount,
      });

      const broadcastTable = existingOrder.tableNumber || 'takeout';
      broadcastItemAdded(orderId, broadcastTable, newItem.id, newItem);
      
      // Refresh local state
      await loadOrder();
      
      return newItem;
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
      throw err;
    }
  }, [updateOrder, broadcastItemAdded, loadOrder]);

  /**
   * Update an order item
   */
  const updateItem = useCallback(async (
    itemId: string,
    updates: Partial<LocalOrderItem>
  ) => {
    try {
      const allItems = await getOrderItems(order?.id || '');
      const existingItem = allItems.find(item => item.id === itemId);
      
      if (!existingItem) {
        throw new Error('Item not found');
      }

      const updatedItem: LocalOrderItem = {
        ...existingItem,
        ...updates,
      };

      await saveOrderItem(updatedItem);

      // Recalculate order totals
      const items = await getOrderItems(existingItem.orderId);
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const discountAmount = items.reduce((sum, item) => sum + item.discountAmount, 0);
      const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

      const existingOrder = await getOrder(existingItem.orderId);
      if (existingOrder) {
        await updateOrder(existingItem.orderId, {
          subtotal,
          discountAmount,
          totalAmount,
        });
        
        const broadcastTable = existingOrder.tableNumber || 'takeout';
        broadcastItemUpdated(existingItem.orderId, broadcastTable, itemId, updatedItem);
      }
      
      // Refresh local state
      await loadOrder();
      
      return updatedItem;
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
      throw err;
    }
  }, [order, updateOrder, broadcastItemUpdated, loadOrder]);

  /**
   * Remove item from order
   */
  const removeItem = useCallback(async (itemId: string) => {
    try {
      const allItems = await getOrderItems(order?.id || '');
      const existingItem = allItems.find(item => item.id === itemId);
      
      if (!existingItem) {
        throw new Error('Item not found');
      }

      await deleteOrderItem(itemId);

      // Recalculate order totals
      const remainingItems = await getOrderItems(existingItem.orderId);
      const subtotal = remainingItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discountAmount = remainingItems.reduce((sum, item) => sum + item.discountAmount, 0);
      const totalAmount = remainingItems.reduce((sum, item) => sum + item.total, 0);

      const existingOrder = await getOrder(existingItem.orderId);
      if (existingOrder) {
        await updateOrder(existingItem.orderId, {
          subtotal,
          discountAmount,
          totalAmount,
        });
        
        const broadcastTable = existingOrder.tableNumber || 'takeout';
        broadcastItemRemoved(existingItem.orderId, broadcastTable, itemId);
      }
      
      // Refresh local state
      await loadOrder();
    } catch (err: any) {
      setError(err.message || 'Failed to remove item');
      throw err;
    }
  }, [order, updateOrder, broadcastItemRemoved, loadOrder]);

  /**
   * Mark order as confirmed (ready for payment/finalization)
   */
  const confirmOrder = useCallback(async (orderId: string) => {
    try {
      const existingOrder = await getOrder(orderId);
      if (!existingOrder) {
        throw new Error('Order not found');
      }

      await updateOrder(orderId, { status: 'confirmed' });
      const broadcastTable = existingOrder.tableNumber || 'takeout';
      broadcastOrderConfirmed(orderId, broadcastTable, existingOrder);
      
      // Cleanup old confirmed orders (older than 24 hours)
      await cleanupOldOrders(24);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm order');
      throw err;
    }
  }, [updateOrder, broadcastOrderConfirmed]);

  /**
   * Mark order as paid (completed)
   * This will clear the order from customer displays
   * Called after payment is successfully processed
   */
  const markOrderAsPaid = useCallback(async (orderId: string) => {
    try {
      const existingOrder = await getOrder(orderId);
      if (!existingOrder) {
        throw new Error('Order not found');
      }

      // Update status to 'paid'
      await updateOrder(orderId, { status: 'paid' });
      
      const broadcastTable = existingOrder.tableNumber || 'takeout';
      console.log('[useLocalOrder] 💰 Order marked as PAID:', orderId);
      console.log('[useLocalOrder] 🧹 Customer display will clear automatically');
      
      // Broadcast that order is paid (listeners will clear the display)
      broadcastOrderUpdated(orderId, broadcastTable, { ...existingOrder, status: 'paid' });
      
      // Optional: Delete paid orders after a delay to keep IndexedDB clean
      setTimeout(async () => {
        try {
          await deleteOrderItems(orderId);
          await deleteOrder(orderId);
          console.log('[useLocalOrder] 🗑️ Paid order cleaned up from IndexedDB');
        } catch (err) {
          console.error('[useLocalOrder] Error cleaning up paid order:', err);
        }
      }, 2000); // Wait 2 seconds before cleanup to allow broadcast propagation
      
    } catch (err: any) {
      setError(err.message || 'Failed to mark order as paid');
      throw err;
    }
  }, [updateOrder, broadcastOrderUpdated]);

  /**
   * Refresh order data manually
   */
  const refresh = useCallback(async () => {
    await loadOrder();
  }, [loadOrder]);

  return {
    // State
    order,
    items,
    allOrders,
    loading,
    error,
    
    // Actions
    createOrder,
    updateOrder,
    removeOrder,
    addItem,
    updateItem,
    removeItem,
    confirmOrder,
    markOrderAsPaid, // NEW: Mark order as paid and clear customer display
    refresh,
  };
}
