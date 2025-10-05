'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { StaffOrderMonitor } from '@/views/orders/StaffOrderMonitor';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import { Card } from '@/views/shared/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Current Orders Dashboard Page
 * 
 * Route: /current-orders
 * Access: Cashier, Manager, Admin only
 * 
 * This page provides a real-time dashboard for staff to monitor all current orders.
 * It displays:
 * - All pending and on-hold orders
 * - Order details (items, customer, table, cashier)
 * - Real-time updates when orders change
 * - Summary statistics (active orders count, total revenue)
 * 
 * Features:
 * - Auto-refreshes via real-time subscriptions
 * - Manual refresh button
 * - Click on order for detailed view
 * - Color-coded by status and customer tier
 */
export default function CurrentOrdersPage() {
  const { user, loading, isCashier, isManager, isAdmin } = useAuth();
  const router = useRouter();

  // Check authorization
  useEffect(() => {
    if (!loading && user) {
      const hasAccess = isCashier() || isManager() || isAdmin();
      if (!hasAccess) {
        // Redirect unauthorized users
        router.push('/');
      }
    }
  }, [user, loading, isCashier, isManager, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to access the current orders dashboard.
          </p>
        </Card>
      </div>
    );
  }

  const hasAccess = isCashier() || isManager() || isAdmin();

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md text-center">
          <div className="text-amber-500 text-5xl mb-4">⛔</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to view this page.
            <br />
            This page is accessible to Cashiers, Managers, and Admins only.
          </p>
        </Card>
      </div>
    );
  }

  return <StaffOrderMonitor />;
}
