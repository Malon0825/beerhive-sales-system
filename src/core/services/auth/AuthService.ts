import { supabase } from '@/data/supabase/client';
import { UserRole } from '@/models/enums/UserRole';
import { AppError } from '@/lib/errors/AppError';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
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
   * Check if user has required role
   */
  static hasRole(user: AuthUser | null, allowedRoles: UserRole[]): boolean {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }

  /**
   * Check if user has admin privileges
   */
  static isAdmin(user: AuthUser | null): boolean {
    return user?.role === UserRole.ADMIN;
  }

  /**
   * Check if user has manager or admin privileges
   */
  static isManagerOrAbove(user: AuthUser | null): boolean {
    if (!user) return false;
    return [UserRole.ADMIN, UserRole.MANAGER].includes(user.role);
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
