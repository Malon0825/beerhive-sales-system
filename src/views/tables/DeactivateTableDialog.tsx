'use client';

/**
 * DeactivateTableDialog Component
 * Confirmation dialog for deactivating a table
 * Prevents deactivation if table has active orders
 */

import React, { useState } from 'react';
import { Table } from '@/models';
import { TableStatus } from '@/models/enums/TableStatus';

interface DeactivateTableDialogProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tableId: string) => Promise<void>;
}

/**
 * Dialog component for confirming table deactivation
 * Shows warnings and prevents deactivation of occupied tables
 * @param {DeactivateTableDialogProps} props - Component properties
 * @returns {JSX.Element | null} Dialog UI or null if closed
 */
export default function DeactivateTableDialog({
  table,
  isOpen,
  onClose,
  onConfirm,
}: DeactivateTableDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !table) return null;

  /**
   * Check if table can be deactivated
   * @returns {boolean} True if table can be deactivated
   */
  const canDeactivate = () => {
    return table.status !== TableStatus.OCCUPIED && !table.current_order_id;
  };

  /**
   * Handle confirmation
   */
  const handleConfirm = async () => {
    if (!canDeactivate()) {
      setError('Cannot deactivate table with active order');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(table.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Deactivate Table {table.table_number}
          </h3>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {!canDeactivate() ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-red-600 mt-0.5 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Cannot Deactivate</h4>
                  <p className="text-sm text-red-700 mt-1">
                    This table has an active order. Please complete or release the table first.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-yellow-600 mt-0.5 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Deactivating this table will hide it from the POS system and prevent new orders from being placed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Table Number:</strong> {table.table_number}</p>
                {table.area && (
                  <p><strong>Area:</strong> {table.area.replace('_', ' ').toUpperCase()}</p>
                )}
                <p><strong>Capacity:</strong> {table.capacity} seats</p>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> You can reactivate this table anytime from the inactive tables list.
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !canDeactivate()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deactivating...' : 'Deactivate Table'}
          </button>
        </div>
      </div>
    </div>
  );
}
