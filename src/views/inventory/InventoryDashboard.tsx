'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import InventoryList from './InventoryList';
import LowStockAlert from './LowStockAlert';
import AddProductDialog from './AddProductDialog';
import { Button } from '../shared/ui/button';
import { Package, AlertTriangle, TrendingDown, TrendingUp, FileBarChart } from 'lucide-react';

/**
 * InventoryDashboard Component
 * Main dashboard for inventory management with Add Product functionality
 */
export default function InventoryDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    adequate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'low-stock'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadStatistics();
  }, []);

  /**
   * Load inventory statistics from API
   */
  const loadStatistics = async () => {
    try {
      setLoading(true);
      // This would call an API endpoint for statistics
      // For now, using placeholder data
      setStats({
        total: 0,
        lowStock: 0,
        outOfStock: 0,
        adequate: 0,
      });
    } catch (error) {
      console.error('Load statistics error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle successful product creation
   * Refreshes the product list and statistics
   */
  const handleProductAdded = () => {
    // Trigger reload of inventory list by changing the key
    setRefreshKey(prev => prev + 1);
    loadStatistics();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage product stock levels</p>
        </div>
        <div className="flex gap-3">
          <Link href="/inventory/reports">
            <Button 
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileBarChart className="w-5 h-5" />
              View Reports
            </Button>
          </Link>
          <Button 
            className="flex items-center gap-2"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Package className="w-5 h-5" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Products</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Low Stock</div>
              <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Out of Stock</div>
              <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Adequate Stock</div>
              <div className="text-2xl font-bold text-green-600">{stats.adequate}</div>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => setActiveTab('low-stock')}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'low-stock'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Low Stock Alerts
              {stats.lowStock > 0 && (
                <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {stats.lowStock}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'all' ? (
            <InventoryList onStatsUpdate={setStats} key={refreshKey} />
          ) : (
            <LowStockAlert />
          )}
        </div>
      </div>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleProductAdded}
      />
    </div>
  );
}
