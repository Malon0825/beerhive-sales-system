'use client';

import CustomerList from '@/views/customers/CustomerList';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Customers Page
 * Displays list of all customers with search and filter capabilities
 * Protected route - accessible by managers, admins, and cashiers
 */
export default function CustomersPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
      <CustomerList />
    </RouteGuard>
  );
}
