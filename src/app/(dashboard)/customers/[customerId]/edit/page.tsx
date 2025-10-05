import { Metadata } from 'next';
import CustomerEditForm from '@/views/customers/CustomerEditForm';

/**
 * Edit Customer Page
 * Page for editing an existing customer's information
 */

export const metadata: Metadata = {
  title: 'Edit Customer | BeerHive POS',
  description: 'Update customer information',
};

interface EditCustomerPageProps {
  params: {
    customerId: string;
  };
}

export default function EditCustomerPage({ params }: EditCustomerPageProps) {
  return <CustomerEditForm customerId={params.customerId} />;
}
