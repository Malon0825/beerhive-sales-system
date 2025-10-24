/**
 * StockStatusBadge Component
 * 
 * Reusable badge for displaying stock status with color coding
 * Used across package and inventory views for consistent status display
 * 
 * @module views/shared/ui/StockStatusBadge
 */

import { Badge } from './badge';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

export type StockStatus = 'available' | 'low' | 'critical' | 'out';

interface StockStatusBadgeProps {
  status: StockStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  label?: string;
}

/**
 * Get status configuration (color, icon, label)
 */
function getStatusConfig(status: StockStatus) {
  switch (status) {
    case 'available':
      return {
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 hover:bg-green-100',
        icon: CheckCircle2,
        label: 'Available',
      };
    case 'low':
      return {
        variant: 'secondary' as const,
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        icon: AlertTriangle,
        label: 'Low Stock',
      };
    case 'critical':
      return {
        variant: 'secondary' as const,
        className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
        icon: AlertCircle,
        label: 'Critical',
      };
    case 'out':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
        icon: XCircle,
        label: 'Out of Stock',
      };
  }
}

/**
 * Get size classes
 */
function getSizeClass(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return 'text-xs px-2 py-0.5';
    case 'md':
      return 'text-sm px-2.5 py-1';
    case 'lg':
      return 'text-base px-3 py-1.5';
  }
}

/**
 * StockStatusBadge - Visual indicator for stock status
 * 
 * @example
 * <StockStatusBadge status="available" />
 * <StockStatusBadge status="low" showIcon />
 * <StockStatusBadge status="out" size="lg" label="Unavailable" />
 */
export function StockStatusBadge({
  status,
  size = 'md',
  showIcon = false,
  label,
}: StockStatusBadgeProps) {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  const displayLabel = label || config.label;
  const sizeClass = getSizeClass(size);

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${sizeClass} flex items-center gap-1.5 font-medium`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {displayLabel}
    </Badge>
  );
}

/**
 * Determine stock status based on quantity thresholds
 * 
 * @param maxSellable - Maximum quantity available
 * @param lowThreshold - Low stock threshold (default: 20)
 * @param criticalThreshold - Critical stock threshold (default: 5)
 * @returns Stock status classification
 * 
 * @example
 * const status = getStockStatusFromQuantity(30); // 'available'
 * const status = getStockStatusFromQuantity(15); // 'low'
 * const status = getStockStatusFromQuantity(0); // 'out'
 */
export function getStockStatusFromQuantity(
  maxSellable: number,
  lowThreshold: number = 20,
  criticalThreshold: number = 5
): StockStatus {
  if (maxSellable === 0) return 'out';
  if (maxSellable <= criticalThreshold) return 'critical';
  if (maxSellable <= lowThreshold) return 'low';
  return 'available';
}
