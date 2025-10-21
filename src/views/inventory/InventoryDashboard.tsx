'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import Link from 'next/link';
import { Product } from '@/models/entities/Product';
import InventoryListResponsive from './InventoryListResponsive';
import AddProductDialog from './AddProductDialog';
import { Button } from '../shared/ui/button';
import { Package, FileBarChart, BarChart3, Boxes, TrendingUp, Loader2 } from 'lucide-react';

/**
 * Code Splitting: Heavy analytics components loaded on-demand
 * Phase 4.3.3: Frontend Optimization
 */
const InventoryAnalytics = lazy(() => import('./InventoryAnalytics'));
const LowStockAlert = lazy(() => import('./LowStockAlert'));
const PackageStockStatus = lazy(() => import('./PackageStockStatus'));
const ReorderRecommendations = lazy(() => import('./ReorderRecommendations'));

/**
 * InventoryDashboard Component
 * Main dashboard for inventory management with Add Product functionality
 */
/**
 * InventoryDashboard Component
 * Redesigned with analytics, responsive layout, and improved UX
 * Features:
 * - Visual analytics with charts and metrics
 * - Card/Table toggle view for products
 * - Sticky controls - no nested scrolling
 * - Fully responsive design
 * - Tab-based navigation for All Products vs Low Stock
 */
export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'analytics' | 'low-stock' | 'package-status' | 'reorder'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    adequate: 0,
  });

  /**
   * Handle successful product creation
   * Refreshes the product list
   * Optimized with useCallback to prevent unnecessary re-renders
   */
  const handleProductAdded = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  /**
   * Handle products loaded from InventoryList
   * Optimized with useCallback to prevent unnecessary re-renders
   */
  const handleProductsLoad = useCallback((loadedProducts: Product[]) => {
    setProducts(loadedProducts);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Fixed */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
              <p className="text-gray-600 text-sm mt-1">Monitor and manage product stock levels</p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Link href="/inventory/reports">
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileBarChart className="w-4 h-4" />
                  <span className="hidden sm:inline">Reports</span>
                </Button>
              </Link>
              <Button 
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Add Product</span>
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mt-4 border-b border-gray-200 -mb-px">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 font-medium text-sm transition-colors rounded-t-lg ${
                activeTab === 'all'
                  ? 'bg-gray-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                All Products
              </span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 font-medium text-sm transition-colors rounded-t-lg ${
                activeTab === 'analytics'
                  ? 'bg-gray-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </span>
            </button>
            <button
              onClick={() => setActiveTab('low-stock')}
              className={`px-4 py-2 font-medium text-sm transition-colors rounded-t-lg flex items-center gap-2 ${
                activeTab === 'low-stock'
                  ? 'bg-gray-50 text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Package className="w-4 h-4" />
              Low Stock
              {stats.lowStock > 0 && (
                <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {stats.lowStock}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('package-status')}
              className={`px-4 py-2 font-medium text-sm transition-colors rounded-t-lg ${
                activeTab === 'package-status'
                  ? 'bg-gray-50 text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Boxes className="w-4 h-4" />
                Package Status
              </span>
            </button>
            <button
              onClick={() => setActiveTab('reorder')}
              className={`px-4 py-2 font-medium text-sm transition-colors rounded-t-lg ${
                activeTab === 'reorder'
                  ? 'bg-gray-50 text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Reorder
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'all' && (
          <InventoryListResponsive 
            onStatsUpdate={setStats} 
            onProductsLoad={handleProductsLoad}
            key={refreshKey} 
          />
        )}
        
        {activeTab === 'analytics' && (
          <Suspense fallback={<TabLoadingFallback label="Analytics" />}>
            <InventoryAnalytics products={products} />
          </Suspense>
        )}
        
        {activeTab === 'low-stock' && (
          <Suspense fallback={<TabLoadingFallback label="Low Stock Alerts" />}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <LowStockAlert />
            </div>
          </Suspense>
        )}
        
        {activeTab === 'package-status' && (
          <Suspense fallback={<TabLoadingFallback label="Package Status" />}>
            <PackageStockStatus />
          </Suspense>
        )}
        
        {activeTab === 'reorder' && (
          <Suspense fallback={<TabLoadingFallback label="Reorder Recommendations" />}>
            <ReorderRecommendations />
          </Suspense>
        )}
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

/**
 * Loading Fallback Component for Lazy-Loaded Tabs
 * Phase 4.3.3: Provides smooth UX during code splitting
 */
function TabLoadingFallback({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-12">
      <div className="flex flex-col items-center justify-center gap-4 text-gray-500">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <div className="text-center">
          <p className="text-lg font-medium">Loading {label}...</p>
          <p className="text-sm text-gray-400 mt-1">Optimizing performance</p>
        </div>
      </div>
    </div>
  );
}
