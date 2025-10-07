import { UserRole } from '@/models/enums/UserRole';

/**
 * Route Access Configuration
 * Defines which user roles can access which routes
 */

export interface RouteAccess {
  path: string;
  allowedRoles: UserRole[];
  redirectTo?: string; // Where to redirect if access is denied
}

/**
 * Route access rules
 * Maps routes to the roles that can access them
 */
export const ROUTE_ACCESS_RULES: RouteAccess[] = [
  // Dashboard (Home) - All roles can access (will be redirected to their default page)
  {
    path: '/',
    allowedRoles: [
      UserRole.ADMIN, 
      UserRole.MANAGER, 
      UserRole.CASHIER, 
      UserRole.KITCHEN, 
      UserRole.BARTENDER, 
      UserRole.WAITER
    ],
  },
  
  // POS - Admin, Manager, Cashier only
  {
    path: '/pos',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
  },
  
  // Kitchen Display - Admin, Manager, Kitchen only
  {
    path: '/kitchen',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.KITCHEN],
  },
  
  // Bartender Display - Admin, Manager, Bartender only
  {
    path: '/bartender',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.BARTENDER],
  },
  
  // Waiter Display - Admin, Manager, Waiter only
  {
    path: '/waiter',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER],
  },
  
  // Reports - Admin, Manager only
  {
    path: '/reports',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  
  // Inventory - Admin, Manager only
  {
    path: '/inventory',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  
  // Customers - Admin, Manager, Cashier (cashiers need to lookup customers for orders)
  {
    path: '/customers',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
  },
  
  // Tables - Admin, Manager, Cashier (cashiers need to assign tables)
  {
    path: '/tables',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER],
  },
  
  // Packages - Admin, Manager only
  {
    path: '/packages',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  
  // Events - Admin, Manager only
  {
    path: '/events',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  
  // Happy Hours - Admin, Manager only
  {
    path: '/happy-hours',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  
  // Settings - Admin, Manager only
  {
    path: '/settings',
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  
  // Audit Logs - Admin only
  {
    path: '/audit-logs',
    allowedRoles: [UserRole.ADMIN],
  },
];

/**
 * Check if a user has access to a specific route
 * Supports both single role and multi-role users
 * 
 * @param route - The route to check (e.g., '/pos', '/kitchen')
 * @param userRoles - The user's role(s) - can be single role or array of roles
 * @returns true if the user has access, false otherwise
 * 
 * @example
 * // Single role user
 * canAccessRoute('/pos', 'cashier') // true
 * canAccessRoute('/kitchen', 'cashier') // false
 * 
 * // Multi-role user
 * canAccessRoute('/pos', ['cashier', 'waiter']) // true
 * canAccessRoute('/kitchen', ['bartender', 'kitchen']) // true
 */
export function canAccessRoute(
  route: string, 
  userRoles: UserRole | UserRole[]
): boolean {
  // Normalize to array for consistent processing
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
  
  // Find the matching route rule
  const routeRule = ROUTE_ACCESS_RULES.find(
    (rule) => route === rule.path || route.startsWith(rule.path + '/')
  );

  // If no rule found, allow access by default (for backward compatibility)
  if (!routeRule) {
    return true;
  }

  // Check if ANY of user's roles is in the allowed roles
  return rolesArray.some(userRole => 
    routeRule.allowedRoles.includes(userRole)
  );
}

/**
 * Get the default route for a user based on their role(s)
 * For multi-role users, returns route for PRIMARY role (first in array)
 * 
 * Priority order: Admin > Manager > Staff roles
 * 
 * @param roles - User role(s) - can be single role or array of roles
 * @returns Default route path for the role
 * 
 * @example
 * // Single role
 * getDefaultRouteForRole('cashier') // '/pos'
 * 
 * // Multi-role - uses first role as primary
 * getDefaultRouteForRole(['bartender', 'kitchen']) // '/bartender'
 * getDefaultRouteForRole(['kitchen', 'bartender']) // '/kitchen'
 * 
 * // Admin/Manager always take precedence (both go to reports)
 * getDefaultRouteForRole(['bartender', 'admin']) // '/reports' (admin overrides)
 * getDefaultRouteForRole(['manager']) // '/reports'
 */
export function getDefaultRouteForRole(roles: UserRole | UserRole[]): string {
  // Normalize to array for consistent processing
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  
  console.log('🎯 [roleBasedAccess] Getting default route for roles:', rolesArray);
  
  // Priority 1: Admin always goes to reports
  if (rolesArray.includes(UserRole.ADMIN)) {
    console.log('✅ [roleBasedAccess] Admin detected → routing to /reports');
    return '/reports';
  }
  
  // Priority 2: Manager goes to reports
  if (rolesArray.includes(UserRole.MANAGER)) {
    console.log('✅ [roleBasedAccess] Manager detected → routing to /reports');
    return '/reports';
  }
  
  // Priority 3: Use primary role (first in array)
  const primaryRole = rolesArray[0];
  console.log('🔍 [roleBasedAccess] Using primary role (first in array):', primaryRole);
  
  let route: string;
  switch (primaryRole) {
    case UserRole.CASHIER:
      route = '/pos'; // Cashier goes to POS
      break;
    case UserRole.KITCHEN:
      route = '/kitchen'; // Kitchen staff to kitchen display
      break;
    case UserRole.BARTENDER:
      route = '/bartender'; // Bartender to bartender display
      break;
    case UserRole.WAITER:
      route = '/waiter'; // Waiter to waiter display
      break;
    default:
      route = '/'; // Default to dashboard
  }
  
  console.log(`✅ [roleBasedAccess] Final route for ${primaryRole}:`, route);
  return route;
}

/**
 * Get the redirect path for a user who doesn't have access to a route
 * Redirects to user's default page based on their role(s)
 * 
 * @param userRoles - The user's role(s) - can be single role or array of roles
 * @returns Path to redirect to
 */
export function getRedirectPathForUnauthorizedAccess(
  userRoles: UserRole | UserRole[]
): string {
  return getDefaultRouteForRole(userRoles);
}
