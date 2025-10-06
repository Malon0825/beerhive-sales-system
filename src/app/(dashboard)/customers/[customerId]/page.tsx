import { Metadata } from 'next';
import { use } from 'react';
import CustomerDetail from '@/views/customers/CustomerDetail';

/**
 * Customer Detail Page
 * Displays detailed information about a specific customer
 */

export const metadata: Metadata = {
  title: 'Customer Details | BeerHive POS',
  description: 'View customer details and purchase history',
};

interface PageProps {
  params: Promise<{ customerId: string }>
}

export default function CustomerPage({ params }: PageProps) {
  const { customerId } = use(params);
  return <CustomerDetail customerId={customerId} />;
}
