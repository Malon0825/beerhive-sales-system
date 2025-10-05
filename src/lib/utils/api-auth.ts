import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { AppError } from '@/lib/errors/AppError';
import { UserRole } from '@/models/enums/UserRole';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

/**
 * Get the authenticated user from the request
 * Extracts the token from Authorization header and validates it
 * @param request - Next.js request object
 * @returns Authenticated user or null if not authenticated
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // Verify the token with Supabase
    const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !authUser) {
      return null;
    }

    // Get user details from our users table
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, email, full_name, role, is_active')
      .eq('id', authUser.id)
      .single();

    if (userError || !user) {
      return null;
    }

    if (!user.is_active) {
      throw new AppError('User account is inactive', 403);
    }

    return user as AuthenticatedUser;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Require authentication for an API route
 * Throws an error if user is not authenticated
 * @param request - Next.js request object
 * @returns Authenticated user
 */
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    throw new AppError('Authentication required', 401);
  }

  return user;
}

/**
 * Require specific role(s) for an API route
 * Throws an error if user doesn't have required role
 * @param request - Next.js request object
 * @param allowedRoles - Array of allowed roles
 * @returns Authenticated user
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);

  if (!allowedRoles.includes(user.role)) {
    throw new AppError('Insufficient permissions', 403);
  }

  return user;
}

/**
 * Require admin or manager role for an API route
 * @param request - Next.js request object
 * @returns Authenticated user
 */
export async function requireManagerOrAbove(request: NextRequest): Promise<AuthenticatedUser> {
  return requireRole(request, [UserRole.ADMIN, UserRole.MANAGER]);
}

/**
 * Require admin role for an API route
 * @param request - Next.js request object
 * @returns Authenticated user
 */
export async function requireAdmin(request: NextRequest): Promise<AuthenticatedUser> {
  return requireRole(request, [UserRole.ADMIN]);
}
