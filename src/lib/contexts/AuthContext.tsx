'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthService, AuthUser } from '@/core/services/auth/AuthService';
import { SessionService } from '@/core/services/auth/SessionService';
import { useRouter } from 'next/navigation';
import { getDefaultRouteForRole } from '@/lib/utils/roleBasedAccess';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize session monitoring
  useEffect(() => {
    SessionService.initialize();
  }, []);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Load current user from authentication service
   * Called on mount and when refreshUser is invoked
   */
  const loadUser = async () => {
    try {
      console.log('🔄 [AuthContext] Loading user...');
      setLoading(true);
      const currentUser = await AuthService.getCurrentUser();
      
      if (currentUser) {
        console.log('✅ [AuthContext] User loaded successfully:', {
          username: currentUser.username,
          fullName: currentUser.full_name,
          roles: currentUser.roles,
          userId: currentUser.id
        });
        setUser(currentUser);
      } else {
        console.log('❌ [AuthContext] No user found (not authenticated)');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error loading user:', error);
      setUser(null);
    } finally {
      console.log('🏁 [AuthContext] User loading completed, loading = false');
      setLoading(false);
    }
  };

  /**
   * Login user with username and password
   * After successful login, redirects to root page (/) which handles role-based routing
   */
  const login = useCallback(async (username: string, password: string) => {
    try {
      console.log('🔐 [AuthContext] Attempting login for:', username);
      const authUser = await AuthService.login({ username, password });
      
      // Update user state immediately
      setUser(authUser);
      
      console.log('✅ [AuthContext] Login successful:', {
        username: authUser.username,
        fullName: authUser.full_name,
        roles: authUser.roles,
        userId: authUser.id
      });
      
      // Small delay to ensure cookies are set and session is synchronized
      // This prevents race conditions where middleware checks auth before cookies are ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Always redirect to root page after login
      // Root page will handle role-based redirects
      console.log('🚀 [AuthContext] Redirecting to root page for role-based routing...');
      
      // Use router.replace instead of router.push to prevent back button issues
      // Also use hard navigation to ensure cookies are sent with first request
      window.location.href = '/';
    } catch (error) {
      console.error('❌ [AuthContext] Login error:', error);
      throw error;
    }
  }, [router]);

  /**
   * Logout current user
   * Clears session and redirects to login page
   */
  const logout = useCallback(async () => {
    try {
      console.log('🚪 [AuthContext] Logging out user:', user?.username);
      
      // Call logout API to clear cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      // Clear local session
      await AuthService.logout();
      setUser(null);
      SessionService.clearSession();
      
      console.log('✅ [AuthContext] Logout successful, redirecting to login...');
      router.push('/login');
    } catch (error) {
      console.error('❌ [AuthContext] Logout error:', error);
      throw error;
    }
  }, [router, user]);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
