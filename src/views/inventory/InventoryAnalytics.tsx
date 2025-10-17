'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/models/entities/Product';
import { InventoryService } from '@/core/services/inventory/InventoryService';
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, Activity } from 'lucide-react';

interface InventoryAnalyticsProps {
  products: Product[];
}

interface StockDistribution {
  adequate: number;
  warning: number;
  low: number;
  out: number;
}

/**
 * InventoryAnalytics Component
 * Displays visual analytics and key metrics for inventory health
 */
export default function InventoryAnalytics({ products }: InventoryAnalyticsProps) {
  const [distribution, setDistribution] = useState<StockDistribution>({
    adequate: 0,
    warning: 0,
    low: 0,
    out: 0,
  });
  const [totalValue, setTotalValue] = useState(0);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [criticalProducts, setCriticalProducts] = useState<Product[]>([]);

  useEffect(() => {
    calculateAnalytics();
  }, [products]);

  /**
   * Calculate analytics data from products
   */
  const calculateAnalytics = () => {
    // Only count active products
    const activeProducts = products.filter(p => p.is_active !== false);

    // Calculate stock distribution
    const dist: StockDistribution = {
      adequate: 0,
      warning: 0,
      low: 0,
      out: 0,
    };

    let value = 0;

    activeProducts.forEach((product) => {
      const status = InventoryService.getStockStatus(
        product.current_stock,
        product.reorder_point
      );

      // Count by status
      if (status === 'adequate') dist.adequate++;
      else if (status === 'warning') dist.warning++;
      else if (status === 'low_stock') dist.low++;
      else if (status === 'out_of_stock') dist.out++;

      // Calculate total value
      value += InventoryService.calculateStockValue(
        product.current_stock,
        product.cost_price || 0
      );
    });

    setDistribution(dist);
    setTotalValue(value);

    // Get top 5 products by value
    const sortedByValue = [...activeProducts]
      .map(p => ({
        ...p,
        value: InventoryService.calculateStockValue(p.current_stock, p.cost_price || 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    setTopProducts(sortedByValue);

    // Get critical stock products (out of stock or low stock)
    const critical = activeProducts
      .filter(p => {
        const status = InventoryService.getStockStatus(p.current_stock, p.reorder_point);
        return status === 'out_of_stock' || status === 'low_stock';
      })
      .sort((a, b) => a.current_stock - b.current_stock)
      .slice(0, 5);
    setCriticalProducts(critical);
  };

  const total = distribution.adequate + distribution.warning + distribution.low + distribution.out;
  const healthScore = total > 0 ? Math.round((distribution.adequate / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium opacity-90">Total Inventory Value</div>
            <DollarSign className="w-6 h-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold">₱{totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs opacity-80 mt-1">{total} active products</div>
        </div>

        {/* Health Score */}
        <div className={`rounded-xl shadow-lg p-5 text-white ${
          healthScore >= 80 ? 'bg-gradient-to-br from-green-500 to-green-600' :
          healthScore >= 60 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
          'bg-gradient-to-br from-red-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium opacity-90">Inventory Health</div>
            <Activity className="w-6 h-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{healthScore}%</div>
          <div className="text-xs opacity-80 mt-1">
            {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Needs Attention'}
          </div>
        </div>

        {/* Critical Items */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium opacity-90">Critical Stock</div>
            <AlertTriangle className="w-6 h-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{distribution.low + distribution.out}</div>
          <div className="text-xs opacity-80 mt-1">
            {distribution.out} out of stock, {distribution.low} low
          </div>
        </div>

        {/* Adequate Stock */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium opacity-90">Adequate Stock</div>
            <TrendingUp className="w-6 h-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{distribution.adequate}</div>
          <div className="text-xs opacity-80 mt-1">Well-stocked products</div>
        </div>
      </div>

      {/* Charts and Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Distribution Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Stock Status Distribution
          </h3>
          
          {/* Visual Bar Chart */}
          <div className="space-y-4">
            {/* Adequate */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Adequate Stock</span>
                <span className="text-gray-900 font-semibold">{distribution.adequate}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (distribution.adequate / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Warning */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Warning Level</span>
                <span className="text-gray-900 font-semibold">{distribution.warning}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (distribution.warning / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Low Stock */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Low Stock</span>
                <span className="text-gray-900 font-semibold">{distribution.low}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (distribution.low / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Out of Stock */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Out of Stock</span>
                <span className="text-gray-900 font-semibold">{distribution.out}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (distribution.out / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Products by Value */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Top 5 Products by Value
          </h3>
          
          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      ₱{(product as any).value?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {product.current_stock} {product.unit_of_measure}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No products available</div>
            )}
          </div>
        </div>

        {/* Critical Stock Alert */}
        <div className="bg-white rounded-xl shadow-md p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Critical Stock Alerts
          </h3>
          
          {criticalProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {criticalProducts.map((product) => {
                const status = InventoryService.getStockStatus(product.current_stock, product.reorder_point);
                const isOutOfStock = status === 'out_of_stock';
                
                return (
                  <div
                    key={product.id}
                    className={`p-4 rounded-lg border-2 ${
                      isOutOfStock
                        ? 'bg-red-50 border-red-200'
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{product.name}</div>
                        <div className="text-xs text-gray-600">{product.sku}</div>
                      </div>
                      {isOutOfStock ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Out
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Low
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-600">Current</div>
                        <div className={`text-lg font-bold ${isOutOfStock ? 'text-red-600' : 'text-orange-600'}`}>
                          {product.current_stock}
                        </div>
                      </div>
                      <TrendingDown className={`w-5 h-5 ${isOutOfStock ? 'text-red-500' : 'text-orange-500'}`} />
                      <div>
                        <div className="text-xs text-gray-600">Reorder</div>
                        <div className="text-lg font-semibold text-gray-700">
                          {product.reorder_point}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-gray-900 font-medium">All Products Well-Stocked!</div>
              <div className="text-gray-500 text-sm mt-1">No critical stock alerts at this time</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
