/**
 * BottleneckDashboard Component
 * 
 * Displays critical bottleneck products that limit package availability
 * Shows impact analysis and optimal restock recommendations
 * 
 * Phase 4.3.3: Optimized with useMemo and useCallback for performance
 * 
 * @module views/inventory/BottleneckDashboard
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import {
  AlertTriangle,
  Package as PackageIcon,
  DollarSign,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Download,
} from 'lucide-react';
import { BottleneckAnalyzer, BottleneckProduct, BottleneckAnalysisResult } from '@/core/services/inventory/BottleneckAnalyzer';
import { exportBottleneckAnalysis } from '@/lib/utils/export';

/**
 * BottleneckDashboard - Shows critical bottleneck products with impact analysis
 */
export default function BottleneckDashboard() {
  const [analysis, setAnalysis] = useState<BottleneckAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Memoized data loading function
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await BottleneckAnalyzer.identifyBottlenecks();
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load bottleneck analysis');
      console.error('Error loading bottlenecks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // Memoized toggle function
  const toggleRow = useCallback((productId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  const getSeverityColor = (severity: number) => {
    if (severity > 10000) return 'text-red-600';
    if (severity > 5000) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getSeverityBadge = (severity: number) => {
    if (severity > 10000) {
      return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
    }
    if (severity > 5000) {
      return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
  };

  // Memoized export handler
  const handleExport = useCallback(() => {
    if (analysis) {
      exportBottleneckAnalysis(analysis.bottlenecks);
    }
  }, [analysis]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Analyzing bottlenecks...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold">Error loading bottleneck analysis</p>
          <p className="text-sm mt-1">{error}</p>
          <Button onClick={loadData} variant="outline" size="sm" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!analysis || analysis.bottlenecks.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500 py-8">
          <PackageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No bottlenecks detected</p>
          <p className="text-sm mt-1">All products have adequate stock for package sales</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bottleneck Analysis</h2>
          <p className="text-sm text-gray-600 mt-1">
            Products limiting package availability and revenue
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            disabled={!analysis || analysis.bottlenecks.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bottlenecks</p>
              <p className="text-2xl font-bold text-gray-900">{analysis.summary.total_bottlenecks}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Critical</p>
              <p className="text-2xl font-bold text-red-900">{analysis.summary.critical_bottlenecks}</p>
              <p className="text-xs text-red-600">Below reorder point</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Packages Affected</p>
              <p className="text-2xl font-bold text-gray-900">{analysis.summary.total_packages_affected}</p>
            </div>
            <PackageIcon className="w-8 h-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4 bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700">Revenue at Risk</p>
              <p className="text-2xl font-bold text-orange-900">
                ₱{(analysis.summary.total_revenue_at_risk / 1000).toFixed(1)}K
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Bottlenecks Table */}
      <Card>
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
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Packages Affected
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Revenue Impact
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Optimal Restock
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysis.bottlenecks.map((bottleneck) => {
                const isExpanded = expandedRows.has(bottleneck.product_id);
                const isCritical = bottleneck.current_stock <= bottleneck.reorder_point;

                return (
                  <>
                    <tr key={bottleneck.product_id} className={`hover:bg-gray-50 ${isCritical ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isCritical && <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                          <div>
                            <p className="font-medium text-gray-900">{bottleneck.product_name}</p>
                            {bottleneck.sku && <p className="text-xs text-gray-500">SKU: {bottleneck.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>
                          {bottleneck.current_stock}
                        </span>
                        {isCritical && (
                          <p className="text-xs text-red-600">
                            Reorder: {bottleneck.reorder_point}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-gray-900">
                          {bottleneck.total_packages_affected}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${getSeverityColor(bottleneck.bottleneck_severity)}`}>
                          ₱{bottleneck.total_revenue_impact.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-blue-600">{bottleneck.optimal_restock} units</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getSeverityBadge(bottleneck.bottleneck_severity)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(bottleneck.product_id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                    </tr>

                    {/* Expanded Row - Affected Packages */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                                <PackageIcon className="w-4 h-4" />
                                Affected Packages ({bottleneck.affected_packages.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {bottleneck.affected_packages.map((pkg) => (
                                  <div
                                    key={pkg.package_id}
                                    className="p-3 bg-white border border-gray-200 rounded-lg"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{pkg.package_name}</p>
                                        <div className="mt-1 space-y-1">
                                          <p className="text-xs text-gray-600">
                                            Max sellable: <span className="font-semibold">{pkg.max_sellable} packages</span>
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            Required: <span className="font-semibold">{pkg.required_per_package} units/pkg</span>
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right ml-3">
                                        <p className="text-sm font-bold text-orange-600">
                                          ₱{pkg.potential_revenue.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-500">potential</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Recommendation */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start gap-3">
                                <ShoppingBag className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-medium text-blue-900 mb-1">💡 Recommendation</p>
                                  <p className="text-sm text-blue-800">
                                    Restock with <span className="font-bold">{bottleneck.optimal_restock} units</span> to
                                    support 50 packages across all affected items. This will unlock{' '}
                                    <span className="font-bold">₱{bottleneck.total_revenue_impact.toFixed(2)}</span> in
                                    potential revenue.
                                  </p>
                                </div>
                              </div>
                            </div>
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
      </Card>
    </div>
  );
}
