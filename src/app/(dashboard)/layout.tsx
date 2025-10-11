'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { DashboardLayout as Layout } from '@/views/shared/layouts/DashboardLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Dashboard Layout
 * Wraps all dashboard routes with authentication and layout
 * 
 * FULLSCREEN MODE:
 * - Detects ?fullscreen=true URL parameter
 * - Bypasses DashboardLayout (no sidebar/header) when in fullscreen mode
 * - Perfect for customer-facing displays
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if fullscreen mode is enabled via URL parameter
  const isFullscreen = searchParams.get('fullscreen') === 'true';

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

  // Fullscreen mode - bypass DashboardLayout wrapper
  // Renders only the page content without sidebar/header
  if (isFullscreen) {
    return <>{children}</>;
  }

  // Normal mode - include DashboardLayout with sidebar and header
  return <Layout user={user}>{children}</Layout>;
}
