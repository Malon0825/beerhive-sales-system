'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { Button } from '@/views/shared/ui/button';
import { PrintableReceipt } from '@/views/pos/PrintableReceipt';
import {
  createSessionReceiptOrderData,
  SessionBillData,
} from '@/views/orders/sessionReceiptMapper';

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

type BillData = SessionBillData;

export default function BillPreviewModal({ 
  sessionId, 
  isOpen, 
  onClose,
  onProceedToPayment 
}: BillPreviewModalProps) {
  const [billData, setBillData] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printContainerRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

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
   * Collect active styles for print window
   */
  const collectActiveStyles = () => {
    const parts: string[] = [];
    // Copy linked stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = (link as HTMLLinkElement).href;
      if (href) {
        parts.push(`<link rel="stylesheet" href="${href}" />`);
      }
    });

    // Copy inline <style> blocks
    document.querySelectorAll('style').forEach((styleEl) => {
      parts.push(`<style>${(styleEl as HTMLStyleElement).innerHTML}</style>`);
    });

    return parts.join('\n');
  };

  /**
   * Print bill preview using separate print window
   */
  const handlePrint = () => {
    const printContent = printContainerRef.current;
    if (!printContent) {
      console.error('Print content not found');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      console.error('Failed to open print window');
      alert('Please allow popups to print the bill');
      return;
    }

    const activeStyles = collectActiveStyles();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bill Preview - ${billData?.session.session_number}</title>
        ${activeStyles}
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: monospace;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            
            body {
              margin: 0;
              padding: 0;
            }
          }
          
          img {
            max-width: 100%;
            height: auto;
            display: block;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 100);
    }, 250);
  };


  const receiptData = useMemo(
    () => (billData ? createSessionReceiptOrderData(billData) : null),
    [billData]
  );

  // Don't use early return to avoid hooks violations with conditional portal
  return (
    <>
      {isOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-4 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-bold">Bill Preview</h2>
              <p className="text-amber-100 text-xs mt-1">Customer Bill</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading bill...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <div className="text-red-500 mb-4 text-4xl">⚠️</div>
                <p className="text-red-600 font-semibold">{error}</p>
                <Button onClick={fetchBillPreview} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : billData && receiptData ? (
              <div className="p-4">
                <PrintableReceipt orderData={receiptData} isPrintMode={false} />
              </div>
            ) : null}
          </div>

          {/* Footer Actions */}
          {!loading && !error && billData && (
            <div className="border-t bg-gray-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-2 sticky bottom-0">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Printer className="w-4 h-4" />
                Print Bill
              </Button>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
                  Close
                </Button>
                {onProceedToPayment && (
                  <Button
                    onClick={onProceedToPayment}
                    className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  >
                    Proceed to Payment
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Hidden print container */}
      {isOpen && isMounted && billData && receiptData && createPortal(
        <div 
          ref={printContainerRef} 
          style={{ 
            position: 'fixed',
            left: '-9999px',
            top: '0',
            width: '80mm',
            visibility: 'hidden'
          }}
        >
          <PrintableReceipt orderData={receiptData} isPrintMode={true} />
        </div>,
        document.body
      )}
    </>
  );
}
