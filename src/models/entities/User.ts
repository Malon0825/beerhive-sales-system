import { UserRole } from '../enums/UserRole';

/**
 * User Entity
 * Represents a system user (staff member)
 * 
 * MULTI-ROLE SUPPORT:
 * - Users can have multiple roles (e.g., bartender + kitchen)
 * - `roles` array contains all assigned roles
 * - `role` (singular) represents the primary role (first in array) - kept for backward compatibility
 * - First role in `roles` array determines default page after login
 */
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  
  /** @deprecated Use `roles` array instead. Kept for backward compatibility. */
  role: UserRole;
  
  /** Array of all roles assigned to this user. First role is primary/default. */
  roles: UserRole[];
  
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new user
 * Can accept either single role or multiple roles
 */
export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  full_name: string;
  
  /** Single role (for backward compatibility) */
  role?: UserRole;
  
  /** Multiple roles (preferred for new code) */
  roles?: UserRole[];
}

/**
 * Input for updating an existing user
 * Can update either single role or multiple roles
 */
export interface UpdateUserInput {
  email?: string;
  full_name?: string;
  
  /** Single role (for backward compatibility) */
  role?: UserRole;
  
  /** Multiple roles (preferred for new code) */
  roles?: UserRole[];
  
  is_active?: boolean;
}
