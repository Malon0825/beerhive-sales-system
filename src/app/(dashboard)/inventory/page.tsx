'use client';

import InventoryDashboard from '@/views/inventory/InventoryDashboard';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Inventory Page
 * Manage product inventory and stock levels
 * Protected route - only accessible by managers and admins
 */
export default function InventoryPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <InventoryDashboard />
    </RouteGuard>
  );
}
