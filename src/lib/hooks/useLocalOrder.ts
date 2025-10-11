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
 * @param tableNumber - Optional table number to filter orders
 * @param autoSync - Auto-refresh when broadcast received (default: true)
 * 
 * @example
 * ```tsx
 * // In POS/Cart
 * const { createOrder, addItem, updateOrder } = useLocalOrder();
 * 
 * // In Customer Display
 * const { order, items, loading } = useLocalOrder('T-01', true);
 * // Automatically updates when POS adds items
 * ```
 */
export function useLocalOrder(tableNumber?: string, autoSync: boolean = true) {
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
   */
  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (tableNumber) {
        // Load order for specific table
        const orderData = await getOrderByTable(tableNumber);
        setOrder(orderData);

        if (orderData) {
          const itemsData = await getOrderItems(orderData.id);
          setItems(itemsData);
        } else {
          setItems([]);
        }
      } else {
        // Load all orders
        const ordersData = await getAllOrders();
        setAllOrders(ordersData.filter(o => o.status === 'draft'));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  }, [tableNumber]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  /**
   * Listen for broadcast messages and auto-sync
   */
  useOrderBroadcast('beerhive_orders', (message) => {
    // Only sync if autoSync enabled and message is for our table
    if (!autoSync) return;
    
    if (tableNumber && message.tableNumber !== tableNumber) {
      return; // Not for this table
    }

    console.log(`🔄 [LocalOrder] Auto-sync triggered by ${message.event}`);
    
    // Reload order data
    loadOrder();
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
      broadcastOrderCreated(newOrder.id, newOrder.tableNumber, newOrder);
      
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
      broadcastOrderUpdated(orderId, updatedOrder.tableNumber, updatedOrder);
      
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
      
      broadcastOrderDeleted(orderId, existingOrder.tableNumber);
      
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

      broadcastItemAdded(orderId, existingOrder.tableNumber, newItem.id, newItem);
      
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
        
        broadcastItemUpdated(existingItem.orderId, existingOrder.tableNumber, itemId, updatedItem);
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
        
        broadcastItemRemoved(existingItem.orderId, existingOrder.tableNumber, itemId);
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
      broadcastOrderConfirmed(orderId, existingOrder.tableNumber, existingOrder);
      
      // Cleanup old confirmed orders (older than 24 hours)
      await cleanupOldOrders(24);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm order');
      throw err;
    }
  }, [updateOrder, broadcastOrderConfirmed]);

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
    refresh,
  };
}
