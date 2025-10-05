'use client';

import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { KitchenOrderWithRelations } from '@/models/types/KitchenOrderWithRelations';
import { Card } from '@/views/shared/ui/card';
import { OrderStatusBadge } from './components/OrderStatusBadge';
import { Clock, AlertTriangle } from 'lucide-react';

interface OrderCardProps {
  kitchenOrder: KitchenOrderWithRelations;
  onStatusChange: (orderId: string, status: KitchenOrderStatus) => void;
}

/**
 * OrderCard Component
 * Displays individual order items in the kitchen display
 * 
 * @param kitchenOrder - Kitchen order with related data
 * @param onStatusChange - Callback when order status changes
 */
export function OrderCard({ kitchenOrder, onStatusChange }: OrderCardProps) {
  const { order, order_item, status, sent_at, is_urgent, special_instructions } = kitchenOrder;
  
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

  return (
    <Card className={`p-4 ${is_urgent ? 'border-2 border-red-500 shadow-lg' : ''} ${isDelayed ? 'border-l-4 border-l-red-600' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">
              {order?.table?.table_number ? `Table ${order.table.table_number}` : 'Takeout'}
            </h3>
            {is_urgent && (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded border border-red-300">
                <AlertTriangle className="h-3 w-3" />
                URGENT
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">Order #{order?.order_number}</p>
        </div>
        <div className="text-right">
          <OrderStatusBadge status={status} />
          <p className={`text-sm mt-1 flex items-center gap-1 justify-end ${isDelayed ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
            <Clock className="h-3 w-3" />
            {timeElapsed} min ago
          </p>
        </div>
      </div>

      {/* Order Item Details */}
      <div className="bg-gray-50 rounded p-3 mb-3">
        <div className="flex justify-between items-center mb-1">
          <p className="font-semibold text-lg">{order_item?.item_name}</p>
          <span className="text-2xl font-bold text-blue-600">×{order_item?.quantity}</span>
        </div>
        
        {special_instructions && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm font-medium text-yellow-800">Special Instructions:</p>
            <p className="text-sm text-yellow-900">{special_instructions}</p>
          </div>
        )}
        
        {order_item?.notes && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">{order_item.notes}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {status === KitchenOrderStatus.PENDING && (
          <button
            onClick={handleStartPreparing}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition"
          >
            Start Preparing
          </button>
        )}
        
        {status === KitchenOrderStatus.PREPARING && (
          <button
            onClick={handleMarkReady}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 transition"
          >
            Mark Ready
          </button>
        )}
        
        {status === KitchenOrderStatus.READY && (
          <button
            onClick={handleMarkServed}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded font-medium hover:bg-gray-700 transition"
          >
            Mark Served
          </button>
        )}
      </div>
    </Card>
  );
}
