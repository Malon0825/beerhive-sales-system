'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/models/entities/Product';
import { InventoryService } from '@/core/services/inventory/InventoryService';
import { Badge } from '../shared/ui/badge';
import { Button } from '../shared/ui/button';
import { Edit, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface InventoryListProps {
  onStatsUpdate?: (stats: {
    total: number;
    lowStock: number;
    outOfStock: number;
    adequate: number;
  }) => void;
}

export default function InventoryList({ onStatsUpdate }: InventoryListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      const result = await response.json();

      if (result.success) {
        setProducts(result.data || []);
        updateStats(result.data || []);
      }
    } catch (error) {
      console.error('Load products error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (productList: Product[]) => {
    if (!onStatsUpdate) return;

    const stats = {
      total: productList.length,
      lowStock: productList.filter(
        (p) => p.current_stock <= p.reorder_point && p.current_stock > 0
      ).length,
      outOfStock: productList.filter((p) => p.current_stock <= 0).length,
      adequate: productList.filter((p) => p.current_stock > p.reorder_point).length,
    };

    onStatsUpdate(stats);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reorder Point
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => {
              const status = InventoryService.getStockStatus(
                product.current_stock,
                product.reorder_point
              );
              const stockValue = InventoryService.calculateStockValue(
                product.current_stock,
                product.cost_price || 0
              );

              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{product.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {InventoryService.formatStockLevel(
                        product.current_stock,
                        product.unit_of_measure
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {product.reorder_point} {product.unit_of_measure}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StockStatusBadge status={status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₱{stockValue.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Edit className="w-4 h-4" />
                      Adjust
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}

function StockStatusBadge({ status }: { status: string }) {
  const config = {
    out_of_stock: {
      label: 'Out of Stock',
      variant: 'destructive' as const,
      icon: XCircle,
    },
    low_stock: {
      label: 'Low Stock',
      variant: 'warning' as const,
      icon: AlertCircle,
    },
    warning: {
      label: 'Warning',
      variant: 'secondary' as const,
      icon: AlertCircle,
    },
    adequate: {
      label: 'Adequate',
      variant: 'success' as const,
      icon: CheckCircle,
    },
  };

  const { label, variant, icon: Icon } = config[status as keyof typeof config] || config.adequate;

  return (
    <Badge variant={variant} className="flex items-center gap-1 w-fit">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}
