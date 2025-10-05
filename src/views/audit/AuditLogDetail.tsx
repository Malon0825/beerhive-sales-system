'use client';

/**
 * AuditLogDetail Component
 * Modal displaying full audit log details including old/new values diff
 */

import React from 'react';
import { AuditLogWithUser } from '@/models';

interface AuditLogDetailProps {
  log: AuditLogWithUser;
  onClose: () => void;
}

export default function AuditLogDetail({ log, onClose }: AuditLogDetailProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toUpperCase();
  };

  const renderJsonDiff = () => {
    if (!log.old_values && !log.new_values) {
      return <p className="text-gray-500">No data changes recorded</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Old Values */}
        {log.old_values && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Old Values</h4>
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <pre className="text-xs text-gray-800 overflow-auto">
                {JSON.stringify(log.old_values, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* New Values */}
        {log.new_values && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">New Values</h4>
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <pre className="text-xs text-gray-800 overflow-auto">
                {JSON.stringify(log.new_values, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0">
          <h3 className="text-lg font-semibold text-gray-900">
            Audit Log Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500">Action</dt>
                <dd className="mt-1">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {formatAction(log.action)}
                  </span>
                </dd>
              </div>
              
              <div>
                <dt className="text-xs text-gray-500">Date & Time</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(log.created_at)}</dd>
              </div>

              <div>
                <dt className="text-xs text-gray-500">User</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {log.user ? (
                    <>
                      <div className="font-medium">{log.user.full_name}</div>
                      <div className="text-gray-500">@{log.user.username} ({log.user.role})</div>
                    </>
                  ) : (
                    'System'
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-gray-500">IP Address</dt>
                <dd className="mt-1 text-sm text-gray-900">{log.ip_address || 'N/A'}</dd>
              </div>

              {log.table_name && (
                <div>
                  <dt className="text-xs text-gray-500">Table</dt>
                  <dd className="mt-1 text-sm text-gray-900">{log.table_name}</dd>
                </div>
              )}

              {log.record_id && (
                <div>
                  <dt className="text-xs text-gray-500">Record ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{log.record_id}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* User Agent */}
          {log.user_agent && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">User Agent</h4>
              <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md break-all">
                {log.user_agent}
              </p>
            </div>
          )}

          {/* Data Changes */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Data Changes</h4>
            {renderJsonDiff()}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
