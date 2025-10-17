'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import { PrintableReceipt } from '@/views/pos/PrintableReceipt';
import { Button } from '@/views/shared/ui/button';
import { Printer, X } from 'lucide-react';

/**
 * Session Receipt Page
 * Displays a printable receipt for a tab session
 * Includes all orders from the session
 * Can be accessed even after the tab is closed (for reprinting)
 */
export default function SessionReceiptPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;
  
  const [billData, setBillData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printContainerRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  /**
   * Fetch bill preview data for the session
   */
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    const fetchBillData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/order-sessions/${sessionId}/bill-preview`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bill data');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch bill data');
        }
        
        setBillData(data.data);
        console.log('✅ [SessionReceipt] Bill data loaded successfully');
      } catch (err) {
        console.error('❌ [SessionReceipt] Error fetching bill data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchBillData();
    }
  }, [sessionId]);

  /**
   * Collect active styles (<link rel="stylesheet"> and inline <style>) so the
   * print window matches the app's Tailwind/global styles.
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

  /**
   * Handle print action
   */
  const handlePrint = () => {
    const printContent = printContainerRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert('Please allow popups to print the receipt');
      return;
    }

    const activeStyles = collectActiveStyles();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Session Receipt - ${billData?.session?.session_number || ''}</title>
        ${activeStyles}
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: monospace; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
          @media print {
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 0; }
            .page-break { page-break-after: always; break-after: page; }
          }
          /* Ensure receipt content uses optimal padding similar to POS */
          .print-receipt {
            max-width: 80mm !important;
            margin: 0 auto !important;
            /* Reduce lateral padding to avoid cramping; keep bottom padding for cutter */
            padding: 6mm 6mm 14mm 6mm !important;
            font-family: monospace !important;
          }
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
      setTimeout(() => {
        printWindow.close();
      }, 100);
    }, 250);

    // Close this (opener) window shortly after triggering print to mimic quick print
    setTimeout(() => {
      try { window.close(); } catch (_) {}
    }, 800);
  };

  /**
   * Handle close action
   */
  const handleClose = () => {
    window.close();
  };

  useEffect(() => {
    if (!billData || !isMounted) return;
    const t = setTimeout(() => {
      if (printContainerRef.current) {
        handlePrint();
      }
    }, 300);
    return () => clearTimeout(t);
  }, [billData, isMounted]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !billData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Receipt</h1>
            <p className="text-gray-600 mb-6">
              {error || 'Unable to load receipt data'}
            </p>
            <Button onClick={handleClose} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Close Window
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Action Bar - Hidden when printing */}
      <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Session Receipt</h1>
              <p className="text-sm text-gray-600">{billData.session.session_number}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} variant="default">
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              <Button onClick={handleClose} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Preview (hidden when printing) */}
      <div className="print:hidden flex justify-center px-6 py-8">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-full max-w-[360px] h-[calc(100vh-180px)] overflow-y-auto">
          {billData.orders.map((order: any, idx: number) => {
            const orderData = {
              order: {
                id: order.id,
                order_number: order.order_number,
                created_at: order.created_at,
                customer: billData.session.customer
                  ? { full_name: billData.session.customer.full_name, customer_number: '' }
                  : undefined,
                cashier: undefined,
                table: billData.session.table
                  ? { table_number: billData.session.table.table_number }
                  : undefined,
                order_items: (order.items || []).map((it: any) => ({
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
                tax_amount: (billData.totals && billData.totals.tax_amount) || 0,
                total_amount: order.total_amount,
                payment_method: undefined,
                amount_tendered: undefined,
                change_amount: undefined,
              },
            } as any;

            return (
              <div key={order.id} className={idx < billData.orders.length - 1 ? 'pb-6 mb-6 border-b border-dashed border-gray-300' : ''}>
                <PrintableReceipt orderData={orderData} isPrintMode={false} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        html, body {
          height: 100%;
          overflow: hidden;
          background: #f3f4f6;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .container {
            padding: 0 !important;
            max-width: 100% !important;
          }
          
          .bg-white {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Hidden print container rendered to body; used to feed the popup */}
      {isMounted && billData && createPortal(
        <div
          ref={printContainerRef}
          style={{ position: 'fixed', left: '-9999px', top: '0', width: '80mm', visibility: 'hidden' }}
        >
          {billData.orders.map((order: any, idx: number) => {
            const orderData = {
              order: {
                id: order.id,
                order_number: order.order_number,
                created_at: order.created_at,
                customer: billData.session.customer
                  ? { full_name: billData.session.customer.full_name, customer_number: '' }
                  : undefined,
                cashier: undefined,
                table: billData.session.table
                  ? { table_number: billData.session.table.table_number }
                  : undefined,
                order_items: (order.items || []).map((it: any) => ({
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
                tax_amount: (billData.totals && billData.totals.tax_amount) || 0,
                total_amount: order.total_amount,
                payment_method: undefined,
                amount_tendered: undefined,
                change_amount: undefined,
              },
            } as any;

            return (
              <div key={order.id} className={idx < billData.orders.length - 1 ? 'page-break' : ''}>
                <PrintableReceipt orderData={orderData} isPrintMode={true} />
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
