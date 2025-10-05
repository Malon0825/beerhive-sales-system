'use client';

/**
 * Reports Page
 * Main page for viewing business reports and analytics
 * Protected route - only accessible by managers and admins
 */

import { ReportsDashboard } from '@/views/reports/ReportsDashboard';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

export default function ReportsPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <div className="p-6">
        <ReportsDashboard />
      </div>
    </RouteGuard>
  );
}
