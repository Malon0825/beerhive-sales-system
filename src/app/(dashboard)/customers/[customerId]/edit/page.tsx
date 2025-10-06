import { Metadata } from 'next';
import { use } from 'react';
import CustomerEditForm from '@/views/customers/CustomerEditForm';

/**
 * Edit Customer Page
 * Page for editing an existing customer's information
 */

export const metadata: Metadata = {
  title: 'Edit Customer | BeerHive POS',
  description: 'Update customer information',
};
/**
 * Next.js App Router page props must satisfy `PageProps`.
 * We declare the dynamic route param shape via the generic.
 */
interface PageProps {
  params: Promise<{ customerId: string }>
}

export default function EditCustomerPage({ params }: PageProps) {
  const { customerId } = use(params);
  return <CustomerEditForm customerId={customerId} />;
}
