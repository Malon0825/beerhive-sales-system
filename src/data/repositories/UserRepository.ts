import { supabaseAdmin } from '../supabase/server-client';
import { AppError } from '@/lib/errors/AppError';
import { UserRole } from '@/models/enums/UserRole';

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;  // Single role (backward compatibility)
  roles?: UserRole[];  // Multiple roles (preferred)
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  full_name?: string;
  role?: UserRole;  // Single role (backward compatibility)
  roles?: UserRole[];  // Multiple roles (preferred)
  is_active?: boolean;
}

/**
 * UserRepository
 * Handles all database operations for users
 */
export class UserRepository {
  /**
   * Get all users
   */
  static async getAll(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, username, email, full_name, role, roles, is_active, last_login, created_at')
        .order('created_at', { ascending: false });

      if (error) throw new AppError(error.message, 500);

      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch users', 500);
    }
  }

  /**
   * Get user by ID
   */
  static async getById(id: string): Promise<any | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, username, email, full_name, role, roles, is_active, last_login, created_at, updated_at')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new AppError(error.message, 500);
      }

      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch user', 500);
    }
  }

  /**
   * Get user by username
   */
  static async getByUsername(username: string): Promise<any | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new AppError(error.message, 500);
      }

      return data;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch user', 500);
    }
  }

  /**
   * Get user by email
   */
  static async getByEmail(email: string): Promise<any | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new AppError(error.message, 500);
      }

      return data;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch user', 500);
    }
  }

  /**
   * Create new user
   */
  static async create(input: CreateUserInput): Promise<any> {
    try {
      // First, create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });

      if (authError) throw new AppError(authError.message, 500);

      // Determine roles array
      // Prefer roles array if provided, otherwise convert single role to array
      const rolesArray = input.roles && input.roles.length > 0 
        ? input.roles 
        : (input.role ? [input.role] : ['cashier']);
      
      const primaryRole = rolesArray[0];

      // Then create user record in users table
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          username: input.username,
          email: input.email,
          full_name: input.full_name,
          role: primaryRole,  // Primary role (first in array)
          roles: rolesArray,  // All roles
          password_hash: 'managed_by_supabase_auth', // Placeholder
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Rollback auth user creation if users table insert fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new AppError(error.message, 500);
      }

      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create user', 500);
    }
  }

  /**
   * Update user
   */
  static async update(id: string, input: UpdateUserInput): Promise<any> {
    try {
      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      
      // Handle roles update
      if (input.roles && input.roles.length > 0) {
        updateData.roles = input.roles;
        updateData.role = input.roles[0];  // Update primary role
      } else if (input.role) {
        // Backward compatibility: single role provided
        updateData.role = input.role;
        updateData.roles = [input.role];
      }
      
      // Add other fields
      if (input.username !== undefined) updateData.username = input.username;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.full_name !== undefined) updateData.full_name = input.full_name;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);

      // If email was updated, update in Supabase Auth
      if (input.email) {
        await supabaseAdmin.auth.admin.updateUserById(id, {
          email: input.email,
        });
      }

      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update user', 500);
    }
  }

  /**
   * Deactivate user (soft delete)
   */
  static async deactivate(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to deactivate user', 500);
    }
  }

  /**
   * Reactivate user
   */
  static async reactivate(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to reactivate user', 500);
    }
  }

  /**
   * Change user password
   */
  static async changePassword(id: string, newPassword: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: newPassword,
      });

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error instanceof AppError ? error : new AppError('Failed to change password', 500);
    }
  }

  /**
   * Delete user (hard delete)
   */
  static async delete(id: string): Promise<void> {
    try {
      // Delete from users table
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', id);

      if (dbError) throw new AppError(dbError.message, 500);

      // Delete from Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) {
        console.warn('Failed to delete auth user:', authError);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to delete user', 500);
    }
  }

  /**
   * Get users by role
   */
  static async getByRole(role: UserRole): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, username, email, full_name, role, is_active')
        .eq('role', role)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw new AppError(error.message, 500);

      return data;
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch users', 500);
    }
  }
}
