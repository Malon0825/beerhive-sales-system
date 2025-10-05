/**
 * User Role Enumeration
 * Defines the different roles users can have in the system
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  KITCHEN = 'kitchen',
  BARTENDER = 'bartender',
  WAITER = 'waiter',
}

export type UserRoleType = `${UserRole}`;
