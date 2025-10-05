'use client';

/**
 * Inventory Report Dashboard Component
 * 
 * Comprehensive inventory reporting with Excel export functionality.
 * Displays inventory summaries, turnover analysis, low stock alerts,
 * and value by category with professional data visualization.
 * 
 * @module InventoryReportDashboard
 * @category Components
 */

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { ExcelExportButton, ExcelExportMultiSheet } from '../reports/ExcelExportButton';
import { ExcelHeader } from '@/core/services/export/ExcelExportService';

/**
 * Interface for inventory report data structure
 */
interface InventoryReportData {
  summary: {
    total_products: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_inventory_value: number;
    average_turnover_rate: number;
  };
  low_stock: Array<{
    sku: string;
    name: string;
    current_stock: number;
    reorder_point: number;
    reorder_quantity: number;
    unit_of_measure: string;
    stock_status: string;
    category?: { name: string };
  }>;
  turnover_analysis: {
    all_items: Array<{
      sku: string;
      product_name: string;
      current_stock: number;
      quantity_sold: number;
      turnover_rate: number;
      days_to_sell: number | null;
      movement_status: string;
    }>;
    slow_moving: any[];
    fast_moving: any[];
  };
  value_by_category: Array<{
    category_name: string;
    total_items: number;
    total_value: number;
  }>;
}

/**
 * Inventory Report Dashboard Component
 * 
 * Main dashboard for viewing and exporting comprehensive inventory reports.
 * Includes summary statistics, turnover analysis, stock alerts, and category values.
 * 
 * @component
 * @returns {JSX.Element} Rendered inventory report dashboard
 */
export default function InventoryReportDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<InventoryReportData | null>(null);

  /**
   * Fetch comprehensive inventory report data
   * 
   * Loads all inventory data including summaries, turnover, and alerts.
   */
  useEffect(() => {
    fetchInventoryReport();
  }, []);

  /**
   * Fetch inventory report from API
   * 
   * @async
   * @returns {Promise<void>}
   */
  const fetchInventoryReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports/inventory?type=comprehensive');
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory report');
      }

      const result = await response.json();
      setReportData(result.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching the report');
      console.error('Inventory report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format currency values
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  /**
   * Format number values
   */
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-PH').format(value);
  };

  /**
   * Excel headers for stock levels report
   */
  const stockLevelsHeaders: ExcelHeader[] = [
    { key: 'sku', label: 'SKU', width: 15 },
    { key: 'name', label: 'Product Name', width: 30 },
    { key: 'category_name', label: 'Category', width: 20 },
    { key: 'current_stock', label: 'Current Stock', width: 15, format: 'number' },
    { key: 'reorder_point', label: 'Reorder Point', width: 15, format: 'number' },
    { key: 'reorder_quantity', label: 'Reorder Qty', width: 15, format: 'number' },
    { key: 'unit_of_measure', label: 'Unit', width: 10 },
    { key: 'stock_status', label: 'Status', width: 12 },
  ];

  /**
   * Excel headers for turnover analysis
   */
  const turnoverHeaders: ExcelHeader[] = [
    { key: 'sku', label: 'SKU', width: 15 },
    { key: 'product_name', label: 'Product Name', width: 30 },
    { key: 'current_stock', label: 'Stock', width: 12, format: 'number' },
    { key: 'quantity_sold', label: 'Qty Sold', width: 12, format: 'number' },
    { key: 'turnover_rate', label: 'Turnover Rate', width: 15, format: 'number' },
    { key: 'days_to_sell', label: 'Days to Sell', width: 15, format: 'number' },
    { key: 'movement_status', label: 'Movement', width: 12 },
  ];

  /**
   * Excel headers for category value analysis
   */
  const categoryHeaders: ExcelHeader[] = [
    { key: 'category_name', label: 'Category', width: 25 },
    { key: 'total_items', label: 'Total Items', width: 12, format: 'number' },
    { key: 'total_value', label: 'Total Value', width: 18, format: 'currency' },
  ];

  /**
   * Get stock status badge color
   */
  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      case 'critical':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  /**
   * Get movement status badge color
   */
  const getMovementColor = (status: string) => {
    switch (status) {
      case 'fast':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'slow':
        return 'bg-yellow-100 text-yellow-800';
      case 'stagnant':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error loading inventory report: {error}</p>
        <button 
          onClick={fetchInventoryReport}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Export Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Report</h1>
          <p className="text-gray-600 mt-1">Comprehensive inventory analysis and insights</p>
        </div>

        {/* Export Buttons */}
        {reportData && (
          <div className="flex gap-3">
            {/* Single Sheet Export - Stock Levels */}
            <ExcelExportButton
              data={reportData.low_stock.map(item => ({
                ...item,
                category_name: item.category?.name || 'Uncategorized'
              }))}
              filename="inventory_stock_levels"
              headers={stockLevelsHeaders}
              sheetName="Stock Levels"
              formatting={{
                alternateRows: true
              }}
            />
            
            {/* Multi-Sheet Comprehensive Export */}
            <ExcelExportMultiSheet
              sheets={[
                {
                  name: 'Stock Levels',
                  data: reportData.low_stock.map(item => ({
                    ...item,
                    category_name: item.category?.name || 'Uncategorized'
                  })),
                  headers: stockLevelsHeaders
                },
                {
                  name: 'Turnover Analysis',
                  data: reportData.turnover_analysis.all_items,
                  headers: turnoverHeaders
                },
                {
                  name: 'Fast Moving',
                  data: reportData.turnover_analysis.fast_moving,
                  headers: turnoverHeaders
                },
                {
                  name: 'Slow Moving',
                  data: reportData.turnover_analysis.slow_moving,
                  headers: turnoverHeaders
                },
                {
                  name: 'Value by Category',
                  data: reportData.value_by_category,
                  headers: categoryHeaders,
                  formatting: { totalsRow: true }
                }
              ]}
              filename="inventory_comprehensive_report"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : reportData ? (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Total Products */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatNumber(reportData.summary.total_products)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Low Stock */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-orange-600 mt-2">
                    {formatNumber(reportData.summary.low_stock_count)}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Out of Stock */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {formatNumber(reportData.summary.out_of_stock_count)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            {/* Inventory Value */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {formatCurrency(reportData.summary.total_inventory_value)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Average Turnover */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Turnover</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">
                    {reportData.summary.average_turnover_rate.toFixed(2)}x
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Grid: Low Stock Alerts and Value by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Alerts */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
                <p className="text-sm text-gray-600 mt-1">Items requiring attention</p>
              </div>
              <div className="p-6">
                {reportData.low_stock && reportData.low_stock.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {reportData.low_stock.slice(0, 10).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-600">SKU: {item.sku}</div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="text-sm font-bold text-gray-900">
                            {item.current_stock} {item.unit_of_measure}
                          </div>
                          <div className="text-xs text-gray-600">
                            Reorder: {item.reorder_point}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStockStatusColor(item.stock_status)}`}>
                          {item.stock_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No low stock items</p>
                )}
              </div>
            </div>

            {/* Value by Category */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Inventory Value by Category</h3>
                <p className="text-sm text-gray-600 mt-1">Stock value distribution</p>
              </div>
              <div className="p-6">
                {reportData.value_by_category && reportData.value_by_category.length > 0 ? (
                  <div className="space-y-4">
                    {reportData.value_by_category.slice(0, 8).map((cat, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {cat.category_name}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(cat.total_value)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  (cat.total_value / reportData.value_by_category[0].total_value) * 100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-12 text-right">
                            {cat.total_items} items
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No category data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Turnover Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fast Moving Items */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Fast Moving Items
                </h3>
                <p className="text-sm text-gray-600 mt-1">High turnover products</p>
              </div>
              <div className="p-6">
                {reportData.turnover_analysis.fast_moving && reportData.turnover_analysis.fast_moving.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {reportData.turnover_analysis.fast_moving.slice(0, 10).map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.product_name}</div>
                          <div className="text-sm text-gray-600">SKU: {item.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-600">
                            {item.turnover_rate.toFixed(2)}x
                          </div>
                          <div className="text-xs text-gray-600">
                            {item.quantity_sold} sold
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No fast moving items</p>
                )}
              </div>
            </div>

            {/* Slow Moving Items */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                  Slow Moving Items
                </h3>
                <p className="text-sm text-gray-600 mt-1">Low turnover products</p>
              </div>
              <div className="p-6">
                {reportData.turnover_analysis.slow_moving && reportData.turnover_analysis.slow_moving.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {reportData.turnover_analysis.slow_moving.slice(0, 10).map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.product_name}</div>
                          <div className="text-sm text-gray-600">SKU: {item.sku}</div>
                        </div>
                        <div className="text-right mr-4">
                          <div className="text-sm font-bold text-orange-600">
                            {item.turnover_rate.toFixed(2)}x
                          </div>
                          <div className="text-xs text-gray-600">
                            Stock: {item.current_stock}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMovementColor(item.movement_status)}`}>
                          {item.movement_status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No slow moving items</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
