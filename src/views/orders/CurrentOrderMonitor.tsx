'use client';

import { useState, useEffect } from 'react';
import { useRealtime } from '@/lib/hooks/useRealtime';
import { Card } from '@/views/shared/ui/card';
import { Badge } from '@/views/shared/ui/badge';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import { format } from 'date-fns';

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  notes?: string;
  is_vip_price: boolean;
  is_complimentary: boolean;
}

interface CurrentOrder {
  id: string;
  order_number: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
  customer?: {
    full_name: string;
    tier: string;
  };
  table?: {
    table_number: string;
    area: string;
  };
  order_items: OrderItem[];
}

interface CurrentOrderMonitorProps {
  tableNumber: string;
  refreshInterval?: number; // in milliseconds
}

/**
 * CurrentOrderMonitor Component
 * Real-time display of current order for customers
 * Shows order items, quantities, prices, and total bill
 */
export function CurrentOrderMonitor({
  tableNumber,
  refreshInterval = 5000,
}: CurrentOrderMonitorProps) {
  const [order, setOrder] = useState<CurrentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  /**
   * Fetch current order for the table
   */
  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/by-table/${tableNumber}`);
      const result = await response.json();

      if (result.success) {
        setOrder(result.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch order');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrder();
  }, [tableNumber]);

  // Real-time subscription to orders table
  useRealtime({
    table: 'orders',
    event: '*',
    onChange: (payload) => {
      console.log('Order update received:', payload);
      // Refetch order when any change occurs
      fetchOrder();
    },
  });

  // Real-time subscription to order_items table
  useRealtime({
    table: 'order_items',
    event: '*',
    onChange: (payload) => {
      console.log('Order items update received:', payload);
      // Refetch order when items change
      fetchOrder();
    },
  });

  // Periodic refresh as backup
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrder();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [tableNumber, refreshInterval]);

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number): string => {
    return `₱${amount.toFixed(2)}`;
  };

  /**
   * Get badge color based on customer tier
   */
  const getTierBadgeColor = (tier: string): string => {
    switch (tier) {
      case 'vip_platinum':
        return 'bg-purple-100 text-purple-800';
      case 'vip_gold':
        return 'bg-yellow-100 text-yellow-800';
      case 'vip_silver':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <Card className="p-8">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading your order...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">🍺</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No Active Order
            </h2>
            <p className="text-gray-600">
              Table {tableNumber} has no current order.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Please place an order to see your bill here.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6 p-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">BeerHive PUB</h1>
              <p className="text-amber-100">Your Current Bill</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">
                {order.table?.table_number || tableNumber}
              </div>
              <div className="text-sm text-amber-100">
                {order.table?.area || 'Table'}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          {order.customer && (
            <div className="flex items-center gap-3 pt-4 border-t border-amber-500">
              <span className="text-amber-100">Customer:</span>
              <span className="font-semibold">{order.customer.full_name}</span>
              <Badge className={getTierBadgeColor(order.customer.tier)}>
                {order.customer.tier.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          )}

          <div className="mt-2 text-sm text-amber-100">
            Order #{order.order_number}
          </div>
        </Card>

        {/* Order Items */}
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📝</span> Order Items
          </h2>

          <div className="space-y-3">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between py-3 border-b last:border-b-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">
                      {item.item_name}
                    </h3>
                    {item.is_complimentary && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Complimentary
                      </Badge>
                    )}
                    {item.is_vip_price && !item.is_complimentary && (
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        VIP Price
                      </Badge>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                    <span>Qty: {item.quantity}</span>
                    <span>×</span>
                    <span>{formatCurrency(item.unit_price)}</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  {item.discount_amount > 0 && (
                    <div className="text-sm text-red-600 line-through">
                      {formatCurrency(item.subtotal)}
                    </div>
                  )}
                  <div className="text-lg font-bold text-gray-800">
                    {formatCurrency(item.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Order Summary */}
        <Card className="p-6 bg-white shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Bill Summary
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span className="font-semibold">
                {formatCurrency(order.subtotal)}
              </span>
            </div>

            {order.discount_amount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span className="font-semibold">
                  -{formatCurrency(order.discount_amount)}
                </span>
              </div>
            )}

            {order.tax_amount > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Tax</span>
                <span className="font-semibold">
                  {formatCurrency(order.tax_amount)}
                </span>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-2xl font-bold text-gray-800">Total</span>
              <span className="text-3xl font-bold text-amber-600">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Last updated: {format(lastUpdated, 'PPp')}</p>
          <p className="mt-1">
            This bill updates in real-time as items are added or removed
          </p>
        </div>
      </div>
    </div>
  );
}
