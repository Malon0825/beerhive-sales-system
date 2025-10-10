'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Edit2, AlertTriangle, Package, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/views/shared/ui/button';
import { Input } from '@/views/shared/ui/input';
import { Badge } from '@/views/shared/ui/badge';
import { formatCurrency } from '@/lib/utils/formatters';
import { apiDelete, apiPatch } from '@/lib/utils/apiClient';

/**
 * ManageOrderItemsModal Component
 * Professional UI for editing/removing order items from confirmed orders
 * 
 * Features:
 * - View all items in order
 * - Remove individual items (with stock return)
 * - Edit item quantities (with stock adjustment)
 * - Real-time validation
 * - Professional confirmation dialogs
 * - Status-based permissions (only CONFIRMED items)
 * 
 * Business Rules:
 * - Only CONFIRMED items can be edited/removed
 * - Items already PREPARING cannot be modified
 * - Stock is automatically adjusted
 * - Order totals recalculated
 * - Kitchen orders removed automatically
 * 
 * @component
 */
interface ManageOrderItemsModalProps {
  orderId: string;
  orderNumber: string;
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onItemsChanged?: () => void; // Callback to refresh parent data
}

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  product_id: string | null;
  package_id: string | null;
  is_complimentary: boolean;
  is_vip_price: boolean;
  notes: string | null;
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  order_items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  total_amount: number;
}

export default function ManageOrderItemsModal({
  orderId,
  orderNumber,
  sessionId,
  isOpen,
  onClose,
  onItemsChanged,
}: ManageOrderItemsModalProps) {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  /**
   * Fetch order data with items
   */
  const fetchOrderData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();

      if (data.success) {
        setOrderData(data.data);
      } else {
        setError(data.error || 'Failed to load order data');
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setError('Failed to load order data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderData();
    }
  }, [isOpen, orderId]);

  /**
   * Handle item removal
   */
  const handleRemoveItem = async (itemId: string) => {
    try {
      setProcessingItemId(itemId);
      setError(null);

      const response = await apiDelete(`/api/orders/${orderId}/items/${itemId}`);

      if (response.success) {
        // Refresh order data
        await fetchOrderData();
        
        // Notify parent to refresh
        onItemsChanged?.();
        
        setConfirmDelete(null);
      } else {
        setError(response.error || 'Failed to remove item');
      }
    } catch (err: any) {
      console.error('Failed to remove item:', err);
      setError(err.message || 'Failed to remove item');
    } finally {
      setProcessingItemId(null);
    }
  };

  /**
   * Handle quantity update
   */
  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      setProcessingItemId(itemId);
      setError(null);

      const response = await apiPatch(`/api/orders/${orderId}/items/${itemId}`, {
        quantity: newQuantity,
      });

      if (response.success) {
        // Refresh order data
        await fetchOrderData();
        
        // Notify parent to refresh
        onItemsChanged?.();
        
        setEditingItemId(null);
      } else {
        setError(response.error || 'Failed to update quantity');
      }
    } catch (err: any) {
      console.error('Failed to update quantity:', err);
      setError(err.message || 'Failed to update quantity');
    } finally {
      setProcessingItemId(null);
    }
  };

  /**
   * Start editing item quantity
   */
  const startEditingQuantity = (item: OrderItem) => {
    setEditingItemId(item.id);
    setEditQuantity(item.quantity);
    setError(null);
  };

  /**
   * Cancel editing
   */
  const cancelEditing = () => {
    setEditingItemId(null);
    setEditQuantity(1);
    setError(null);
  };

  /**
   * Check if order can be edited
   */
  const canEditOrder = () => {
    if (!orderData) return false;
    return orderData.status === 'confirmed';
  };

  if (!isOpen || !isMounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Order Items</h2>
            <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
              <span>Order #{orderNumber}</span>
              <Badge variant={canEditOrder() ? 'default' : 'secondary'}>
                {orderData?.status || 'Loading...'}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : !canEditOrder() ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Cannot Edit Order</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Only CONFIRMED orders can be edited. This order is currently in{' '}
                    <span className="font-semibold">{orderData?.status?.toUpperCase()}</span> status.
                  </p>
                  <p className="text-xs text-amber-600 mt-2">
                    Once items are being prepared in the kitchen/bar, they cannot be removed or edited.
                  </p>
                </div>
              </div>
            </div>
          ) : orderData?.order_items && orderData.order_items.length > 0 ? (
            <div className="space-y-3">
              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Edit Mode Active</p>
                    <p className="text-sm text-blue-700 mt-1">
                      You can remove items or change quantities. Stock will be automatically adjusted and
                      kitchen/bar will be notified of changes.
                    </p>
                  </div>
                </div>
              </div>

              {orderData.order_items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.package_id ? (
                          <Package className="w-4 h-4 text-purple-600" />
                        ) : (
                          <div className="w-4 h-4 rounded bg-gray-300" />
                        )}
                        <h4 className="font-semibold text-gray-900">{item.item_name}</h4>
                        {item.is_complimentary && (
                          <Badge variant="secondary" className="text-xs">Complimentary</Badge>
                        )}
                        {item.is_vip_price && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                            VIP Price
                          </Badge>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-1 italic">Note: {item.notes}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2">
                        {editingItemId === item.id ? (
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Quantity:</label>
                            <Input
                              type="number"
                              min="1"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                              className="w-20"
                              disabled={processingItemId === item.id}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.id, editQuantity)}
                              disabled={processingItemId === item.id || editQuantity === item.quantity}
                            >
                              {processingItemId === item.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              disabled={processingItemId === item.id}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm text-gray-600">
                              Qty: <span className="font-semibold text-gray-900">{item.quantity}</span>
                            </span>
                            <span className="text-sm text-gray-600">×</span>
                            <span className="text-sm text-gray-600">
                              {formatCurrency(item.unit_price)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(item.total)}
                        </div>
                        {item.discount_amount > 0 && (
                          <div className="text-xs text-gray-500">
                            Discount: -{formatCurrency(item.discount_amount)}
                          </div>
                        )}
                      </div>

                      {editingItemId !== item.id && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditingQuantity(item)}
                            disabled={processingItemId !== null}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDelete(item.id)}
                            disabled={processingItemId !== null}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Confirm Delete Dialog */}
                  {confirmDelete === item.id && (
                    <div className="mt-3 pt-3 border-t border-gray-300 bg-red-50 -m-4 p-4 rounded-b-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-900">
                            Remove this item?
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDelete(null)}
                            disabled={processingItemId === item.id}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={processingItemId === item.id}
                          >
                            {processingItemId === item.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                                Removing...
                              </>
                            ) : (
                              'Remove'
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-red-700 mt-2">
                        Stock will be returned to inventory and kitchen/bar will be notified.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No items in this order</p>
            </div>
          )}

          {/* Order Totals */}
          {orderData && orderData.order_items && orderData.order_items.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(orderData.subtotal)}
                  </span>
                </div>
                {orderData.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(orderData.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">
                    {formatCurrency(orderData.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
