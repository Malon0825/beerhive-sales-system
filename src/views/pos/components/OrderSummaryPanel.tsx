'use client';

import React from 'react';
import { Card } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import { CartItem } from '@/lib/contexts/CartContext';
import { Customer } from '@/models/entities/Customer';
import { RestaurantTable } from '@/models/entities/Table';
import { User, Armchair, List, Trash2, Plus, Minus } from 'lucide-react';

/**
 * Props for OrderSummaryPanel component
 */
interface OrderSummaryPanelProps {
  /** Cart items to display */
  items: CartItem[];
  /** Selected customer */
  customer: Customer | null;
  /** Selected table */
  table: RestaurantTable | null;
  /** Subtotal amount */
  subtotal: number;
  /** Total amount */
  total: number;
  /** Whether cart is loading */
  isLoading: boolean;
  /** Handler to open customer search */
  onOpenCustomerSearch: () => void;
  /** Handler to open table selector */
  onOpenTableSelector: () => void;
  /** Handler to update item quantity */
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  /** Handler to remove item */
  onRemoveItem: (itemId: string) => void;
  /** Handler to proceed to payment */
  onProceedToPayment: () => void;
  /** Handler to clear cart */
  onClearCart: () => void;
}

/**
 * OrderSummaryPanel Component
 * 
 * Displays current order summary with customer/table info and action buttons.
 * Professional layout with clear item listing and controls.
 * 
 * Features:
 * - Customer and table selection
 * - Item quantity controls
 * - Item removal
 * - Order totals
 * - Payment and clear actions
 * 
 * @component
 */
export function OrderSummaryPanel({
  items,
  customer,
  table,
  subtotal,
  total,
  isLoading,
  onOpenCustomerSearch,
  onOpenTableSelector,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToPayment,
  onClearCart,
}: OrderSummaryPanelProps) {
  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
        <h2 className="text-xl font-bold text-gray-800">Current Order</h2>
        <p className="text-sm text-gray-600">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Customer & Table Selection */}
      <div className="p-4 space-y-2 border-b bg-gray-50">
        <Button
          variant="outline"
          className="w-full justify-start hover:bg-white hover:border-amber-400 transition-colors"
          size="sm"
          onClick={onOpenCustomerSearch}
        >
          <User className="h-4 w-4 mr-2 text-blue-600" />
          <span className="flex-1 text-left truncate">
            {customer ? customer.full_name : 'Select Customer (Optional)'}
          </span>
        </Button>
        
        <Button
          variant="outline"
          className="w-full justify-start hover:bg-white hover:border-amber-400 transition-colors"
          size="sm"
          onClick={onOpenTableSelector}
        >
          <Armchair className="h-4 w-4 mr-2 text-amber-600" />
          <span className="flex-1 text-left truncate">
            {table ? `Table ${table.table_number}` : 'Select Table (Optional)'}
          </span>
        </Button>
      </div>

      {/* Order Items List */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-3"></div>
            <p>Loading cart...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <List className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No items in cart</p>
            <p className="text-sm mt-1">Select products to add</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
                {/* Item Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-semibold text-sm leading-tight">
                      {item.product.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      ₱{item.unitPrice.toFixed(2)} each
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <span className="w-12 text-center font-bold text-lg">
                      {item.quantity}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Item Subtotal */}
                  <span className="font-bold text-lg text-amber-600">
                    ₱{item.subtotal.toFixed(2)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Totals Section */}
      <div className="border-t p-4 bg-gray-50 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal:</span>
            <span className="font-medium">₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax:</span>
            <span className="font-medium">₱0.00</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-2xl font-bold text-amber-600">
                ₱{total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-6 text-lg shadow-lg"
            disabled={items.length === 0}
            onClick={onProceedToPayment}
          >
            Proceed to Payment
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={onClearCart}
              disabled={items.length === 0}
              className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button 
              variant="outline" 
              disabled={items.length === 0}
              className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
            >
              Hold Order
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
