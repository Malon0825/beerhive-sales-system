import { Metadata } from 'next';
import HappyHourManager from '@/views/happy-hours/HappyHourManager';

export const metadata: Metadata = {
  title: 'Happy Hours | BeerHive POS',
  description: 'Manage happy hour pricing and promotions',
};

export default function HappyHoursPage() {
  return <HappyHourManager />;
}
