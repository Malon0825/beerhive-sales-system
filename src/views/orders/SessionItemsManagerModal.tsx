'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit, AlertCircle, Package, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { formatCurrency } from '@/lib/utils/formatters';
import ManageOrderItemsModal from './ManageOrderItemsModal';

/**
 * SessionItemsManagerModal Component
 * Entry point for managing items across all orders in a session (tab)
 * 
 * Features:
 * - Lists all orders in the session
 * - Shows order status and items
 * - Opens ManageOrderItemsModal for each order
 * - Only allows editing CONFIRMED orders
 * - Real-time updates via callbacks
 * 
 * @component
 */
interface SessionItemsManagerModalProps {
  sessionId: string;
  sessionNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onItemsChanged?: () => void;
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    product_id: string | null;
    package_id: string | null;
  }>;
}

interface SessionData {
  session: {
    id: string;
    session_number: string;
    total_amount: number;
  };
  orders: OrderData[];
  totals: {
    subtotal: number;
    discount_amount: number;
    total_amount: number;
  };
}

export default function SessionItemsManagerModal({
  sessionId,
  sessionNumber,
  isOpen,
  onClose,
  onItemsChanged,
}: SessionItemsManagerModalProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [managingOrderId, setManagingOrderId] = useState<string | null>(null);
  const [managingOrderNumber, setManagingOrderNumber] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  /**
   * Fetch session data with all orders
   */
  const fetchSessionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/order-sessions/${sessionId}/bill-preview`);
      const data = await response.json();

      if (data.success) {
        setSessionData(data.data);
      } else {
        setError(data.error || 'Failed to load session data');
      }
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchSessionData();
    }
  }, [isOpen, sessionId]);

  /**
   * Handle manage items click for an order
   */
  const handleManageOrder = (order: OrderData) => {
    setManagingOrderId(order.id);
    setManagingOrderNumber(order.order_number);
  };

  /**
   * Handle items changed
   */
  const handleItemsChanged = async () => {
    // Refresh session data
    await fetchSessionData();
    
    // Notify parent
    onItemsChanged?.();
  };

  /**
   * Check if order can be edited
   */
  const canEditOrder = (status: string) => {
    return status === 'confirmed';
  };

  /**
   * Get status badge
   */
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-500', text: 'text-white', label: 'Draft' },
      confirmed: { bg: 'bg-blue-600', text: 'text-white', label: 'Confirmed' },
      preparing: { bg: 'bg-orange-500', text: 'text-white', label: 'Preparing' },
      ready: { bg: 'bg-green-500', text: 'text-white', label: 'Ready' },
      served: { bg: 'bg-purple-500', text: 'text-white', label: 'Served' },
      completed: { bg: 'bg-green-700', text: 'text-white', label: 'Completed' },
      voided: { bg: 'bg-red-500', text: 'text-white', label: 'Voided' },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-500', text: 'text-white', label: status };
    
    return (
      <Badge className={`${config.bg} ${config.text}`}>
        {config.label}
      </Badge>
    );
  };

  if (!isOpen || !isMounted) return null;

  const modalContent = (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Tab Items</h2>
              <p className="text-sm text-gray-600 mt-1">
                Session: {sessionNumber}
              </p>
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
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            ) : sessionData?.orders && sessionData.orders.length > 0 ? (
              <div className="space-y-4">
                {/* Info Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Edit Confirmed Orders</p>
                      <p className="text-sm text-blue-700 mt-1">
                        You can edit or remove items from <strong>CONFIRMED</strong> orders only.
                        Once items are being prepared, they cannot be modified.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Orders List */}
                {sessionData.orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {order.order_number}
                          </h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </div>
                        <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="space-y-2 mb-3">
                      {order.items?.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {item.package_id ? (
                              <Package className="w-3 h-3 text-purple-600" />
                            ) : (
                              <ShoppingBag className="w-3 h-3 text-gray-400" />
                            )}
                            <span className="text-gray-700">
                              {item.quantity}x {item.item_name}
                            </span>
                          </div>
                          <span className="text-gray-600">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                      {order.items && order.items.length > 3 && (
                        <p className="text-xs text-gray-500 ml-5">
                          +{order.items.length - 3} more items
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    {canEditOrder(order.status) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => handleManageOrder(order)}
                      >
                        <Edit className="w-3 h-3 mr-2" />
                        Manage Items
                      </Button>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">
                          Cannot edit - Order is {order.status.toUpperCase()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Session Totals */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Session Totals</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(sessionData.totals.subtotal)}
                      </span>
                    </div>
                    {sessionData.totals.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(sessionData.totals.discount_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">
                        {formatCurrency(sessionData.totals.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No orders in this session</p>
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

      {/* Manage Order Items Modal */}
      {managingOrderId && (
        <ManageOrderItemsModal
          orderId={managingOrderId}
          orderNumber={managingOrderNumber}
          sessionId={sessionId}
          isOpen={!!managingOrderId}
          onClose={() => {
            setManagingOrderId(null);
            setManagingOrderNumber('');
          }}
          onItemsChanged={handleItemsChanged}
        />
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
