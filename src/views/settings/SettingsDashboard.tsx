'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Settings, Users, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Card } from '../shared/ui/card';

/**
 * SettingsDashboard Component
 * Main settings dashboard with navigation cards to different settings sections
 * Only accessible to Admin and Manager roles
 */
export default function SettingsDashboard() {
  const { user, loading, isManagerOrAbove } = useAuth();
  const router = useRouter();

  // Check access permissions
  useEffect(() => {
    if (!loading && !isManagerOrAbove()) {
      router.push('/');
    }
  }, [loading, isManagerOrAbove, router]);

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

  if (!isManagerOrAbove()) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to access this section. Only administrators and managers can access settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-600">
          Manage system configuration, users, and access control
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management */}
        <Link href="/settings/users">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-amber-500">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  User Management
                </h3>
                <p className="text-gray-600 text-sm">
                  Add, edit, and manage system users. Assign roles and control access permissions.
                </p>
              </div>
            </div>
          </Card>
        </Link>

        {/* General Settings */}
        <Card className="p-6 opacity-50 cursor-not-allowed border-2">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Settings className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                General Settings
              </h3>
              <p className="text-gray-600 text-sm">
                Configure business information, tax rates, and system preferences.
              </p>
              <span className="inline-block mt-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                Coming Soon
              </span>
            </div>
          </div>
        </Card>

        {/* Security Settings */}
        <Card className="p-6 opacity-50 cursor-not-allowed border-2">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ShieldCheck className="w-8 h-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Security Settings
              </h3>
              <p className="text-gray-600 text-sm">
                Configure password policies, session timeouts, and security preferences.
              </p>
              <span className="inline-block mt-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                Coming Soon
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Current User Info */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium mb-1">You're logged in as: {user?.full_name}</p>
            <p className="text-amber-800">
              Role: <span className="font-semibold capitalize">{user?.role}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
