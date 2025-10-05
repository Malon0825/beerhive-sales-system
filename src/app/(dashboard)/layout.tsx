'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { DashboardLayout as Layout } from '@/views/shared/layouts/DashboardLayout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Dashboard Layout
 * Wraps all dashboard routes with authentication and layout
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Layout user={user}>{children}</Layout>;
}
