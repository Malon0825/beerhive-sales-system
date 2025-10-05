'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import UserList from './UserList';
import UserForm from './UserForm';
import { Button } from '../../shared/ui/button';
import { UserPlus, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/data/supabase/client';

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

/**
 * UserManagement Component
 * Manages system users with CRUD operations
 * Only accessible to Admin and Manager roles
 */
export default function UserManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Check if user has manager or admin role
  const hasAccess = user?.role === 'admin' || user?.role === 'manager';

  // Check access permissions and load data
  useEffect(() => {
    if (authLoading) return;

    if (!hasAccess) {
      router.push('/');
      return;
    }

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, hasAccess]);

  /**
   * Load all users from API
   */
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        toast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please log in to access this page.',
        });
        router.push('/login');
        return;
      }

      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();

      if (result.success) {
        setUsers(result.data || []);
      } else {
        console.error('Failed to load users:', result.error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to load users',
        });
      }
    } catch (error) {
      console.error('Load users error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load users. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUser(null);
    loadUsers();
  };

  /**
   * Deactivate a user
   */
  const handleDeactivate = async (userId: string) => {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Not authenticated',
        });
        return;
      }

      const response = await fetch(`/api/users/${userId}/deactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'User deactivated successfully',
        });
        loadUsers();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to deactivate user',
        });
      }
    } catch (error) {
      console.error('Deactivate user error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to deactivate user',
      });
    }
  };

  /**
   * Reactivate a user
   */
  const handleReactivate = async (userId: string) => {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Not authenticated',
        });
        return;
      }

      const response = await fetch(`/api/users/${userId}/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'User reactivated successfully',
        });
        loadUsers();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to reactivate user',
        });
      }
    } catch (error) {
      console.error('Reactivate user error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reactivate user',
      });
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to access this section. Only administrators and managers can manage users.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }


  const activeUsers = users.filter((u) => u.is_active).length;
  const inactiveUsers = users.filter((u) => !u.is_active).length;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage system users and access control</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Add User
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Users</div>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Active Users</div>
              <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-green-600 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Inactive Users</div>
              <div className="text-2xl font-bold text-gray-600">{inactiveUsers}</div>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              ✕
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingUser ? 'Edit User' : 'Create New User'}
          </h2>
          <UserForm
            user={editingUser}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <UserList
          users={users}
          loading={loading}
          onEdit={handleEdit}
          onDeactivate={handleDeactivate}
          onReactivate={handleReactivate}
          onRefresh={loadUsers}
        />
      </div>
    </div>
  );
}
