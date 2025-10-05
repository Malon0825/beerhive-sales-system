'use client';

import { useState, useEffect } from 'react';
import { Order } from '@/models/entities/Order';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import { OrderStatusBadge } from '@/views/shared/OrderStatusBadge';
import { 
  Calendar,
  DollarSign,
  FileText,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface OrderWithDetails extends Order {
  order_items?: any[];
  table?: any;
}

interface CustomerOrderHistoryProps {
  customerId?: string;
  limit?: number;
  showFilters?: boolean;
}

/**
 * CustomerOrderHistory Component
 * Displays a customer's order history with expandable details
 * 
 * Features:
 * - Shows order list with status, date, and total
 * - Expandable order details showing items
 * - Pagination support
 * - Filter by status
 * - Responsive design
 * 
 * @param customerId - Customer ID to fetch orders for (optional, uses current user if not provided)
 * @param limit - Maximum number of orders to display per page
 * @param showFilters - Whether to show status filter options
 */
export function CustomerOrderHistory({ 
  customerId, 
  limit = 10,
  showFilters = true 
}: CustomerOrderHistoryProps) {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  /**
   * Fetch orders from API
   */
  useEffect(() => {
    fetchOrders();
  }, [customerId, statusFilter]);

  /**
   * Fetch customer orders from the API
   */
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (customerId) {
        params.append('customerId', customerId);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/orders?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch orders');
      }

      setOrders(result.data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle order details expansion
   */
  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchOrders} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render empty state
   */
  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No orders found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>
              View and track your orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === 'on_hold' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('on_hold')}
              >
                On Hold
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders list */}
      <div className="space-y-3">
        {orders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              {/* Order summary */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleOrderDetails(order.id)}
              >
                <div className="flex-1 space-y-2">
                  {/* Order number and status */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{order.order_number}</span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  {/* Order details */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                    {order.table && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        Table {order.table.table_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand/collapse button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOrderDetails(order.id);
                  }}
                >
                  {expandedOrderId === order.id ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Expanded order details */}
              {expandedOrderId === order.id && order.order_items && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <h4 className="font-semibold text-sm">Order Items</h4>
                  <div className="space-y-2">
                    {order.order_items.map((item: any, index: number) => (
                      <div
                        key={item.id || index}
                        className="flex justify-between items-start text-sm"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                        <span className="font-medium">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order totals */}
                  <div className="pt-3 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(order.discount_amount)}</span>
                      </div>
                    )}
                    {order.tax_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(order.tax_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>

                  {/* Payment method */}
                  {order.payment_method && (
                    <div className="pt-2 text-sm text-muted-foreground">
                      Payment: {order.payment_method.replace('_', ' ').toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load more button (if needed) */}
      {orders.length >= limit && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={fetchOrders}>
            Load More Orders
          </Button>
        </div>
      )}
    </div>
  );
}
