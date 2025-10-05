'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { canAccessRoute, getRedirectPathForUnauthorizedAccess } from '@/lib/utils/roleBasedAccess';
import { UserRole } from '@/models/enums/UserRole';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRoles: UserRole[];
  fallbackPath?: string;
}

/**
 * RouteGuard Component
 * Protects routes by checking if the user has the required role
 * Redirects to appropriate page if access is denied
 */
export function RouteGuard({ children, requiredRoles, fallbackPath }: RouteGuardProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    console.log('🛡️ [RouteGuard] Checking access for:', pathname, {
      loading,
      isAuthenticated,
      hasUser: !!user,
      requiredRoles
    });

    // Wait for authentication to load
    if (loading) {
      console.log('⏳ [RouteGuard] Still loading authentication...');
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      console.log('❌ [RouteGuard] Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    console.log('👤 [RouteGuard] User info:', {
      username: user.username,
      roles: user.roles,
      requiredRoles,
      pathname
    });

    // Check if user has required role (supports multi-role users)
    // User has access if ANY of their roles matches ANY of the required roles
    const hasAccess = user.roles.some(userRole => 
      requiredRoles.includes(userRole as UserRole)
    );

    console.log('🔐 [RouteGuard] Access check result:', {
      hasAccess,
      userRoles: user.roles,
      requiredRoles,
      pathname
    });

    if (!hasAccess) {
      // User doesn't have access, redirect to their default page
      const redirectPath = fallbackPath || getRedirectPathForUnauthorizedAccess(user.roles as UserRole[]);
      console.warn(`⛔ [RouteGuard] Access denied: ${user.username} (${user.roles.join(', ')}) tried to access ${pathname}`);
      console.log(`↪️ [RouteGuard] Redirecting to: ${redirectPath}`);
      router.push(redirectPath);
      return;
    }

    // User is authorized
    console.log(`✅ [RouteGuard] Access granted to ${pathname} for ${user.username}`);
    setIsAuthorized(true);
  }, [loading, isAuthenticated, user, requiredRoles, router, pathname, fallbackPath]);

  // Show loading state
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

  // Show nothing while checking authorization or redirecting
  if (!isAuthenticated || !isAuthorized) {
    return null;
  }

  // User is authenticated and authorized, render children
  return <>{children}</>;
}

/**
 * Higher Order Component (HOC) to protect pages
 * Usage: export default withRouteGuard(MyPage, [UserRole.ADMIN, UserRole.MANAGER]);
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles: UserRole[],
  fallbackPath?: string
) {
  return function GuardedComponent(props: P) {
    return (
      <RouteGuard requiredRoles={requiredRoles} fallbackPath={fallbackPath}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}
