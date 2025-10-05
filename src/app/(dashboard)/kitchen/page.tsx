'use client';

import { KitchenDisplay } from '@/views/kitchen/KitchenDisplay';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Kitchen Page
 * Route: /kitchen
 * Kitchen staff interface for managing food orders
 * Protected route - only accessible by kitchen staff, managers, and admins
 */
export default function KitchenPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.KITCHEN]}>
      <KitchenDisplay />
    </RouteGuard>
  );
}
