'use client';

import { useState, useEffect } from 'react';
import { LowStockAlert as LowStockAlertService } from '@/core/services/inventory/LowStockAlert';
import { Badge } from '../shared/ui/badge';
import { Button } from '../shared/ui/button';
import { AlertTriangle, ShoppingCart, TrendingDown } from 'lucide-react';

export default function LowStockAlert() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Alerts</div>
          <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600">Critical</div>
          <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-600">Urgent</div>
          <div className="text-2xl font-bold text-orange-600">{summary.urgent}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-600">Moderate</div>
          <div className="text-2xl font-bold text-yellow-600">{summary.moderate}</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Low</div>
          <div className="text-2xl font-bold text-gray-600">{summary.low}</div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.map((alert) => (
          <AlertCard key={alert.product.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: any }) {
  const urgencyColor = LowStockAlertService.getUrgencyColor(alert.urgency);
  const urgencyLabel = LowStockAlertService.getUrgencyLabel(alert.urgency);

  return (
    <div className="bg-white border-l-4 rounded-lg shadow p-6" style={{ borderLeftColor: urgencyColor }}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5" style={{ color: urgencyColor }} />
            <h3 className="text-lg font-semibold text-gray-900">{alert.product.name}</h3>
            <Badge variant="secondary" style={{ backgroundColor: urgencyColor + '20', color: urgencyColor }}>
              {urgencyLabel}
            </Badge>
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
              <div className="text-gray-600">Reorder Point</div>
              <div className="font-medium text-gray-900">
                {alert.reorderPoint} {alert.product.unit_of_measure}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Days of Stock</div>
              <div className="font-medium text-gray-900">~{alert.daysOfStock} days</div>
            </div>
          </div>

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
