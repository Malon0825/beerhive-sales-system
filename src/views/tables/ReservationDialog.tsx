'use client';

/**
 * ReservationDialog Component
 * Modal dialog for reserving a table with optional notes
 */

import React, { useState } from 'react';
import { Table } from '@/models';

interface ReservationDialogProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tableId: string, notes?: string) => Promise<void>;
}

/**
 * Reservation dialog component for capturing reservation details
 * @param {ReservationDialogProps} props - Component properties
 * @returns {JSX.Element} Reservation dialog UI
 */
export default function ReservationDialog({ 
  table, 
  isOpen, 
  onClose, 
  onConfirm 
}: ReservationDialogProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle confirmation of reservation
  const handleConfirm = async () => {
    if (!table) return;

    setLoading(true);
    try {
      await onConfirm(table.id, notes.trim() || undefined);
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Failed to reserve table:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!loading) {
      setNotes('');
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
            Reserve Table {table.table_number}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Capacity: {table.capacity} seats
            {table.area && ` • ${table.area.replace('_', ' ')}`}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <div>
            <label 
              htmlFor="reservation-notes" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Reservation Notes (Optional)
            </label>
            <textarea
              id="reservation-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Reserved for John Doe at 7:00 PM"
              rows={3}
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {notes.length}/200 characters
            </p>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <svg 
                className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" 
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
                <p className="text-sm font-medium text-yellow-800">
                  Table will be marked as reserved
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  The table status will change from available to reserved and cannot be used until the reservation is confirmed or cancelled.
                </p>
              </div>
            </div>
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
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                Reserving...
              </span>
            ) : (
              'Confirm Reservation'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
