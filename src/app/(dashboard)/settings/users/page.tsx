import { Metadata } from 'next';
import UserManagement from '@/views/settings/users/UserManagement';

export const metadata: Metadata = {
  title: 'User Management | BeerHive POS',
  description: 'Manage system users and access control',
};

/**
 * Users Page
 * Manage system users - accessible only to Admin and Manager roles
 */
export default function UsersPage() {
  return <UserManagement />;
}
