/**
 * PackageImpactSection Component
 * 
 * Shows which packages are affected by a product's stock level
 * Displayed as an expandable section in product inventory rows
 * 
 * @module views/inventory/components/PackageImpactSection
 */

'use client';

import { usePackageImpact } from '@/lib/hooks/usePackageAvailability';
import { Badge } from '@/views/shared/ui/badge';
import { StockStatusBadge, getStockStatusFromQuantity } from '@/views/shared/ui/StockStatusBadge';
import { Boxes, Package, AlertCircle, TrendingUp, Info } from 'lucide-react';

interface PackageImpactSectionProps {
  productId: string;
  productName?: string;
}

/**
 * PackageImpactSection - Shows packages affected by a product
 * 
 * @example
 * <PackageImpactSection productId="uuid-123" productName="Premium Beer" />
 */
export function PackageImpactSection({
  productId,
  productName,
}: PackageImpactSectionProps) {
  const { impact, loading, error } = usePackageImpact(productId);

  // Loading state
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          <span>Loading package information...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">Failed to load package impact</p>
      </div>
    );
  }

  // No packages use this product
  if (!impact || impact.total_packages_impacted === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Info className="w-4 h-4" />
          <span>This product is not used in any packages</span>
        </div>
      </div>
    );
  }

  // Get minimum availability status
  const minAvailability = impact.minimum_package_availability || 0;
  const status = getStockStatusFromQuantity(minAvailability);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-purple-600" />
          <h4 className="font-medium text-gray-900">
            Used in {impact.total_packages_impacted} Package{impact.total_packages_impacted !== 1 ? 's' : ''}
          </h4>
        </div>
        {impact.minimum_package_availability !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Min Availability:</span>
            <StockStatusBadge status={status} size="sm" />
            <span className="text-sm font-semibold text-gray-900">
              {minAvailability}
            </span>
          </div>
        )}
      </div>

      {/* Impact Alert */}
      {status === 'out' || status === 'critical' ? (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900">
                {status === 'out' 
                  ? 'Packages unavailable due to insufficient stock' 
                  : 'Low stock affecting package availability'}
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Restock {productName || 'this product'} to enable package sales
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Package List */}
      <div className="space-y-2">
        {impact.affected_packages.map((pkg) => {
          const pkgStatus = getStockStatusFromQuantity(pkg.max_sellable);
          
          return (
            <div
              key={pkg.package_id}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {pkg.package_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      Uses <span className="font-semibold">{pkg.quantity_per_package}</span> unit{pkg.quantity_per_package !== 1 ? 's' : ''} per package
                    </span>
                    {pkg.package_type && (
                      <>
                        <span className="text-gray-300">•</span>
                        <Badge variant="secondary" className="text-xs">
                          {pkg.package_type === 'vip_only' ? 'VIP' : 
                           pkg.package_type === 'promotional' ? 'Promo' : 'Regular'}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-3">
                <StockStatusBadge status={pkgStatus} size="sm" />
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    pkgStatus === 'out' ? 'text-red-600' :
                    pkgStatus === 'critical' ? 'text-orange-600' :
                    pkgStatus === 'low' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {pkg.max_sellable}
                  </p>
                  <p className="text-xs text-gray-500">available</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {impact.affected_packages.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium">Stock Impact:</p>
              <p className="mt-1">
                Current stock of <span className="font-semibold">{impact.current_stock} units</span>
                {' '}enables minimum of{' '}
                <span className="font-bold">{minAvailability} packages</span> across all affected packages.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline display
 */
interface PackageImpactBadgeProps {
  productId: string;
  onClick?: () => void;
}

export function PackageImpactBadge({ productId, onClick }: PackageImpactBadgeProps) {
  const { impact, loading } = usePackageImpact(productId, { enabled: true });

  if (loading || !impact || impact.total_packages_impacted === 0) {
    return null;
  }

  const minAvailability = impact.minimum_package_availability || 0;
  const hasIssue = minAvailability <= 20;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
        hasIssue
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
      }`}
    >
      <Boxes className="w-3 h-3" />
      <span>
        Used in {impact.total_packages_impacted} pkg{impact.total_packages_impacted !== 1 ? 's' : ''}
      </span>
      {hasIssue && <AlertCircle className="w-3 h-3" />}
    </button>
  );
}
