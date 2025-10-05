'use client';

import HappyHourManager from '@/views/happy-hours/HappyHourManager';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Happy Hours Page
 * Manage happy hour pricing and promotions
 * Protected route - only accessible by managers and admins
 */
export default function HappyHoursPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <HappyHourManager />
    </RouteGuard>
  );
}
