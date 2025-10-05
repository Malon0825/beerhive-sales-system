import { Metadata } from 'next';
import EventManager from '@/views/events/EventManager';

export const metadata: Metadata = {
  title: 'Customer Events | BeerHive POS',
  description: 'Manage customer events and special offers',
};

export default function EventsPage() {
  return <EventManager />;
}
