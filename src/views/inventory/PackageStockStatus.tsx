/**
 * PackageStockStatus Component
 * 
 * Main dashboard for monitoring package availability
 * Shows all packages grouped by status with filtering and search
 * 
 * @module views/inventory/PackageStockStatus
 */

'use client';

import { useState, useMemo } from 'react';
import { useAllPackageAvailability } from '@/lib/hooks/usePackageAvailability';
import { PackageStatusCard } from './components/PackageStatusCard';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import { 
  RefreshCw, 
  Search, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Filter,
  Download
} from 'lucide-react';

type StatusFilter = 'all' | 'available' | 'low_stock' | 'out_of_stock';

/**
 * PackageStockStatus - Main package availability dashboard
 * 
 * Features:
 * - Real-time availability display
 * - Status filtering
 * - Search functionality
 * - Statistics overview
 * - Manual refresh
 */
export default function PackageStockStatus() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Fetch all packages with auto-refresh every 2 minutes
  const { packages, loading, error, stats, refresh, lastFetched } = useAllPackageAvailability({
    refetchInterval: 120000, // 2 minutes
  });

  // Filter and search packages
  const filteredPackages = useMemo(() => {
    let filtered = packages;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pkg => pkg.status === statusFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pkg =>
        pkg.package_name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [packages, statusFilter, searchQuery]);

  // Group packages by status
  const groupedPackages = useMemo(() => {
    return {
      available: filteredPackages.filter(p => p.status === 'available'),
      low_stock: filteredPackages.filter(p => p.status === 'low_stock'),
      out_of_stock: filteredPackages.filter(p => p.status === 'out_of_stock'),
    };
  }, [filteredPackages]);

  // Handle refresh
  const handleRefresh = async () => {
    await refresh();
  };

  // Export to CSV (placeholder)
  const handleExport = () => {
    const csvContent = [
      ['Package Name', 'Status', 'Max Sellable', 'Bottleneck'].join(','),
      ...packages.map(pkg => [
        pkg.package_name,
        pkg.status,
        pkg.max_sellable,
        pkg.bottleneck?.product_name || 'None'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `package-availability-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            statusFilter === 'all'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Packages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-gray-400" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('available')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            statusFilter === 'available'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold text-green-600">{stats.available}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('low_stock')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            statusFilter === 'low_stock'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('out_of_stock')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            statusFilter === 'out_of_stock'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      {lastFetched && (
        <p className="text-xs text-gray-500">
          Last updated: {lastFetched.toLocaleTimeString()}
        </p>
      )}

      {/* Loading State */}
      {loading && packages.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading packages...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-900 font-medium">Error loading packages</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-3">
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredPackages.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No packages found</p>
          <p className="text-gray-500 text-sm mt-1">
            {searchQuery ? 'Try a different search term' : 'Create packages to see them here'}
          </p>
        </div>
      )}

      {/* Package Grid */}
      {!loading && !error && filteredPackages.length > 0 && (
        <div className="space-y-6">
          {/* Out of Stock */}
          {groupedPackages.out_of_stock.length > 0 && (statusFilter === 'all' || statusFilter === 'out_of_stock') && (
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Out of Stock ({groupedPackages.out_of_stock.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedPackages.out_of_stock.map(pkg => (
                  <PackageStatusCard key={pkg.package_id} packageSummary={pkg} />
                ))}
              </div>
            </div>
          )}

          {/* Low Stock */}
          {groupedPackages.low_stock.length > 0 && (statusFilter === 'all' || statusFilter === 'low_stock') && (
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Low Stock ({groupedPackages.low_stock.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedPackages.low_stock.map(pkg => (
                  <PackageStatusCard key={pkg.package_id} packageSummary={pkg} />
                ))}
              </div>
            </div>
          )}

          {/* Available */}
          {groupedPackages.available.length > 0 && (statusFilter === 'all' || statusFilter === 'available') && (
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Available ({groupedPackages.available.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedPackages.available.map(pkg => (
                  <PackageStatusCard key={pkg.package_id} packageSummary={pkg} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
