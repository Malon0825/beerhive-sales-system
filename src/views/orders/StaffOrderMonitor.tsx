'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRealtime } from '@/lib/hooks/useRealtime';
import { Card } from '@/views/shared/ui/card';
import { Badge } from '@/views/shared/ui/badge';
import { Button } from '@/views/shared/ui/button';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import { format } from 'date-fns';
import { RefreshCw, Clock, Users, DollarSign, Trash2 } from 'lucide-react';
import { supabase } from '@/data/supabase/client';

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
}

interface CurrentOrder {
  id: string;
  order_number?: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  status?: string;
  created_at: string;
  customer?: {
    id: string;
    full_name: string;
    customer_number: string;
    tier: string;
  };
  table?: {
    id: string;
    table_number: string;
    area: string;
  };
  cashier?: {
    id: string;
    full_name: string;
    username: string;
  };
  items?: OrderItem[]; // Changed from order_items to items to match API response
}

/**
 * StaffOrderMonitor Component
 * 
 * Real-time dashboard for monitoring current orders
 * 
 * Display:
 * - Shows ONLY orders belonging to the logged-in user
 * - Filters by cashier_id matching current user
 * - Other users' orders are not visible
 * 
 * Features:
 * - Real-time order updates (user-specific)
 * - Clear all orders (user-specific)
 * - Manual refresh
 * - User-isolated view for security and focus
 * 
 * Access: Cashier, Manager, Admin only
 */
export function StaffOrderMonitor() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CurrentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  /**
   * Fetch current orders for the logged-in user only
   * Filters orders by cashier_id matching the current user
   */
  const fetchOrders = async () => {
    try {
      if (!user?.id) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Fetch only orders belonging to this user
      const response = await fetch(`/api/current-orders?cashierId=${user.id}`);
      const result = await response.json();

      if (result.success) {
        setOrders(result.data || []);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch orders');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear all orders belonging to the logged-in user
   * Only clears orders where cashier_id matches the current user
   */
  const handleClearOrders = async () => {
    if (!user) {
      alert('You must be logged in to clear orders');
      return;
    }

    setClearing(true);
    setShowClearConfirm(false);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call API to clear orders
      const response = await fetch('/api/current-orders', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear orders');
      }

      // Show success message
      const deletedCount = result.data?.deletedCount || 0;
      if (deletedCount > 0) {
        alert(`Successfully cleared ${deletedCount} order(s)`);
      } else {
        alert('No orders to clear');
      }

      // Refresh orders list
      await fetchOrders();
    } catch (err: any) {
      console.error('Clear orders error:', err);
      alert(err.message || 'Failed to clear orders');
    } finally {
      setClearing(false);
    }
  };

  // Initial fetch - refetch when user becomes available
  useEffect(() => {
    if (user?.id) {
      fetchOrders();
    }
  }, [user?.id]);

  // Real-time subscription to current_orders (filtered by user)
  // Only receives updates for orders belonging to this user
  useRealtime({
    table: 'current_orders',
    event: '*',
    filter: user?.id ? `cashier_id=eq.${user.id}` : undefined,
    onChange: (payload) => {
      console.log('Current order update received:', payload);
      fetchOrders();
    },
  });

  // Real-time subscription to current_order_items
  // Will receive updates for items in this user's orders
  useRealtime({
    table: 'current_order_items',
    event: '*',
    onChange: (payload) => {
      console.log('Current order items update received:', payload);
      // Only refetch if we have a user to filter by
      if (user?.id) {
        fetchOrders();
      }
    },
  });

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number): string => {
    return `₱${amount.toFixed(2)}`;
  };

  /**
   * Get status badge variant
   */
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      on_hold: { label: 'On Hold', className: 'bg-orange-100 text-orange-800' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
      voided: { label: 'Voided', className: 'bg-red-100 text-red-800' },
    };

    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  /**
   * Get tier badge color
   */
  const getTierBadge = (tier: string) => {
    const tierMap: Record<string, { className: string }> = {
      vip_platinum: { className: 'bg-purple-100 text-purple-800' },
      vip_gold: { className: 'bg-yellow-100 text-yellow-800' },
      vip_silver: { className: 'bg-gray-200 text-gray-700' },
      regular: { className: 'bg-blue-100 text-blue-800' },
    };

    const config = tierMap[tier] || { className: 'bg-gray-100 text-gray-800' };
    return (
      <Badge className={config.className}>
        {tier.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  /**
   * Calculate total revenue from current orders
   */
  const getTotalRevenue = (): number => {
    return orders.reduce((sum, order) => sum + order.total_amount, 0);
  };

  /**
   * Get time elapsed since order creation
   */
  const getTimeElapsed = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-800">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold">Error Loading Orders</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            My Current Orders
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time view of your draft orders in progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowClearConfirm(true)}
            disabled={clearing || orders.length === 0}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear My Orders
          </Button>
          <Button
            onClick={fetchOrders}
            disabled={clearing}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Clear Your Orders?
            </h3>
            <p className="text-gray-600 mb-6">
              This will delete all current orders that belong to you (
              <span className="font-semibold">{user?.full_name || user?.username}</span>
              ). This action cannot be undone.
            </p>
            <p className="text-sm text-amber-600 mb-6">
              ⚠️ Only your orders will be cleared. Other users' orders will not be affected.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setShowClearConfirm(false)}
                variant="outline"
                disabled={clearing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleClearOrders}
                variant="destructive"
                disabled={clearing}
                className="flex items-center gap-2"
              >
                {clearing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Yes, Clear Orders
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">My Orders</p>
              <p className="text-3xl font-bold text-blue-900">{orders.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-600 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-green-900">
                {formatCurrency(getTotalRevenue())}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-700 font-medium">Last Updated</p>
              <p className="text-lg font-semibold text-purple-900">
                {format(lastUpdated, 'HH:mm:ss')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Current Orders
            </h3>
            <p>You don't have any draft orders in progress.</p>
            <p className="text-sm text-gray-400 mt-2">
              Orders from other users are not visible in this view.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {orders.map((order) => (
            <Card
              key={order.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedOrder === order.id ? 'ring-2 ring-amber-500' : ''
              }`}
              onClick={() => setSelectedOrder(order.id)}
            >
              {/* Order Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      {order.order_number || `Order #${order.id.slice(0, 8)}`}
                    </h3>
                    {order.status && getStatusBadge(order.status)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {getTimeElapsed(order.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-600">
                    {formatCurrency(order.total_amount)}
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="text-sm text-red-600">
                      -{formatCurrency(order.discount_amount)} off
                    </div>
                  )}
                </div>
              </div>

              {/* Table Info */}
              {order.table && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🪑</span>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {order.table.table_number}
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.table.area}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Info */}
              {order.customer && (
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold text-gray-800">
                    {order.customer.full_name}
                  </span>
                  {getTierBadge(order.customer.tier)}
                </div>
              )}

              {/* Cashier Info */}
              {order.cashier && (
                <div className="mb-3 text-sm text-gray-600">
                  Cashier: <span className="font-medium">{order.cashier.full_name}</span>
                </div>
              )}

              {/* Order Items */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Items ({order.items?.length || 0})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item: OrderItem) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between text-sm"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {item.quantity}× {item.item_name}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                          )}
                        </div>
                        <span className="font-semibold text-gray-700 ml-2">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No items yet</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
