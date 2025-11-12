'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import { PrintableReceipt } from '@/views/pos/PrintableReceipt';
import { Button } from '@/views/shared/ui/button';
import { Printer, X } from 'lucide-react';
import { createSessionReceiptOrderData } from '@/views/orders/sessionReceiptMapper';

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
    if (!printContent) {
      console.error('❌ Print content not found');
      return;
    }

    console.log('✅ Print content HTML length:', printContent.innerHTML.length);

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert('Please allow popups to print the receipt');
      return;
    }

    const activeStyles = collectActiveStyles();
    console.log('✅ Active styles collected:', activeStyles.length, 'characters');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt</title>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
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
          @media print {
            @page { 
              size: 80mm auto; 
              margin: 0; 
            }
            body {
              display: block;
            }
            .print-receipt {
              margin: 0 auto !important;
            }
          }
          /* Essential utility classes */
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

  // Transform billData into receipt format
  const receiptData = useMemo(() => {
    if (!billData) return null;
    return createSessionReceiptOrderData(billData);
  }, [billData]);

  useEffect(() => {
    if (!receiptData || !isMounted) return;
    const t = setTimeout(() => {
      if (printContainerRef.current) {
        handlePrint();
      }
    }, 300);
    return () => clearTimeout(t);
  }, [receiptData, isMounted]);

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
  if (error || !billData || !receiptData) {
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
          <PrintableReceipt 
            orderData={receiptData} 
            isPrintMode={false} 
          />
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
      {isMounted && receiptData && createPortal(
        <div
          ref={printContainerRef}
          style={{ position: 'fixed', left: '-9999px', top: '0', width: '80mm', visibility: 'hidden' }}
        >
          <PrintableReceipt 
            orderData={receiptData} 
            isPrintMode={true} 
          />
        </div>,
        document.body
      )}
    </div>
  );
}
