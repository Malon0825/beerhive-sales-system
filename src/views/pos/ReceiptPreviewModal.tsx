'use client';

/**
 * Receipt Preview Modal Component
 * Preview receipt before printing with print and download options
 */

import { useState, useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { ReceiptData, ReceiptGenerator } from '@/core/utils/generators/receiptGenerator';

interface ReceiptPreviewModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptPreviewModal({
  orderId,
  isOpen,
  onClose,
}: ReceiptPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchReceiptData();
    }
  }, [isOpen, orderId]);

  const fetchReceiptData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await ReceiptGenerator.generateReceipt(orderId);
      setReceiptData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open(
      `/api/orders/${orderId}/receipt?format=html`,
      '_blank',
      'width=400,height=600'
    );

    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handlePrintToPDF = () => {
    // Open receipt in new window for browser's print-to-PDF functionality
    const printWindow = window.open(
      `/api/orders/${orderId}/receipt?format=html`,
      '_blank',
      'width=400,height=600'
    );

    if (printWindow) {
      printWindow.addEventListener('load', () => {
        // Auto-trigger print dialog (users can save as PDF from here)
        printWindow.print();
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Receipt Preview</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 p-8">
              <p>{error}</p>
              <button
                onClick={fetchReceiptData}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : receiptData ? (
            <div className="font-mono text-sm space-y-2">
              {/* Receipt Content */}
              <div className="text-center font-bold text-base mb-4">
                {receiptData.businessName}
              </div>
              
              {receiptData.businessAddress && (
                <div className="text-center text-xs">{receiptData.businessAddress}</div>
              )}
              {receiptData.businessPhone && (
                <div className="text-center text-xs">{receiptData.businessPhone}</div>
              )}

              <div className="border-t-2 border-black my-3"></div>

              <div className="space-y-1">
                <div>Order #: {receiptData.orderNumber}</div>
                <div>Date: {new Date(receiptData.orderDate).toLocaleString()}</div>
                {receiptData.tableNumber && <div>Table: {receiptData.tableNumber}</div>}
                {receiptData.customerName && (
                  <div>Customer: {receiptData.customerName}
                    {receiptData.customerTier && receiptData.customerTier !== 'regular' 
                      ? ` (${receiptData.customerTier.toUpperCase()})` 
                      : ''}
                  </div>
                )}
                <div>Cashier: {receiptData.cashierName}</div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-3"></div>

              {/* Items */}
              <div className="space-y-2">
                {receiptData.items.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between">
                      <div>{item.quantity}x {item.name}</div>
                      <div>{ReceiptGenerator.formatCurrency(item.total)}</div>
                    </div>
                    {item.notes && (
                      <div className="text-xs pl-4 italic">Note: {item.notes}</div>
                    )}
                    {item.isComplimentary && (
                      <div className="text-xs pl-4 font-bold">** COMPLIMENTARY **</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-400 my-3"></div>

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <div>Subtotal:</div>
                  <div>{ReceiptGenerator.formatCurrency(receiptData.subtotal)}</div>
                </div>
                {receiptData.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <div>Discount:</div>
                    <div>-{ReceiptGenerator.formatCurrency(receiptData.discountAmount)}</div>
                  </div>
                )}
                {receiptData.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <div>Tax:</div>
                    <div>{ReceiptGenerator.formatCurrency(receiptData.taxAmount)}</div>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-black my-3"></div>

              <div className="flex justify-between font-bold text-base">
                <div>TOTAL:</div>
                <div>{ReceiptGenerator.formatCurrency(receiptData.totalAmount)}</div>
              </div>

              <div className="border-t-2 border-black my-3"></div>

              {/* Payment */}
              <div className="space-y-1">
                <div>Payment: {receiptData.paymentMethod.toUpperCase()}</div>
                {receiptData.amountTendered && (
                  <div>Tendered: {ReceiptGenerator.formatCurrency(receiptData.amountTendered)}</div>
                )}
                {receiptData.changeAmount && (
                  <div>Change: {ReceiptGenerator.formatCurrency(receiptData.changeAmount)}</div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 my-3"></div>

              {/* Footer */}
              <div className="text-center text-xs space-y-1">
                {receiptData.footerMessage && (
                  <div>{receiptData.footerMessage}</div>
                )}
                <div className="text-gray-500">Powered by BeerHive POS</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {!loading && !error && receiptData && (
          <div className="flex gap-3 p-4 border-t">
            <button
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handlePrintToPDF}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              title="Open print dialog - save as PDF from browser"
            >
              <Download className="w-4 h-4" />
              Save as PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
