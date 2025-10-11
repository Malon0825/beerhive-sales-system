'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Order broadcast message types
 */
export type OrderBroadcastEvent = 
  | 'order_created'
  | 'order_updated'
  | 'order_deleted'
  | 'item_added'
  | 'item_updated'
  | 'item_removed'
  | 'order_confirmed';

/**
 * Broadcast message structure
 */
export interface OrderBroadcastMessage {
  event: OrderBroadcastEvent;
  orderId: string;
  tableNumber?: string;
  itemId?: string;
  timestamp: string;
  data?: any;
}

/**
 * useOrderBroadcast Hook
 * 
 * Provides real-time cross-tab/window communication for order updates using
 * the BroadcastChannel API. This enables instant updates between POS terminals
 * and customer-facing displays without network latency or database costs.
 * 
 * Benefits:
 * - Near-instant updates (<10ms latency)
 * - Works offline (same-origin communication)
 * - Zero infrastructure cost
 * - No network dependency
 * 
 * Use Cases:
 * - POS terminal broadcasts when item added to order
 * - Customer display receives instant update
 * - Multiple POS terminals stay in sync
 * - Kitchen/bar displays get real-time order updates
 * 
 * @param channelName - Name of the broadcast channel (default: 'beerhive_orders')
 * @param onMessage - Callback function to handle incoming messages
 * 
 * @example
 * ```tsx
 * // In POS/CartContext
 * const { broadcast } = useOrderBroadcast('beerhive_orders');
 * 
 * function addItem(item) {
 *   // Add to local storage
 *   await saveOrderItem(item);
 *   
 *   // Broadcast to all listening tabs/windows
 *   broadcast({
 *     event: 'item_added',
 *     orderId: order.id,
 *     tableNumber: order.tableNumber,
 *     itemId: item.id,
 *     timestamp: new Date().toISOString(),
 *     data: item
 *   });
 * }
 * 
 * // In CustomerOrderMonitor
 * useOrderBroadcast('beerhive_orders', (message) => {
 *   if (message.tableNumber === myTableNumber) {
 *     // Refresh order display
 *     loadOrderFromIndexedDB();
 *   }
 * });
 * ```
 */
export function useOrderBroadcast(
  channelName: string = 'beerhive_orders',
  onMessage?: (message: OrderBroadcastMessage) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const messageHandlerRef = useRef(onMessage);

  // Update message handler ref when it changes
  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  /**
   * Initialize broadcast channel
   */
  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel API not supported in this browser');
      return;
    }

    // Create broadcast channel
    channelRef.current = new BroadcastChannel(channelName);

    // Set up message listener
    channelRef.current.onmessage = (event: MessageEvent<OrderBroadcastMessage>) => {
      console.log(`📡 [OrderBroadcast] Received:`, event.data);
      
      // Call the message handler if provided
      if (messageHandlerRef.current) {
        messageHandlerRef.current(event.data);
      }
    };

    // Handle errors
    channelRef.current.onmessageerror = (event) => {
      console.error('BroadcastChannel message error:', event);
    };

    console.log(`📡 [OrderBroadcast] Channel "${channelName}" initialized`);

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
        console.log(`📡 [OrderBroadcast] Channel "${channelName}" closed`);
      }
    };
  }, [channelName]);

  /**
   * Broadcast a message to all listening tabs/windows
   */
  const broadcast = useCallback((message: OrderBroadcastMessage) => {
    if (!channelRef.current) {
      console.warn('BroadcastChannel not initialized');
      return;
    }

    try {
      channelRef.current.postMessage(message);
      console.log(`📡 [OrderBroadcast] Sent:`, message);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }, []);

  /**
   * Helper function to broadcast order created event
   */
  const broadcastOrderCreated = useCallback((orderId: string, tableNumber: string, data?: any) => {
    broadcast({
      event: 'order_created',
      orderId,
      tableNumber,
      timestamp: new Date().toISOString(),
      data,
    });
  }, [broadcast]);

  /**
   * Helper function to broadcast order updated event
   */
  const broadcastOrderUpdated = useCallback((orderId: string, tableNumber: string, data?: any) => {
    broadcast({
      event: 'order_updated',
      orderId,
      tableNumber,
      timestamp: new Date().toISOString(),
      data,
    });
  }, [broadcast]);

  /**
   * Helper function to broadcast order deleted event
   */
  const broadcastOrderDeleted = useCallback((orderId: string, tableNumber: string) => {
    broadcast({
      event: 'order_deleted',
      orderId,
      tableNumber,
      timestamp: new Date().toISOString(),
    });
  }, [broadcast]);

  /**
   * Helper function to broadcast item added event
   */
  const broadcastItemAdded = useCallback((
    orderId: string,
    tableNumber: string,
    itemId: string,
    data?: any
  ) => {
    broadcast({
      event: 'item_added',
      orderId,
      tableNumber,
      itemId,
      timestamp: new Date().toISOString(),
      data,
    });
  }, [broadcast]);

  /**
   * Helper function to broadcast item updated event
   */
  const broadcastItemUpdated = useCallback((
    orderId: string,
    tableNumber: string,
    itemId: string,
    data?: any
  ) => {
    broadcast({
      event: 'item_updated',
      orderId,
      tableNumber,
      itemId,
      timestamp: new Date().toISOString(),
      data,
    });
  }, [broadcast]);

  /**
   * Helper function to broadcast item removed event
   */
  const broadcastItemRemoved = useCallback((
    orderId: string,
    tableNumber: string,
    itemId: string
  ) => {
    broadcast({
      event: 'item_removed',
      orderId,
      tableNumber,
      itemId,
      timestamp: new Date().toISOString(),
    });
  }, [broadcast]);

  /**
   * Helper function to broadcast order confirmed event
   */
  const broadcastOrderConfirmed = useCallback((orderId: string, tableNumber: string, data?: any) => {
    broadcast({
      event: 'order_confirmed',
      orderId,
      tableNumber,
      timestamp: new Date().toISOString(),
      data,
    });
  }, [broadcast]);

  return {
    broadcast,
    broadcastOrderCreated,
    broadcastOrderUpdated,
    broadcastOrderDeleted,
    broadcastItemAdded,
    broadcastItemUpdated,
    broadcastItemRemoved,
    broadcastOrderConfirmed,
    isSupported: typeof BroadcastChannel !== 'undefined',
  };
}

/**
 * Check if BroadcastChannel API is supported
 */
export function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}
