'use client';

import { useState } from 'react';
import { Badge } from '@/views/shared/ui/badge';
import { Card } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import { formatCurrency } from '@/core/utils/formatters/currency';
import { formatDate } from '@/core/utils/formatters/date';
import { Clock, User, Table as TableIcon, DollarSign, RotateCcw } from 'lucide-react';
import ReturnOrderDialog from './ReturnOrderDialog';

/**
 * OrderBoardCard Component
 * Displays individual order information on the order board
 * Shows order details including items, customer, table, and total amount
 */

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string | null;
}

interface OrderBoardCardProps {
  order: {
    id: string;
    order_number: string;
    customer?: {
      full_name: string;
      customer_number: string;
    } | null;
    table?: {
      table_number: string;
      area?: string;
    } | null;
    order_items: OrderItem[];
    total_amount: number;
    status: string;
    created_at: string;
  };
  onOrderUpdated?: () => void;
}

/**
 * Get status badge variant based on order status
 */
const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'destructive' => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'voided':
      return 'destructive';
    default:
      return 'default';
  }
};

export default function OrderBoardCard({ order, onOrderUpdated }: OrderBoardCardProps) {
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  /**
   * Handle successful order return/void
   */
  const handleReturnSuccess = () => {
    if (onOrderUpdated) {
      onOrderUpdated();
    }
  };

  return (
    <>
      <Card className="p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            {order.order_number}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{formatDate(order.created_at)}</span>
          </div>
        </div>
        <Badge variant={getStatusVariant(order.status)}>
          {order.status.toUpperCase()}
        </Badge>
      </div>

      {/* Customer & Table Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {order.customer && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {order.customer.full_name}
              </p>
              <p className="text-xs text-gray-500">
                {order.customer.customer_number}
              </p>
            </div>
          </div>
        )}
        {order.table && (
          <div className="flex items-center gap-2">
            <TableIcon className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Table {order.table.table_number}
              </p>
              {order.table.area && (
                <p className="text-xs text-gray-500 capitalize">
                  {order.table.area.replace('_', ' ')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="border-t border-b border-gray-200 py-4 mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Items</h4>
        <div className="space-y-2">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {item.quantity}x {item.item_name}
                </p>
                {item.notes && (
                  <p className="text-xs text-gray-500 italic mt-1">{item.notes}</p>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 ml-4">
                {formatCurrency(item.total)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-600">
          <DollarSign className="h-5 w-5" />
          <span className="text-sm font-medium">Total</span>
        </div>
        <p className="text-2xl font-bold text-green-600">
          {formatCurrency(order.total_amount)}
        </p>
      </div>

      {/* Return/Void Button for Completed Orders */}
      {order.status === 'completed' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReturnDialog(true)}
            className="w-full text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Return Order
          </Button>
        </div>
      )}
    </Card>

    {/* Return Order Dialog */}
    {showReturnDialog && (
      <ReturnOrderDialog
        orderId={order.id}
        orderNumber={order.order_number}
        onClose={() => setShowReturnDialog(false)}
        onSuccess={handleReturnSuccess}
      />
    )}
    </>
  );
}
