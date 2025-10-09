'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { User, Mail, Lock, Eye, EyeOff, Save, X } from 'lucide-react';
import { supabase } from '@/data/supabase/client';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileFormData {
  username: string;
  email: string;
  full_name: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * ProfileDialog Component
 * Allows users to update their personal information (username, email, full_name, password)
 * Excludes business-sensitive data like role and permissions
 */
export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    email: '',
    full_name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Initialize form with user data
  useEffect(() => {
    if (user && open) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        full_name: user.full_name || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user, open]);

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Validate form data
   */
  const validateForm = (): string | null => {
    // Basic info validation
    if (!formData.username.trim()) {
      return 'Username is required';
    }
    if (formData.username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Invalid email format';
    }

    if (!formData.full_name.trim()) {
      return 'Full name is required';
    }

    // Password validation (only if changing password)
    if (formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        return 'Current password is required to change password';
      }

      if (formData.newPassword.length < 8) {
        return 'New password must be at least 8 characters';
      }

      if (!/[A-Z]/.test(formData.newPassword)) {
        return 'New password must contain at least one uppercase letter';
      }

      if (!/[a-z]/.test(formData.newPassword)) {
        return 'New password must contain at least one lowercase letter';
      }

      if (!/[0-9]/.test(formData.newPassword)) {
        return 'New password must contain at least one number';
      }

      if (formData.newPassword !== formData.confirmPassword) {
        return 'New passwords do not match';
      }
    }

    return null;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: validationError,
      });
      return;
    }

    setLoading(true);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Prepare update data
      const updateData: any = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
      };

      // Add password fields if changing password
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      // Call API to update profile
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Success
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Profile updated successfully',
      });

      // Clear password fields
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        // Refresh the page to update user data in context
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      // Reset form
      if (user) {
        setFormData({
          username: user.username || '',
          email: user.email || '',
          full_name: user.full_name || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
            Edit Profile
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Update your personal information. Role and permissions cannot be changed here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Username */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="username" className="text-sm">
              Username <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                className="pl-8 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
                placeholder="Enter username"
                disabled={loading}
                required
              />
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              3+ characters, letters, numbers, and underscores only
            </p>
          </div>

          {/* Email */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email" className="text-sm">
              Email <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="pl-8 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
                placeholder="Enter email"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="full_name" className="text-sm">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder="Enter full name"
              className="text-sm sm:text-base h-9 sm:h-10"
              disabled={loading}
              required
            />
          </div>

          {/* Divider */}
          <div className="border-t pt-3 sm:pt-4">
            <h3 className="mb-2 sm:mb-3 text-xs sm:text-sm font-medium">Change Password (Optional)</h3>

            {/* Current Password */}
            <div className="mb-2 sm:mb-3 space-y-1.5 sm:space-y-2">
              <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleChange('currentPassword', e.target.value)}
                  className="pl-8 sm:pl-10 pr-9 sm:pr-10 text-sm sm:text-base h-9 sm:h-10"
                  placeholder="Enter current password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:scale-95 transition-transform"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="mb-2 sm:mb-3 space-y-1.5 sm:space-y-2">
              <Label htmlFor="newPassword" className="text-sm">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleChange('newPassword', e.target.value)}
                  className="pl-8 sm:pl-10 pr-9 sm:pr-10 text-sm sm:text-base h-9 sm:h-10"
                  placeholder="Enter new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:scale-95 transition-transform"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                8+ characters, must include uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className="pl-8 sm:pl-10 pr-9 sm:pr-10 text-sm sm:text-base h-9 sm:h-10"
                  placeholder="Confirm new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:scale-95 transition-transform"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="h-9 sm:h-10 text-sm sm:text-base w-full sm:w-auto"
            >
              <X className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="h-9 sm:h-10 text-sm sm:text-base w-full sm:w-auto active:scale-95 transition-transform"
            >
              <Save className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
