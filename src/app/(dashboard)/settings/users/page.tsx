import { Metadata } from 'next';
import UserManagement from '@/views/settings/users/UserManagement';

export const metadata: Metadata = {
  title: 'User Management | BeerHive POS',
  description: 'Manage system users and access control',
};

export default function UsersPage() {
  // TODO: Add admin-only access guard
  return <UserManagement />;
}
