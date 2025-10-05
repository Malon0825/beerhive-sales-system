'use client';

import { useState } from 'react';
import { useCurrentOrders } from '@/lib/hooks/useCurrentOrders';
import { Card } from '@/views/shared/ui/card';
import { Badge } from '@/views/shared/ui/badge';
import { Button } from '@/views/shared/ui/button';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  MapPin,
  FileText,
  Pause,
  Play,
  X,
} from 'lucide-react';

interface CurrentOrderPanelProps {
  cashierId: string;
  onCheckout?: (orderId: string) => void;
}

/**
 * CurrentOrderPanel Component
 * 
 * Displays the current order being built by a cashier in POS
 * Shows items, quantities, prices, and totals
 * Updates in real-time when items are added/removed
 * 
 * Features:
 * - Real-time updates via Supabase subscriptions
 * - Cashier-specific order isolation
 * - Add/remove/update items
 * - Hold/resume orders
 * - Customer and table assignment
 * - Auto-calculated totals
 */
export function CurrentOrderPanel({ cashierId, onCheckout }: CurrentOrderPanelProps) {
  const {
    activeOrder,
    loading,
    error,
    removeItem,
    updateItem,
    clearItems,
    holdOrder,
    createOrder,
  } = useCurrentOrders(cashierId);

  const [processingItem, setProcessingItem] = useState<string | null>(null);

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number): string => {
    return `₱${amount.toFixed(2)}`;
  };

  /**
   * Handle quantity change for an item
   */
  const handleQuantityChange = async (
    itemId: string,
    currentQuantity: number,
    change: number
  ) => {
    if (!activeOrder?.id) return;

    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return; // Minimum quantity is 1

    try {
      setProcessingItem(itemId);
      
      // Get current item to recalculate totals
      const item = activeOrder.items?.find((i) => i.id === itemId);
      if (!item) return;

      const newSubtotal = item.unit_price * newQuantity;
      const newTotal = newSubtotal - (item.discount_amount || 0);

      await updateItem(activeOrder.id, itemId, {
        quantity: newQuantity,
        subtotal: newSubtotal,
        total: newTotal,
      });
    } catch (err) {
      console.error('Error updating item quantity:', err);
    } finally {
      setProcessingItem(null);
    }
  };

  /**
   * Handle item removal
   */
  const handleRemoveItem = async (itemId: string) => {
    if (!activeOrder?.id) return;

    if (!confirm('Remove this item from the order?')) return;

    try {
      setProcessingItem(itemId);
      await removeItem(activeOrder.id, itemId);
    } catch (err) {
      console.error('Error removing item:', err);
    } finally {
      setProcessingItem(null);
    }
  };

  /**
   * Handle clear all items
   */
  const handleClearAll = async () => {
    if (!activeOrder?.id) return;

    if (!confirm('Clear all items from this order?')) return;

    try {
      await clearItems(activeOrder.id);
    } catch (err) {
      console.error('Error clearing items:', err);
    }
  };

  /**
   * Handle hold order
   */
  const handleHoldOrder = async () => {
    if (!activeOrder?.id) return;

    try {
      await holdOrder(activeOrder.id);
    } catch (err) {
      console.error('Error holding order:', err);
    }
  };

  /**
   * Handle checkout
   */
  const handleCheckout = () => {
    if (!activeOrder?.id) return;
    
    if (onCheckout) {
      onCheckout(activeOrder.id);
    }
  };

  /**
   * Handle new order creation
   */
  const handleNewOrder = async () => {
    try {
      await createOrder();
    } catch (err) {
      console.error('Error creating new order:', err);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <LoadingSpinner />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 h-full">
        <div className="text-center text-red-600">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  // No active order
  if (!activeOrder) {
    return (
      <Card className="p-6 h-full flex flex-col items-center justify-center">
        <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">No active order</p>
        <Button onClick={handleNewOrder} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4 mr-2" />
          Start New Order
        </Button>
      </Card>
    );
  }

  const itemCount = activeOrder.items?.length || 0;
  const hasItems = itemCount > 0;

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-amber-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-lg">Current Order</h3>
            <Badge className="bg-blue-100 text-blue-800">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Badge>
          </div>
          {hasItems && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Customer & Table Info */}
        <div className="space-y-2 text-sm">
          {activeOrder.customer && (
            <div className="flex items-center gap-2 text-gray-700">
              <User className="w-4 h-4" />
              <span>{activeOrder.customer.full_name}</span>
              <Badge className="text-xs">
                {activeOrder.customer.tier.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          )}
          {activeOrder.table && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4" />
              <span>
                {activeOrder.table.table_number} - {activeOrder.table.area}
              </span>
            </div>
          )}
          {activeOrder.order_notes && (
            <div className="flex items-start gap-2 text-gray-700">
              <FileText className="w-4 h-4 mt-0.5" />
              <span className="text-xs">{activeOrder.order_notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!hasItems ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No items yet</p>
            <p className="text-sm">Select products to add</p>
          </div>
        ) : (
          activeOrder.items?.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{item.item_name}</h4>
                  {item.notes && (
                    <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                  )}
                  {item.is_vip_price && (
                    <Badge className="mt-1 text-xs bg-purple-100 text-purple-800">
                      VIP Price
                    </Badge>
                  )}
                  {item.is_complimentary && (
                    <Badge className="mt-1 text-xs bg-green-100 text-green-800">
                      Complimentary
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => item.id && handleRemoveItem(item.id)}
                  disabled={processingItem === item.id}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      item.id && handleQuantityChange(item.id, item.quantity, -1)
                    }
                    disabled={processingItem === item.id || item.quantity <= 1}
                    className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      item.id && handleQuantityChange(item.id, item.quantity, 1)
                    }
                    disabled={processingItem === item.id}
                    className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Price */}
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {formatCurrency(item.unit_price)} each
                  </div>
                  <div className="font-bold text-amber-600">
                    {formatCurrency(item.total)}
                  </div>
                </div>
              </div>

              {/* Addons */}
              {item.addons && item.addons.length > 0 && (
                <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                  <span className="font-semibold">Add-ons: </span>
                  {item.addons.map((addon, idx) => (
                    <span key={idx}>
                      {addon.addon_name} (+{formatCurrency(addon.addon_price)})
                      {idx < item.addons!.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Order Summary */}
      <div className="border-t p-4 bg-gray-50">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">
              {formatCurrency(activeOrder.subtotal)}
            </span>
          </div>
          {activeOrder.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Discount</span>
              <span className="font-semibold">
                -{formatCurrency(activeOrder.discount_amount)}
              </span>
            </div>
          )}
          {activeOrder.tax_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="font-semibold">
                {formatCurrency(activeOrder.tax_amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span className="text-amber-600">
              {formatCurrency(activeOrder.total_amount)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleHoldOrder}
            className="flex-1"
            disabled={!hasItems}
          >
            <Pause className="w-4 h-4 mr-2" />
            Hold
          </Button>
          <Button
            onClick={handleCheckout}
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={!hasItems}
          >
            Checkout
          </Button>
        </div>
      </div>
    </Card>
  );
}
