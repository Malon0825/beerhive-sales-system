import { Metadata } from 'next';
import CustomerForm from '@/views/customers/CustomerForm';

/**
 * New Customer Page
 * Page for adding a new customer to the system
 */

export const metadata: Metadata = {
  title: 'Add Customer | BeerHive POS',
  description: 'Create a new customer profile',
};

export default function NewCustomerPage() {
  return <CustomerForm />;
}
