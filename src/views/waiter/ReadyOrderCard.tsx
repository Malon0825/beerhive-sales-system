'use client';

import { KitchenOrderWithRelations } from '@/models/types/KitchenOrderWithRelations';
import { Card } from '@/views/shared/ui/card';
import { CheckCircle, Clock } from 'lucide-react';

interface ReadyOrderCardProps {
  kitchenOrder: KitchenOrderWithRelations;
  onMarkServed: () => void;
}

/**
 * ReadyOrderCard Component
 * Displays a ready order item that needs to be delivered
 * Optimized for phone and tablet screens with responsive text and layout
 * 
 * @param kitchenOrder - Kitchen order with "ready" status
 * @param onMarkServed - Callback when waiter marks item as served
 */
export function ReadyOrderCard({ kitchenOrder, onMarkServed }: ReadyOrderCardProps) {
  const { order, order_item, ready_at, sent_at, special_instructions } = kitchenOrder;
  
  /**
   * Calculate how long the item has been ready (in minutes)
   */
  const timeReady = Math.floor(
    (Date.now() - new Date(ready_at || sent_at).getTime()) / 60000
  );
  
  const isDelayed = timeReady > 5; // Alert if ready for more than 5 minutes

  return (
    <Card className={`p-3 sm:p-4 border-2 border-green-500 ${isDelayed ? 'bg-yellow-50' : 'bg-green-50'}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="h-4 sm:h-5 w-4 sm:w-5 text-green-600" />
            <span className="text-xs font-semibold text-green-700 uppercase">Ready</span>
          </div>
          <p className="text-xs text-gray-600 truncate">Order #{order?.order_number}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <div className={`flex items-center gap-1 text-xs sm:text-sm ${isDelayed ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
            <Clock className="h-3 sm:h-4 w-3 sm:w-4" />
            <span className="whitespace-nowrap">{timeReady}m</span>
          </div>
        </div>
      </div>

      {/* Item Details */}
      <div className="mb-3 sm:mb-4">
        <div className="flex justify-between items-center">
          <p className="font-bold text-base sm:text-lg text-gray-800 flex-1 pr-2">{order_item?.item_name}</p>
          <span className="text-xl sm:text-2xl font-bold text-green-600 flex-shrink-0">×{order_item?.quantity}</span>
        </div>

        {special_instructions && (
          <div className="mt-2 p-1.5 sm:p-2 bg-yellow-100 border border-yellow-300 rounded">
            <p className="text-xs font-medium text-yellow-800">Special Instructions:</p>
            <p className="text-xs sm:text-sm text-yellow-900">{special_instructions}</p>
          </div>
        )}

        {order_item?.notes && (
          <div className="mt-2 p-1.5 sm:p-2 bg-blue-100 border border-blue-300 rounded">
            <p className="text-xs font-medium text-blue-800">Notes:</p>
            <p className="text-xs sm:text-sm text-blue-900">{order_item.notes}</p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onMarkServed}
        className="w-full bg-green-600 text-white px-3 sm:px-4 py-2 sm:py-3 rounded text-sm sm:text-base font-bold hover:bg-green-700 transition active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2"
      >
        <CheckCircle className="h-4 sm:h-5 w-4 sm:w-5" />
        Mark as Served
      </button>

      {isDelayed && (
        <p className="text-xs text-red-600 font-semibold mt-2 text-center">
          ⚠️ Waiting {timeReady} min - Deliver soon!
        </p>
      )}
    </Card>
  );
}
