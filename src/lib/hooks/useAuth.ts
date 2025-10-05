'use client';

import { useAuthContext } from '../contexts/AuthContext';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Hook for accessing authentication state and methods
 */
export function useAuth() {
  const context = useAuthContext();

  // Helper functions (support multi-role users)
  
  /**
   * Check if user has any of the allowed roles
   * Returns true if user has at least one of the allowed roles
   */
  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!context.user) return false;
    return context.user.roles.some(userRole => allowedRoles.includes(userRole));
  };

  /**
   * Check if user has admin role
   * Admin may have multiple roles, this checks if admin is one of them
   */
  const isAdmin = (): boolean => {
    if (!context.user) return false;
    return context.user.roles.includes(UserRole.ADMIN);
  };

  /**
   * Check if user has manager role
   * Manager may have multiple roles, this checks if manager is one of them
   */
  const isManager = (): boolean => {
    if (!context.user) return false;
    return context.user.roles.includes(UserRole.MANAGER);
  };

  /**
   * Check if user has cashier role
   * User may have multiple roles, this checks if cashier is one of them
   */
  const isCashier = (): boolean => {
    if (!context.user) return false;
    return context.user.roles.includes(UserRole.CASHIER);
  };

  /**
   * Check if user has kitchen role
   * User may have multiple roles, this checks if kitchen is one of them
   */
  const isKitchen = (): boolean => {
    if (!context.user) return false;
    return context.user.roles.includes(UserRole.KITCHEN);
  };

  /**
   * Check if user has bartender role
   * User may have multiple roles, this checks if bartender is one of them
   */
  const isBartender = (): boolean => {
    if (!context.user) return false;
    return context.user.roles.includes(UserRole.BARTENDER);
  };

  /**
   * Check if user has waiter role
   * User may have multiple roles, this checks if waiter is one of them
   */
  const isWaiter = (): boolean => {
    if (!context.user) return false;
    return context.user.roles.includes(UserRole.WAITER);
  };

  /**
   * Check if user has manager or admin privileges
   * Returns true if user has either manager or admin in their roles
   */
  const isManagerOrAbove = (): boolean => {
    if (!context.user) return false;
    return context.user.roles.some(role => 
      [UserRole.ADMIN, UserRole.MANAGER].includes(role)
    );
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
