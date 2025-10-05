import { KitchenDisplay } from '@/views/kitchen/KitchenDisplay';

/**
 * Kitchen Page
 * Route: /kitchen
 * Kitchen staff interface for managing food orders
 */
export default function KitchenPage() {
  return <KitchenDisplay />;
}

export const metadata = {
  title: 'Kitchen Display - BeerHive POS',
  description: 'Kitchen order management interface',
};
