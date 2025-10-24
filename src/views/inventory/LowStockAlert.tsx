'use client';

import { useState, useEffect } from 'react';
import { getUrgencyColor, getUrgencyLabel } from '@/core/utils/inventory/stockAlertUtils';
import { Badge } from '../shared/ui/badge';
import { Button } from '../shared/ui/button';
import { AlertTriangle, ShoppingCart, TrendingDown, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { usePackageImpact } from '@/lib/hooks/usePackageAvailability';
import { StockStatusBadge, getStockStatusFromQuantity } from '../shared/ui/StockStatusBadge';

/**
 * Filter types for low stock alerts
 */
type AlertFilter = 'all' | 'critical' | 'urgent' | 'moderate' | 'low';

/**
 * LowStockAlert Component
 * Displays products with low stock levels categorized by urgency
 * Fetches data from API endpoint and uses client-safe utility functions
 * Features clickable filter cards to filter alerts by urgency level
 */
export default function LowStockAlert() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<AlertFilter>('all');
  const [summary, setSummary] = useState({
    total: 0,
    critical: 0,
    urgent: 0,
    moderate: 0,
    low: 0,
  });

  useEffect(() => {
    loadAlerts();
  }, []);

  /**
   * Load alerts and summary data from API
   */
  const loadAlerts = async () => {
    try {
      setLoading(true);
      
      const [alertsData, summaryData] = await Promise.all([
        fetch('/api/inventory/low-stock').then((r) => r.json()),
        fetch('/api/inventory/low-stock?type=summary').then((r) => r.json()),
      ]);

      if (alertsData.success) {
        setAlerts(alertsData.data || []);
      }

      if (summaryData.success) {
        setSummary(summaryData.data);
      }
    } catch (error) {
      console.error('Load alerts error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter alerts based on urgency level
   * Urgency ranges:
   * - Critical: >= 70
   * - Urgent: >= 50 && < 70
   * - Moderate: >= 30 && < 50
   * - Low: < 30
   */
  const filterAlerts = (alerts: any[], filter: AlertFilter): any[] => {
    if (filter === 'all') return alerts;

    return alerts.filter((alert) => {
      const urgency = alert.urgency;
      switch (filter) {
        case 'critical':
          return urgency >= 70;
        case 'urgent':
          return urgency >= 50 && urgency < 70;
        case 'moderate':
          return urgency >= 30 && urgency < 50;
        case 'low':
          return urgency < 30;
        default:
          return true;
      }
    });
  };

  // Get filtered alerts
  const filteredAlerts = filterAlerts(alerts, activeFilter);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingDown className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">All Stock Levels Good!</h3>
        <p className="text-gray-600">No products require immediate attention.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Stats - Clickable Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <button
          onClick={() => setActiveFilter('all')}
          className={`text-left rounded-lg p-4 transition-all duration-200 ${
            activeFilter === 'all'
              ? 'bg-blue-50 border-2 border-blue-500 shadow-md'
              : 'bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm'
          }`}
        >
          <div className={`text-sm ${activeFilter === 'all' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
            Total Alerts
          </div>
          <div className={`text-2xl font-bold ${activeFilter === 'all' ? 'text-blue-600' : 'text-gray-900'}`}>
            {summary.total}
          </div>
        </button>
        
        <button
          onClick={() => setActiveFilter('critical')}
          className={`text-left rounded-lg p-4 transition-all duration-200 ${
            activeFilter === 'critical'
              ? 'bg-red-100 border-2 border-red-500 shadow-md'
              : 'bg-red-50 border border-red-200 hover:border-red-400 hover:shadow-sm'
          }`}
        >
          <div className={`text-sm ${activeFilter === 'critical' ? 'font-semibold' : ''} text-red-600`}>
            Critical
          </div>
          <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
        </button>
        
        <button
          onClick={() => setActiveFilter('urgent')}
          className={`text-left rounded-lg p-4 transition-all duration-200 ${
            activeFilter === 'urgent'
              ? 'bg-orange-100 border-2 border-orange-500 shadow-md'
              : 'bg-orange-50 border border-orange-200 hover:border-orange-400 hover:shadow-sm'
          }`}
        >
          <div className={`text-sm ${activeFilter === 'urgent' ? 'font-semibold' : ''} text-orange-600`}>
            Urgent
          </div>
          <div className="text-2xl font-bold text-orange-600">{summary.urgent}</div>
        </button>
        
        <button
          onClick={() => setActiveFilter('moderate')}
          className={`text-left rounded-lg p-4 transition-all duration-200 ${
            activeFilter === 'moderate'
              ? 'bg-yellow-100 border-2 border-yellow-500 shadow-md'
              : 'bg-yellow-50 border border-yellow-200 hover:border-yellow-400 hover:shadow-sm'
          }`}
        >
          <div className={`text-sm ${activeFilter === 'moderate' ? 'font-semibold' : ''} text-yellow-600`}>
            Moderate
          </div>
          <div className="text-2xl font-bold text-yellow-600">{summary.moderate}</div>
        </button>
        
        <button
          onClick={() => setActiveFilter('low')}
          className={`text-left rounded-lg p-4 transition-all duration-200 ${
            activeFilter === 'low'
              ? 'bg-gray-100 border-2 border-gray-500 shadow-md'
              : 'bg-gray-50 border border-gray-200 hover:border-gray-400 hover:shadow-sm'
          }`}
        >
          <div className={`text-sm ${activeFilter === 'low' ? 'font-semibold' : ''} text-gray-600`}>
            Low
          </div>
          <div className="text-2xl font-bold text-gray-600">{summary.low}</div>
        </button>
      </div>

      {/* Active Filter Indicator */}
      {activeFilter !== 'all' && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <AlertTriangle className="w-4 h-4" />
            <span>
              Showing <strong>{filteredAlerts.length}</strong> {activeFilter} alert{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setActiveFilter('all')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertCard key={alert.product.id} alert={alert} />
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No {activeFilter} alerts</h3>
            <p className="text-gray-500 text-sm">There are no alerts in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AlertCard Component
 * Displays individual low stock alert with urgency indicator and package impact
 */
function AlertCard({ alert }: { alert: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const urgencyColor = getUrgencyColor(alert.urgency);
  const urgencyLabel = getUrgencyLabel(alert.urgency);
  
  // Fetch package impact
  const { impact, loading: impactLoading } = usePackageImpact(alert.product.id, { enabled: true });

  return (
    <div className="bg-white border-l-4 rounded-lg shadow p-6" style={{ borderLeftColor: urgencyColor }}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <AlertTriangle className="w-5 h-5" style={{ color: urgencyColor }} />
            <h3 className="text-lg font-semibold text-gray-900">{alert.product.name}</h3>
            <Badge variant="secondary" style={{ backgroundColor: urgencyColor + '20', color: urgencyColor }}>
              {urgencyLabel}
            </Badge>
            
            {/* Package Impact Badge */}
            {impact && impact.total_packages_impacted > 0 && (
              <Badge 
                variant="secondary" 
                className="bg-purple-100 text-purple-700 flex items-center gap-1"
              >
                <Package className="w-3 h-3" />
                Affects {impact.total_packages_impacted} pkg{impact.total_packages_impacted !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">SKU</div>
              <div className="font-medium text-gray-900">{alert.product.sku}</div>
            </div>
            <div>
              <div className="text-gray-600">Current Stock</div>
              <div className="font-medium text-gray-900">
                {alert.stockLevel} {alert.product.unit_of_measure}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Reorder Threshold</div>
              <div className="font-medium text-gray-900">
                {alert.reorderPoint} {alert.product.unit_of_measure}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Days of Stock</div>
              <div className="font-medium text-gray-900">~{alert.daysOfStock} days</div>
            </div>
          </div>

          {/* Package Impact Warning */}
          {impact && impact.total_packages_impacted > 0 && impact.minimum_package_availability !== undefined && impact.minimum_package_availability <= 20 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">
                    Package Availability Impact
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    This low stock affects <strong>{impact.total_packages_impacted} package{impact.total_packages_impacted !== 1 ? 's' : ''}</strong>.
                    {impact.minimum_package_availability === 0 ? (
                      <span className="font-semibold"> All affected packages are out of stock.</span>
                    ) : (
                      <span> Minimum availability: <strong>{impact.minimum_package_availability} packages</strong></span>
                    )}
                  </p>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 text-sm text-orange-700 hover:text-orange-900 font-medium flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide affected packages
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        View affected packages
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Expandable Package List */}
          {isExpanded && impact && impact.affected_packages.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Affected Packages:</h4>
              {impact.affected_packages.map((pkg) => {
                const pkgStatus = getStockStatusFromQuantity(pkg.max_sellable);
                return (
                  <div
                    key={pkg.package_id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Package className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm text-gray-900">{pkg.package_name}</p>
                        <p className="text-xs text-gray-500">
                          Uses {pkg.quantity_per_package} unit{pkg.quantity_per_package !== 1 ? 's' : ''} per package
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StockStatusBadge status={pkgStatus} size="sm" />
                      <span className={`text-lg font-bold ${
                        pkgStatus === 'out' ? 'text-red-600' :
                        pkgStatus === 'critical' ? 'text-orange-600' :
                        pkgStatus === 'low' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {pkg.max_sellable}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {alert.reorderQuantity > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-900">
                    Recommended Reorder Quantity
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {alert.reorderQuantity} {alert.product.unit_of_measure}
                  </div>
                  {alert.product.cost_price && (
                    <div className="text-sm text-blue-700">
                      Estimated Cost: ₱{(alert.reorderQuantity * alert.product.cost_price).toFixed(2)}
                    </div>
                  )}
                  {/* Package Impact Note */}
                  {impact && impact.total_packages_impacted > 0 && (
                    <div className="text-xs text-blue-600 mt-1">
                      Will enable {Math.floor(alert.reorderQuantity / (impact.affected_packages[0]?.quantity_per_package || 1))} additional packages
                    </div>
                  )}
                </div>
                <Button variant="default" className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Create PO
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
