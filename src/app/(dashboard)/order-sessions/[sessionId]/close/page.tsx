'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PaymentPanel } from '@/views/pos/PaymentPanel';
import { apiGet } from '@/lib/utils/apiClient';
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
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
  // Use ref to track receipt state synchronously for handleClose race condition
  const showReceiptRef = useRef(false);
  const [receiptData, setReceiptData] = useState<ReceiptOrderData | null>(null);
  const { dataBatching, isOnline } = useOfflineRuntime();

  /**
   * Fetch session data including orders for item count
   * If total is 0, automatically close tab without payment
   */
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Try IndexedDB first for offline support
        const cachedSession = await dataBatching.getSessionById(sessionId);

        if (cachedSession) {
          setSessionData(cachedSession);
        } else if (isOnline) {
          const data = await apiGet(`/api/order-sessions/${sessionId}`);
          if (data.success) {
            setSessionData(data.data);
          }
        }

        const session = cachedSession ?? (await (async () => {
          if (!cachedSession && isOnline) {
            const data = await apiGet(`/api/order-sessions/${sessionId}`);
            return data.success ? data.data : null;
          }
          return null;
        })());

        // Auto-close tabs with zero amount offline-first (no payment needed)
        if (session && (session.total_amount === 0 || session.total_amount === null)) {
          console.log('💰 Total is ₱0.00 - Auto-closing tab offline-first (no payment needed)...');

          try {
            const { enqueueSyncMutation, deleteOrderSession } = await import('@/lib/data-batching/offlineDb');
            const { MutationSyncService } = await import('@/lib/data-batching/MutationSyncService');
            
            // Queue close mutation
            const queueId = await enqueueSyncMutation('orderSessions.close', {
              endpoint: `/api/order-sessions/${sessionId}/close`,
              method: 'POST',
              body: {
                payment_method: 'none',
                amount_tendered: 0,
                discount_amount: 0,
              },
              session_id: sessionId,
              created_at: new Date().toISOString(),
            });
            
            console.log(`📋 Queued zero-amount tab close: #${queueId}`);
            
            // CRITICAL FIX: Delete session from IndexedDB instead of marking as closed
            // This prevents UI from showing "Occupied + No active tab" state
            await deleteOrderSession(sessionId);
            
            console.log('✅ Session removed from IndexedDB (auto-close)');
            
            // Trigger sync if online
            if (isOnline) {
              const syncService = MutationSyncService.getInstance();
              void syncService.processPendingMutations();
            }

            alert('Tab closed successfully (No payment required - ₱0.00)');
            router.push('/tabs');
          } catch (error) {
            console.error('Failed to auto-close zero-amount tab:', error);
            alert('Failed to close tab. Please try again.');
            router.push('/tabs');
          }
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchSession();
  }, [sessionId, router, dataBatching, isOnline]);

  /**
   * Handle dialog close
   * Navigates back to tabs when dialog is closed
   */
  const handleClose = (open: boolean) => {
    setIsOpen(open);
    // Check ref instead of state for immediate updates to avoid race condition
    if (!open && !showReceiptRef.current) {
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
    
    // Check if we have local order data for the receipt (Offline-First approach)
    // This works for both online and offline modes since PaymentPanel always provides a snapshot
    if (options?.localOrder) {
      console.log('📄 Showing session receipt using local data snapshot');
      setReceiptData(options.localOrder as ReceiptOrderData);
      setShowReceipt(true);
      showReceiptRef.current = true; // Update ref immediately
      return;
    }

    // Fallback for legacy behavior or missing data
    console.log('⚠️ No local receipt data found, redirecting to tabs');
    router.push('/tabs');
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    showReceiptRef.current = false;
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
