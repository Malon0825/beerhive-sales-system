'use client';

/**
 * Sales Chart Component
 * Visual representation of sales data using Recharts
 */

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export type ChartType = 'line' | 'bar';

interface SalesChartProps {
  data: any[];
  chartType?: ChartType;
  title?: string;
  showTrend?: boolean;
}

export function SalesChart({ data, chartType = 'line', title = 'Sales Overview', showTrend = true }: SalesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available for the selected period
        </div>
      </div>
    );
  }

  // Calculate trend
  const calculateTrend = () => {
    if (data.length < 2) return { value: 0, isPositive: true };
    
    const recentRevenue = data.slice(-3).reduce((sum, d) => sum + (d.total_revenue || 0), 0) / Math.min(3, data.length);
    const olderRevenue = data.slice(0, 3).reduce((sum, d) => sum + (d.total_revenue || 0), 0) / Math.min(3, data.length);
    
    const percentChange = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue) * 100 : 0;
    
    return {
      value: Math.abs(percentChange).toFixed(1),
      isPositive: percentChange >= 0,
    };
  };

  const trend = showTrend ? calculateTrend() : null;

  // Format data for chart
  const formattedData = data.map(item => ({
    ...item,
    date: item.date ? format(new Date(item.date), 'MMM dd') : 
          item.hour !== undefined ? `${item.hour}:00` : 
          item.category_name || item.payment_method || 'N/A',
    revenue: parseFloat(item.total_revenue || item.total_amount || item.total_sales || 0),
    transactions: parseInt(item.transaction_count || item.count || 0),
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Revenue' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {chartType === 'line' ? (
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            {formattedData[0]?.transactions !== undefined && (
              <Line
                type="monotone"
                dataKey="transactions"
                name="Transactions"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                yAxisId="right"
              />
            )}
          </LineChart>
        ) : (
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            {formattedData[0]?.transactions !== undefined && (
              <Bar
                dataKey="transactions"
                name="Transactions"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                yAxisId="right"
              />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
