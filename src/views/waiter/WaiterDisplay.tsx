'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/data/supabase/client';
import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { KitchenOrderWithRelations } from '@/models/types/KitchenOrderWithRelations';
import { ReadyOrderCard } from './ReadyOrderCard';
import { RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';

/**
 * WaiterDisplay Component
 * Interface for waiters to view ready orders and mark them as served
 * 
 * Features:
 * - Shows only orders with status "ready"
 * - Grouped by table for easy delivery
 * - Mark entire order as served
 * - Realtime updates when kitchen marks items ready
 */
export function WaiterDisplay() {
  const [orders, setOrders] = useState<KitchenOrderWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Fetch ready orders from API
   * Uses dedicated waiter endpoint that returns only 'ready' status orders
   */
  const fetchOrders = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      
      console.log('🍽️  [WaiterDisplay] Fetching ready orders...');
      const response = await fetch('/api/waiter/orders');
      const data = await response.json();
      
      console.log(`🍽️  [WaiterDisplay] Received ${data.count || 0} ready orders`);
      
      if (data.success) {
        // API already filters for 'ready' status
        setOrders(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch orders');
        toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error fetching ready orders:', err);
      setError('Failed to load orders');
      toast({ title: 'Error', description: 'Network error while loading orders', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  }, [toast]);

  /**
   * Handle marking order as served
   */
  const handleMarkServed = async (orderId: string, tableName: string) => {
    try {
      const response = await fetch(`/api/kitchen/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: KitchenOrderStatus.SERVED }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({ 
          title: 'Order Served', 
          description: `${tableName} order marked as served` 
        });
        // Orders will be updated via realtime subscription
      } else {
        toast({ 
          title: 'Error', 
          description: `Failed to update: ${data.error}`, 
          variant: 'destructive' 
        });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast({ 
        title: 'Error', 
        description: 'Failed to mark order as served', 
        variant: 'destructive' 
      });
    }
  };

  /**
   * Setup realtime subscription for kitchen orders
   */
  useEffect(() => {
    // Initial fetch
    fetchOrders();

    // Create realtime subscription
    const channel = supabase
      .channel('waiter-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_orders',
        },
        async (payload) => {
          console.log('Waiter: Kitchen order update:', payload);
          
          // Refetch orders on any change
          await fetchOrders();
          
          // Show notification for newly ready orders
          if (payload.eventType === 'UPDATE' && payload.new?.status === 'ready') {
            toast({ 
              title: 'Order Ready!', 
              description: 'New order ready for delivery' 
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Waiter orders subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, toast]);

  /**
   * Handle manual refresh
   */
  const handleRefresh = () => {
    fetchOrders(true);
  };

  /**
   * Group orders by table for easier delivery
   */
  const ordersByTable = orders.reduce((acc, order) => {
    const tableKey = order.order?.table?.table_number || 'Takeout';
    if (!acc[tableKey]) {
      acc[tableKey] = [];
    }
    acc[tableKey].push(order);
    return acc;
  }, {} as Record<string, KitchenOrderWithRelations[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ready orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => fetchOrders(false)}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle className="h-7 w-7 text-green-600" />
              Waiter - Ready Orders
            </h1>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Ready Items</p>
              <p className="text-3xl font-bold text-green-600">{orders.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Tables</p>
              <p className="text-3xl font-bold text-blue-600">
                {Object.keys(ordersByTable).length}
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Orders by Table */}
      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-xl text-gray-600">No orders ready for delivery</p>
            <p className="text-sm text-gray-500 mt-2">
              Orders will appear here when kitchen marks them as ready
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(ordersByTable).map(([tableName, tableOrders]) => (
              <div key={tableName} className="bg-white rounded-lg shadow-md p-4">
                {/* Table Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {tableName === 'Takeout' ? '📦 Takeout Order' : `🍽️ Table ${tableName}`}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {tableOrders.length} item{tableOrders.length > 1 ? 's' : ''} ready
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-5 w-5" />
                    <span className="text-sm">
                      Oldest: {Math.floor(
                        (Date.now() - new Date(tableOrders[0].ready_at || tableOrders[0].sent_at).getTime()) / 60000
                      )} min ago
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tableOrders.map((order) => (
                    <ReadyOrderCard
                      key={order.id}
                      kitchenOrder={order}
                      onMarkServed={() => handleMarkServed(order.id, tableName)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
