'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PaymentPanel } from '@/views/pos/PaymentPanel';
import { apiGet } from '@/lib/utils/apiClient';
import type {
  PaymentCompleteOptions,
  OfflineReceiptPayload,
} from '@/views/pos/PaymentPanel';
import { SalesReceipt } from '@/views/pos/SalesReceipt';
import type { ReceiptOrderData } from '@/views/pos/SalesReceipt';

/**
 * Close Tab Page
 * Route: /order-sessions/[sessionId]/close
 * 
 * Uses unified PaymentPanel component for cohesive payment experience
 * across POS and Tab Management modules
 */
export default function CloseTabPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [isOpen, setIsOpen] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptOrderData | null>(null);

  /**
   * Fetch session data including orders for item count
   * If total is 0, automatically close tab without payment
   */
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const data = await apiGet(`/api/order-sessions/${sessionId}`);
        
        if (data.success) {
          const session = data.data;
          setSessionData(session);
          
          // Auto-close tabs with zero amount
          if (session.total_amount === 0 || session.total_amount === null) {
            console.log('💰 Total is ₱0.00 - Auto-closing tab without payment...');
            
            try {
              const closeResponse = await fetch(`/api/order-sessions/${sessionId}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  payment_method: 'none',
                  amount_tendered: 0,
                  discount_amount: 0,
                }),
              });
              
              const closeData = await closeResponse.json();
              
              if (closeData.success) {
                console.log('✅ Tab closed successfully');
                // Show brief success message and redirect
                alert('Tab closed successfully (No payment required - ₱0.00)');
                router.push('/tabs');
              } else {
                throw new Error(closeData.error || 'Failed to close tab');
              }
            } catch (error) {
              console.error('Failed to auto-close zero-amount tab:', error);
              alert('Failed to close tab. Please try again.');
              router.push('/tabs');
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, router]);

  /**
   * Handle dialog close
   * Navigates back to tabs when dialog is closed
   */
  const handleClose = (open: boolean) => {
    setIsOpen(open);
    if (!open && !showReceipt) {
      router.push('/tabs'); // Redirect to unified tab management
    }
  };

  /**
   * Handle successful payment and trigger automatic receipt printing
   * @param sessionId - The ID of the closed session
   * @param options - Options containing result data
   */
  const handleSuccess = (sessionId: string, options?: PaymentCompleteOptions) => {
    console.log('✅ Payment successful, session closed:', sessionId);
    
    if (options?.isOffline) {
      const localOrder = options.localOrder as OfflineReceiptPayload | null | undefined;

      if (localOrder && 'order' in localOrder) {
        setReceiptData(localOrder);
      } else if (localOrder) {
        setReceiptData({ order: localOrder as any });
      } else {
        console.warn('⚠️ [CloseTabPage] Offline completion missing localOrder payload');
      }

      setShowReceipt(true);
      return;
    }

    // Extract result data containing orders
    const resultData = options?.resultData;
    
    if (resultData) {
      const receiptUrl = `/order-sessions/${sessionId}/receipt`;
      console.log('📄 Auto-printing consolidated session receipt:', receiptUrl);

      setTimeout(() => {
        const printWindow = window.open(receiptUrl, '_blank', 'width=420,height=680');

        if (printWindow) {
          printWindow.addEventListener('load', () => {
            try {
              printWindow.focus();
            } catch {}
          });
        }
      }, 200);

      // Redirect after a brief delay to allow print dialogs to open
      setTimeout(() => {
        router.push('/tabs');
      }, 1500);
    } else {
      router.push('/tabs');
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
    router.push('/tabs');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Session not found</p>
          <button
            onClick={() => router.push('/tabs')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Return to Tab Management
          </button>
        </div>
      </div>
    );
  }

  /**
   * Calculate total item count from all orders in session
   */
  const itemCount = sessionData.orders?.reduce((total: number, order: any) => {
    return total + (order.order_items?.length || 0);
  }, 0) || 0;

  // Don't render PaymentPanel for zero-amount tabs (auto-closing)
  if (sessionData.total_amount === 0 || sessionData.total_amount === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Closing tab...</p>
          <p className="mt-2 text-sm text-gray-500">No payment required (₱0.00)</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PaymentPanel
        open={isOpen}
        onOpenChange={handleClose}
        onPaymentComplete={handleSuccess}
        mode="close-tab"
        sessionId={sessionId}
        sessionNumber={sessionData.session_number}
        sessionTotal={sessionData.total_amount || 0}
        sessionSubtotal={sessionData.subtotal || 0}
        sessionExistingDiscount={sessionData.discount_amount || 0}
        sessionItemCount={itemCount}
        sessionCustomer={sessionData.customer}
        sessionTable={sessionData.table}
        sessionData={sessionData}
      />

      {showReceipt && receiptData && (
        <SalesReceipt
          orderData={receiptData}
          onClose={handleCloseReceipt}
        />
      )}
    </>
  );
}
