'use client';

/**
 * Settings Page
 * Main settings page with navigation to different settings sections
 * Protected route - only accessible by managers and admins
 * 
 * Performance Optimization:
 * - Uses dynamic import to lazy-load the SettingsDashboard
 * - Settings module has 3014 modules, making it one of the heaviest
 * - Dynamic loading reduces initial bundle and improves TTI
 */

import dynamic from 'next/dynamic';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';
import { DashboardSkeleton } from '@/components/loading/LoadingSkeleton';

/**
 * Dynamically import SettingsDashboard to reduce bundle size
 * Settings includes user management, system config, and other heavy components
 */
const SettingsDashboard = dynamic(
  () => import('@/views/settings/SettingsDashboard'),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false,
  }
);

export default function SettingsPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <SettingsDashboard />
    </RouteGuard>
  );
}
