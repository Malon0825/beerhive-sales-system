'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, User, MapPin, FileText, Printer } from 'lucide-react';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

/**
 * BillPreviewModal Component
 * Displays a preview of the customer's bill without finalizing payment
 * 
 * Features:
 * - Shows all orders in the session
 * - Displays running total
 * - Allows printing bill preview
 * - Option to proceed to payment
 */
interface BillPreviewModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onProceedToPayment?: () => void;
}

interface BillData {
  session: {
    id: string;
    session_number: string;
    opened_at: string;
    duration_minutes: number;
    table?: {
      table_number: string;
      area?: string;
    };
    customer?: {
      full_name: string;
      tier?: string;
    };
  };
  orders: Array<{
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    items: Array<{
      item_name: string;
      quantity: number;
      unit_price: number;
      total: number;
      is_complimentary: boolean;
      is_vip_price: boolean;
    }>;
    subtotal: number;
    discount_amount: number;
    total_amount: number;
  }>;
  totals: {
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
  };
}

export default function BillPreviewModal({ 
  sessionId, 
  isOpen, 
  onClose,
  onProceedToPayment 
}: BillPreviewModalProps) {
  const [billData, setBillData] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch bill preview data from API
   */
  const fetchBillPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/order-sessions/${sessionId}/bill-preview`);
      const data = await response.json();

      if (data.success) {
        setBillData(data.data);
      } else {
        setError(data.error || 'Failed to load bill preview');
      }
    } catch (err) {
      console.error('Failed to fetch bill preview:', err);
      setError('Failed to load bill preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchBillPreview();
    }
  }, [isOpen, sessionId]);

  /**
   * Print bill preview
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * Format duration
   */
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} min`;
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500';
      case 'confirmed':
        return 'bg-blue-500';
      case 'preparing':
        return 'bg-yellow-500';
      case 'ready':
        return 'bg-green-500';
      case 'served':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Bill Preview</h2>
            <p className="text-blue-100 text-sm mt-1">NOT AN OFFICIAL RECEIPT</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading bill...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <div className="text-red-500 mb-4">⚠️</div>
              <p className="text-red-600 font-semibold">{error}</p>
              <Button onClick={fetchBillPreview} className="mt-4">
                Retry
              </Button>
            </div>
          ) : billData ? (
            <div className="p-6 space-y-6">
              {/* Session Info */}
              <div className="border-b pb-4 space-y-2">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <FileText className="w-5 h-5" />
                  {billData.session.session_number}
                </div>
                
                {billData.session.table && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {billData.session.table.table_number}
                      {billData.session.table.area && ` - ${billData.session.table.area}`}
                    </span>
                  </div>
                )}

                {billData.session.customer && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{billData.session.customer.full_name}</span>
                    {billData.session.customer.tier && (
                      <Badge variant="outline" className="text-xs">
                        {billData.session.customer.tier}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {formatDuration(billData.session.duration_minutes)}</span>
                </div>
              </div>

              {/* Orders */}
              <div className="space-y-6">
                {billData.orders.map((order, orderIndex) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{order.order_number}</span>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </span>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2">
                      {order.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex-1">
                            <span className="font-medium">{item.quantity}x</span>{' '}
                            <span>{item.item_name}</span>
                            {item.is_vip_price && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                VIP
                              </Badge>
                            )}
                            {item.is_complimentary && (
                              <Badge variant="outline" className="ml-2 text-xs bg-green-50">
                                FREE
                              </Badge>
                            )}
                          </div>
                          <span className="font-medium">
                            {item.is_complimentary ? 'FREE' : formatCurrency(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Order Total */}
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-gray-600 mt-2 pt-2 border-t">
                        <span>Discount:</span>
                        <span>-{formatCurrency(order.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                      <span>Order Total:</span>
                      <span>{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand Total */}
              <div className="border-t-2 border-gray-300 pt-4 space-y-2">
                <div className="flex justify-between text-lg">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(billData.totals.subtotal)}</span>
                </div>
                
                {billData.totals.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(billData.totals.discount_amount)}</span>
                  </div>
                )}

                {billData.totals.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(billData.totals.tax_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-2xl font-bold text-green-600 pt-2 border-t">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(billData.totals.total_amount)}</span>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-sm font-semibold text-yellow-800">
                  THIS IS NOT AN OFFICIAL RECEIPT
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Please proceed to payment counter to settle your bill
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {!loading && !error && billData && (
          <div className="border-t bg-gray-50 p-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Bill
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {onProceedToPayment && (
                <Button
                  onClick={onProceedToPayment}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Proceed to Payment
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
