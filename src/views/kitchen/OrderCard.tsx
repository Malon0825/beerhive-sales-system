'use client';

import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { KitchenOrderWithRelations } from '@/models/types/KitchenOrderWithRelations';
import { Card } from '@/views/shared/ui/card';
import { OrderStatusBadge } from './components/OrderStatusBadge';
import { Clock, AlertTriangle, Trash2 } from 'lucide-react';

interface OrderCardProps {
  kitchenOrder: KitchenOrderWithRelations;
  onStatusChange: (orderId: string, status: KitchenOrderStatus) => void;
  onRemove?: (orderId: string) => void;
}

/**
 * OrderCard Component
 * Displays individual order items in the kitchen display
 * Optimized for phone and tablet screens with responsive text and layout
 * 
 * @param kitchenOrder - Kitchen order with related data
 * @param onStatusChange - Callback when order status changes
 */
export function OrderCard({ kitchenOrder, onStatusChange, onRemove }: OrderCardProps) {
  const { order, order_item, product_name, status, sent_at, is_urgent, special_instructions } = kitchenOrder;
  
  /**
   * Calculate time elapsed since order was sent (in minutes)
   */
  const timeElapsed = Math.floor((Date.now() - new Date(sent_at).getTime()) / 60000);
  const isDelayed = timeElapsed > 15;

  /**
   * Handle start preparing action
   */
  const handleStartPreparing = () => {
    onStatusChange(kitchenOrder.id, KitchenOrderStatus.PREPARING);
  };

  /**
   * Handle mark ready action
   */
  const handleMarkReady = () => {
    onStatusChange(kitchenOrder.id, KitchenOrderStatus.READY);
  };

  /**
   * Handle mark served action
   */
  const handleMarkServed = () => {
    onStatusChange(kitchenOrder.id, KitchenOrderStatus.SERVED);
  };

  /**
   * Handle remove cancelled order
   */
  const handleRemove = () => {
    if (onRemove) {
      onRemove(kitchenOrder.id);
    }
  };

  return (
    <Card className={`p-3 sm:p-4 ${is_urgent ? 'border-2 border-red-500 shadow-lg' : ''} ${isDelayed ? 'border-l-4 border-l-red-600' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold">
              {order?.table?.table_number ? `Table ${order.table.table_number}` : 'Takeout'}
            </h3>
            {is_urgent && (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border border-red-300">
                <AlertTriangle className="h-3 w-3" />
                URGENT
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600">Order #{order?.order_number}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <OrderStatusBadge status={status} />
          <p className={`text-xs sm:text-sm mt-1 flex items-center gap-1 justify-end ${isDelayed ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
            <Clock className="h-3 w-3" />
            <span className="whitespace-nowrap">{timeElapsed}m</span>
          </p>
        </div>
      </div>

      {/* Order Item Details */}
      <div className="bg-gray-50 rounded p-2 sm:p-3 mb-2 sm:mb-3">
        <div className="flex justify-between items-center mb-1">
          <p className="font-semibold text-base sm:text-lg flex-1 pr-2">{product_name || order_item?.item_name}</p>
          <span className="text-xl sm:text-2xl font-bold text-blue-600 flex-shrink-0">×{order_item?.quantity}</span>
        </div>
        
        {special_instructions && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs sm:text-sm font-medium text-yellow-800">Special Instructions:</p>
            <p className="text-xs sm:text-sm text-yellow-900">{special_instructions}</p>
          </div>
        )}
        
        {order_item?.notes && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs sm:text-sm text-blue-800">{order_item.notes}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {status === KitchenOrderStatus.PENDING && (
          <button
            onClick={handleStartPreparing}
            className="flex-1 bg-blue-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded text-sm sm:text-base font-medium hover:bg-blue-700 transition active:scale-95"
          >
            Start Preparing
          </button>
        )}
        
        {status === KitchenOrderStatus.PREPARING && (
          <button
            onClick={handleMarkReady}
            className="flex-1 bg-green-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded text-sm sm:text-base font-medium hover:bg-green-700 transition active:scale-95"
          >
            Mark Ready
          </button>
        )}
        
        {status === KitchenOrderStatus.READY && (
          <button
            onClick={handleMarkServed}
            className="flex-1 bg-gray-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded text-sm sm:text-base font-medium hover:bg-gray-700 transition active:scale-95"
          >
            Mark Served
          </button>
        )}
        
        {status === KitchenOrderStatus.CANCELLED && onRemove && (
          <button
            onClick={handleRemove}
            className="flex-1 bg-red-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded text-sm sm:text-base font-medium hover:bg-red-700 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        )}
      </div>
    </Card>
  );
}
