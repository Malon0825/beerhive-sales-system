/**
 * Audit Logs Page
 * Admin-only page for viewing system audit logs
 */

import { Metadata } from 'next';
import AuditLogViewer from '@/views/audit/AuditLogViewer';

export const metadata: Metadata = {
  title: 'Audit Logs | BeerHive POS',
  description: 'System audit logs and activity tracking',
};

export default function AuditLogsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-2">
          Track and monitor all critical system activities
        </p>
      </div>
      
      <AuditLogViewer />
    </div>
  );
}
