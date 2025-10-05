import { Badge } from '@/views/shared/ui/badge';
import { OrderStatus } from '@/models/enums/OrderStatus';

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

/**
 * OrderStatusBadge Component
 * Displays a colored badge based on the order status
 * 
 * @param status - The order status (pending, completed, voided, on_hold)
 * @param className - Optional additional CSS classes
 * 
 * Status color mapping:
 * - pending: warning (yellow)
 * - completed: success (green)
 * - voided: destructive (red)
 * - on_hold: info (blue)
 */
export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  /**
   * Get badge variant based on order status
   */
  const getVariant = () => {
    switch (status) {
      case OrderStatus.COMPLETED:
      case 'completed':
        return 'success';
      case OrderStatus.PENDING:
      case 'pending':
        return 'warning';
      case OrderStatus.VOIDED:
      case 'voided':
        return 'destructive';
      case OrderStatus.ON_HOLD:
      case 'on_hold':
        return 'info';
      default:
        return 'default';
    }
  };

  /**
   * Format status text for display
   */
  const getStatusText = () => {
    return status.toString().replace('_', ' ').toUpperCase();
  };

  return (
    <Badge variant={getVariant()} className={className}>
      {getStatusText()}
    </Badge>
  );
}
