'use client';

import { Badge } from '@/views/shared/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface StockStatusBadgeProps {
  currentStock: number;
  reorderPoint: number;
  categoryName?: string;
  compact?: boolean;
}

/**
 * StockStatusBadge Component
 * 
 * Displays product stock status with appropriate color coding and icons
 * Follows business rules:
 * - Drinks: Must have stock (strict validation)
 * - Food: Can be served even without stock (kitchen confirmation)
 * 
 * @param currentStock - Current stock level
 * @param reorderPoint - Stock reorder threshold
 * @param categoryName - Product category name (to identify drinks)
 * @param compact - Show compact version (icon only)
 */
export function StockStatusBadge({
  currentStock,
  reorderPoint,
  categoryName = '',
  compact = false,
}: StockStatusBadgeProps) {
  /**
   * Check if product is a drink/beverage
   */
  const isDrink = () => {
    const normalizedCategory = categoryName?.toLowerCase() || '';
    return (
      normalizedCategory.includes('beer') ||
      normalizedCategory.includes('beverage') ||
      normalizedCategory.includes('drink') ||
      normalizedCategory.includes('alcohol')
    );
  };

  /**
   * Get stock status details
   */
  const getStockStatus = () => {
    const isDrinkProduct = isDrink();

    if (currentStock <= 0) {
      return {
        status: 'out_of_stock',
        label: compact ? 'Out' : (isDrinkProduct ? 'Out of Stock' : 'Out (Kitchen OK)'),
        variant: 'destructive' as const,
        icon: XCircle,
        shouldWarn: isDrinkProduct,
      };
    }

    if (currentStock <= reorderPoint) {
      return {
        status: 'low_stock',
        label: compact ? `${currentStock}` : `Low (${currentStock})`,
        variant: 'warning' as const,
        icon: AlertTriangle,
        shouldWarn: true,
      };
    }

    return {
      status: 'adequate',
      label: compact ? `${currentStock}` : `Stock: ${currentStock}`,
      variant: 'success' as const,
      icon: CheckCircle2,
      shouldWarn: false,
    };
  };

  const status = getStockStatus();
  const Icon = status.icon;

  if (compact) {
    return (
      <Badge variant={status.variant} className="px-2 py-1 text-xs flex items-center gap-1">
        <Icon className="h-3 w-3" />
        <span>{status.label}</span>
      </Badge>
    );
  }

  return (
    <Badge variant={status.variant} className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      <span>{status.label}</span>
    </Badge>
  );
}
