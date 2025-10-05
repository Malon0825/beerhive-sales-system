import { CustomerTier } from '@/models/enums/CustomerTier';
import { Badge } from '@/views/shared/ui/badge';
import { Crown } from 'lucide-react';

interface TierBadgeProps {
  tier: CustomerTier | string;
  showIcon?: boolean;
}

/**
 * TierBadge Component
 * Displays a color-coded badge for customer VIP tiers
 * - Regular: Gray
 * - Silver: Silver/Gray with subtle shine
 * - Gold: Yellow/Gold
 * - Platinum: Purple/Platinum
 */
export function TierBadge({ tier, showIcon = true }: TierBadgeProps) {
  /**
   * Get badge styling based on tier
   */
  const getBadgeProps = () => {
    switch (tier) {
      case CustomerTier.VIP_PLATINUM:
        return {
          variant: 'default' as const,
          className: 'bg-purple-600 text-white hover:bg-purple-700',
          label: 'Platinum VIP',
        };
      case CustomerTier.VIP_GOLD:
        return {
          variant: 'default' as const,
          className: 'bg-yellow-500 text-white hover:bg-yellow-600',
          label: 'Gold VIP',
        };
      case CustomerTier.VIP_SILVER:
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-400 text-white hover:bg-gray-500',
          label: 'Silver VIP',
        };
      case CustomerTier.REGULAR:
      default:
        return {
          variant: 'outline' as const,
          className: 'border-gray-300 text-gray-700',
          label: 'Regular',
        };
    }
  };

  const { variant, className, label } = getBadgeProps();
  const isVip = tier !== CustomerTier.REGULAR;

  return (
    <Badge variant={variant} className={className}>
      {showIcon && isVip && <Crown className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}
