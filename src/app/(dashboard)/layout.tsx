'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { DashboardLayoutWrapper } from '@/components/layouts/DashboardLayoutWrapper';

/**
 * Dashboard Layout
 * Wraps all dashboard routes with authentication and layout
 * 
 * Features:
 * - Authentication check and redirect
 * - Fullscreen mode support via URL parameter
 * - Suspense boundary for useSearchParams compliance
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  /**
   * Redirect to login if not authenticated
   */
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Show loading state while checking authentication
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

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  /**
   * Wrap DashboardLayoutWrapper in Suspense to support useSearchParams
   * This is required by Next.js for static rendering compatibility
   * Fallback shows loading state during initial parameter read
   */
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <DashboardLayoutWrapper user={user}>{children}</DashboardLayoutWrapper>
    </Suspense>
  );
}
