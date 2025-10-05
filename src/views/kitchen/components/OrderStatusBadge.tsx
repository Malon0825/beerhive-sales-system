import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { Badge } from '@/views/shared/ui/badge';

interface OrderStatusBadgeProps {
  status: KitchenOrderStatus;
  className?: string;
}

/**
 * OrderStatusBadge Component
 * Displays a colored badge based on kitchen order status
 * 
 * @param status - Current kitchen order status
 * @param className - Additional CSS classes
 */
export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  /**
   * Get color styling based on status
   */
  const getStatusColor = (status: KitchenOrderStatus): string => {
    switch (status) {
      case KitchenOrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case KitchenOrderStatus.PREPARING:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case KitchenOrderStatus.READY:
        return 'bg-green-100 text-green-800 border-green-300';
      case KitchenOrderStatus.SERVED:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  /**
   * Format status label for display
   */
  const getStatusLabel = (status: KitchenOrderStatus): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Badge className={`${getStatusColor(status)} ${className}`}>
      {getStatusLabel(status)}
    </Badge>
  );
}
