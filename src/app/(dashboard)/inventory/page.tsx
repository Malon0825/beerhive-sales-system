import { Metadata } from 'next';
import InventoryDashboard from '@/views/inventory/InventoryDashboard';

export const metadata: Metadata = {
  title: 'Inventory Management | BeerHive POS',
  description: 'Manage product inventory and stock levels',
};

export default function InventoryPage() {
  return <InventoryDashboard />;
}
