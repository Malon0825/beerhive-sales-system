'use client';

import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Order, OrderItem } from '@/models/entities/Order';
import { format } from 'date-fns';
import { PrintableReceipt } from './PrintableReceipt';

/**
 * Order data structure with full details for receipt
 */
interface ReceiptOrderData {
  order: Order & {
    customer?: {
      full_name: string;
      customer_number: string;
    };
    cashier?: {
      full_name: string;
    };
    table?: {
      table_number: string;
    };
    order_items?: OrderItem[];
  };
}

interface SalesReceiptProps {
  orderData: ReceiptOrderData;
  onClose?: () => void;
  /**
   * If true, the printed receipt will include active Tailwind/global styles
   * so that the print preview matches the on-screen dialog. Leave false to
   * use the legacy minimalist print layout.
   */
  matchDialogStyles?: boolean;
}

/**
 * SalesReceipt Component
 * Displays a printable sales receipt/invoice with BeerHive branding
 * Features:
 * - BeerHive logo integration
 * - Complete order details (items, quantities, prices)
 * - Customer and table information
 * - Payment details
 * - Print-optimized styling
 */
export function SalesReceipt({ orderData, onClose, matchDialogStyles = true }: SalesReceiptProps) {
  const { order } = orderData;

  /**
   * Format date and time for display
   */
  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return dateString;
    }
  };

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const printContainerRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  /**
   * Collect style tags and stylesheets from the current document to inject
   * into the print window. This preserves Tailwind and global styles so the
   * printed receipt matches the on-screen preview exactly.
   *
   * NOTE: We only copy <link rel="stylesheet"> and <style> tags to avoid
   * executing any scripts in the print window.
   */
  const collectActiveStyles = () => {
    const parts: string[] = [];
    // Copy linked stylesheets (e.g., Next.js compiled CSS, Tailwind)
    document
      .querySelectorAll('link[rel="stylesheet"]')
      .forEach((link) => {
        const href = (link as HTMLLinkElement).href;
        if (href) {
          parts.push(`<link rel="stylesheet" href="${href}" />`);
        }
      });

    // Copy any inline <style> blocks (e.g., dev mode injected styles)
    document.querySelectorAll('style').forEach((styleEl) => {
      parts.push(`<style>${(styleEl as HTMLStyleElement).innerHTML}</style>`);
    });

    return parts.join('\n');
  };

  /**
   * Trigger browser print dialog using a separate print window.
   *
   * Design parity fix: inject Tailwind/global styles from the current
   * document into the print window so the printed layout is identical
   * to the dialog preview.
   */
  const handlePrint = () => {
    // Get the receipt content
    const printContent = printContainerRef.current;
    if (!printContent) {
      console.error('Print content not found');
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      console.error('Failed to open print window. Please allow popups.');
      alert('Please allow popups to print receipts');
      return;
    }

    // Don't use external styles for thermal printing - use minimal inline CSS only
    const activeStyles = '';

    // Write the receipt content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${order.order_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: monospace; 
            font-size: 11px; 
            color: #000; 
            background: #fff; 
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          .print-receipt { 
            width: 80mm !important; 
            max-width: 80mm !important; 
            text-align: left; 
            box-sizing: border-box;
            margin: 0 auto;
          }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .items-center { align-items: center; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .uppercase { text-transform: uppercase; }
          .italic { font-style: italic; }
          .w-full { width: 100%; }
          .inline-block { display: inline-block; }
          .border-black { border-color: #000; }
          .border-gray-200 { border-color: #e5e7eb; }
          .border-gray-300 { border-color: #d1d5db; }
          .border-gray-400 { border-color: #9ca3af; }
          .border-t { border-top-width: 1px; border-top-style: solid; }
          .border-t-2 { border-top-width: 2px; border-top-style: solid; }
          .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
          .border-l-4 { border-left-width: 4px; border-left-style: solid; }
          .border-dashed { border-style: dashed; }
          .border-double { border-style: double; }
          .border { border-width: 1px; border-style: solid; }
          .bg-white { background-color: #fff; }
          .text-black { color: #000; }
          .text-xs { font-size: 0.75rem; }
          table { border-collapse: collapse; }
          img { 
            max-width: 100%; 
            height: auto; 
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          @media print { 
            @page { size: 80mm auto; margin: 0; } 
            body { display: block; }
            .print-receipt { margin: 0 auto !important; }
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

    // Wait for images to load before printing
    setTimeout(() => {
      printWindow.print();
      // Close the print window after printing or canceling
      setTimeout(() => {
        printWindow.close();
      }, 100);
    }, 250);
  };

  return (
    <>
      {/* Receipt Modal Container */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Screen View Header */}
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Sales Receipt</h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                type="button"
              >
                🖨️ Print Receipt
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  type="button"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          {/* Receipt Preview - Uses PrintableReceipt component */}
          <div className="overflow-y-auto">
            <PrintableReceipt orderData={orderData} isPrintMode={false} />
          </div>
        </div>
      </div>

      {/* Hidden print container - Only used when printing */}
      {isMounted && createPortal(
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
          <PrintableReceipt orderData={orderData} isPrintMode={true} />
        </div>,
        document.body
      )}
    </>
  );
}
