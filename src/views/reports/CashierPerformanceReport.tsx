// @ts-nocheck - Supabase query result type inference issues
'use client';

/**
 * Cashier Performance Report Component
 * Analyze cashier performance metrics including sales, transactions, and averages
 */

import { useState, useEffect } from 'react';
import { Users, Award, DollarSign, ShoppingCart } from 'lucide-react';
import { DateRangeFilter, DatePeriod } from './DateRangeFilter';

interface CashierPerformance {
  cashier_id: string;
  cashier_name: string;
  total_sales: number;
  transaction_count: number;
  average_transaction: number;
}

export function CashierPerformanceReport() {
  const [loading, setLoading] = useState(true);
  const [cashiers, setCashiers] = useState<CashierPerformance[]>([]);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [sortBy, setSortBy] = useState<'sales' | 'transactions' | 'average'>('sales');

  const fetchCashierPerformance = async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/reports/sales?type=cashiers&startDate=${startDate}&endDate=${endDate}`
      );
      const result = await response.json();
      
      if (result.success) {
        setCashiers(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch cashier performance:', error);
      setCashiers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (startDate: string, endDate: string, period: DatePeriod) => {
    setDateRange({ startDate, endDate });
    fetchCashierPerformance(startDate, endDate);
  };

  useEffect(() => {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    handleDateRangeChange(monthAgo.toISOString(), now.toISOString(), 'month');
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

  // Sort cashiers
  const sortedCashiers = [...cashiers].sort((a, b) => {
    switch (sortBy) {
      case 'sales':
        return b.total_sales - a.total_sales;
      case 'transactions':
        return b.transaction_count - a.transaction_count;
      case 'average':
        return b.average_transaction - a.average_transaction;
      default:
        return 0;
    }
  });

  // Calculate totals
  const totalSales = cashiers.reduce((sum, c) => sum + c.total_sales, 0);
  const totalTransactions = cashiers.reduce((sum, c) => sum + c.transaction_count, 0);
  const overallAverage = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Cashier Performance Report</h2>
        </div>
      </div>

      {/* Date Filter */}
      <DateRangeFilter onDateRangeChange={handleDateRangeChange} defaultPeriod="month" />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-600">Active Cashiers</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{cashiers.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-600">Total Sales</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {formatCurrency(totalSales)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-600">Total Transactions</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {formatNumber(totalTransactions)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-600">Overall Avg Transaction</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {formatCurrency(overallAverage)}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {sortedCashiers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top by Sales */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-gray-900">Top Seller</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {sortedCashiers[0]?.cashier_name}
            </div>
            <div className="text-lg font-bold text-yellow-600">
              {formatCurrency(sortedCashiers[0]?.total_sales || 0)}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {formatNumber(sortedCashiers[0]?.transaction_count || 0)} transactions
            </div>
          </div>

          {/* Most Transactions */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Most Active</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {[...cashiers].sort((a, b) => b.transaction_count - a.transaction_count)[0]?.cashier_name}
            </div>
            <div className="text-lg font-bold text-blue-600">
              {formatNumber([...cashiers].sort((a, b) => b.transaction_count - a.transaction_count)[0]?.transaction_count || 0)} orders
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {formatCurrency([...cashiers].sort((a, b) => b.transaction_count - a.transaction_count)[0]?.total_sales || 0)} in sales
            </div>
          </div>

          {/* Highest Average */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Highest Average</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {[...cashiers].sort((a, b) => b.average_transaction - a.average_transaction)[0]?.cashier_name}
            </div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency([...cashiers].sort((a, b) => b.average_transaction - a.average_transaction)[0]?.average_transaction || 0)}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              per transaction
            </div>
          </div>
        </div>
      )}

      {/* Cashier Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Performance Breakdown</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('sales')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'sales' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                By Sales
              </button>
              <button
                onClick={() => setSortBy('transactions')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'transactions' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                By Orders
              </button>
              <button
                onClick={() => setSortBy('average')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'average' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                By Average
              </button>
            </div>
          </div>
        </div>

        {sortedCashiers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No cashier data available for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cashier Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Sales
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Transaction
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Total Sales
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedCashiers.map((cashier, index) => {
                  const salesPercentage = totalSales > 0 ? (cashier.total_sales / totalSales) * 100 : 0;

                  return (
                    <tr key={cashier.cashier_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`
                          inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                          ${index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                            index === 1 ? 'bg-gray-200 text-gray-700' : 
                            index === 2 ? 'bg-orange-100 text-orange-700' : 
                            'bg-gray-100 text-gray-600'}
                        `}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {cashier.cashier_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(cashier.total_sales)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatNumber(cashier.transaction_count)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(cashier.average_transaction)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(salesPercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12 text-right">
                            {salesPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
