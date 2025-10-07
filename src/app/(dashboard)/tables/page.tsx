'use client';

/**
 * Tables Management Page
 * Visual table management interface with real-time status updates
 * Protected route - accessible by admins, managers, cashiers, and waiters
 * Note: Waiters can occupy/release tables and mark them as cleaned. Reservations,
 *       deactivation/reactivation, and creating tables remain manager/admin only.
 */

import TableGrid from '@/views/tables/TableGrid';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

export default function TablesPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER]}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Table Management</h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage table status in real-time
          </p>
        </div>
        
        <TableGrid />
      </div>
    </RouteGuard>
  );
}
