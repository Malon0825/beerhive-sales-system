'use client';

import { WaiterDisplay } from '@/views/waiter/WaiterDisplay';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Waiter Page
 * Route: /waiter
 * Waiter/Server interface for delivering prepared orders to customers
 * Protected route - only accessible by waiters, managers, and admins
 */
export default function WaiterPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER]}>
      <WaiterDisplay />
    </RouteGuard>
  );
}
