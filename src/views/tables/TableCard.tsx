'use client';

/**
 * TableCard Component
 * Displays individual table with status, capacity, and current order info
 */

import React from 'react';
import { Table, TableStatus } from '@/models';
import TableStatusBadge from './TableStatusBadge';

/**
 * Props for `TableCard` controlling table display and which actions are available.
 * New optional boolean flags allow parent components to hide/show specific action buttons
 * based on the current user's role without altering business logic.
 */
interface TableCardProps {
  /** Table entity to render. */
  table: Table;
  /** Handler to open reservation flow. Rendered only when `canReserve` is true. */
  onReserve?: (table: Table) => void;
  /** Handler to open occupy flow. Rendered only when `canOccupy` is true. */
  onOccupy?: (table: Table) => void;
  /** Handler for quick actions like release, markCleaned, cancelReservation. */
  onQuickAction?: (tableId: string, action: 'release' | 'markCleaned' | 'cancelReservation') => Promise<void>;
  /** Handler to deactivate a table. Rendered only when `canDeactivate` is true. */
  onDeactivate?: (table: Table) => void;
  /** Card click handler for future details navigation. */
  onClick?: (table: Table) => void;

  /** Whether to show the Reserve button. Defaults to true. */
  canReserve?: boolean;
  /** Whether to show the Occupy button. Defaults to true. */
  canOccupy?: boolean;
  /** Whether to show the To Cleaning (release) button. Defaults to true. */
  canRelease?: boolean;
  /** Whether to show the Set Available (markCleaned) button. Defaults to true. */
  canMarkCleaned?: boolean;
  /** Whether to show the Cancel Reservation button. Defaults to true. */
  canCancelReservation?: boolean;
  /** Whether to show the Deactivate button. Defaults to true. */
  canDeactivate?: boolean;
}

/**
 * TableCard component displays a single table with status and quick actions
 * @param {TableCardProps} props - Component properties
 * @returns {JSX.Element} Table card UI
 */
export default function TableCard({ 
  table, 
  onReserve, 
  onOccupy, 
  onQuickAction,
  onDeactivate, 
  onClick,
  canReserve = true,
  canOccupy = true,
  canRelease = true,
  canMarkCleaned = true,
  canCancelReservation = true,
  canDeactivate = true,
}: TableCardProps) {
  /**
   * Handle reserve button click
   */
  const handleReserveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReserve) {
      onReserve(table);
    }
  };

  /**
   * Handle occupy button click
   */
  const handleOccupyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOccupy) {
      onOccupy(table);
    }
  };

  /**
   * Handle quick action button clicks
   */
  const handleQuickActionClick = (e: React.MouseEvent, action: 'release' | 'markCleaned' | 'cancelReservation') => {
    e.stopPropagation();
    if (onQuickAction) {
      onQuickAction(table.id, action);
    }
  };

  /**
   * Handle card click
   */
  const handleCardClick = () => {
    if (onClick) {
      onClick(table);
    }
  };

  /**
   * Handle deactivate button click
   */
  const handleDeactivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeactivate) {
      onDeactivate(table);
    }
  };

  const getCardBorderColor = () => {
    switch (table.status) {
      case TableStatus.AVAILABLE:
        return 'border-green-300 hover:border-green-400';
      case TableStatus.OCCUPIED:
        return 'border-red-300 hover:border-red-400';
      case TableStatus.RESERVED:
        return 'border-yellow-300 hover:border-yellow-400';
      case TableStatus.CLEANING:
        return 'border-gray-300 hover:border-gray-400';
      default:
        return 'border-gray-300 hover:border-gray-400';
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow border-2 ${getCardBorderColor()} p-4 transition-all duration-200 cursor-pointer hover:shadow-lg`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            {table.table_number}
          </h3>
          {table.area && (
            <p className="text-sm text-gray-500 capitalize">
              {table.area.replace('_', ' ')}
            </p>
          )}
        </div>
        <TableStatusBadge status={table.status} />
      </div>

      {/* Capacity */}
      <div className="mb-3">
        <div className="flex items-center text-sm text-gray-600">
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Capacity: {table.capacity} seats
        </div>
      </div>

      {/* Current Order Info */}
      {table.current_order_id && (
        <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-blue-800 font-medium">
            Order in progress
          </p>
        </div>
      )}

      {/* Notes */}
      {table.notes && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 italic line-clamp-2">
            {table.notes}
          </p>
        </div>
      )}

      {/* Quick Actions (role-aware rendering) */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
        {table.status === TableStatus.AVAILABLE && (
          <>
            {canOccupy && (
              <button
                onClick={handleOccupyClick}
                className="flex-1 text-xs px-2 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-medium"
                title="Mark table as occupied"
              >
                Occupy
              </button>
            )}
            {canReserve && (
              <button
                onClick={handleReserveClick}
                className="flex-1 text-xs px-2 py-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors font-medium"
                title="Reserve this table"
              >
                Reserve
              </button>
            )}
          </>
        )}
        
        {table.status === TableStatus.OCCUPIED && canRelease && (
          <>
            <button
              onClick={(e) => handleQuickActionClick(e, 'release')}
              className="flex-1 text-xs px-2 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium"
              title="Release table to cleaning"
            >
              To Cleaning
            </button>
          </>
        )}
        
        {table.status === TableStatus.RESERVED && (
          <>
            {canOccupy && (
              <button
                onClick={handleOccupyClick}
                className="flex-1 text-xs px-2 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-medium"
                title="Customer arrived - occupy table"
              >
                Occupy
              </button>
            )}
            {canCancelReservation && (
              <button
                onClick={(e) => handleQuickActionClick(e, 'cancelReservation')}
                className="flex-1 text-xs px-2 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium"
                title="Cancel reservation"
              >
                Cancel
              </button>
            )}
          </>
        )}
        
        {table.status === TableStatus.CLEANING && canMarkCleaned && (
          <button
            onClick={(e) => handleQuickActionClick(e, 'markCleaned')}
            className="flex-1 text-xs px-2 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium"
            title="Table is clean and ready"
          >
            Set Available
          </button>
        )}
      </div>

      {/* Deactivate Button - role-aware; show only when permitted and meaningful */}
      {canDeactivate && table.status !== TableStatus.OCCUPIED && !table.current_order_id && onDeactivate && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <button
            onClick={handleDeactivateClick}
            className="w-full text-xs px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors font-medium flex items-center justify-center gap-1"
            title="Deactivate this table"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Deactivate Table
          </button>
        </div>
      )}
    </div>
  );
}
