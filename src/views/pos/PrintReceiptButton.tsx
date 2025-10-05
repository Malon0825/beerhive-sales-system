'use client';

/**
 * Print Receipt Button Component
 * Triggers browser print dialog for receipt printing
 */

import { useState } from 'react';
import { Printer, Download, FileText } from 'lucide-react';

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
  const [downloading, setDownloading] = useState(false);

  /**
   * Print receipt (HTML)
   */
  const handlePrint = async () => {
    setPrinting(true);

    try {
      // Open receipt in new window
      const printWindow = window.open(
        `/api/orders/${orderId}/receipt?format=html`,
        '_blank',
        'width=400,height=600'
      );

      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
          
          // Auto-close after print (optional)
          printWindow.addEventListener('afterprint', () => {
            printWindow.close();
          });
        });
      }
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print receipt. Please try again.');
    } finally {
      setPrinting(false);
    }
  };

  /**
   * Download PDF receipt
   */
  const handleDownloadPDF = async () => {
    setDownloading(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/receipt?format=pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${orderNumber || orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
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
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {downloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              PDF
            </>
          )}
        </button>
      </div>
    );
  }

  if (variant === 'pdf') {
    return (
      <button
        onClick={handleDownloadPDF}
        disabled={downloading}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {downloading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Download PDF
          </>
        )}
      </button>
    );
  }

  // Default: Print variant
  return (
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
