/**
 * PackageSalesImpact Component
 * 
 * Displays inventory consumption breakdown by sales channel
 * Shows direct sales vs package consumption with detailed breakdown
 * 
 * @module views/inventory/PackageSalesImpact
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import {
  TrendingUp,
  Package as PackageIcon,
  ShoppingCart,
  Lightbulb,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/views/shared/ui/badge';
import {
  getInventoryConsumptionByChannel,
  generateSalesChannelInsights,
  ConsumptionByChannel,
  SalesChannelInsights,
} from '@/data/queries/sales-impact.queries';
import { subDays, format } from 'date-fns';

interface PackageSalesImpactProps {
  productId: string;
  initialDateRange?: { start: string; end: string };
}

type DateRangePreset = '7' | '30' | '90';

/**
 * PackageSalesImpact - Shows consumption breakdown by sales channel
 */
export default function PackageSalesImpact({
  productId,
  initialDateRange,
}: PackageSalesImpactProps) {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('30');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    initialDateRange || {
      start: subDays(new Date(), 30).toISOString(),
      end: new Date().toISOString(),
    }
  );
  const [consumption, setConsumption] = useState<ConsumptionByChannel | null>(null);
  const [insights, setInsights] = useState<SalesChannelInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInventoryConsumptionByChannel(productId, dateRange);
      setConsumption(data);
      setInsights(generateSalesChannelInsights(data));
    } catch (err: any) {
      setError(err.message || 'Failed to load sales impact data');
      console.error('Error loading sales impact:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [productId, dateRange]);

  const handleDateRangeChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    const days = parseInt(preset, 10);
    setDateRange({
      start: subDays(new Date(), days).toISOString(),
      end: new Date().toISOString(),
    });
  };

  const getChannelBadge = (channel: 'direct' | 'package' | 'balanced') => {
    const config = {
      direct: { label: 'Direct Sales', className: 'bg-blue-100 text-blue-800' },
      package: { label: 'Package Sales', className: 'bg-purple-100 text-purple-800' },
      balanced: { label: 'Balanced', className: 'bg-green-100 text-green-800' },
    };

    const { label, className } = config[channel];
    return <Badge className={className}>{label}</Badge>;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading sales impact data...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p className="font-semibold">Error loading data</p>
          <p className="text-sm mt-1">{error}</p>
          <Button onClick={loadData} variant="outline" size="sm" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!consumption || consumption.total_consumed === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500 py-8">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No sales data available</p>
          <p className="text-sm mt-1">No consumption recorded in the selected date range</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Date Range Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Sales Impact Analysis</h3>
          <p className="text-sm text-gray-600">{consumption.product_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div className="flex gap-1">
            {(['7', '30', '90'] as DateRangePreset[]).map((preset) => (
              <Button
                key={preset}
                variant={dateRangePreset === preset ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange(preset)}
              >
                {preset} days
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Consumed</p>
              <p className="text-2xl font-bold text-gray-900">
                {consumption.total_consumed.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">units</p>
            </div>
            <TrendingUp className="w-8 h-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Direct Sales</p>
              <p className="text-2xl font-bold text-blue-900">
                {consumption.direct_sales.toFixed(1)}
              </p>
              <p className="text-xs text-blue-600">
                {consumption.direct_percentage.toFixed(1)}% of total
              </p>
            </div>
            <ShoppingCart className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 bg-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700">Package Sales</p>
              <p className="text-2xl font-bold text-purple-900">
                {consumption.package_consumption.toFixed(1)}
              </p>
              <p className="text-xs text-purple-600">
                {consumption.package_percentage.toFixed(1)}% of total
              </p>
            </div>
            <PackageIcon className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Consumption Breakdown Chart */}
      <Card className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Consumption Breakdown</h4>
        <div className="space-y-4">
          {/* Direct Sales Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Direct Sales</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {consumption.direct_sales.toFixed(1)} units ({consumption.direct_percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${consumption.direct_percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Package Sales Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PackageIcon className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Package Consumption</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {consumption.package_consumption.toFixed(1)} units ({consumption.package_percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-purple-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${consumption.package_percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </Card>

      {/* Package Breakdown */}
      {consumption.package_breakdown.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold text-gray-900 mb-4">
            Package Breakdown ({consumption.package_breakdown.length})
          </h4>
          <div className="space-y-3">
            {consumption.package_breakdown.map((pkg) => (
              <div
                key={pkg.package_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{pkg.package_name}</p>
                  <p className="text-xs text-gray-600">
                    {pkg.package_sales_count} packages sold
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold text-gray-900">
                    {pkg.quantity_consumed.toFixed(1)} units
                  </p>
                  <p className="text-xs text-gray-600">{pkg.percentage.toFixed(1)}% of total</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Insights Section */}
      {insights && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-blue-900">Insights & Recommendations</h4>
                {getChannelBadge(insights.dominant_channel)}
              </div>
              <p className="text-sm text-blue-800 leading-relaxed">{insights.recommendation}</p>
              {insights.top_package_consumer && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">Top Package Consumer</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {insights.top_package_consumer.package_name}
                  </p>
                  <p className="text-xs text-blue-600">
                    {insights.top_package_consumer.quantity_consumed.toFixed(1)} units consumed
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Metadata Footer */}
      <div className="text-xs text-gray-500 text-center">
        Data from {format(new Date(dateRange.start), 'MMM d')} -{' '}
        {format(new Date(dateRange.end), 'MMM d, yyyy')} • SKU: {consumption.sku || 'N/A'}
      </div>
    </div>
  );
}
