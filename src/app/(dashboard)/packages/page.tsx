'use client';

import PackageManager from '@/views/packages/PackageManager';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Packages Page
 * Main page for package management
 * Protected route - only accessible by managers and admins
 */
export default function PackagesPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <PackageManager />
    </RouteGuard>
  );
}
