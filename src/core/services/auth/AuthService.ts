import { supabase } from '@/data/supabase/client';
import { UserRole } from '@/models/enums/UserRole';
import { AppError } from '@/lib/errors/AppError';

export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Authenticated User Interface
 * Represents the currently logged-in user
 * 
 * MULTI-ROLE SUPPORT:
 * - `roles` array contains all assigned roles
 * - `role` (singular) is the primary role - kept for backward compatibility
 * - Access checks should use `roles` array
 */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  
  /** @deprecated Use `roles` array instead. Kept for backward compatibility. */
  role: UserRole;
  
  /** Array of all roles assigned to this user. Use this for access control. */
  roles: UserRole[];
  
  is_active: boolean;
}

/**
 * Authentication Service
 * Handles user login, logout, and session management
 */
export class AuthService {
  /**
   * Login user with username and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      // Call server-side API to handle authentication
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!result.success) {
        throw new AppError(result.error, response.status);
      }

      // Set session on client
      if (result.data.session) {
        await supabase.auth.setSession({
          access_token: result.data.session.access_token,
          refresh_token: result.data.session.refresh_token,
        });
      }

      return result.data.user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Login error:', error);
      throw new AppError('An error occurred during login. Please try again.', 500);
    }
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new AppError('Failed to logout', 500);
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw new AppError('An error occurred during logout', 500);
    }
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return null;
      }

      // Call API to get user details (bypasses RLS on server)
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Check if user has any of the required roles
   * Supports multi-role users - returns true if user has ANY of the allowed roles
   * 
   * @param user - The user to check
   * @param allowedRoles - Array of roles that are allowed
   * @returns true if user has at least one of the allowed roles
   */
  static hasRole(user: AuthUser | null, allowedRoles: UserRole[]): boolean {
    if (!user) return false;
    
    // Check if ANY of user's roles matches ANY of the allowed roles
    return user.roles.some(userRole => allowedRoles.includes(userRole));
  }

  /**
   * Check if user has admin privileges
   * Admin role takes precedence in multi-role scenarios
   * 
   * @param user - The user to check
   * @returns true if user has admin role
   */
  static isAdmin(user: AuthUser | null): boolean {
    if (!user) return false;
    return user.roles.includes(UserRole.ADMIN);
  }

  /**
   * Check if user has manager or admin privileges
   * Returns true if user has either manager or admin in their roles
   * 
   * @param user - The user to check
   * @returns true if user has manager or admin role
   */
  static isManagerOrAbove(user: AuthUser | null): boolean {
    if (!user) return false;
    return user.roles.some(role => 
      [UserRole.ADMIN, UserRole.MANAGER].includes(role)
    );
  }

  /**
   * Verify manager PIN for sensitive operations
   */
  static async verifyManagerPIN(pin: string): Promise<boolean> {
    try {
      // Get current user
      const currentUser = await this.getCurrentUser();
      if (!currentUser) return false;

      // Check if user is manager or admin
      if (!this.isManagerOrAbove(currentUser)) {
        return false;
      }

      // In a real implementation, verify PIN against stored hash
      // For now, we'll just check if user is manager/admin
      return true;
    } catch (error) {
      console.error('Verify manager PIN error:', error);
      return false;
    }
  }
}
