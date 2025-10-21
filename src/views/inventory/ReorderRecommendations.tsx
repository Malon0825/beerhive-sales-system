/**
 * ReorderRecommendations Component
 * 
 * Displays smart reorder recommendations considering both direct sales
 * and package component consumption. Includes filtering, sorting, and export.
 * 
 * @module views/inventory/ReorderRecommendations
 */

'use client';

import { useState } from 'react';
import { useReorderRecommendations } from '@/data/queries/reorder-recommendations.queries';
import { Card } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import {
  Download,
  AlertTriangle,
  TrendingUp,
  Package,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/views/shared/ui/badge';
import { format } from 'date-fns';

interface ReorderRecommendationsProps {
  days?: number;
  buffer?: number;
  onExport?: () => void;
}

/**
 * ReorderRecommendations - Smart reorder recommendations with package awareness
 */
export default function ReorderRecommendations({
  days = 30,
  buffer = 14,
  onExport,
}: ReorderRecommendationsProps) {
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'normal'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [daysParam, setDaysParam] = useState(days);
  const [bufferParam, setBufferParam] = useState(buffer);

  const { data, isLoading, error, refetch } = useReorderRecommendations({
    days: daysParam,
    buffer: bufferParam,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
  });

  const toggleRowExpansion = (productId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedRows(newExpanded);
  };

  const getPriorityBadge = (priority: 'urgent' | 'high' | 'normal') => {
    const config = {
      urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
      normal: { label: 'Normal', className: 'bg-blue-100 text-blue-800' },
    };

    const { label, className } = config[priority];
    return <Badge className={className}>{label}</Badge>;
  };

  const handleExportCSV = () => {
    if (!data) return;

    const headers = [
      'Product Name',
      'SKU',
      'Current Stock',
      'Direct Sales',
      'Package Consumption',
      'Total Consumed',
      'Daily Velocity',
      'Days Until Stockout',
      'Recommended Reorder',
      'Priority',
    ];

    const rows = data.recommendations.map((rec) => [
      rec.product_name,
      rec.sku,
      rec.current_stock.toString(),
      rec.direct_sales.toString(),
      rec.package_consumption.toString(),
      rec.total_consumed.toString(),
      rec.daily_velocity.toFixed(2),
      rec.days_until_stockout === 9999 ? 'N/A' : rec.days_until_stockout.toFixed(1),
      rec.recommended_reorder.toString(),
      rec.priority,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reorder-recommendations-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onExport) onExport();
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold">Failed to load recommendations</p>
          <p className="text-sm text-gray-600 mt-1">{error.message}</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reorder Recommendations</h2>
          <p className="text-sm text-gray-600 mt-1">
            Smart recommendations based on sales patterns and package consumption
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={!data}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.total_products}</p>
              </div>
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          </Card>
          <Card className="p-4 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Urgent</p>
                <p className="text-2xl font-bold text-red-900">{data.summary.urgent_count}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </Card>
          <Card className="p-4 bg-orange-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">High Priority</p>
                <p className="text-2xl font-bold text-orange-900">{data.summary.high_priority_count}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Normal</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.normal_count}</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by Priority:</span>
          </div>
          <div className="flex gap-2">
            {(['all', 'urgent', 'high', 'normal'] as const).map((filter) => (
              <Button
                key={filter}
                variant={priorityFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriorityFilter(filter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Recommendations Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-4">Loading recommendations...</p>
          </div>
        ) : data && data.recommendations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Daily Velocity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Days Until Stockout
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Recommended Order
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.recommendations.map((rec) => {
                  const isExpanded = expandedRows.has(rec.product_id);
                  return (
                    <>
                      <tr key={rec.product_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{rec.product_name}</p>
                            {rec.sku && <p className="text-xs text-gray-500">SKU: {rec.sku}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-gray-900">{rec.current_stock}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-900">{rec.daily_velocity.toFixed(2)}/day</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-semibold ${
                              rec.days_until_stockout < 7
                                ? 'text-red-600'
                                : rec.days_until_stockout < 14
                                ? 'text-orange-600'
                                : 'text-gray-900'
                            }`}
                          >
                            {rec.days_until_stockout === 9999 ? 'N/A' : `${rec.days_until_stockout.toFixed(1)} days`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-blue-600">{rec.recommended_reorder} units</span>
                        </td>
                        <td className="px-4 py-3 text-center">{getPriorityBadge(rec.priority)}</td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(rec.product_id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Consumption Breakdown */}
                              <div>
                                <h4 className="font-semibold text-sm text-gray-900 mb-2">Consumption Breakdown</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-700">Direct Sales:</span>
                                    <span className="font-semibold text-gray-900">
                                      {rec.direct_sales} units (
                                      {rec.total_consumed > 0
                                        ? ((rec.direct_sales / rec.total_consumed) * 100).toFixed(1)
                                        : '0'}
                                      %)
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-700">Package Consumption:</span>
                                    <span className="font-semibold text-gray-900">
                                      {rec.package_consumption} units (
                                      {rec.total_consumed > 0
                                        ? ((rec.package_consumption / rec.total_consumed) * 100).toFixed(1)
                                        : '0'}
                                      %)
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm border-t pt-2">
                                    <span className="font-semibold text-gray-900">Total Consumed:</span>
                                    <span className="font-bold text-gray-900">{rec.total_consumed} units</span>
                                  </div>
                                </div>
                              </div>

                              {/* Package Breakdown */}
                              {rec.usage_breakdown.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-sm text-gray-900 mb-2">
                                    Package Usage ({rec.usage_breakdown.length})
                                  </h4>
                                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                    {rec.usage_breakdown.map((pkg) => (
                                      <div
                                        key={pkg.package_id}
                                        className="flex justify-between items-center text-sm bg-white px-2 py-1.5 rounded"
                                      >
                                        <span className="text-gray-700 truncate">{pkg.package_name}</span>
                                        <span className="font-semibold text-gray-900 ml-2">
                                          {pkg.quantity_consumed.toFixed(1)} ({pkg.percentage.toFixed(1)}%)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No recommendations available</p>
            <p className="text-sm mt-1">Try adjusting the date range or filters</p>
          </div>
        )}
      </Card>

      {/* Metadata Footer */}
      {data && (
        <div className="text-xs text-gray-500 text-center">
          Analyzed {data.metadata.days_analyzed} days of sales data (
          {format(new Date(data.metadata.start_date), 'MMM d')} -{' '}
          {format(new Date(data.metadata.end_date), 'MMM d, yyyy')}) • Buffer: {data.metadata.buffer_days} days
        </div>
      )}
    </div>
  );
}
