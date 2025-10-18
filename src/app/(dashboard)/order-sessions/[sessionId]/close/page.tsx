'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PaymentPanel } from '@/views/pos/PaymentPanel';
import { apiGet } from '@/lib/utils/apiClient';

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
   */
  const handleClose = () => {
    setIsOpen(false);
    router.push('/tabs'); // Redirect to unified tab management
  };

  /**
   * Handle successful payment and trigger automatic receipt printing
   * @param sessionId - The ID of the closed session
   * @param options - Options containing result data
   */
  const handleSuccess = (sessionId: string, options?: { resultData?: any }) => {
    console.log('✅ Payment successful, session closed:', sessionId);
    
    // Extract result data containing orders
    const resultData = options?.resultData;
    
    if (resultData) {
      // Get the session's orders for receipt printing
      const orders = resultData.receipt?.orders || [];
      
      console.log('📄 Auto-printing receipts for', orders.length, 'orders');
      
      // Auto-print receipt for each order in the session
      // Note: In a tab/session, multiple orders might exist, we print the main consolidated receipt
      // For now, we'll print receipts for all orders in the session
      orders.forEach((order: any, index: number) => {
        // Get order ID - the order object should have an id property
        // Since we're getting order data from the closeTab service, we need to find the actual order IDs
        // The session has the order IDs in sessionData.orders array
        const sessionOrder = sessionData?.orders?.[index];
        
        if (sessionOrder?.id) {
          setTimeout(() => {
            // Auto-print mode: open and trigger print immediately
            const printWindow = window.open(
              `/api/orders/${sessionOrder.id}/receipt?format=html`,
              '_blank',
              'width=400,height=600'
            );
            
            if (printWindow) {
              printWindow.addEventListener('load', () => {
                printWindow.print();
                // Auto-close after printing
                printWindow.addEventListener('afterprint', () => {
                  try { printWindow.close(); } catch {}
                });
              });
            }
          }, index * 500); // Stagger multiple receipts by 500ms
        }
      });
    }
    
    // Redirect after a brief delay to allow print dialogs to open
    setTimeout(() => {
      router.push('/tabs');
    }, 1500);
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
    <PaymentPanel
      open={isOpen}
      onOpenChange={setIsOpen}
      onPaymentComplete={handleSuccess}
      mode="close-tab"
      sessionId={sessionId}
      sessionNumber={sessionData.session_number}
      sessionTotal={sessionData.total_amount || 0}
      sessionItemCount={itemCount}
      sessionCustomer={sessionData.customer}
      sessionTable={sessionData.table}
    />
  );
}
