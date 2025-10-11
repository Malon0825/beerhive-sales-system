'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CurrentOrderMonitor } from '@/views/orders/CurrentOrderMonitor';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import { useLocalOrder } from '@/lib/hooks/useLocalOrder';
import { BrowserCompatibilityCheck } from '@/components/shared/BrowserCompatibilityCheck';
import { useAuth } from '@/lib/hooks/useAuth';
import { ShoppingCart } from 'lucide-react';
import { FullscreenToggleButton } from '@/components/shared/FullscreenToggleButton';

/**
 * CurrentOrdersContent Component
 * 
 * Displays the current cashier's active order for customer viewing.
 * This component uses useSearchParams and must be wrapped in Suspense boundary.
 * 
 * Architecture (Cashier-Bounded):
 * - Each cashier/manager/admin has their OWN active order display
 * - Works for BOTH dine-in (with tables) AND takeout (no tables)
 * - Reads ONLY from IndexedDB (no network calls)
 * - Filters orders by logged-in staff member ID
 * - Listens to BroadcastChannel for instant updates
 * - Zero latency updates (<10ms vs 200-500ms with API calls)
 * - Auto-clears after payment completion
 */
export function CurrentOrdersContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const cashierId = searchParams.get('cashier') || user?.id; // Support URL override for multi-display setups
  
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeout' | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  
  // Get all active draft orders from IndexedDB (filtered by cashier)
  const { allOrders, loading } = useLocalOrder();

  /**
   * Detect active order for the current cashier from IndexedDB
   * NEW: Cashier-bounded - each staff member has their own active order
   * Works for both dine-in (with table) and takeout (without table)
   * 
   * This runs whenever allOrders changes (via BroadcastChannel updates)
   */
  useEffect(() => {
    const detectCashierOrder = () => {
      try {
        if (!cashierId) {
          console.log('[CurrentOrders] No cashier ID available');
          setIsLoadingOrder(false);
          return;
        }

        console.log('[CurrentOrders] 👤 Checking orders for cashier:', cashierId);
        
        // Filter orders for THIS cashier only
        // IMPORTANT: Exclude 'paid' orders - they should clear from display
        const activeOrders = allOrders.filter(order => 
          order.cashierId === cashierId && 
          (order.status === 'draft' || order.status === 'confirmed') // Exclude paid orders
        );
        
        // Check for paid orders (to clear display)
        const paidOrders = allOrders.filter(order =>
          order.cashierId === cashierId &&
          order.status === 'paid'
        );
        
        if (paidOrders.length > 0) {
          // Payment completed - clear display
          setTableNumber(null);
          setOrderType(null);
          console.log('[CurrentOrders] 💰 Payment completed! Clearing display...');
          return;
        }
        
        // Get the most recent active order (should only be one per cashier)
        const sortedOrders = activeOrders
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (sortedOrders.length > 0) {
          const activeOrder = sortedOrders[0];
          
          // Set table number (can be null for takeout orders)
          setTableNumber(activeOrder.tableNumber || null);
          
          // Determine order type
          if (activeOrder.tableNumber) {
            setOrderType('dine-in');
            console.log('[CurrentOrders] ✅ Found DINE-IN order for table:', activeOrder.tableNumber);
          } else {
            setOrderType('takeout');
            console.log('[CurrentOrders] ✅ Found TAKEOUT order (no table)');
          }
          
          // Warn if multiple orders for this cashier
          if (sortedOrders.length > 1) {
            console.warn('[CurrentOrders] ⚠️ WARNING: Cashier has multiple active orders!');
            console.warn('[CurrentOrders] This should not happen. Only showing most recent.');
          }
        } else {
          // No active orders for this cashier
          setTableNumber(null);
          setOrderType(null);
          console.log('[CurrentOrders] No active orders for this cashier');
        }
      } catch (error) {
        console.error('[CurrentOrders] Error detecting cashier order:', error);
        setTableNumber(null);
        setOrderType(null);
      } finally {
        setIsLoadingOrder(false);
      }
    };

    if (!loading && cashierId) {
      detectCashierOrder();
    } else if (!loading) {
      setIsLoadingOrder(false);
    }
  }, [loading, allOrders, cashierId]);

  return (
    <BrowserCompatibilityCheck requireIndexedDB={true} requireBroadcastChannel={true}>
      {/* Fullscreen Toggle Button - Always visible */}
      <FullscreenToggleButton />

      {/* Show loading state */}
      {(loading || isLoadingOrder) && (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-6 text-2xl text-white font-light">Loading order...</p>
          </div>
        </div>
      )}

      {/* Show the order if found (works for both dine-in and takeout) */}
      {!loading && !isLoadingOrder && (tableNumber || orderType === 'takeout') && (
        <CurrentOrderMonitor 
          tableNumber={tableNumber || undefined}
          cashierId={!tableNumber ? cashierId : undefined}
        />
      )}

      {/* No active order found - show waiting screen */}
      {!loading && !isLoadingOrder && !tableNumber && orderType !== 'takeout' && (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
          <div className="text-center max-w-2xl">
            <div className="mb-8">
              <ShoppingCart className="h-24 w-24 text-amber-400 mx-auto mb-6 animate-pulse" />
            </div>
            
            <h1 className="text-5xl font-bold text-white mb-6">
              Waiting for Order
            </h1>
            
            <p className="text-slate-300 text-xl mb-4">
              Customer display for: <span className="text-amber-400 font-bold">{user?.username || 'Staff'}</span>
            </p>
            
            <p className="text-slate-400 text-lg mb-2">
              Order will appear here when you start adding items in Cart
            </p>
          
            
            <div className="mt-12 inline-flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-6 py-3 rounded-full border border-emerald-500/20">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Ready to receive orders</span>
            </div>

            <div className="mt-8 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl">
              <p className="text-slate-300 text-sm">
                👤 This display shows YOUR active order only
              </p>
            </div>
          </div>
        </div>
      )}
    </BrowserCompatibilityCheck>
  );
}
