'use client';

/**
 * Print Receipt Button Component
 * Triggers browser print dialog for receipt printing
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, FileText } from 'lucide-react';
import { PrintableReceipt } from './PrintableReceipt';
import { fetchOrderForReceipt } from '@/lib/utils/receiptPrinter';

interface PrintReceiptButtonProps {
  orderId: string;
  orderNumber?: string;
  variant?: 'print' | 'pdf' | 'both';
  className?: string;
  autoPrint?: boolean;
}

export function PrintReceiptButton({
  orderId,
  orderNumber,
  variant = 'print',
  className = '',
  autoPrint = false,
}: PrintReceiptButtonProps) {
  const [printing, setPrinting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [printOrderData, setPrintOrderData] = useState<any | null>(null);
  const printContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  /**
   * Print receipt (HTML)
   */
  const collectActiveStyles = () => {
    const parts: string[] = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = (link as HTMLLinkElement).href;
      if (href) parts.push(`<link rel="stylesheet" href="${href}" />`);
    });
    document.querySelectorAll('style').forEach((styleEl) => {
      parts.push(`<style>${(styleEl as HTMLStyleElement).innerHTML}</style>`);
    });
    return parts.join('\n');
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const data = await fetchOrderForReceipt(orderId);
      const order = data;
      const orderData = {
        order: {
          id: order.id,
          order_number: order.order_number,
          created_at: order.created_at,
          customer: order.customer ? { full_name: order.customer.full_name, customer_number: order.customer.customer_number || '' } : undefined,
          cashier: order.cashier ? { full_name: order.cashier.full_name } : undefined,
          table: order.table ? { table_number: order.table.table_number } : undefined,
          order_items: (order.order_items || []).map((it: any) => ({
            id: it.id || undefined,
            item_name: it.item_name,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total: it.total,
            notes: it.notes,
            is_vip_price: it.is_vip_price,
            is_complimentary: it.is_complimentary,
          })),
          subtotal: order.subtotal,
          discount_amount: order.discount_amount || 0,
          tax_amount: order.tax_amount || 0,
          total_amount: order.total_amount,
          payment_method: order.payment_method || undefined,
          amount_tendered: order.amount_tendered || undefined,
          change_amount: order.change_amount || undefined,
        },
      } as any;
      setPrintOrderData(orderData);

      await new Promise((r) => setTimeout(r, 100));
      const printContent = printContainerRef.current;
      if (!printContent) throw new Error('Print content not ready');

      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) throw new Error('Failed to open print window');

      const activeStyles = collectActiveStyles();

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sales Receipt - ${orderNumber || order.order_number}</title>
          ${activeStyles}
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: monospace; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
            @media print { @page { size: 80mm auto; margin: 5mm; } body { margin: 0; padding: 0; } }
            img { max-width: 100%; height: auto; display: block; }
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
        setTimeout(() => printWindow.close(), 100);
      }, 250);
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print receipt. Please try again.');
    } finally {
      setPrinting(false);
    }
  };

  /**
   * Print to PDF using browser's print dialog
   */
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

  /**
   * Auto-print on mount if enabled
   */
  useState(() => {
    if (autoPrint) {
      setTimeout(handlePrint, 500);
    }
  });

  if (variant === 'both') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <button
          onClick={handlePrint}
          disabled={printing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {printing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Printing...
            </>
          ) : (
            <>
              <Printer className="w-4 h-4" />
              Print
            </>
          )}
        </button>

        <button
          onClick={handlePrintToPDF}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          title="Save as PDF from browser"
        >
          <Download className="w-4 h-4" />
          Save PDF
        </button>
      </div>
    );
  }

  if (variant === 'pdf') {
    return (
      <button
        onClick={handlePrintToPDF}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors ${className}`}
        title="Save as PDF from browser"
      >
        <Download className="w-4 h-4" />
        Save as PDF
      </button>
    );
  }

  // Default: Print variant
  return (
    <>
      <button
        onClick={handlePrint}
        disabled={printing}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {printing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Printing...
          </>
        ) : (
          <>
            <Printer className="w-4 h-4" />
            Print Receipt
          </>
        )}
      </button>

      {isMounted && printOrderData && createPortal(
        <div
          ref={printContainerRef}
          style={{ position: 'fixed', left: '-9999px', top: '0', width: '80mm', visibility: 'hidden' }}
        >
          <PrintableReceipt orderData={printOrderData} isPrintMode={true} />
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * Quick Print Button (Icon Only)
 */
export function QuickPrintButton({
  orderId,
  className = '',
}: {
  orderId: string;
  className?: string;
}) {
  const handleQuickPrint = () => {
    window.open(
      `/api/orders/${orderId}/receipt?format=html`,
      '_blank',
      'width=400,height=600'
    );
  };

  return (
    <button
      onClick={handleQuickPrint}
      className={`p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${className}`}
      title="Print Receipt"
    >
      <Printer className="w-5 h-5" />
    </button>
  );
}
