import { BartenderDisplay } from '@/views/bartender/BartenderDisplay';

/**
 * Bartender Page
 * Route: /bartender
 * Bartender interface for managing beverage orders
 */
export default function BartenderPage() {
  return <BartenderDisplay />;
}

export const metadata = {
  title: 'Bartender Display - BeerHive POS',
  description: 'Bartender order management interface',
};
