'use client';

/**
 * Reports Page
 * Main page for viewing business reports and analytics
 * Protected route - only accessible by managers and admins
 * 
 * Performance Optimization:
 * - Uses dynamic import to lazy-load the heavy ReportsDashboard component
 * - This reduces the initial bundle size and improves Time to Interactive
 * - The dashboard includes chart libraries (Recharts) which add significant weight
 */

import dynamic from 'next/dynamic';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';
import { DashboardSkeleton } from '@/components/loading/LoadingSkeleton';

/**
 * Dynamically import ReportsDashboard with loading state
 * This prevents the heavy chart library from blocking the initial page load
 */
const ReportsDashboard = dynamic(
  () => import('@/views/reports/ReportsDashboard').then(mod => ({ default: mod.ReportsDashboard })),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false, // Disable SSR for charts to reduce server load
  }
);

export default function ReportsPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <div className="p-6">
        <ReportsDashboard />
      </div>
    </RouteGuard>
  );
}
