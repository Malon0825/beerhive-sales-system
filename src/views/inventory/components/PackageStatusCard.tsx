/**
 * PackageStatusCard Component
 * 
 * Displays a package's availability status with component breakdown
 * Shows bottleneck product and actionable recommendations
 * 
 * Phase 4.3.3: Optimized with React.memo for list rendering performance
 * 
 * @module views/inventory/components/PackageStatusCard
 */

import { useState, memo } from 'react';
import { PackageAvailabilitySummary, PackageAvailabilityResult } from '@/models/dtos/PackageAvailability';
import { Card } from '@/views/shared/ui/card';
import { StockStatusBadge, getStockStatusFromQuantity } from '@/views/shared/ui/StockStatusBadge';
import { BottleneckIndicatorCompact } from './BottleneckIndicator';
import { ComponentStockList } from './ComponentStockList';
import { Button } from '@/views/shared/ui/button';
import { ChevronDown, ChevronUp, Package as PackageIcon, DollarSign, Tag } from 'lucide-react';
import { usePackageAvailability } from '@/lib/hooks/usePackageAvailability';

interface PackageStatusCardProps {
  packageSummary: PackageAvailabilitySummary;
  packageType?: 'vip_only' | 'regular' | 'promotional';
  price?: number;
}

/**
 * PackageStatusCard - Displays package availability with expandable details
 * Memoized for optimal list rendering performance
 * 
 * @example
 * <PackageStatusCard
 *   packageSummary={{
 *     package_id: 'uuid',
 *     package_name: 'VIP Bundle',
 *     max_sellable: 25,
 *     status: 'low_stock',
 *     bottleneck: { product_name: 'Beer A', current_stock: 50 }
 *   }}
 *   packageType="vip_only"
 *   price={500}
 * />
 */
export const PackageStatusCard = memo(function PackageStatusCard({
  packageSummary,
  packageType,
  price,
}: PackageStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Fetch detailed data only when expanded
  const { availability, loading } = usePackageAvailability(
    isExpanded ? packageSummary.package_id : null,
    { enabled: isExpanded }
  );

  const status = getStockStatusFromQuantity(packageSummary.max_sellable);

  // Get package type badge
  const getPackageTypeBadge = () => {
    if (!packageType) return null;

    const config = {
      vip_only: { label: 'VIP Only', className: 'bg-purple-100 text-purple-700' },
      regular: { label: 'Regular', className: 'bg-blue-100 text-blue-700' },
      promotional: { label: 'Promo', className: 'bg-green-100 text-green-700' },
    };

    const { label, className } = config[packageType];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${className}`}>
        <Tag className="w-3 h-3 mr-1" />
        {label}
      </span>
    );
  };

  // Calculate potential revenue impact
  const getPotentialRevenue = () => {
    if (!price) return null;
    return packageSummary.max_sellable * price;
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <PackageIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 truncate">
                {packageSummary.package_name}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StockStatusBadge status={status} showIcon />
              {getPackageTypeBadge()}
            </div>
          </div>

          {/* Max Sellable */}
          <div className="text-right ml-4">
            <p className="text-xs text-gray-500">Available</p>
            <p className={`text-2xl font-bold ${
              status === 'out' ? 'text-red-600' :
              status === 'critical' ? 'text-orange-600' :
              status === 'low' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {packageSummary.max_sellable}
            </p>
            <p className="text-xs text-gray-500">packages</p>
          </div>
        </div>

        {/* Price & Revenue Info */}
        {price && (
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg mb-3">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Price:</span>
              <span className="font-semibold text-gray-900">₱{price.toFixed(2)}</span>
            </div>
            {getPotentialRevenue() !== null && (
              <div className="text-sm">
                <span className="text-gray-600">Max Revenue:</span>
                <span className="font-semibold text-gray-900 ml-1">
                  ₱{getPotentialRevenue()!.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bottleneck Summary */}
        {packageSummary.bottleneck && packageSummary.max_sellable > 0 && (
          <div className="mb-3">
            <BottleneckIndicatorCompact
              productName={packageSummary.bottleneck.product_name}
              maxPackages={packageSummary.max_sellable}
            />
          </div>
        )}

        {/* Out of Stock Message */}
        {packageSummary.max_sellable === 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
            <p className="text-sm font-medium text-red-900">
              Package cannot be sold - insufficient component stock
            </p>
            {packageSummary.bottleneck && (
              <p className="text-xs text-red-700 mt-1">
                Missing: {packageSummary.bottleneck.product_name}
              </p>
            )}
          </div>
        )}

        {/* Expand Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Hide Components
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              View Components
            </>
          )}
        </Button>

        {/* Expanded Component Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading components...</p>
              </div>
            ) : availability ? (
              <>
                <h4 className="font-medium text-sm text-gray-900 mb-3">
                  Package Components ({availability.component_availability.length})
                </h4>
                <ComponentStockList
                  components={availability.component_availability}
                  bottleneckProductId={availability.bottleneck_product?.product_id}
                />

                {/* Actionable Recommendation */}
                {availability.bottleneck_product && availability.max_sellable < 50 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-medium text-blue-900 mb-1">
                      💡 Recommendation
                    </p>
                    <p className="text-xs text-blue-700">
                      Restock <span className="font-semibold">{availability.bottleneck_product.product_name}</span>
                      {' '}to increase package availability. Current: {availability.bottleneck_product.current_stock} units.
                      Add {Math.ceil((50 - availability.max_sellable) * availability.bottleneck_product.required_per_package)} units
                      to enable 50 packages.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Failed to load component details
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});
