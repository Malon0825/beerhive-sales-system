'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/data/supabase/client';
import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { KitchenOrderWithRelations } from '@/models/types/KitchenOrderWithRelations';
import { OrderCard } from './OrderCard';
import { KitchenHeader } from './components/KitchenHeader';
import { FilterTabs } from './components/FilterTabs';
import { useToast } from '@/lib/hooks/useToast';
import { useStationNotification } from '@/lib/hooks/useStationNotification';
import { useOrderAcknowledgment } from '@/lib/hooks/useOrderAcknowledgment';
import { useOrderAgeAlert } from '@/lib/hooks/useOrderAgeAlert';
import { AudioEnablePrompt } from '@/components/station/AudioEnablePrompt';
import { OrderAgeAlert } from '@/components/station/OrderAgeAlert';
import { Clock } from 'lucide-react';

/**
 * KitchenDisplay Component
 * Main kitchen display interface for managing order preparation with realtime updates
 * Optimized for phone and tablet screens with responsive grid layout
 * 
 * Features:
 * - Realtime order updates via Supabase subscriptions with DB-level filtering
 * - Status filtering (all, pending, preparing, ready)
 * - Robust notification system (sound repeats 3x, visual alerts, auto re-alert)
 * - Order acknowledgment tracking with escalation for missed orders
 * - Visual age alerts (warning at 5 min, critical at 10 min)
 * - Manual refresh capability
 * - Automatic status change handling
 * - Responsive layout for phone (single column) and tablet (2 columns) screens
 */
export function KitchenDisplay() {
  const [orders, setOrders] = useState<KitchenOrderWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearingCancelled, setIsClearingCancelled] = useState(false);
  const [filter, setFilter] = useState<'all' | KitchenOrderStatus>('all');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Station notification hook for sound and vibration (plays 3x at max volume)
  const { playNotification, showBrowserNotification, isMuted, toggleMute } = useStationNotification({
    soundFile: '/sounds/kitchen-alert.mp3', // Kitchen-specific sound
    vibrationPattern: [200, 100, 200], // Short pattern for new orders
  });

  // Order acknowledgment tracking for re-alerts
  const { addNewOrder, acknowledgeOrder, removeOrder } = useOrderAcknowledgment({
    repeatInterval: 30, // Re-alert every 30 seconds
    maxRepeats: 5, // Up to 5 re-alerts
    onRepeatAlert: (orderId, count) => {
      console.log(`🔔 Re-alerting for order ${orderId} (${count} times)`);
      playNotification('urgent', 2); // Play 2x for re-alerts
      toast({ 
        title: 'Pending Order!', 
        description: `Order ${orderId.slice(0, 8)} still pending`, 
        variant: 'destructive' 
      });
    }
  });

  // Age alert monitoring for visual escalation
  const pendingOrders = orders.filter(o => o.status === KitchenOrderStatus.PENDING);
  const ageStatus = useOrderAgeAlert(pendingOrders, {
    warningThresholdMinutes: 5,
    criticalThresholdMinutes: 10,
  });

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
    // Acknowledge order when staff interacts with it
    acknowledgeOrder(orderId);

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
        
        // Remove from tracking when completed/cancelled
        if (status === KitchenOrderStatus.READY || status === KitchenOrderStatus.CANCELLED) {
          removeOrder(orderId);
        }
      } else {
        toast({ title: 'Error', description: `Failed to update status: ${data.error}`, variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast({ title: 'Error', description: 'Failed to update order status', variant: 'destructive' });
    }
  };

  /**
   * Handle remove cancelled order
   */
  const handleRemoveOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/kitchen/orders/${orderId}/delete`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'Success', description: 'Cancelled order removed' });
        // Refresh orders to update UI
        await fetchOrders();
      } else {
        toast({ title: 'Error', description: `Failed to remove order: ${data.error}`, variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error removing order:', err);
      toast({ title: 'Error', description: 'Failed to remove order', variant: 'destructive' });
    }
  };

  /**
   * Setup realtime subscription for kitchen orders
   */
  useEffect(() => {
    // Initial fetch
    fetchOrders();

    // Create realtime subscription with DB-level filtering for kitchen only
    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_orders',
          filter: 'destination=eq.kitchen', // 🎯 Filter at database level
        },
        async (payload) => {
          console.log('Kitchen order realtime update:', payload);
          
          // Refetch orders on any change
          await fetchOrders();
          
          // Show robust notification for new orders
          if (payload.eventType === 'INSERT') {
            const orderId = (payload.new as any)?.id;
            
            // Track new order for acknowledgment
            if (orderId) {
              addNewOrder(orderId);
            }

            // Play sound 3x at max volume + vibration
            playNotification('newOrder', 3);
            
            // Show browser notification (works even when tab not focused)
            await showBrowserNotification(
              'New Kitchen Order! 🍳',
              'A new order has been received at the kitchen station'
            );
            
            // Show toast notification
            toast({ title: 'New Order', description: 'New order received!' });
          }

          // Remove from tracking when order is deleted
          if (payload.eventType === 'DELETE') {
            const orderId = (payload.old as any)?.id;
            if (orderId) {
              removeOrder(orderId);
            }
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
   * Handle clear all cancelled orders
   */
  const handleClearCancelled = async () => {
    try {
      setIsClearingCancelled(true);
      
      const response = await fetch('/api/kitchen/orders/clear-cancelled?destination=kitchen', {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        toast({ 
          title: 'Success', 
          description: `Cleared ${data.count} cancelled order(s)` 
        });
        // Refresh orders
        await fetchOrders();
      } else {
        toast({ 
          title: 'Error', 
          description: `Failed to clear cancelled orders: ${data.error}`, 
          variant: 'destructive' 
        });
      }
    } catch (err) {
      console.error('Error clearing cancelled orders:', err);
      toast({ 
        title: 'Error', 
        description: 'Failed to clear cancelled orders', 
        variant: 'destructive' 
      });
    } finally {
      setIsClearingCancelled(false);
    }
  };

  /**
   * Calculate order counts by status
   */
  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === KitchenOrderStatus.PENDING).length,
    preparing: orders.filter(o => o.status === KitchenOrderStatus.PREPARING).length,
    cancelled: orders.filter(o => o.status === KitchenOrderStatus.CANCELLED).length,
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
      {/* Audio Enable Prompt (one-time setup) */}
      <AudioEnablePrompt />

      {/* Age Alert Banner (warning/critical orders) */}
      <OrderAgeAlert ageStatus={ageStatus} stationName="Kitchen" />
      {/* Header */}
      <KitchenHeader
        pendingCount={orderCounts.pending}
        preparingCount={orderCounts.preparing}
        cancelledCount={orderCounts.cancelled}
        onRefresh={handleRefresh}
        onClearCancelled={handleClearCancelled}
        isRefreshing={isRefreshing}
        isClearingCancelled={isClearingCancelled}
        isMuted={isMuted}
        onToggleMute={toggleMute}
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
                      onRemove={handleRemoveOrder}
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
