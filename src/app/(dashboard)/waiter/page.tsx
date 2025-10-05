import { WaiterDisplay } from '@/views/waiter/WaiterDisplay';

/**
 * Waiter Page
 * Route: /waiter
 * Waiter/Server interface for delivering prepared orders to customers
 */
export default function WaiterPage() {
  return <WaiterDisplay />;
}

export const metadata = {
  title: 'Waiter Display - BeerHive POS',
  description: 'Waiter order delivery interface',
};
