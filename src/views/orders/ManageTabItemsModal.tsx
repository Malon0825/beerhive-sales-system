'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Trash2, AlertTriangle, Clock, ChefHat, Loader2, Package, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/views/shared/ui/button';
import { Input } from '@/views/shared/ui/input';
import { Badge } from '@/views/shared/ui/badge';
import { formatCurrency } from '@/lib/utils/formatters';

/**
 * ManageTabItemsModal Component
 * Professional single-modal interface for reducing order quantities
 * 
 * REDESIGNED FOR PROFESSIONAL UX:
 * - Single modal shows ALL items from ALL orders
 * - One-click quantity reduction (no nested modals)
 * - Only allows decreasing quantities (no additions)
 * - Clear kitchen status warnings
 * - Minimal clicks for common operations
 * - Real-time feedback
 * 
 * Features:
 * - View all tab items in one place
 * - Quick decrease buttons (-1, -2, Custom)
 * - Remove item with one click + confirm
 * - Kitchen status indicators
 * - Automatic stock adjustment
 * - Real-time session total updates
 * 
 * Business Rules:
 * - Only CONFIRMED order items can be modified
 * - Can only DECREASE quantity (no increases)
 * - Items in PREPARING/READY status show warnings
 * - Last item in order cannot be removed (must void order)
 * - All changes immediately update inventory and kitchen
 * 
 * @component
 */
interface ManageTabItemsModalProps {
  sessionId: string;
  sessionNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onItemsChanged?: () => void;
}

interface TabItem {
  id: string;
  order_id: string;
  order_number: string;
  order_status: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_id: string | null;
  package_id: string | null;
  is_complimentary: boolean;
  kitchen_status?: 'pending' | 'preparing' | 'ready' | 'completed';
  can_modify: boolean;
  is_last_item_in_order: boolean;
}

interface SessionData {
  session_number: string;
  total_amount: number;
  items: TabItem[];
}

export default function ManageTabItemsModal({
  sessionId,
  sessionNumber,
  isOpen,
  onClose,
  onItemsChanged,
}: ManageTabItemsModalProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [customQuantity, setCustomQuantity] = useState<{ [itemId: string]: string }>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  /**
   * Fetch all tab items
   */
  const fetchTabItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/order-sessions/${sessionId}/manage-items`);
      const data = await response.json();

      if (data.success) {
        setSessionData(data.data);
      } else {
        setError(data.error || 'Failed to load items');
      }
    } catch (err) {
      console.error('Failed to fetch tab items:', err);
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchTabItems();
    }
  }, [isOpen, sessionId]);

  /**
   * Reduce item quantity by a fixed amount
   */
  const handleReduceQuantity = async (item: TabItem, reduction: number) => {
    const newQuantity = item.quantity - reduction;

    if (newQuantity < 1) {
      setError('Cannot reduce below 1. Use Remove to delete the item.');
      return;
    }

    await updateItemQuantity(item, newQuantity);
  };

  /**
   * Update item to custom quantity
   */
  const handleCustomQuantity = async (item: TabItem) => {
    const customValue = customQuantity[item.id];
    if (!customValue) return;

    const newQuantity = parseInt(customValue, 10);

    if (isNaN(newQuantity) || newQuantity < 1) {
      setError('Invalid quantity. Must be at least 1.');
      return;
    }

    if (newQuantity >= item.quantity) {
      setError(`New quantity must be less than current (${item.quantity}). This feature only allows reductions.`);
      return;
    }

    await updateItemQuantity(item, newQuantity);
    
    // Clear custom input
    setCustomQuantity(prev => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  /**
   * Update item quantity (backend call)
   */
  const updateItemQuantity = async (item: TabItem, newQuantity: number) => {
    try {
      setProcessingItemId(item.id);
      setError(null);

      const response = await fetch(`/api/orders/${item.order_id}/items/${item.id}/reduce`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_quantity: newQuantity,
          reason: 'Customer changed order',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show kitchen warning if exists
        if (data.data.kitchenWarning) {
          // Non-blocking warning
          console.warn('Kitchen warning:', data.data.kitchenWarning);
        }

        // Refresh data
        await fetchTabItems();
        onItemsChanged?.();
      } else {
        setError(data.error || 'Failed to update quantity');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update quantity');
    } finally {
      setProcessingItemId(null);
    }
  };

  /**
   * Remove item completely
   */
  const handleRemoveItem = async (item: TabItem) => {
    try {
      setProcessingItemId(item.id);
      setError(null);

      const response = await fetch(`/api/orders/${item.order_id}/items/${item.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setConfirmRemove(null);
        await fetchTabItems();
        onItemsChanged?.();
      } else {
        setError(data.error || 'Failed to remove item');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove item');
    } finally {
      setProcessingItemId(null);
    }
  };

  /**
   * Get kitchen status badge
   */
  const getKitchenBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-gray-500 text-white text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'preparing':
        return <Badge className="bg-orange-500 text-white text-xs"><ChefHat className="w-3 h-3 mr-1" />Preparing</Badge>;
      case 'ready':
        return <Badge className="bg-green-500 text-white text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Ready</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500 text-white text-xs">Served</Badge>;
      default:
        return null;
    }
  };

  if (!isOpen || !isMounted) return null;

  const modifiableItems = sessionData?.items.filter(i => i.can_modify) || [];
  const unmodifiableItems = sessionData?.items.filter(i => !i.can_modify) || [];

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Manage Tab Items</h2>
            <p className="text-blue-100 text-sm mt-1">
              Session: {sessionNumber} • {sessionData?.items.length || 0} items
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-blue-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Reduce Order Quantities</p>
              <p className="text-blue-700 mt-1">
                You can only <strong>decrease</strong> quantities. To add more items, create a new order.
                Items already being prepared will show a warning but can still be modified.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-500">Loading items...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setError(null)}
                    className="mt-3"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ) : sessionData && sessionData.items.length > 0 ? (
            <div className="space-y-6">
              {/* Modifiable Items */}
              {modifiableItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Can Be Modified ({modifiableItems.length})
                  </h3>
                  <div className="space-y-3">
                    {modifiableItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {item.package_id && <Package className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                              <h4 className="font-semibold text-gray-900 truncate">{item.item_name}</h4>
                              {getKitchenBadge(item.kitchen_status)}
                              {item.is_complimentary && (
                                <Badge variant="secondary" className="text-xs">Free</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span>Order: {item.order_number}</span>
                              <span>•</span>
                              <span className="font-semibold">Qty: {item.quantity}</span>
                              <span>×</span>
                              <span>{formatCurrency(item.unit_price)}</span>
                            </div>

                            {/* Kitchen Warning */}
                            {item.kitchen_status && ['preparing', 'ready'].includes(item.kitchen_status) && (
                              <div className="mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                <p className="text-xs text-amber-800">
                                  ⚠️ {item.kitchen_status === 'preparing' ? 'Being prepared' : 'Already prepared'} - changes will create new kitchen order
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Price */}
                          <div className="text-right flex-shrink-0">
                            <div className="text-xl font-bold text-gray-900">
                              {formatCurrency(item.total)}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Quick Reduce Buttons */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 font-medium">Reduce:</span>
                              {[1, 2].map(amount => (
                                <Button
                                  key={amount}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReduceQuantity(item, amount)}
                                  disabled={processingItemId === item.id || item.quantity <= amount}
                                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                                >
                                  <Minus className="w-3 h-3 mr-1" />
                                  {amount}
                                </Button>
                              ))}
                            </div>

                            {/* Custom Quantity */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Set to:</span>
                              <Input
                                type="number"
                                min="1"
                                max={item.quantity - 1}
                                placeholder="Qty"
                                value={customQuantity[item.id] || ''}
                                onChange={(e) => setCustomQuantity(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="w-20 h-8 text-sm"
                                disabled={processingItemId === item.id}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleCustomQuantity(item)}
                                disabled={processingItemId === item.id || !customQuantity[item.id]}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Apply
                              </Button>
                            </div>

                            {/* Remove Button */}
                            <div className="ml-auto">
                              {confirmRemove === item.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-red-600 font-medium">Remove item?</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setConfirmRemove(null)}
                                    disabled={processingItemId === item.id}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRemoveItem(item)}
                                    disabled={processingItemId === item.id || item.is_last_item_in_order}
                                  >
                                    {processingItemId === item.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      'Confirm'
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setConfirmRemove(item.id)}
                                  disabled={processingItemId !== null || item.is_last_item_in_order}
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  title={item.is_last_item_in_order ? 'Cannot remove last item - void order instead' : 'Remove item'}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Processing Overlay */}
                        {processingItemId === item.id && (
                          <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmodifiable Items */}
              {unmodifiableItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Cannot Modify ({unmodifiableItems.length})
                  </h3>
                  <div className="space-y-2">
                    {unmodifiableItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-60"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">{item.item_name}</span>
                            <Badge variant="secondary" className="text-xs">{item.order_status}</Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {item.quantity}x • {formatCurrency(item.total)}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Order {item.order_number} - Cannot modify items in {item.order_status} status
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Total */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-5 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Session Total:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(sessionData.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No items in this tab</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} size="lg">
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
