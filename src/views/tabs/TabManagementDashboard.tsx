'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { Input } from '@/views/shared/ui/input';
import {
  Receipt,
  Users,
  DollarSign,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Grid3x3,
  List,
  WifiOff,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRealtime } from '@/lib/hooks/useRealtime';
import { apiGet, apiPost } from '@/lib/utils/apiClient';
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
import { OfflineTabService } from '@/services/OfflineTabService';
import TableWithTabCard from './TableWithTabCard';
import QuickOpenTabModal from './QuickOpenTabModal';
import { useRouter } from 'next/navigation';

/**
 * TabManagementDashboard Component
 * Unified interface for managing all tabs and tables
 * 
 * Features:
 * - View all tables with their tab status
 * - Open new tabs quickly
 * - Manage active tabs
 * - View bills and close tabs
 * - Real-time updates
 * - Professional, intuitive UI
 * 
 * @component
 */
export default function TabManagementDashboard() {
  const router = useRouter();
  const { dataBatching, isOnline } = useOfflineRuntime();
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showOpenTabModal, setShowOpenTabModal] = useState(false);

  /**
   * Load tables from IndexedDB (instant)
   * Triggers background sync if online
   */
  const reloadTablesFromCache = useCallback(async () => {
    const cachedTables = await dataBatching.getCachedTables();
    setTables(cachedTables);
  }, [dataBatching]);

  const loadTables = useCallback(async () => {
    try {
      await reloadTablesFromCache();
      
      // Trigger background sync (non-blocking)
      if (isOnline) {
        dataBatching.syncAllEntities().catch(err => {
          console.log('Background table sync failed:', err);
        });
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  }, [dataBatching, isOnline, reloadTablesFromCache]);

  /**
   * Load sessions from IndexedDB (instant)
   * Triggers background sync if online
   */
  const reloadSessionsFromCache = useCallback(async () => {
    const cachedSessions = await dataBatching.getActiveSessionsSnapshot();
    setSessions(cachedSessions);
    setLoading(false);
  }, [dataBatching]);

  const loadSessions = useCallback(async () => {
    try {
      await reloadSessionsFromCache();
      
      // Trigger background sync (non-blocking)
      if (isOnline) {
        dataBatching.syncAllEntities().catch(err => {
          console.log('Background session sync failed:', err);
        });
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setLoading(false);
    }
  }, [dataBatching, isOnline, reloadSessionsFromCache]);

  /**
   * Load all data from IndexedDB
   */
  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadTables(), loadSessions()]);
    setLoading(false);
  }, [loadTables, loadSessions]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Real-time subscription for tables
  useRealtime({
    table: 'restaurant_tables',
    event: '*',
    onChange: () => {
      console.log('Table updated, syncing and refreshing from IndexedDB...');
      if (!isOnline) {
        reloadTablesFromCache().catch(err => {
          console.error('Failed to reload tables from cache after realtime update:', err);
        });
        return;
      }

      dataBatching
        .syncAllEntities()
        .then(() => reloadTablesFromCache())
        .catch(err => {
          console.log('Realtime table sync failed:', err);
          return reloadTablesFromCache();
        });
    },
  });

  // Real-time subscription for sessions
  useRealtime({
    table: 'order_sessions',
    event: '*',
    onChange: () => {
      console.log('Session updated, syncing and refreshing from IndexedDB...');
      if (!isOnline) {
        reloadSessionsFromCache().catch(err => {
          console.error('Failed to reload sessions from cache after realtime update:', err);
        });
        return;
      }

      dataBatching
        .syncAllEntities()
        .then(() => reloadSessionsFromCache())
        .catch(err => {
          console.log('Realtime session sync failed:', err);
          return reloadSessionsFromCache();
        });
    },
  });

  /**
   * Map sessions to tables
   */
  const selectBestSessionForTable = useCallback(
    (tableId: string) => {
      const tableSessions = sessions.filter((s) => s.table_id === tableId);
      if (tableSessions.length === 0) {
        return null;
      }

      const tempSessions = tableSessions.filter(
        (s) =>
          s._temp_id ||
          (typeof s.id === 'string' && s.id.startsWith('offline-session-')) ||
          s._pending_sync
      );
      const realSessions = tableSessions.filter(
        (s) => !s._temp_id && !(typeof s.id === 'string' && s.id.startsWith('offline-session-'))
      );

      const getMaxTotal = (list: any[]) =>
        list.reduce((best, current) => {
          if (!best) return current;
          const bestTotal = best.total_amount ?? 0;
          const currentTotal = current.total_amount ?? 0;
          return currentTotal > bestTotal ? current : best;
        }, null as any);

      const bestTemp = tempSessions.length > 0 ? getMaxTotal(tempSessions) : null;
      const bestReal = realSessions.length > 0 ? getMaxTotal(realSessions) : null;

      if (!bestReal && bestTemp) {
        return bestTemp;
      }
      if (!bestTemp && bestReal) {
        return bestReal;
      }
      if (!bestReal && !bestTemp) {
        return tableSessions[0];
      }

      const tempTotal = bestTemp.total_amount ?? 0;
      const realTotal = bestReal.total_amount ?? 0;

      if (!bestReal._pending_sync && realTotal >= tempTotal) {
        return bestReal;
      }

      return bestTemp;
    },
    [sessions]
  );

  const tablesWithSessions = tables.map((table) => {
    const session = selectBestSessionForTable(table.id);
    return {
      ...table,
      session,
    };
  });

  /**
   * Filter tables based on search, area, and status
   */
  const filteredTables = tablesWithSessions.filter((table) => {
    // Search filter
    const matchesSearch =
      !searchTerm ||
      table.table_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.session?.session_number?.toLowerCase().includes(searchTerm.toLowerCase());

    // Area filter
    const matchesArea = areaFilter === 'all' || table.area === areaFilter;

    // Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'with_tab' && table.session) ||
      (statusFilter === 'without_tab' && !table.session) ||
      table.status === statusFilter;

    return matchesSearch && matchesArea && matchesStatus;
  });

  /**
   * Get unique areas
   */
  const areas = Array.from(new Set(tables.map((t) => t.area).filter(Boolean)));

  /**
   * Calculate statistics
   */
  const stats = {
    totalTables: tables.filter((t) => t.is_active).length,
    activeTabs: sessions.length,
    totalRevenue: sessions.reduce((sum, s) => sum + (s.total_amount || 0), 0),
    availableTables: tables.filter((t) => t.status === 'available' && t.is_active).length,
  };

  /**
   * Handle open tab
   */
  const handleOpenTab = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      setSelectedTable(table);
      setShowOpenTabModal(true);
    }
  };

  /**
   * Handle confirm open tab
   * Creates a new tab and automatically navigates to add-order page
   * Uses authenticated API client to include Bearer token
   */
  const handleConfirmOpenTab = async (
    tableId: string,
    customerId?: string,
    notes?: string
  ) => {
    try {
      const data = await apiPost('/api/order-sessions', {
        table_id: tableId,
        customer_id: customerId,
        notes,
      });

      if (data.success) {
        // Close modal immediately
        setShowOpenTabModal(false);
        setSelectedTable(null);
        
        // Navigate to add order page immediately
        // The add-order page will load its own data
        router.push(`/tabs/${data.data.id}/add-order`);
        
        // Refresh data in background (won't delay navigation)
        loadAllData().catch(err => console.error('Background refresh failed:', err));
      } else {
        throw new Error(data.error || 'Failed to open tab');
      }
    } catch (error) {
      console.error('Failed to open tab:', error);
      throw error;
    }
  };

  /**
   * Handle view bill
   */
  const handleViewBill = (sessionId: string) => {
    router.push(`/order-sessions/${sessionId}/bill-preview`);
  };

  /**
   * Handle add order
   */
  const handleAddOrder = (sessionId: string) => {
    router.push(`/tabs/${sessionId}/add-order`);
  };

  /**
   * Handle close tab
   * If total amount is 0, queue close mutation offline-first (no payment page needed)
   * Otherwise, navigate to payment page
   * 
   * Offline-first: All tab closures use mutation queue for consistency
   */
  const handleCloseTab = async (sessionId: string) => {
    // Find the session to check total amount
    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }

    // If total is 0, close tab offline-first without payment page
    if (session.total_amount === 0 || session.total_amount === null) {
      try {
        console.log('Total is ₱0.00 - Closing tab offline-first (no payment needed)...');

        const { queueId } = await OfflineTabService.closeTab(sessionId, {
          amount_tendered: 0,
          payment_method: 'none',
          notes: 'Zero-amount tab close',
        });

        console.log(`Queued zero-amount tab close via OfflineTabService: #${queueId}`);

        // Refresh UI to remove from list
        await loadAllData();

        // Show success message
        alert('Tab closed successfully (No payment required - ₱0.00)');
      } catch (error) {
        console.error('Failed to close zero-amount tab:', error);
        alert('Failed to close tab. Please try again.');
      }
    } else {
      // Normal flow - navigate to payment page
      router.push(`/order-sessions/${sessionId}/close`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tab management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tab Management</h1>
          <p className="text-gray-600 mt-1">
            Manage all tables and customer tabs in one place
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Offline indicator */}
          {!isOnline && (
            <Badge variant="secondary" className="flex items-center gap-2">
              <WifiOff className="w-4 h-4" />
              Offline Mode
            </Badge>
          )}
          
          {/* Refresh button */}
          <Button
            onClick={loadAllData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <Grid3x3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTables}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableTables} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tabs</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeTabs}</div>
            <p className="text-xs text-muted-foreground">Currently open</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Pending payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Ticket</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.activeTabs > 0 ? stats.totalRevenue / stats.activeTabs : 0)}
            </div>
            <p className="text-xs text-muted-foreground">Per tab</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by table number, area, or tab number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Area Filter */}
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Areas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="with_tab">With Active Tab</option>
              <option value="without_tab">Without Tab</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || areaFilter !== 'all' || statusFilter !== 'all') && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchTerm}
                  <button onClick={() => setSearchTerm('')} className="ml-1">×</button>
                </Badge>
              )}
              {areaFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Area: {areaFilter}
                  <button onClick={() => setAreaFilter('all')} className="ml-1">×</button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="ml-1">×</button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tables Grid */}
      {filteredTables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Grid3x3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Tables Found
            </h3>
            <p className="text-gray-500">
              Try adjusting your filters or search term
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'
          }
        >
          {filteredTables.map((table) => (
            <TableWithTabCard
              key={table.id}
              table={table}
              session={table.session}
              onOpenTab={handleOpenTab}
              onViewBill={handleViewBill}
              onAddOrder={handleAddOrder}
              onCloseTab={handleCloseTab}
            />
          ))}
        </div>
      )}

      {/* Quick Open Tab Modal */}
      <QuickOpenTabModal
        isOpen={showOpenTabModal}
        onClose={() => {
          setShowOpenTabModal(false);
          setSelectedTable(null);
        }}
        table={selectedTable}
        onConfirm={handleConfirmOpenTab}
      />
    </div>
  );
}
