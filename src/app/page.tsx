'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getDefaultRouteForRole } from '@/lib/utils/roleBasedAccess';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Root Landing Page Component
 * 
 * This component handles the initial routing logic for the application.
 * It redirects users to their appropriate default page based on authentication status and role.
 * 
 * Routing Logic:
 * - Unauthenticated users → /login
 * - Authenticated users → Role-based default route:
 *   - Admin → / (dashboard)
 *   - Manager → /reports
 *   - Cashier → /pos
 *   - Kitchen → /kitchen
 *   - Bartender → /bartender
 *   - Waiter → /waiter
 * 
 * @returns Loading spinner while checking authentication and redirecting
 */
export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  /**
   * Authentication and Routing Effect
   * Handles redirect logic based on user authentication status and role
   */
  useEffect(() => {
    // Wait for authentication check to complete
    if (loading) {
      console.log('🔄 [Root Page] Authentication check in progress...');
      return;
    }

    console.log('📍 [Root Page] Authentication check completed');
    console.log('🔐 [Root Page] isAuthenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      // Redirect unauthenticated users to login
      console.log('❌ [Root Page] User not authenticated - redirecting to /login');
      router.replace('/login');
      return;
    }

    // User is authenticated - log user details
    console.log('✅ [Root Page] User authenticated:', {
      username: user?.username,
      fullName: user?.full_name,
      roles: user?.roles,
      userId: user?.id
    });

    // Get role-based default route
    const defaultRoute = getDefaultRouteForRole(user?.roles as UserRole[]);
    
    console.log('🎯 [Root Page] Redirecting to role-based default route:', {
      roles: user?.roles,
      defaultRoute
    });

    // Redirect to user's default page
    router.replace(defaultRoute);
    
  }, [isAuthenticated, loading, user, router]);

  /**
   * Render loading state while authentication is being checked
   * and redirect is being processed
   */
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {loading ? 'Checking authentication...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}
