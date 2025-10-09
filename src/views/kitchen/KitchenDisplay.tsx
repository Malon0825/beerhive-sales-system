'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/data/supabase/client';
import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { KitchenOrderWithRelations } from '@/models/types/KitchenOrderWithRelations';
import { OrderCard } from './OrderCard';
import { KitchenHeader } from './components/KitchenHeader';
import { FilterTabs } from './components/FilterTabs';
import { useToast } from '@/lib/hooks/useToast';
import { Clock } from 'lucide-react';

/**
 * KitchenDisplay Component
 * Main kitchen display interface for managing order preparation with realtime updates
 * Optimized for phone and tablet screens with responsive grid layout
 * 
 * Features:
 * - Realtime order updates via Supabase subscriptions
 * - Status filtering (all, pending, preparing, ready)
 * - Manual refresh capability
 * - Automatic status change handling
 * - Responsive layout for phone (single column) and tablet (2 columns) screens
 */
export function KitchenDisplay() {
  const [orders, setOrders] = useState<KitchenOrderWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | KitchenOrderStatus>('all');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Fetch kitchen orders from API
   */
  const fetchOrders = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      
      const response = await fetch('/api/kitchen/orders?destination=kitchen');
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch orders');
        toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
      setError('Failed to load orders');
      toast({ title: 'Error', description: 'Network error while loading orders', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  }, [toast]);

  /**
   * Handle status change for a kitchen order
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
   * Setup realtime subscription for kitchen orders
   */
  useEffect(() => {
    // Initial fetch
    fetchOrders();

    // Create realtime subscription
    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_orders',
        },
        async (payload) => {
          console.log('Kitchen order realtime update:', payload);
          
          // Refetch orders on any change
          await fetchOrders();
          
          // Show notification for new orders
          if (payload.eventType === 'INSERT') {
            toast({ title: 'New Order', description: 'New order received!' });
          }
        }
      )
      .subscribe((status) => {
        console.log('Kitchen orders subscription status:', status);
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
   * Filter orders based on selected filter
   */
  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  /**
   * Group orders by table for better organization
   */
  const ordersByTable = filteredOrders.reduce((acc, order) => {
    const tableKey = order.order?.table?.table_number || 'Takeout';
    if (!acc[tableKey]) {
      acc[tableKey] = [];
    }
    acc[tableKey].push(order);
    return acc;
  }, {} as Record<string, KitchenOrderWithRelations[]>);

  /**
   * Calculate order counts by status
   */
  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === KitchenOrderStatus.PENDING).length,
    preparing: orders.filter(o => o.status === KitchenOrderStatus.PREPARING).length,
    ready: orders.filter(o => o.status === KitchenOrderStatus.READY).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading kitchen orders...</p>
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
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
      <KitchenHeader
        pendingCount={orderCounts.pending}
        preparingCount={orderCounts.preparing}
        readyCount={orderCounts.ready}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Filter Tabs */}
      <div className="bg-white px-2 sm:px-4 pb-3 sm:pb-4">
        <FilterTabs
          activeFilter={filter}
          onFilterChange={setFilter}
          counts={orderCounts}
        />
      </div>

      {/* Orders by Table - Organized for efficient preparation */}
      <div className="p-2 sm:p-3 md:p-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-400 mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg sm:text-xl text-gray-600">No orders to display</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Orders will appear here when customers place them</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {Object.entries(ordersByTable).map(([tableName, tableOrders]) => (
              <div key={tableName} className="bg-white rounded-lg shadow-md p-3 sm:p-4">
                {/* Table Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 pb-3 border-b gap-2">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                      {tableName === 'Takeout' ? '📦 Takeout Order' : `🍽️ Table ${tableName}`}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {tableOrders.length} item{tableOrders.length > 1 ? 's' : ''} for this table
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 sm:h-5 w-4 sm:w-5" />
                    <span className="text-xs sm:text-sm">
                      Oldest: {Math.floor(
                        (Date.now() - new Date(tableOrders[0].sent_at).getTime()) / 60000
                      )} min ago
                    </span>
                  </div>
                </div>

                {/* Order Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  {tableOrders.map((order) => (
                    <OrderCard 
                      key={order.id} 
                      kitchenOrder={order}
                      onStatusChange={handleStatusChange}
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
