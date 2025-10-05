'use client';

/**
 * Discount Analysis Report Component
 * Analyze discounts given by cashier, reason, and type
 */

import { useState, useEffect } from 'react';
import { Percent, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { DateRangeFilter, DatePeriod } from './DateRangeFilter';

interface DiscountData {
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  reason: string;
  created_at: string;
  cashier?: { full_name: string };
  manager?: { full_name: string };
}

export function DiscountAnalysisReport() {
  const [loading, setLoading] = useState(true);
  const [discounts, setDiscounts] = useState<DiscountData[]>([]);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const fetchDiscounts = async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const { getDiscountAnalysis } = await import('@/data/queries/reports.queries');
      const result = await getDiscountAnalysis(startDate, endDate);
      setDiscounts(result || []);
    } catch (error) {
      console.error('Failed to fetch discount data:', error);
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (startDate: string, endDate: string, period: DatePeriod) => {
    setDateRange({ startDate, endDate });
    fetchDiscounts(startDate, endDate);
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
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Calculate analytics
  const totalDiscountAmount = discounts.reduce((sum, d) => sum + parseFloat(d.discount_amount as any), 0);

  // Group by type
  const byType = discounts.reduce((acc, d) => {
    const type = d.discount_type || 'unknown';
    if (!acc[type]) {
      acc[type] = { count: 0, total: 0 };
    }
    acc[type].count += 1;
    acc[type].total += parseFloat(d.discount_amount as any);
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  // Group by reason
  const byReason = discounts.reduce((acc, d) => {
    const reason = d.reason || 'No reason';
    if (!acc[reason]) {
      acc[reason] = { count: 0, total: 0 };
    }
    acc[reason].count += 1;
    acc[reason].total += parseFloat(d.discount_amount as any);
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  // Group by cashier
  const byCashier = discounts.reduce((acc, d) => {
    const cashier = d.cashier?.full_name || 'Unknown';
    if (!acc[cashier]) {
      acc[cashier] = { count: 0, total: 0 };
    }
    acc[cashier].count += 1;
    acc[cashier].total += parseFloat(d.discount_amount as any);
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const topReasons = Object.entries(byReason)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5);

  const topCashiers = Object.entries(byCashier)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5);

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
          <Percent className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Discount Analysis Report</h2>
        </div>
      </div>

      {/* Date Filter */}
      <DateRangeFilter onDateRangeChange={handleDateRangeChange} defaultPeriod="month" />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-600">Total Discounts Given</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{discounts.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-600">Total Discount Amount</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {formatCurrency(totalDiscountAmount)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-600">Average Discount</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {discounts.length > 0 ? formatCurrency(totalDiscountAmount / discounts.length) : formatCurrency(0)}
          </div>
        </div>
      </div>

      {/* Discount by Type */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Discounts by Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(byType).map(([type, data], index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-600 capitalize mb-1">
                {type.replace('_', ' ')}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.total)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {data.count} discounts
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Discount Reasons */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Discount Reasons</h3>
          <div className="space-y-3">
            {topReasons.map(([reason, data], index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{reason}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(data.total)}
                    </div>
                    <div className="text-xs text-gray-600">{data.count} times</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${(data.total / totalDiscountAmount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cashiers by Discount Given */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Discounts by Cashier</h3>
          <div className="space-y-3">
            {topCashiers.map(([cashier, data], index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{cashier}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(data.total)}
                    </div>
                    <div className="text-xs text-gray-600">{data.count} discounts</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(data.total / totalDiscountAmount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Discounts Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Discounts</h3>
        </div>
        
        {discounts.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No discounts given in this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cashier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {discounts.slice(0, 20).map((discount, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(discount.created_at), 'MMM dd, HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                        {discount.discount_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {discount.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {discount.discount_type === 'percentage' 
                        ? `${discount.discount_value}%` 
                        : formatCurrency(discount.discount_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-green-600">
                        {formatCurrency(parseFloat(discount.discount_amount as any))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {discount.cashier?.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {discount.manager?.full_name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
