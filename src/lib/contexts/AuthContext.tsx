'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthService, AuthUser } from '@/core/services/auth/AuthService';
import { SessionService } from '@/core/services/auth/SessionService';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/models/enums/UserRole';

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

/**
 * Get default route based on user role
 * Each role is redirected to their primary workspace
 */
function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case UserRole.ADMIN:
      return '/'; // Dashboard
    case UserRole.MANAGER:
      return '/reports'; // Manager starts at reports
    case UserRole.CASHIER:
      return '/pos'; // Cashier goes to POS
    case UserRole.KITCHEN:
      return '/kitchen'; // Kitchen staff to kitchen display
    case UserRole.BARTENDER:
      return '/bartender'; // Bartender to bartender display
    case UserRole.WAITER:
      return '/waiter'; // Waiter to waiter display
    default:
      return '/'; // Default to dashboard
  }
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

  const loadUser = async () => {
    try {
      setLoading(true);
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string) => {
    try {
      const authUser = await AuthService.login({ username, password });
      setUser(authUser);
      
      // Route user to their role-specific page
      const defaultRoute = getDefaultRouteForRole(authUser.role);
      console.log(`✅ Login successful: ${authUser.username} (${authUser.role}) → redirecting to ${defaultRoute}`);
      router.push(defaultRoute);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
      setUser(null);
      SessionService.clearSession();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, [router]);

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
