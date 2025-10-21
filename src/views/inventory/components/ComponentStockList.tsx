/**
 * ComponentStockList Component
 * 
 * Displays a list of package components with their stock levels
 * Highlights bottleneck components and shows availability status
 * 
 * @module views/inventory/components/ComponentStockList
 */

import { ComponentAvailability } from '@/models/dtos/PackageAvailability';
import { CheckCircle2, AlertCircle, Package } from 'lucide-react';

interface ComponentStockListProps {
  components: ComponentAvailability[];
  bottleneckProductId?: string;
  className?: string;
}

/**
 * ComponentStockList - Shows package component stocks with status indicators
 * 
 * @example
 * <ComponentStockList
 *   components={[
 *     { product_id: '1', product_name: 'Beer', current_stock: 50, required_per_package: 2, max_packages: 25 },
 *     { product_id: '2', product_name: 'Snack', current_stock: 100, required_per_package: 1, max_packages: 100 }
 *   ]}
 *   bottleneckProductId="1"
 * />
 */
export function ComponentStockList({
  components,
  bottleneckProductId,
  className = '',
}: ComponentStockListProps) {
  if (components.length === 0) {
    return (
      <div className={`text-center py-6 text-gray-500 ${className}`}>
        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No components found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {components.map((component) => {
        const isBottleneck = component.product_id === bottleneckProductId;
        const isLowStock = component.max_packages <= 20;
        const isOutOfStock = component.max_packages === 0;

        return (
          <div
            key={component.product_id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              isBottleneck
                ? 'bg-orange-50 border-orange-300'
                : isOutOfStock
                ? 'bg-red-50 border-red-200'
                : isLowStock
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {isBottleneck || isOutOfStock || isLowStock ? (
                  <AlertCircle
                    className={`w-5 h-5 ${
                      isBottleneck
                        ? 'text-orange-600'
                        : isOutOfStock
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}
                  />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {component.product_name}
                  </p>
                  {isBottleneck && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      Bottleneck
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                  <span>
                    Stock: <span className="font-semibold">{component.current_stock}</span>
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>
                    Required: <span className="font-semibold">{component.required_per_package}</span> per pkg
                  </span>
                  <span className="text-gray-400">•</span>
                  <span
                    className={
                      isOutOfStock
                        ? 'text-red-700 font-semibold'
                        : isLowStock
                        ? 'text-yellow-700 font-semibold'
                        : ''
                    }
                  >
                    Max: <span className="font-semibold">{component.max_packages}</span> packages
                  </span>
                </div>
              </div>
            </div>

            {isBottleneck && (
              <div className="flex-shrink-0 ml-3">
                <div className="text-right">
                  <p className="text-xs font-medium text-orange-900">Limits to</p>
                  <p className="text-lg font-bold text-orange-700">{component.max_packages}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact version for smaller displays
 */
interface ComponentStockListCompactProps {
  components: ComponentAvailability[];
  bottleneckProductId?: string;
}

export function ComponentStockListCompact({
  components,
  bottleneckProductId,
}: ComponentStockListCompactProps) {
  return (
    <div className="space-y-1.5">
      {components.map((component) => {
        const isBottleneck = component.product_id === bottleneckProductId;
        const isLowStock = component.max_packages <= 20;

        return (
          <div
            key={component.product_id}
            className="flex items-center justify-between text-xs py-1.5"
          >
            <div className="flex items-center gap-2">
              {isBottleneck || isLowStock ? (
                <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              )}
              <span className={isBottleneck ? 'font-semibold' : ''}>
                {component.product_name}
              </span>
            </div>
            <span className="text-gray-600">
              {component.current_stock} units
            </span>
          </div>
        );
      })}
    </div>
  );
}
