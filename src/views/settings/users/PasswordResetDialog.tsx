'use client';

import { useState } from 'react';
import { Button } from '../../shared/ui/button';
import { X, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface PasswordResetDialogProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasswordResetDialog({
  userId,
  onClose,
  onSuccess,
}: PasswordResetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset this user\'s password?')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setNewPassword(result.temporaryPassword);
      } else {
        alert(result.error || 'Failed to reset password');
        onClose();
      }
    } catch (error) {
      console.error('Reset password error:', error);
      alert('Failed to reset password');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!newPassword) return;

    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      alert('Failed to copy password');
    }
  };

  const handleClose = () => {
    if (newPassword) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!newPassword ? (
            // Confirmation state
            <div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">This will generate a new temporary password.</p>
                    <p>The user will need to use this password to log in and should change it immediately.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleReset} disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </div>
          ) : (
            // Success state with new password
            <div>
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Password reset successful!</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-md font-mono text-lg tracking-wider">
                    {newPassword}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Copy this password and provide it to the user securely</li>
                    <li>This password will not be shown again</li>
                    <li>The user should change this password after first login</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
