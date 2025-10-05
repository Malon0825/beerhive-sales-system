'use client';

import { BartenderDisplay } from '@/views/bartender/BartenderDisplay';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Bartender Page
 * Route: /bartender
 * Bartender interface for managing beverage orders
 * Protected route - only accessible by bartenders, managers, and admins
 */
export default function BartenderPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.BARTENDER]}>
      <BartenderDisplay />
    </RouteGuard>
  );
}
