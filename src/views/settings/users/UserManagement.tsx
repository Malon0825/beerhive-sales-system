'use client';

import { useState, useEffect } from 'react';
import UserList from './UserList';
import UserForm from './UserForm';
import { Button } from '../../shared/ui/button';
import { UserPlus, Users } from 'lucide-react';

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

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const result = await response.json();

      if (result.success) {
        setUsers(result.data || []);
      }
    } catch (error) {
      console.error('Load users error:', error);
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

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/deactivate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        loadUsers();
      } else {
        alert(result.error || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('Deactivate user error:', error);
      alert('Failed to deactivate user');
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/reactivate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        loadUsers();
      } else {
        alert(result.error || 'Failed to reactivate user');
      }
    } catch (error) {
      console.error('Reactivate user error:', error);
      alert('Failed to reactivate user');
    }
  };

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
