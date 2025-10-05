'use client';

import React from 'react';
import { CartProvider } from '@/lib/contexts/CartContext';
import { POSInterface } from '@/views/pos/POSInterface';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';
import { useAuth } from '@/lib/hooks/useAuth';

/**
 * POS Page
 * Point of Sale interface for cashiers, managers, and admins
 * Protected route - only accessible by authorized roles
 * 
 * Features:
 * - Syncs cart items to current_orders table for realtime monitoring
 * - Each cashier has isolated current orders
 * - Automatic database sync on every item add/update/remove
 */
function POSPage() {
  const { user } = useAuth();

  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
      <CartProvider userId={user?.id}>
        <div className="h-full">
          <POSInterface />
        </div>
      </CartProvider>
    </RouteGuard>
  );
}

export default POSPage;
