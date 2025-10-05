import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTE_ACCESS_RULES, getDefaultRouteForRole } from '@/lib/utils/roleBasedAccess';

/**
 * Public routes that don't require authentication
 */
const publicRoutes = ['/login', '/api/auth/login'];

/**
 * API routes that should bypass route access checks
 */
const apiRoutes = ['/api'];

/**
 * Middleware for authentication and route protection
 * Checks if user is authenticated and has permission to access the requested route
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow API routes (they have their own auth)
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if user is authenticated by checking for auth token cookie
  const authToken = request.cookies.get('auth-token')?.value;
  
  if (!authToken) {
    // No auth token, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Get user roles from cookie (set during login)
  // Cookie stores roles as JSON array string: '["bartender","kitchen"]'
  const userRolesString = request.cookies.get('user-roles')?.value;

  if (!userRolesString) {
    // No roles found, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Parse roles array from cookie
  let userRoles: string[];
  try {
    userRoles = JSON.parse(userRolesString);
    if (!Array.isArray(userRoles) || userRoles.length === 0) {
      throw new Error('Invalid roles format');
    }
  } catch (error) {
    console.error('Failed to parse user roles from cookie:', error);
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check route access rules
  const matchingRule = ROUTE_ACCESS_RULES.find(
    (rule) => pathname === rule.path || pathname.startsWith(rule.path + '/')
  );

  if (matchingRule) {
    // Check if ANY of user's roles is allowed to access this route
    const hasAccess = userRoles.some((userRole) =>
      matchingRule.allowedRoles.some(
        (allowedRole) => allowedRole.toLowerCase() === userRole.toLowerCase()
      )
    );

    if (!hasAccess) {
      // Access denied, redirect to user's default route
      const defaultRoute = getDefaultRouteForRole(userRoles as any);
      console.warn(`⛔ Middleware: Access denied to ${pathname} for roles ${userRoles.join(', ')}`);
      console.log(`↪️  Redirecting to: ${defaultRoute}`);
      
      const redirectUrl = new URL(defaultRoute, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // User is authenticated and authorized
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
