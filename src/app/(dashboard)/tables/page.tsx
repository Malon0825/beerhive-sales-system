'use client';

/**
 * Tables Management Page
 * Visual table management interface with real-time status updates
 * Protected route - accessible by managers, admins, and cashiers
 */

import TableGrid from '@/views/tables/TableGrid';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

export default function TablesPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
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
