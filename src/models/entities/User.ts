import { UserRole } from '../enums/UserRole';

/**
 * User Entity
 * Represents a system user (staff member)
 */
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}
