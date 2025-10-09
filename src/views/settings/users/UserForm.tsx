'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Label } from '../../shared/ui/label';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/data/supabase/client';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;  // Primary role (backward compatibility)
  roles?: string[];  // Multiple roles
  is_active: boolean;
  manager_pin?: string;  // Optional manager PIN for admin/manager users
}

interface UserFormProps {
  user: User | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    roles: ['cashier'] as string[],  // Multi-role support
    password: '',
    confirmPassword: '',
    manager_pin: '',  // Optional PIN for admin/manager users
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Use roles array if available, otherwise convert single role to array
      const userRoles = user.roles && user.roles.length > 0 
        ? user.roles 
        : [user.role];
      
      setFormData({
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        roles: userRoles,
        password: '',
        confirmPassword: '',
        manager_pin: user.manager_pin || '',  // Load existing PIN if available
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Full name validation
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    // Password validation (only for new users or if changing password)
    if (!user) {
      // Creating new user
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Password must contain uppercase, lowercase, and number';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submit form to create or update user
   * Prevents double submission using loading state and early validation
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission - exit immediately if already processing
    if (loading) {
      console.warn('[UserForm] Blocked duplicate submission attempt');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const payload: any = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        roles: formData.roles,  // Send roles array
      };

      // Only include password for new users
      if (!user) {
        payload.password = formData.password;
      }
      
      // Include manager_pin if user has admin or manager role
      // Check if any of the selected roles includes 'admin' or 'manager'
      const hasManagerRole = formData.roles.some(role => role === 'admin' || role === 'manager');
      if (hasManagerRole && formData.manager_pin) {
        payload.manager_pin = formData.manager_pin;
      }

      const url = user ? `/api/users/${user.id}` : '/api/users';
      const method = user ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          variant: 'success',
          title: 'Success',
          description: user ? 'User updated successfully' : 'User created successfully',
        });
        onSuccess();
      } else {
        // Handle specific error cases
        let errorMessage = result.error || 'Failed to save user';
        
        // 409 Conflict - duplicate username/email
        if (response.status === 409) {
          errorMessage = result.error || 'Username or email already exists. Please check the form and try again.';
          
          // Update form errors for better UX
          if (errorMessage.toLowerCase().includes('username')) {
            setErrors({ username: 'This username is already taken' });
          } else if (errorMessage.toLowerCase().includes('email')) {
            setErrors({ email: 'This email is already registered' });
          }
        }
        
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error('Save user error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save user. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Username */}
      <div>
        <Label htmlFor="username">Username *</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          disabled={!!user} // Cannot change username for existing users
          className={errors.username ? 'border-red-500' : ''}
        />
        {errors.username && (
          <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.username}
          </div>
        )}
        {user && (
          <div className="text-gray-500 text-sm mt-1">
            Username cannot be changed after creation
          </div>
        )}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.email}
          </div>
        )}
      </div>

      {/* Full Name */}
      <div>
        <Label htmlFor="full_name">Full Name *</Label>
        <Input
          id="full_name"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className={errors.full_name ? 'border-red-500' : ''}
        />
        {errors.full_name && (
          <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.full_name}
          </div>
        )}
      </div>

      {/* Roles */}
      <div>
        <Label htmlFor="roles">Roles *</Label>
        <div className="space-y-2">
          <div className="text-sm text-gray-600 mb-2">
            Select one or more roles. First role selected will be the primary role.
          </div>
          <div className="space-y-2 border border-gray-300 rounded-md p-3">
            {['admin', 'manager', 'cashier', 'kitchen', 'bartender', 'waiter'].map((role) => (
              <label key={role} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.roles.includes(role)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Add role
                      setFormData({ ...formData, roles: [...formData.roles, role] });
                    } else {
                      // Remove role (but keep at least one)
                      if (formData.roles.length > 1) {
                        setFormData({ ...formData, roles: formData.roles.filter(r => r !== role) });
                      }
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="capitalize text-sm">{role}</span>
              </label>
            ))}
          </div>
          {formData.roles.length > 0 && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Primary role:</span> <span className="capitalize">{formData.roles[0]}</span>
              {formData.roles.length > 1 && (
                <>
                  {' | '}
                  <span className="font-medium">Additional:</span> <span className="capitalize">{formData.roles.slice(1).join(', ')}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manager PIN (only for admin/manager roles) */}
      {formData.roles.some(role => role === 'admin' || role === 'manager') && (
        <div>
          <Label htmlFor="manager_pin">Manager PIN (Optional)</Label>
          <Input
            id="manager_pin"
            type="text"
            value={formData.manager_pin}
            onChange={(e) => setFormData({ ...formData, manager_pin: e.target.value })}
            placeholder="Enter PIN for authorization"
            maxLength={6}
          />
          <div className="text-gray-500 text-sm mt-1">
            Used for authorizing order returns and voids. No restrictions on PIN format.
          </div>
        </div>
      )}

      {/* Password (only for new users) */}
      {!user && (
        <>
          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={errors.password ? 'border-red-500' : ''}
              placeholder="At least 8 characters"
            />
            {errors.password && (
              <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.password}
              </div>
            )}
            <div className="text-gray-500 text-sm mt-1">
              Must contain uppercase, lowercase, and number
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            {errors.confirmPassword && (
              <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.confirmPassword}
              </div>
            )}
          </div>
        </>
      )}

      {user && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="text-sm text-blue-800">
            To change the password, use the "Reset Password" action in the user list.
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}
