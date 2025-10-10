'use client';

import { useState } from 'react';
import { Badge } from '@/views/shared/ui/badge';
import { Card } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import { formatCurrency } from '@/core/utils/formatters/currency';
import { formatDate } from '@/core/utils/formatters/date';
import { Clock, User, Table as TableIcon, DollarSign, Receipt, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * SessionBoardCard Component
 * Displays session-grouped orders on the order board
 * Shows all orders from a single tab/session bundled together
 * Supports receipt printing for the entire session
 */

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
  total_amount: number;
}

interface SessionBoardCardProps {
  session: {
    session_id: string;
    session_number: string;
    session_status: string;
    session_opened_at: string;
    orders: Order[];
    customer?: {
      full_name: string;
      customer_number: string;
    } | null;
    table?: {
      table_number: string;
      area?: string;
    } | null;
    total_amount: number;
    earliest_created_at: string;
  };
  onSessionUpdated?: () => void;
}

/**
 * Get status badge variant based on session/order status
 */
const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'destructive' => {
  switch (status.toLowerCase()) {
    case 'closed':
    case 'completed':
      return 'success';
    case 'open':
    case 'pending':
    case 'confirmed':
      return 'warning';
    case 'voided':
      return 'destructive';
    default:
      return 'default';
  }
};

/**
 * Get order status display
 */
const getOrderStatusDisplay = (status: string): string => {
  return status.toUpperCase();
};

export default function SessionBoardCard({ session, onSessionUpdated }: SessionBoardCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);

  /**
   * Handle receipt printing for the entire session
   */
  const handlePrintReceipt = async () => {
    try {
      setIsPrintingReceipt(true);
      
      // Open receipt in new window for session
      const receiptUrl = `/order-sessions/${session.session_id}/receipt`;
      const receiptWindow = window.open(receiptUrl, '_blank', 'width=400,height=600');
      
      if (!receiptWindow) {
        alert('Please allow pop-ups to print receipts');
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Failed to generate receipt');
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  // Calculate total items across all orders
  const totalItems = session.orders.reduce(
    (sum, order) => sum + order.order_items.length,
    0
  );

  // Get all completed orders count
  const completedOrdersCount = session.orders.filter(
    (o) => o.status === 'completed'
  ).length;

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold text-purple-900">
              {session.session_number}
            </h3>
            <Badge variant={getStatusVariant(session.session_status)}>
              {session.session_status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{formatDate(session.session_opened_at)}</span>
          </div>
          <p className="text-xs text-purple-600 font-medium mt-1">
            {session.orders.length} {session.orders.length === 1 ? 'order' : 'orders'} • {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(session.total_amount)}
          </p>
        </div>
      </div>

      {/* Customer & Table Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {session.customer && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {session.customer.full_name}
              </p>
              <p className="text-xs text-gray-500">
                {session.customer.customer_number}
              </p>
            </div>
          </div>
        )}
        {session.table && (
          <div className="flex items-center gap-2">
            <TableIcon className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Table {session.table.table_number}
              </p>
              {session.table.area && (
                <p className="text-xs text-gray-500 capitalize">
                  {session.table.area.replace('_', ' ')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Orders Summary */}
      <div className="border-t border-b border-gray-200 py-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Orders in this Tab</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show Details
              </>
            )}
          </Button>
        </div>

        {/* Orders List - Compact View */}
        {!isExpanded && (
          <div className="space-y-2">
            {session.orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between bg-gray-50 p-2 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {order.order_number}
                  </span>
                  <Badge variant={getStatusVariant(order.status)} className="text-xs">
                    {getOrderStatusDisplay(order.status)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders List - Expanded View */}
        {isExpanded && (
          <div className="space-y-3">
            {session.orders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      {order.order_number}
                    </span>
                    <Badge variant={getStatusVariant(order.status)} className="text-xs">
                      {getOrderStatusDisplay(order.status)}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(order.created_at)}
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-1">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <div className="flex-1">
                        <p className="text-gray-900">
                          <span className="font-medium">{item.quantity}x</span> {item.item_name}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-gray-500 italic">{item.notes}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 ml-4">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Order Total */}
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-gray-700">Order Total:</span>
                    <span className="text-gray-900">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-2">
        {/* Print Receipt Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrintReceipt}
          disabled={isPrintingReceipt}
          className="w-full text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          <Receipt className="h-4 w-4 mr-2" />
          {isPrintingReceipt ? 'Generating Receipt...' : 'Print Receipt'}
        </Button>

        {/* Status Info */}
        {session.session_status === 'open' && completedOrdersCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2">
            <p className="text-xs text-amber-800 text-center">
              ⚠️ {completedOrdersCount} {completedOrdersCount === 1 ? 'order' : 'orders'} completed • Tab still open
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
