'use client';

/**
 * Tables Management Page
 * Visual table management interface with real-time status updates
 * Protected route - accessible by admins, managers, cashiers, and waiters
 * 
 * Features:
 * - View and manage all restaurant tables
 * - Create, edit, and deactivate tables
 * - Update table status (available, occupied, reserved, cleaning)
 * - Filter tables by status and area
 * 
 * Note: 
 * - Waiters can occupy/release tables and mark them as cleaned
 * - Reservations, deactivation/reactivation, and creating/editing tables are manager/admin only
 * - Tab management is handled through the dedicated Tabs module
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
            Manage restaurant tables, update status, and configure seating arrangements
          </p>
        </div>
        
        {/* Full-width Table Grid */}
        <TableGrid />
      </div>
    </RouteGuard>
  );
}
