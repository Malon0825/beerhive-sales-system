import { useState, useEffect, useCallback } from 'react';
import { useRealtime } from './useRealtime';
import { CurrentOrder, CurrentOrderItem } from '@/data/repositories/CurrentOrderRepository';

/**
 * useCurrentOrders Hook
 * 
 * Manages current (draft) orders for a cashier with real-time updates
 * Each cashier sees only their own current orders
 * 
 * Features:
 * - Real-time updates via Supabase subscriptions
 * - Cashier-specific order isolation
 * - CRUD operations for orders and items
 * - Automatic total recalculation
 */
export function useCurrentOrders(cashierId: string) {
  const [orders, setOrders] = useState<CurrentOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<CurrentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all current orders for this cashier
   */
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/current-orders?cashierId=${cashierId}`);
      const result = await response.json();

      if (result.success) {
        setOrders(result.data || []);
        
        // Set active order (first non-held order)
        const active = result.data?.find((order: CurrentOrder) => !order.is_on_hold);
        setActiveOrder(active || null);
        
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch orders');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [cashierId]);

  /**
   * Create a new current order
   */
  const createOrder = useCallback(async (data?: {
    customerId?: string;
    tableId?: string;
    orderNotes?: string;
  }) => {
    try {
      const response = await fetch('/api/current-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId,
          customerId: data?.customerId,
          tableId: data?.tableId,
          orderNotes: data?.orderNotes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchOrders(); // Refresh orders
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [cashierId, fetchOrders]);

  /**
   * Update a current order
   */
  const updateOrder = useCallback(async (
    orderId: string,
    updates: {
      customerId?: string;
      tableId?: string;
      orderNotes?: string;
      isOnHold?: boolean;
    }
  ) => {
    try {
      const response = await fetch(`/api/current-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId,
          ...updates,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchOrders(); // Refresh orders
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update order');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [cashierId, fetchOrders]);

  /**
   * Delete a current order
   */
  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      const response = await fetch(
        `/api/current-orders/${orderId}?cashierId=${cashierId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.success) {
        await fetchOrders(); // Refresh orders
      } else {
        throw new Error(result.error || 'Failed to delete order');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [cashierId, fetchOrders]);

  /**
   * Add item to current order
   */
  const addItem = useCallback(async (orderId: string, item: CurrentOrderItem) => {
    try {
      const response = await fetch(`/api/current-orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId,
          item,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchOrders(); // Refresh orders to get updated totals
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to add item');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [cashierId, fetchOrders]);

  /**
   * Update item in current order
   */
  const updateItem = useCallback(async (
    orderId: string,
    itemId: string,
    updates: Partial<CurrentOrderItem>
  ) => {
    try {
      const response = await fetch(
        `/api/current-orders/${orderId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashierId,
            updates,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        await fetchOrders(); // Refresh orders
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update item');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [cashierId, fetchOrders]);

  /**
   * Remove item from current order
   */
  const removeItem = useCallback(async (orderId: string, itemId: string) => {
    try {
      const response = await fetch(
        `/api/current-orders/${orderId}/items/${itemId}?cashierId=${cashierId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.success) {
        await fetchOrders(); // Refresh orders
      } else {
        throw new Error(result.error || 'Failed to remove item');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [cashierId, fetchOrders]);

  /**
   * Clear all items from current order
   */
  const clearItems = useCallback(async (orderId: string) => {
    try {
      const response = await fetch(
        `/api/current-orders/${orderId}/items?cashierId=${cashierId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.success) {
        await fetchOrders(); // Refresh orders
      } else {
        throw new Error(result.error || 'Failed to clear items');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [cashierId, fetchOrders]);

  /**
   * Hold current order (pause to work on another)
   */
  const holdOrder = useCallback(async (orderId: string) => {
    return await updateOrder(orderId, { isOnHold: true });
  }, [updateOrder]);

  /**
   * Resume held order
   */
  const resumeOrder = useCallback(async (orderId: string) => {
    return await updateOrder(orderId, { isOnHold: false });
  }, [updateOrder]);

  // Initial fetch
  useEffect(() => {
    if (cashierId) {
      fetchOrders();
    }
  }, [cashierId, fetchOrders]);

  // Real-time subscription to current_orders table
  // Filtered by cashier_id to only receive updates for this cashier's orders
  useRealtime({
    table: 'current_orders',
    event: '*',
    filter: `cashier_id=eq.${cashierId}`,
    onChange: (payload) => {
      console.log('Current order update received:', payload);
      fetchOrders(); // Refetch on any change
    },
  });

  // Real-time subscription to current_order_items table
  // Will receive updates for items in this cashier's orders
  useRealtime({
    table: 'current_order_items',
    event: '*',
    onChange: (payload) => {
      console.log('Current order items update received:', payload);
      fetchOrders(); // Refetch when items change
    },
  });

  return {
    // State
    orders,
    activeOrder,
    loading,
    error,
    
    // Actions
    createOrder,
    updateOrder,
    deleteOrder,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    holdOrder,
    resumeOrder,
    refresh: fetchOrders,
  };
}
