'use client';

import React from 'react';
import { CartProvider } from '@/lib/contexts/CartContext';
import { StockTrackerProvider } from '@/lib/contexts/StockTrackerContext';
import { POSInterface } from '@/views/pos/POSInterface';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { BrowserCompatibilityCheck } from '@/components/shared/BrowserCompatibilityCheck';
import { UserRole } from '@/models/enums/UserRole';
import { useAuth } from '@/lib/hooks/useAuth';

/**
 * POS Page - Point of Sale Interface
 * 
 * Protected route - only accessible by authorized roles (Cashier, Manager, Admin)
 * 
 * Features:
 * - Local-first architecture using IndexedDB for instant cart operations
 * - Real-time sync to customer displays via BroadcastChannel (<10ms latency)
 * - Cart items stored locally until order is finalized/paid
 * - Automatic stock tracking in memory (synced to DB after payment)
 * - Works offline - no network dependency for cart operations
 * 
 * Integration:
 * - CartContext manages cart state with IndexedDB persistence
 * - BroadcastChannel syncs updates to customer-facing displays
 * - Database sync happens ONLY when order is finalized
 * 
 * Browser Requirements:
 * - IndexedDB support (for local cart storage)
 * - BroadcastChannel support (for real-time customer display updates)
 */
function POSPage() {
  const { user } = useAuth();

  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
      <BrowserCompatibilityCheck requireIndexedDB={true} requireBroadcastChannel={true}>
        <StockTrackerProvider>
          <CartProvider userId={user?.id}>
            <div className="h-full">
              <POSInterface />
            </div>
          </CartProvider>
        </StockTrackerProvider>
      </BrowserCompatibilityCheck>
    </RouteGuard>
  );
}

export default POSPage;
