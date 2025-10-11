'use client';

import { Suspense } from 'react';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';
import { CurrentOrdersContent } from '@/components/pages/CurrentOrdersContent';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';

/**
 * Current Orders Page - Cashier-Bounded Customer Display (Authentication Required)
 * 
 * Route: /current-orders
 * Purpose: Display the current cashier's active order for customer viewing
 * 
 * NEW ARCHITECTURE (Cashier-Bounded):
 * - Each cashier/manager/admin has their OWN active order display
 * - Works for BOTH dine-in (with tables) AND takeout (no tables)
 * - Requires authentication - staff member must be logged in
 * - Customer views order on secondary display at cashier's station
 * 
 * Workflow (Universal - Dine-in & Takeout):
 * 1. Cashier/Manager/Admin logs into POS
 * 2. Creates order (with or without table assignment)
 * 3. Customer display shows THAT STAFF MEMBER'S active order
 * 4. Updates in real-time (<10ms) as items are added/removed
 * 5. Display clears automatically after payment is completed
 * 
 * Use Cases:
 * - Dine-in orders: Cashier selects table, customer sees order
 * - Takeout orders: No table needed, customer sees order at counter
 * - Multiple cashiers: Each has independent customer display
 * 
 * Architecture (Local-First):
 * - Reads ONLY from IndexedDB (no network calls)
 * - Filters orders by logged-in staff member ID
 * - Listens to BroadcastChannel for instant updates
 * - Zero latency updates (<10ms vs 200-500ms with API calls)
 * - Auto-clears after payment completion
 * 
 * Access Control:
 * - Requires authentication (RouteGuard)
 * - Allowed roles: Cashier, Manager, Admin
 * - Each staff member sees ONLY their active order
 */
export default function CurrentOrdersPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
      {/* 
        Suspense boundary for useSearchParams compliance
        Required by Next.js for static rendering compatibility
      */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="text-center">
              <LoadingSpinner />
              <p className="mt-6 text-2xl text-white font-light">Loading...</p>
            </div>
          </div>
        }
      >
        <CurrentOrdersContent />
      </Suspense>
    </RouteGuard>
  );
}
