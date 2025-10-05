import { Metadata } from 'next';
import CustomerDetail from '@/views/customers/CustomerDetail';

/**
 * Customer Detail Page
 * Displays detailed information about a specific customer
 */

export const metadata: Metadata = {
  title: 'Customer Details | BeerHive POS',
  description: 'View customer details and purchase history',
};

interface CustomerPageProps {
  params: {
    customerId: string;
  };
}

export default function CustomerPage({ params }: CustomerPageProps) {
  return <CustomerDetail customerId={params.customerId} />;
}
