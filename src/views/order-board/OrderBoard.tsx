'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtime } from '@/lib/hooks/useRealtime';
import OrderBoardCard from './OrderBoardCard';
import { Button } from '@/views/shared/ui/button';
import { RefreshCw, Filter } from 'lucide-react';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';

/**
 * OrderBoard Component
 * Real-time display of all customer orders
 * Updates automatically when new orders are created or modified by cashiers
 */

interface Order {
  id: string;
  order_number: string;
  customer: {
    full_name: string;
    customer_number: string;
  } | null;
  table: {
    table_number: string;
    area?: string;
  } | null;
  order_items: any[];
  total_amount: number;
  status: string;
  created_at: string;
}

type FilterStatus = 'all' | 'pending' | 'completed' | 'voided';

export default function OrderBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  /**
   * Fetch all orders from the API
   */
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders/board');
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setOrders(data.orders || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle real-time order updates
   */
  const handleOrderUpdate = useCallback((payload: any) => {
    console.log('Order update received:', payload);
    
    // Refresh the entire order list to get updated data with relations
    fetchOrders();
  }, [fetchOrders]);

  /**
   * Subscribe to real-time order updates
   */
  useRealtime({
    table: 'orders',
    event: '*',
    onChange: handleOrderUpdate,
  });

  /**
   * Initial data fetch
   */
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /**
   * Filter orders based on selected status
   */
  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'all') return true;
    return order.status === filterStatus;
  });

  /**
   * Get count for each status
   */
  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    voided: orders.filter(o => o.status === 'voided').length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Board</h1>
            <p className="text-gray-600 mt-2">
              Real-time customer orders • Last update: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <Button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'completed', 'voided'] as FilterStatus[]).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                onClick={() => setFilterStatus(status)}
                className="capitalize"
              >
                {status} ({statusCounts[status]})
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Orders</p>
          <p className="text-3xl font-bold text-blue-700">{statusCounts.all}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600 font-medium">Pending</p>
          <p className="text-3xl font-bold text-yellow-700">{statusCounts.pending}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Completed</p>
          <p className="text-3xl font-bold text-green-700">{statusCounts.completed}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Voided</p>
          <p className="text-3xl font-bold text-red-700">{statusCounts.voided}</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && orders.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {filterStatus === 'all' 
              ? 'No orders yet. Orders will appear here in real-time.'
              : `No ${filterStatus} orders found.`}
          </p>
        </div>
      )}

      {/* Order Grid */}
      {filteredOrders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <OrderBoardCard 
              key={order.id} 
              order={order} 
              onOrderUpdated={fetchOrders}
            />
          ))}
        </div>
      )}
    </div>
  );
}
