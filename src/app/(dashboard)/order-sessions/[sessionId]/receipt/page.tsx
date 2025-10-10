'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import TabBillReceipt from '@/views/orders/TabBillReceipt';
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

  /**
   * Fetch bill preview data for the session
   */
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
   * Handle print action
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * Handle close action
   */
  const handleClose = () => {
    window.close();
  };

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

      {/* Receipt Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto">
          <TabBillReceipt billData={billData} isPrintMode={false} />
        </div>
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
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
    </div>
  );
}
