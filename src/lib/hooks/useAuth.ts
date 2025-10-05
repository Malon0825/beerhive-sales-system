'use client';

import { useAuthContext } from '../contexts/AuthContext';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Hook for accessing authentication state and methods
 */
export function useAuth() {
  const context = useAuthContext();

  // Helper functions
  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!context.user) return false;
    return allowedRoles.includes(context.user.role);
  };

  const isAdmin = (): boolean => {
    return context.user?.role === UserRole.ADMIN;
  };

  const isManager = (): boolean => {
    return context.user?.role === UserRole.MANAGER;
  };

  const isCashier = (): boolean => {
    return context.user?.role === UserRole.CASHIER;
  };

  const isKitchen = (): boolean => {
    return context.user?.role === UserRole.KITCHEN;
  };

  const isBartender = (): boolean => {
    return context.user?.role === UserRole.BARTENDER;
  };

  const isWaiter = (): boolean => {
    return context.user?.role === UserRole.WAITER;
  };

  const isManagerOrAbove = (): boolean => {
    if (!context.user) return false;
    return [UserRole.ADMIN, UserRole.MANAGER].includes(context.user.role);
  };

  const canAccessPOS = (): boolean => {
    return hasRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]);
  };

  const canAccessKitchen = (): boolean => {
    return hasRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.KITCHEN]);
  };

  const canAccessBartender = (): boolean => {
    return hasRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.BARTENDER]);
  };

  const canAccessWaiter = (): boolean => {
    return hasRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER]);
  };

  const canManageInventory = (): boolean => {
    return hasRole([UserRole.ADMIN, UserRole.MANAGER]);
  };

  const canViewReports = (): boolean => {
    return hasRole([UserRole.ADMIN, UserRole.MANAGER]);
  };

  return {
    ...context,
    hasRole,
    isAdmin,
    isManager,
    isCashier,
    isKitchen,
    isBartender,
    isWaiter,
    isManagerOrAbove,
    canAccessPOS,
    canAccessKitchen,
    canAccessBartender,
    canAccessWaiter,
    canManageInventory,
    canViewReports,
  };
}
