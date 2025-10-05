'use client';

import { useState } from 'react';
import RoleBadge from './RoleBadge';
import PasswordResetDialog from './PasswordResetDialog';
import { Button } from '../../shared/ui/button';
import { Badge } from '../../shared/ui/badge';
import { Edit, Power, PowerOff, Key } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface UserListProps {
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onDeactivate: (userId: string) => void;
  onReactivate: (userId: string) => void;
  onRefresh: () => void;
}

export default function UserList({
  users,
  loading,
  onEdit,
  onDeactivate,
  onReactivate,
  onRefresh,
}: UserListProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handlePasswordReset = (userId: string) => {
    setSelectedUserId(userId);
    setShowPasswordReset(true);
  };

  const handlePasswordResetClose = () => {
    setShowPasswordReset(false);
    setSelectedUserId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No users found. Create your first user to get started.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className={`hover:bg-gray-50 ${!user.is_active ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                    <div className="text-sm text-gray-500">@{user.username}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.is_active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_login
                    ? new Date(user.last_login).toLocaleString()
                    : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(user)}
                      className="flex items-center gap-1"
                      title="Edit user"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePasswordReset(user.id)}
                      className="flex items-center gap-1"
                      title="Reset password"
                    >
                      <Key className="w-4 h-4" />
                    </Button>

                    {user.is_active ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDeactivate(user.id)}
                        className="flex items-center gap-1"
                        title="Deactivate user"
                      >
                        <PowerOff className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onReactivate(user.id)}
                        className="flex items-center gap-1"
                        title="Reactivate user"
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPasswordReset && selectedUserId && (
        <PasswordResetDialog
          userId={selectedUserId}
          onClose={handlePasswordResetClose}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
