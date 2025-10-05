'use client';

/**
 * OccupyTableDialog Component
 * Modal dialog for marking a table as occupied
 */

import React, { useState } from 'react';
import { Table } from '@/models';

interface OccupyTableDialogProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tableId: string) => Promise<void>;
}

/**
 * Occupy table dialog component for confirming table occupancy
 * @param {OccupyTableDialogProps} props - Component properties
 * @returns {JSX.Element} Occupy dialog UI
 */
export default function OccupyTableDialog({ 
  table, 
  isOpen, 
  onClose, 
  onConfirm 
}: OccupyTableDialogProps) {
  const [loading, setLoading] = useState(false);

  // Handle confirmation of occupancy
  const handleConfirm = async () => {
    if (!table) return;

    setLoading(true);
    try {
      await onConfirm(table.id);
      onClose();
    } catch (error) {
      console.error('Failed to occupy table:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen || !table) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            Occupy Table {table.table_number}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Capacity: {table.capacity} seats
            {table.area && ` • ${table.area.replace('_', ' ')}`}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <svg 
                className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" 
                  clipRule="evenodd" 
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">
                  Mark table as occupied
                </p>
                <p className="text-xs text-red-700 mt-1">
                  The table status will change to occupied and will not be available for other customers until released.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">You can occupy this table for:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Walk-in customers who are being seated</li>
              <li>Confirmed reservations arriving</li>
              <li>Customers ready to order</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg 
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Occupying...
              </span>
            ) : (
              'Confirm Occupy'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
