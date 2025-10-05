'use client';

import SettingsDashboard from '@/views/settings/SettingsDashboard';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Settings Page
 * Main settings page with navigation to different settings sections
 * Protected route - only accessible by managers and admins
 */
export default function SettingsPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <SettingsDashboard />
    </RouteGuard>
  );
}
