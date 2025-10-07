// @ts-nocheck - Supabase type inference issues
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
   * ENHANCED: Pre-validates uniqueness to prevent orphaned auth records
   * 
   * Transaction Flow:
   * 1. Check if username/email already exists (prevent duplicates)
   * 2. Create user in Supabase Auth
   * 3. Insert into users table
   * 4. If step 3 fails, rollback step 2 (delete auth user)
   * 
   * @param requestId - Optional trace ID for correlating logs across layers
   * @throws AppError with specific message if username/email exists
   */
  static async create(input: CreateUserInput, requestId?: string): Promise<any> {
    let authUserId: string | null = null;
    const traceId = requestId || 'NO_TRACE_ID';
    
    try {
      // STEP 1: Pre-validate uniqueness BEFORE creating auth user
      // This prevents orphaned auth records when username/email already exists
      // NOTE: There's still a small race condition window, but this catches most cases
      console.log('\n========================================');
      console.log(`[UserRepository] ${traceId} 🚀 Starting user creation process`);
      console.log(`[UserRepository] ${traceId} Input data:`, {
        username: input.username,
        email: input.email,
        full_name: input.full_name,
        roles: input.roles || [input.role]
      });
      console.log(`[UserRepository] ${traceId} Step 1: Pre-validating uniqueness...`);
      
      const { data: existingUsers, error: checkError } = await supabaseAdmin
        .from('users')
        .select('username, email, id, is_active')
        .or(`username.eq.${input.username},email.eq.${input.email}`);
      
      if (checkError) {
        console.error('[UserRepository] ❌ Uniqueness check failed:', checkError);
        throw new AppError('Failed to validate user data', 500);
      }
      
      console.log(`[UserRepository] ${traceId} 🔍 Pre-validation result:`, {
        existingCount: existingUsers?.length || 0,
        existing: existingUsers || []
      });
      
      if (existingUsers && existingUsers.length > 0) {
        const duplicate = existingUsers[0];
        console.error(`[UserRepository] ${traceId} ❌ DUPLICATE FOUND:`, {
          id: duplicate.id,
          username: duplicate.username,
          email: duplicate.email,
          is_active: duplicate.is_active
        });
        
        if (duplicate.username === input.username) {
          console.warn(`[UserRepository] ${traceId} 🚫 Duplicate username detected:`, input.username);
          throw new AppError(`Username "${input.username}" is already taken`, 409);
        }
        if (duplicate.email === input.email) {
          console.warn(`[UserRepository] ${traceId} 🚫 Duplicate email detected:`, input.email);
          throw new AppError(`Email "${input.email}" is already registered`, 409);
        }
      }
      
      console.log(`[UserRepository] ${traceId} ✅ Uniqueness validation passed - no duplicates found`);
      
      // STEP 2: Create user in Supabase Auth
      console.log(`[UserRepository] ${traceId} Step 2: Creating user in Supabase Auth...`);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });

      if (authError) {
        console.error('[UserRepository] ❌ Auth user creation failed:', {
          message: authError.message,
          status: authError.status,
          code: authError.code
        });
        throw new AppError(authError.message, 500);
      }
      
      authUserId = authData.user.id;
      console.log(`[UserRepository] ${traceId} ✅ Auth user created successfully:`, {
        authUserId: authUserId,
        email: authData.user.email
      });

      // Determine roles array
      // Prefer roles array if provided, otherwise convert single role to array
      const rolesArray = input.roles && input.roles.length > 0 
        ? input.roles 
        : (input.role ? [input.role] : ['cashier']);
      
      const primaryRole = rolesArray[0];

      // STEP 3: Upsert user record in users table
      // Note: Some environments may have a DB trigger that auto-inserts a users row on auth user creation.
      // Using UPSERT on primary key (id) avoids PK conflicts and lets us supply full application fields.
      console.log(`[UserRepository] ${traceId} Step 3: Upserting user into users table (onConflict: id)...`);
      console.log(`[UserRepository] ${traceId} Upsert data:`, {
        id: authData.user.id,
        username: input.username,
        email: input.email,
        role: primaryRole,
        roles: rolesArray
      });
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .upsert({
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
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        // STEP 4: CRITICAL - Rollback auth user if users table insert fails
        console.error(`[UserRepository] ${traceId} ❌ Users table insert failed:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        console.log(`[UserRepository] ${traceId} ⚠️  Step 4: Rolling back auth user:`, authUserId);
        
        try {
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId!);
          if (deleteError) {
            console.error(`[UserRepository] ${traceId} ❌ CRITICAL: Rollback failed!`, {
              deleteError: deleteError,
              orphanedAuthUserId: authUserId
            });
            // Orphaned auth user created - needs manual cleanup
            throw new AppError(
              `User creation failed and rollback failed. Orphaned auth user: ${authUserId}. ` +
              `Contact administrator to clean up. Original error: ${error.message}`,
              500
            );
          }
          console.log(`[UserRepository] ${traceId} ✅ Rollback successful - auth user deleted:`, authUserId);
        } catch (rollbackError) {
          console.error(`[UserRepository] ${traceId} ❌ Exception during rollback:`, rollbackError);
          throw rollbackError;
        }
        
        // Provide user-friendly error message based on error code
        console.log(`[UserRepository] ${traceId} 🔍 Analyzing error code:`, error.code);

        // Handle enum role mismatch (e.g., waiter not present in DB enum)
        const messageLower = (error.message || '').toLowerCase();
        if (messageLower.includes('invalid input value for enum user_role')) {
          const allowedRoles = Object.values(UserRole);
          console.error(`[UserRepository] ${traceId} 🚫 Invalid role enum value provided`, {
            attemptedRole: input.role || (input.roles && input.roles[0]),
            allowedRoles,
          });
          throw new AppError(
            `Invalid role provided. Allowed roles: ${allowedRoles.join(', ')}. ` +
            `If you just added a new role, ensure the database enum is migrated.`,
            400
          );
        }
        if (error.code === '23505') { // PostgreSQL unique violation
          // This means race condition occurred - another request created the user
          const constraintName = (error.details || error.message || '').toString();
          const lcConstraint = constraintName.toLowerCase();
          console.error(`[UserRepository] ${traceId} 🚫 PostgreSQL UNIQUE constraint violation:`, {
            code: error.code,
            constraint: constraintName,
            username: input.username,
            email: input.email
          });
          
          // First, try to detect from constraint/message text
          if (lcConstraint.includes('username') || lcConstraint.includes('users_username')) {
            throw new AppError(`Username "${input.username}" is already taken (created by another request)`, 409);
          } else if (lcConstraint.includes('email') || lcConstraint.includes('users_email')) {
            throw new AppError(`Email "${input.email}" is already registered (created by another request)`, 409);
          }

          // Fallback: Re-check which field exists to return precise error
          console.log(`[UserRepository] ${traceId} 🔁 Fallback check: determining conflicting field...`);
          try {
            const [usernameExists, emailExists] = await Promise.all([
              UserRepository.getByUsername(input.username).then(u => !!u).catch(() => false),
              UserRepository.getByEmail(input.email).then(u => !!u).catch(() => false),
            ]);

            console.log(`[UserRepository] ${traceId} Fallback result:`, {
              usernameExists,
              emailExists,
            });

            if (usernameExists && emailExists) {
              throw new AppError(`Both username "${input.username}" and email "${input.email}" already exist`, 409);
            }
            if (usernameExists) {
              throw new AppError(`Username "${input.username}" is already taken (created by another request)`, 409);
            }
            if (emailExists) {
              throw new AppError(`Email "${input.email}" is already registered (created by another request)`, 409);
            }
          } catch (fallbackErr) {
            // If fallback threw an AppError, bubble it up
            if (fallbackErr instanceof AppError) {
              throw fallbackErr;
            }
            console.warn(`[UserRepository] ${traceId} ⚠️  Fallback detection failed, returning generic 409`, fallbackErr);
          }

          throw new AppError('Username or email already exists', 409);
        }
        console.error(`[UserRepository] ${traceId} ❌ Unexpected database error:`, error);
        throw new AppError(error.message, 500);
      }
      
      console.log(`[UserRepository] ${traceId} ✅ User created successfully:`, {
        id: data.id,
        username: data.username,
        email: data.email
      });
      console.log('========================================\n');
      return data;
      
    } catch (error) {
      console.error(`[UserRepository] ${traceId} Error creating user:`, error);
      
      // If we have an auth user ID and error is not AppError (unexpected error),
      // attempt cleanup
      if (authUserId && !(error instanceof AppError)) {
        console.log(`[UserRepository] ${traceId} Unexpected error - attempting cleanup of auth user:`, authUserId);
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
          console.log(`[UserRepository] ${traceId} Cleanup successful`);
        } catch (cleanupError) {
          console.error(`[UserRepository] ${traceId} Cleanup failed:`, cleanupError);
        }
      }
      
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

  /**
   * Get default POS user for order transactions
   * Returns the first active user with POS privileges (admin, manager, or cashier)
   * Used as a fallback when no authenticated user is available
   * 
   * Priority order: admin > manager > cashier
   * 
   * @throws AppError if no POS user exists
   * @returns The default POS user object
   */
  static async getDefaultPOSUser(): Promise<any> {
    try {
      console.log('[UserRepository] Fetching default POS user...');
      
      // Try to get users with POS privileges in priority order
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, username, email, full_name, role')
        .in('role', [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER])
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error('[UserRepository] ❌ Error fetching POS user:', error);
        throw new AppError(error.message, 500);
      }

      if (!data || data.length === 0) {
        // No POS user found - this is a critical error
        console.error('[UserRepository] ❌ No active POS user (admin/manager/cashier) found in database');
        throw new AppError(
          'No POS user found in system. Please create an admin, manager, or cashier user first.',
          500
        );
      }

      const user = data[0];
      console.log('[UserRepository] ✅ Default POS user found:', {
        id: user.id,
        username: user.username,
        role: user.role
      });

      return user;
    } catch (error) {
      console.error('[UserRepository] Error fetching default POS user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch default POS user', 500);
    }
  }

  /**
   * Get default cashier user (deprecated - use getDefaultPOSUser instead)
   * @deprecated Use getDefaultPOSUser() for multi-role support
   */
  static async getDefaultCashier(): Promise<any> {
    console.warn('[UserRepository] getDefaultCashier() is deprecated. Use getDefaultPOSUser() instead.');
    return this.getDefaultPOSUser();
  }

  /**
   * Validates if a user ID exists and is active
   * 
   * @param userId - The user ID to validate
   * @param allowedRoles - Optional array of roles to validate against (e.g., ['admin', 'manager', 'cashier'])
   * @returns True if user exists, is active, and has allowed role (if specified), false otherwise
   */
  static async validateUserId(userId: string, allowedRoles?: UserRole[]): Promise<boolean> {
    try {
      const user = await this.getById(userId);
      
      if (!user || !user.is_active) {
        return false;
      }

      // If roles are specified, check if user has one of the allowed roles
      if (allowedRoles && allowedRoles.length > 0) {
        return allowedRoles.includes(user.role);
      }

      return true;
    } catch (error) {
      console.error('[UserRepository] Error validating user ID:', error);
      return false;
    }
  }

  /**
   * Validates if a user has POS privileges (admin, manager, or cashier)
   * 
   * @param userId - The user ID to validate
   * @returns True if user exists, is active, and has POS role
   */
  static async validatePOSUser(userId: string): Promise<boolean> {
    return this.validateUserId(userId, [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]);
  }
}
