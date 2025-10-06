// @ts-nocheck - Supabase query result type inference issues
'use client';

/**
 * Low Stock Report Component
 * Display products below reorder point with recommendations
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Package, ArrowUp } from 'lucide-react';

interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  unit_of_measure: string;
  category?: { name: string };
  stock_status: 'out_of_stock' | 'critical' | 'low';
  alert_level?: 'critical' | 'warning' | 'info';
  recommendation?: string;
}

export function LowStockReport() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'out_of_stock' | 'critical' | 'low'>('all');

  useEffect(() => {
    fetchLowStockItems();
  }, []);

  const fetchLowStockItems = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/inventory?type=alerts');
      const result = await response.json();
      
      if (result.success) {
        setItems(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch low stock items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.stock_status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Out of Stock
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Critical
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Low Stock
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Low Stock Alert</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilter('out_of_stock')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'out_of_stock' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Out of Stock ({items.filter(i => i.stock_status === 'out_of_stock').length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'critical' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Critical ({items.filter(i => i.stock_status === 'critical').length})
            </button>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {filter === 'all' 
                ? 'No low stock items found. All products are adequately stocked!' 
                : `No items with ${filter.replace('_', ' ')} status`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reorder Point
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Suggested Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action Needed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.stock_status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{item.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {item.category?.name || 'Uncategorized'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-medium ${
                        item.stock_status === 'out_of_stock' ? 'text-red-600' :
                        item.stock_status === 'critical' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        {item.current_stock} {item.unit_of_measure}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-600">
                        {item.reorder_point} {item.unit_of_measure}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 text-sm font-medium text-blue-600">
                        <ArrowUp className="w-4 h-4" />
                        {item.reorder_quantity} {item.unit_of_measure}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">
                        {item.recommendation || 'Review and reorder'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 font-semibold">Out of Stock Items</div>
            <div className="text-2xl font-bold text-red-900 mt-1">
              {items.filter(i => i.stock_status === 'out_of_stock').length}
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-orange-800 font-semibold">Critical Stock Items</div>
            <div className="text-2xl font-bold text-orange-900 mt-1">
              {items.filter(i => i.stock_status === 'critical').length}
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-yellow-800 font-semibold">Low Stock Items</div>
            <div className="text-2xl font-bold text-yellow-900 mt-1">
              {items.filter(i => i.stock_status === 'low').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
