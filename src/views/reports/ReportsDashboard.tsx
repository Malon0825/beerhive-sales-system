// @ts-nocheck - Supabase query result type inference issues
'use client';

/**
 * Reports Dashboard Component
 * Main dashboard for viewing sales, inventory, and customer reports
 */

import { useState, useEffect } from 'react';
import { DateRangeFilter, DatePeriod } from './DateRangeFilter';
import { SalesChart } from './SalesChart';
import { TopProductsTable } from './TopProductsTable';
import { ExportReportButton } from './ExportReportButton';
import { ExcelExportButton, ExcelExportMultiSheet } from './ExcelExportButton';
import { ExcelHeader } from '@/core/services/export/ExcelExportService';
import { DollarSign, ShoppingCart, Users, TrendingUp, Package, AlertTriangle } from 'lucide-react';

interface DashboardData {
  sales: any;
  inventory: any;
  customers: any;
}

export function ReportsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '', period: 'week' as DatePeriod });
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  const fetchReports = async (startDate: string, endDate: string, period: DatePeriod) => {
    setLoading(true);
    setError(null);

    try {
      const [salesRes, inventoryRes, customersRes] = await Promise.all([
        fetch(`/api/reports/sales?type=comprehensive&startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/reports/inventory?type=summary&startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/reports/customers?type=summary&startDate=${startDate}&endDate=${endDate}`),
      ]);

      if (!salesRes.ok || !inventoryRes.ok || !customersRes.ok) {
        throw new Error('Failed to fetch reports');
      }

      const [sales, inventory, customers] = await Promise.all([
        salesRes.json(),
        inventoryRes.json(),
        customersRes.json(),
      ]);

      setDashboardData({
        sales: sales.data,
        inventory: inventory.data,
        customers: customers.data,
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching reports');
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (startDate: string, endDate: string, period: DatePeriod) => {
    setDateRange({ startDate, endDate, period });
    fetchReports(startDate, endDate, period);
  };

  useEffect(() => {
    // Initialize with default week period
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    handleDateRangeChange(weekAgo.toISOString(), now.toISOString(), 'week');
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-PH').format(value);
  };

  /**
   * Define Excel headers for sales data export
   */
  const salesHeaders: ExcelHeader[] = [
    { key: 'date', label: 'Date', width: 12, format: 'date' },
    { key: 'total_revenue', label: 'Revenue', width: 15, format: 'currency' },
    { key: 'transaction_count', label: 'Orders', width: 10, format: 'number' },
    { key: 'average_transaction', label: 'Avg Order Value', width: 15, format: 'currency' },
  ];

  /**
   * Define Excel headers for top products export
   */
  const productsHeaders: ExcelHeader[] = [
    { key: 'product_name', label: 'Product Name', width: 25 },
    { key: 'quantity_sold', label: 'Quantity Sold', width: 15, format: 'number' },
    { key: 'total_revenue', label: 'Revenue', width: 15, format: 'currency' },
  ];

  /**
   * Define Excel headers for categories export
   */
  const categoriesHeaders: ExcelHeader[] = [
    { key: 'category_name', label: 'Category', width: 20 },
    { key: 'total_revenue', label: 'Revenue', width: 15, format: 'currency' },
    { key: 'product_count', label: 'Products', width: 12, format: 'number' },
  ];

  /**
   * Define Excel headers for payment methods export
   */
  const paymentHeaders: ExcelHeader[] = [
    { key: 'payment_method', label: 'Payment Method', width: 20 },
    { key: 'total_amount', label: 'Total Amount', width: 15, format: 'currency' },
    { key: 'count', label: 'Transaction Count', width: 15, format: 'number' },
  ];

  /**
   * Define Excel headers for cashiers export
   */
  const cashiersHeaders: ExcelHeader[] = [
    { key: 'cashier_name', label: 'Cashier Name', width: 25 },
    { key: 'total_sales', label: 'Total Sales', width: 15, format: 'currency' },
    { key: 'transaction_count', label: 'Transactions', width: 15, format: 'number' },
  ];

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error loading reports: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive business insights and metrics</p>
        </div>
        
        {/* Export Buttons */}
        {dashboardData && (
          <div className="flex gap-3">
            {/* CSV Export */}
            <ExportReportButton 
              data={dashboardData?.sales.daily_sales || []} 
              filename="sales_report"
            />
            
            {/* Excel Single Sheet Export */}
            <ExcelExportButton
              data={dashboardData?.sales.daily_sales || []}
              filename="sales_report"
              headers={salesHeaders}
              sheetName="Daily Sales"
              formatting={{
                totalsRow: true,
                alternateRows: true
              }}
            />
            
            {/* Excel Multi-Sheet Export */}
            <ExcelExportMultiSheet
              sheets={[
                {
                  name: 'Sales Summary',
                  data: dashboardData?.sales.daily_sales || [],
                  headers: salesHeaders,
                  formatting: { totalsRow: true }
                },
                {
                  name: 'Top Products',
                  data: dashboardData?.sales.top_products || [],
                  headers: productsHeaders
                },
                {
                  name: 'Categories',
                  data: dashboardData?.sales.categories || [],
                  headers: categoriesHeaders
                },
                {
                  name: 'Payment Methods',
                  data: dashboardData?.sales.payment_methods || [],
                  headers: paymentHeaders
                },
                {
                  name: 'Top Cashiers',
                  data: dashboardData?.sales.cashiers || [],
                  headers: cashiersHeaders
                }
              ]}
              filename="comprehensive_report"
            />
          </div>
        )}
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter
        onDateRangeChange={handleDateRangeChange}
        defaultPeriod="week"
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : dashboardData ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Revenue */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(dashboardData.sales.summary.total_revenue || 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Avg: {formatCurrency(dashboardData.sales.summary.average_transaction_value || 0)}
              </p>
            </div>

            {/* Total Transactions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatNumber(dashboardData.sales.summary.total_transactions || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Discounts: {formatCurrency(dashboardData.sales.summary.total_discounts || 0)}
              </p>
            </div>

            {/* Active Customers */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Customers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatNumber(dashboardData.customers.active_customers || 0)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                VIP: {formatNumber(dashboardData.customers.vip_customers || 0)}
              </p>
            </div>

            {/* Inventory Status */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatNumber(dashboardData.inventory.total_products || 0)}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-red-600 mt-4 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Low Stock: {formatNumber(dashboardData.inventory.low_stock_count || 0)}
              </p>
            </div>
          </div>

          {/* Sales Chart */}
          <SalesChart
            data={dashboardData.sales.daily_sales || []}
            chartType="line"
            title="Sales Trend"
            showTrend={true}
          />

          {/* Grid: Top Products and Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <TopProductsTable
              products={dashboardData.sales.top_products || []}
              title="Top Selling Products"
              limit={5}
            />

            {/* Sales by Category */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Sales by Category</h3>
              </div>
              <div className="p-6">
                {dashboardData.sales.categories && dashboardData.sales.categories.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.sales.categories.slice(0, 5).map((cat: any, index: number) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {cat.category_name || 'Uncategorized'}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(cat.total_revenue || 0)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                (cat.total_revenue / dashboardData.sales.categories[0].total_revenue) * 100,
                                100
                              )}%`,
                            }}
                          />
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

          {/* Payment Methods and Cashier Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
              </div>
              <div className="p-6">
                {dashboardData.sales.payment_methods && dashboardData.sales.payment_methods.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.sales.payment_methods.map((pm: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {pm.payment_method || 'Unknown'}
                        </span>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(pm.total_amount || 0)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatNumber(pm.count || 0)} orders
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No payment data available</p>
                )}
              </div>
            </div>

            {/* Top Cashiers */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Top Cashiers</h3>
              </div>
              <div className="p-6">
                {dashboardData.sales.cashiers && dashboardData.sales.cashiers.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.sales.cashiers.slice(0, 5).map((cashier: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                            ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'}
                          `}>
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {cashier.cashier_name || 'Unknown'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(cashier.total_sales || 0)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatNumber(cashier.transaction_count || 0)} orders
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No cashier data available</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
