'use client';

/**
 * Audit Logs Page
 * Admin-only page for viewing system audit logs
 * Protected route - only accessible by admins
 */

import AuditLogViewer from '@/views/audit/AuditLogViewer';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

export default function AuditLogsPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN]}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-2">
            Track and monitor all critical system activities
          </p>
        </div>
        
        <AuditLogViewer />
      </div>
    </RouteGuard>
  );
}
