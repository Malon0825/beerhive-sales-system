'use client';

import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/views/shared/layouts/DashboardLayout';
import { User } from '@/models/entities/User';

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
  user: User | null;
}

/**
 * DashboardLayoutWrapper Component
 * 
 * Wraps dashboard content with appropriate layout based on fullscreen mode.
 * This component uses useSearchParams to detect fullscreen mode from URL.
 * Must be wrapped in Suspense boundary to support Next.js static rendering.
 * 
 * Features:
 * - Detects ?fullscreen=true URL parameter
 * - Bypasses DashboardLayout (no sidebar/header) when in fullscreen mode
 * - Perfect for customer-facing displays
 * 
 * @param children - Dashboard page content to render
 * @param user - Authenticated user object
 */
export function DashboardLayoutWrapper({ children, user }: DashboardLayoutWrapperProps) {
  const searchParams = useSearchParams();
  
  // Check if fullscreen mode is enabled via URL parameter
  const isFullscreen = searchParams.get('fullscreen') === 'true';

  // Fullscreen mode - bypass DashboardLayout wrapper
  // Renders only the page content without sidebar/header
  if (isFullscreen) {
    return <>{children}</>;
  }

  // Normal mode - include DashboardLayout with sidebar and header
  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
