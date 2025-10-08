'use client';

/**
 * TableGrid Component
 * Visual grid of all restaurant tables with real-time status updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableStatus } from '@/models';
import TableCard from './TableCard';
import ReservationDialog from './ReservationDialog';
import OccupyTableDialog from './OccupyTableDialog';
import AddTableDialog from './AddTableDialog';
import DeactivateTableDialog from './DeactivateTableDialog';
import { supabase } from '@/data/supabase/client';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiPatch, apiPost } from '@/lib/utils/apiClient';

/**
 * Props for TableGrid component
 */
interface TableGridProps {
  /** Callback when a table is selected */
  onTableSelect?: (tableId: string | null) => void;
  /** Currently selected table ID for highlighting */
  selectedTableId?: string | null;
}

export default function TableGrid({ onTableSelect, selectedTableId }: TableGridProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TableStatus | 'all'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [showOccupyDialog, setShowOccupyDialog] = useState(false);
  const [showAddTableDialog, setShowAddTableDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showInactiveTables, setShowInactiveTables] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Role-based capability flags derived from authenticated user
  // - Manager/Admin: full control (reserve/cancel/deactivate/reactivate/create)
  // - Cashier: occupy/release
  // - Waiter: occupy/release/markCleaned
  const { isManagerOrAbove, isWaiter, isCashier } = useAuth();
  const canReserve = isManagerOrAbove();
  const canCancelReservation = isManagerOrAbove();
  const canOccupy = isManagerOrAbove() || isCashier() || isWaiter();
  const canRelease = isManagerOrAbove() || isCashier() || isWaiter();
  const canMarkCleaned = isManagerOrAbove() || isWaiter();
  const canDeactivate = isManagerOrAbove();
  const canReactivate = isManagerOrAbove();
  const canCreateTable = isManagerOrAbove();

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * Fetch tables based on active/inactive filter
   * @param {boolean} includeInactive - Whether to include inactive tables
   */
  const fetchTables = useCallback(async (includeInactive: boolean = false) => {
    try {
      setLoading(true);
      let query = supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTables((data as Table[]) || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      showToast('Failed to fetch tables', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and refetch when showInactiveTables changes
  useEffect(() => {
    fetchTables(showInactiveTables);
  }, [fetchTables, showInactiveTables]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('restaurant_tables_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_tables',
        },
        (payload) => {
          console.log('Table change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setTables((prev) => [...prev, payload.new as Table]);
          } else if (payload.eventType === 'UPDATE') {
            setTables((prev) =>
              prev.map((table) =>
                table.id === payload.new.id ? (payload.new as Table) : table
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTables((prev) =>
              prev.filter((table) => table.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Handle table status change using API endpoint
   * @param {string} tableId - Table ID
   * @param {string} action - Action to perform (reserve, occupy, etc.)
   * @param {string} notes - Optional notes for reservation
   */
  const handleStatusChange = async (
    tableId: string, 
    action: 'reserve' | 'occupy' | 'release' | 'markCleaned' | 'cancelReservation',
    notes?: string
  ) => {
    try {
      const data = await apiPatch(`/api/tables/${tableId}`, { action, notes });

      if (!data.success) {
        throw new Error(data.error || 'Failed to update table status');
      }

      // Optimistically update local state immediately
      if (data.data) {
        setTables((prev) =>
          prev.map((table) =>
            table.id === tableId ? (data.data as Table) : table
          )
        );
      }

      showToast(`Table ${action}d successfully`, 'success');
    } catch (error) {
      console.error('Error updating table status:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update table status', 'error');
      throw error;
    }
  };

  // Handle reserve button click
  const handleReserveClick = (table: Table) => {
    setSelectedTable(table);
    setShowReservationDialog(true);
  };

  // Handle occupy button click
  const handleOccupyClick = (table: Table) => {
    setSelectedTable(table);
    setShowOccupyDialog(true);
  };

  /**
   * Handle deactivate button click
   * Opens the deactivation confirmation dialog
   * @param {Table} table - Table to deactivate
   */
  const handleDeactivateClick = (table: Table) => {
    setSelectedTable(table);
    setShowDeactivateDialog(true);
  };

  // Confirm reservation
  const handleConfirmReservation = async (tableId: string, notes?: string) => {
    await handleStatusChange(tableId, 'reserve', notes);
  };

  // Confirm occupy
  const handleConfirmOccupy = async (tableId: string) => {
    await handleStatusChange(tableId, 'occupy');
  };

  // Handle other status changes
  const handleQuickStatusChange = async (tableId: string, action: 'release' | 'markCleaned' | 'cancelReservation') => {
    await handleStatusChange(tableId, action);
  };

  /**
   * Handle table deactivation
   * Calls the API to deactivate the table
   * @param {string} tableId - Table ID to deactivate
   */
  const handleConfirmDeactivate = async (tableId: string) => {
    await handleStatusChange(tableId, 'deactivate' as any);
  };

  /**
   * Handle table reactivation
   * Calls the API to reactivate an inactive table
   * @param {string} tableId - Table ID to reactivate
   */
  const handleReactivate = async (tableId: string) => {
    try {
      const data = await apiPatch(`/api/tables/${tableId}`, { action: 'reactivate' });

      if (!data.success) {
        throw new Error(data.error || 'Failed to reactivate table');
      }

      // Optimistically update local state
      if (data.data) {
        setTables((prev) =>
          prev.map((table) =>
            table.id === tableId ? (data.data as Table) : table
          )
        );
      }

      showToast('Table reactivated successfully', 'success');
    } catch (error) {
      console.error('Error reactivating table:', error);
      showToast(error instanceof Error ? error.message : 'Failed to reactivate table', 'error');
    }
  };

  /**
   * Handle adding a new table
   * Optimistically updates the UI immediately after successful creation
   * @param {object} tableData - Table data from the form
   */
  const handleAddTable = async (tableData: {
    table_number: string;
    capacity: number;
    area?: string;
    notes?: string;
  }) => {
    try {
      const data = await apiPost('/api/tables', tableData);

      if (!data.success) {
        throw new Error(data.error || 'Failed to create table');
      }

      // Optimistically add table to UI immediately
      if (data.data) {
        setTables((prev) => {
          // Check if table already exists (from real-time subscription)
          const exists = prev.some(t => t.id === data.data.id);
          if (exists) {
            return prev; // Already added via subscription
          }
          return [...prev, data.data as Table];
        });
      }

      showToast(`Table ${tableData.table_number} added successfully`, 'success');
    } catch (error) {
      console.error('Error adding table:', error);
      showToast(error instanceof Error ? error.message : 'Failed to add table', 'error');
      throw error;
    }
  };

  /**
   * Handle table click
   * Selects the table and notifies parent component
   */
  const handleTableClick = (table: Table) => {
    console.log('Table clicked:', table);
    
    // Toggle selection - if already selected, deselect
    if (selectedTableId === table.id) {
      onTableSelect?.(null);
    } else {
      onTableSelect?.(table.id);
    }
  };

  /**
   * Filter tables based on status, area, and active state
   */
  const filteredTables = tables.filter((table) => {
    const statusMatch = filter === 'all' || table.status === filter;
    const areaMatch = areaFilter === 'all' || table.area === areaFilter;
    return statusMatch && areaMatch;
  });

  // Separate active and inactive tables
  const activeTables = filteredTables.filter(t => t.is_active);
  const inactiveTables = filteredTables.filter(t => !t.is_active);

  // Get unique areas
  const areas = Array.from(new Set(tables.map((t) => t.area).filter(Boolean)));

  // Get table statistics (only active tables)
  const stats = {
    total: activeTables.length,
    available: activeTables.filter((t) => t.status === TableStatus.AVAILABLE).length,
    occupied: activeTables.filter((t) => t.status === TableStatus.OCCUPIED).length,
    reserved: activeTables.filter((t) => t.status === TableStatus.RESERVED).length,
    cleaning: activeTables.filter((t) => t.status === TableStatus.CLEANING).length,
    inactive: inactiveTables.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading tables...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Total Tables</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Available</p>
          <p className="text-2xl font-bold text-green-600">{stats.available}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-600">Occupied</p>
          <p className="text-2xl font-bold text-red-600">{stats.occupied}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">Reserved</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.reserved}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
          <p className="text-sm text-gray-600">Cleaning</p>
          <p className="text-2xl font-bold text-gray-600">{stats.cleaning}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Status Filter */}
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as TableStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value={TableStatus.AVAILABLE}>Available</option>
              <option value={TableStatus.OCCUPIED}>Occupied</option>
              <option value={TableStatus.RESERVED}>Reserved</option>
              <option value={TableStatus.CLEANING}>Cleaning</option>
            </select>
          </div>

          {/* Area Filter */}
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="area-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Area
            </label>
            <select
              id="area-filter"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Areas</option>
              {areas.map((area) => (
                <option key={area || 'general'} value={area || ''}>
                  {(area || 'General').replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Add Table Button */}
          <div className="flex items-end gap-2">
            {(filter !== 'all' || areaFilter !== 'all') && (
              <button
                onClick={() => {
                  setFilter('all');
                  setAreaFilter('all');
                }}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={() => setShowInactiveTables(!showInactiveTables)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              title={showInactiveTables ? 'Hide inactive tables' : 'Show inactive tables'}
            >
              {showInactiveTables ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showInactiveTables ? 'Hide' : 'Show'} Inactive ({stats.inactive})
          </button>
            {canCreateTable && (
              <button
                onClick={() => setShowAddTableDialog(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add Table
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Tables Grid */}
      {activeTables.length === 0 && !showInactiveTables ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-4 text-gray-600">No active tables found matching the filters</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Tables</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeTables.map((table) => (
                <div
                  key={table.id}
                  className={`transition-all ${
                    selectedTableId === table.id
                      ? 'ring-4 ring-blue-500 ring-offset-2 rounded-lg'
                      : ''
                  }`}
                >
                  <TableCard
                    table={table}
                    onReserve={handleReserveClick}
                    onOccupy={handleOccupyClick}
                    onQuickAction={handleQuickStatusChange}
                    onDeactivate={handleDeactivateClick}
                    onClick={handleTableClick}
                    // Pass role-based action visibility
                    canReserve={canReserve}
                    canOccupy={canOccupy}
                    canRelease={canRelease}
                    canMarkCleaned={canMarkCleaned}
                    canCancelReservation={canCancelReservation}
                    canDeactivate={canDeactivate}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Inactive Tables Section */}
          {showInactiveTables && inactiveTables.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-gray-500" />
                Inactive Tables ({inactiveTables.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inactiveTables.map((table) => (
                  <div key={table.id} className="relative">
                    <div className="absolute top-2 right-2 z-10">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-white">
                        Inactive
                      </span>
                    </div>
                    <div className="opacity-60">
                      <TableCard
                        table={table}
                        onClick={handleTableClick}
                      />
                    </div>
                    {canReactivate && (
                      <button
                        onClick={() => handleReactivate(table.id)}
                        className="mt-2 w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Reactivate Table
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <ReservationDialog
        table={selectedTable}
        isOpen={showReservationDialog}
        onClose={() => setShowReservationDialog(false)}
        onConfirm={handleConfirmReservation}
      />

      <OccupyTableDialog
        table={selectedTable}
        isOpen={showOccupyDialog}
        onClose={() => setShowOccupyDialog(false)}
        onConfirm={handleConfirmOccupy}
      />

      <AddTableDialog
        isOpen={showAddTableDialog}
        onClose={() => setShowAddTableDialog(false)}
        onConfirm={handleAddTable}
      />

      <DeactivateTableDialog
        table={selectedTable}
        isOpen={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        onConfirm={handleConfirmDeactivate}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
