'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/data/supabase/client';
import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { OrderCard } from '../kitchen/OrderCard';
import { useToast } from '@/lib/hooks/useToast';

/**
 * BartenderDisplay Component
 * Main bartender display interface for managing beverage orders with realtime updates
 * 
 * Features:
 * - Realtime order updates via Supabase subscriptions
 * - Status filtering (all, pending, preparing, ready)
 * - Manual refresh capability
 * - Automatic status change handling
 */
export function BartenderDisplay() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | KitchenOrderStatus>('all');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Fetch bartender orders from API
   */
  const fetchOrders = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      
      const response = await fetch('/api/kitchen/orders?destination=bartender');
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch orders');
        toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error fetching bartender orders:', err);
      setError('Failed to load orders');
      toast({ title: 'Error', description: 'Network error while loading orders', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  }, [toast]);

  /**
   * Handle status change for a bartender order
   */
  const handleStatusChange = async (orderId: string, status: KitchenOrderStatus) => {
    try {
      const response = await fetch(`/api/kitchen/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'Success', description: `Order status updated to ${status}` });
        // Orders will be updated via realtime subscription
      } else {
        toast({ title: 'Error', description: `Failed to update status: ${data.error}`, variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast({ title: 'Error', description: 'Failed to update order status', variant: 'destructive' });
    }
  };

  /**
   * Setup realtime subscription for bartender orders
   */
  useEffect(() => {
    // Initial fetch
    fetchOrders();

    // Create realtime subscription
    const channel = supabase
      .channel('bartender-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_orders',
        },
        async (payload) => {
          console.log('Bartender: Kitchen order update:', payload);
          
          // Refetch orders on any change
          await fetchOrders();
          
          // Show notification for new orders
          if (payload.eventType === 'INSERT') {
            toast({ 
              title: 'New Order!', 
              description: 'New beverage order received' 
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Bartender orders subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, toast]);

  // Filter orders
  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  // Group orders by status
  const pendingOrders = orders.filter(o => o.status === KitchenOrderStatus.PENDING);
  const preparingOrders = orders.filter(o => o.status === KitchenOrderStatus.PREPARING);
  const readyOrders = orders.filter(o => o.status === KitchenOrderStatus.READY);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bartender orders...</p>
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
            onClick={fetchOrders}
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-purple-800">Bartender Station</h1>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          {/* Status Summary */}
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingOrders.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Preparing</p>
              <p className="text-2xl font-bold text-purple-600">{preparingOrders.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Ready</p>
              <p className="text-2xl font-bold text-green-600">{readyOrders.length}</p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchOrders}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setFilter(KitchenOrderStatus.PENDING)}
            className={`px-4 py-2 rounded ${filter === KitchenOrderStatus.PENDING ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Pending ({pendingOrders.length})
          </button>
          <button
            onClick={() => setFilter(KitchenOrderStatus.PREPARING)}
            className={`px-4 py-2 rounded ${filter === KitchenOrderStatus.PREPARING ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Preparing ({preparingOrders.length})
          </button>
          <button
            onClick={() => setFilter(KitchenOrderStatus.READY)}
            className={`px-4 py-2 rounded ${filter === KitchenOrderStatus.READY ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Ready ({readyOrders.length})
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="p-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-xl text-gray-600">No beverage orders</p>
            <p className="text-sm text-gray-500 mt-2">Drink orders will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                kitchenOrder={order}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
