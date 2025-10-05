import { Metadata } from 'next';
import CustomerList from '@/views/customers/CustomerList';

/**
 * Customers Page
 * Displays list of all customers with search and filter capabilities
 */

export const metadata: Metadata = {
  title: 'Customers | BeerHive POS',
  description: 'Manage customers and VIP memberships',
};

export default function CustomersPage() {
  return <CustomerList />;
}
