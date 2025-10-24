/**
 * BottleneckIndicator Component
 * 
 * Displays a warning indicator when a product is the limiting factor
 * for package availability. Shows the constraint clearly to users.
 * 
 * @module views/inventory/components/BottleneckIndicator
 */

import { AlertCircle, TrendingDown } from 'lucide-react';
import { Badge } from '@/views/shared/ui/badge';

interface BottleneckIndicatorProps {
  productName: string;
  currentStock: number;
  requiredPerPackage: number;
  maxPackages: number;
  className?: string;
}

/**
 * BottleneckIndicator - Shows which product limits package availability
 * 
 * @example
 * <BottleneckIndicator
 *   productName="Premium Beer"
 *   currentStock={50}
 *   requiredPerPackage={2}
 *   maxPackages={25}
 * />
 */
export function BottleneckIndicator({
  productName,
  currentStock,
  requiredPerPackage,
  maxPackages,
  className = '',
}: BottleneckIndicatorProps) {
  return (
    <div className={`flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg ${className}`}>
      <div className="flex-shrink-0 mt-0.5">
        <AlertCircle className="w-5 h-5 text-orange-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-orange-900">
            Limited by: {productName}
          </p>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Bottleneck
          </Badge>
        </div>
        <div className="mt-1.5 space-y-1">
          <p className="text-xs text-orange-700">
            Current stock: <span className="font-semibold">{currentStock} units</span>
            {' • '}
            Required: <span className="font-semibold">{requiredPerPackage} units/package</span>
          </p>
          <p className="text-xs text-orange-700 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" />
            Limits availability to <span className="font-bold">{maxPackages} packages</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for inline display
 */
interface BottleneckIndicatorCompactProps {
  productName: string;
  maxPackages: number;
}

export function BottleneckIndicatorCompact({
  productName,
  maxPackages,
}: BottleneckIndicatorCompactProps) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-orange-700">
      <AlertCircle className="w-3.5 h-3.5" />
      <span>
        Limited by <span className="font-semibold">{productName}</span>
        {' '}
        ({maxPackages} max)
      </span>
    </div>
  );
}
