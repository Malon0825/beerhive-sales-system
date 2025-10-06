// @ts-nocheck - Supabase query result type inference issues
'use client';

/**
 * Voided Transactions Report Component
 * Display all voided orders with reasons and metrics
 */

import { useState, useEffect } from 'react';
import { XCircle, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { DateRangeFilter, DatePeriod } from './DateRangeFilter';

interface VoidedTransaction {
  id: string;
  order_number: string;
  total_amount: number;
  voided_reason: string;
  voided_at: string;
  created_at: string;
  cashier?: { full_name: string };
  voided_by_user?: { full_name: string };
}

export function VoidedTransactionsReport() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<VoidedTransaction[]>([]);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const fetchVoidedTransactions = async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const { getVoidedTransactions } = await import('@/data/queries/reports.queries');
      const result = await getVoidedTransactions(startDate, endDate);
      setTransactions(result || []);
    } catch (error) {
      console.error('Failed to fetch voided transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (startDate: string, endDate: string, period: DatePeriod) => {
    setDateRange({ startDate, endDate });
    fetchVoidedTransactions(startDate, endDate);
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

  // Calculate metrics
  const totalVoidedAmount = transactions.reduce((sum, t) => sum + parseFloat(t.total_amount as any), 0);
  const voidReasons = transactions.reduce((acc, t) => {
    const reason = t.voided_reason || 'No reason provided';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topReasons = Object.entries(voidReasons)
    .sort(([, a], [, b]) => b - a)
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
          <XCircle className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900">Voided Transactions Report</h2>
        </div>
      </div>

      {/* Date Filter */}
      <DateRangeFilter onDateRangeChange={handleDateRangeChange} defaultPeriod="month" />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-600">Total Voided Orders</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{transactions.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-600">Total Voided Amount</div>
          <div className="text-3xl font-bold text-red-600 mt-2">
            {formatCurrency(totalVoidedAmount)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-600">Average Void Amount</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {transactions.length > 0 ? formatCurrency(totalVoidedAmount / transactions.length) : formatCurrency(0)}
          </div>
        </div>
      </div>

      {/* Common Void Reasons */}
      {topReasons.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Void Reasons</h3>
          <div className="space-y-3">
            {topReasons.map(([reason, count], index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{reason}</span>
                  <span className="text-sm font-bold text-gray-900">{count} orders</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all"
                    style={{ width: `${(count / transactions.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Voided Transactions</h3>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No voided transactions found in this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cashier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voided By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Void Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.order_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-600">
                        {formatCurrency(parseFloat(transaction.total_amount as any))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {transaction.cashier?.full_name || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {transaction.voided_by_user?.full_name || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {transaction.voided_reason || 'No reason provided'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(transaction.voided_at), 'MMM dd, yyyy HH:mm')}
                      </div>
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
