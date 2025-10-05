import { Metadata } from 'next';
import OrderBoard from '@/views/order-board/OrderBoard';

/**
 * Order Board Page
 * Real-time display of all customer orders for managers/admins/users
 * Shows orders as they are created by cashiers
 */
export const metadata: Metadata = {
  title: 'Order Board - BeerHive POS',
  description: 'Real-time customer order display board',
};

export default function OrderBoardPage() {
  return <OrderBoard />;
}
