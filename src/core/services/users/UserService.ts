import { UserRepository, CreateUserInput, UpdateUserInput } from '@/data/repositories/UserRepository';
import { UserRole } from '@/models/enums/UserRole';
import { AppError } from '@/lib/errors/AppError';

/**
 * UserService
 * Business logic for user management
 */
export class UserService {
  /**
   * Create new user with validation
   */
  static async createUser(input: CreateUserInput): Promise<any> {
    try {
      // Validate username
      await this.validateUsername(input.username);

      // Validate email
      await this.validateEmail(input.email);

      // Validate password strength
      this.validatePasswordStrength(input.password);

      // Validate roles
      const roles = input.roles && input.roles.length > 0 ? input.roles : (input.role ? [input.role] : []);
      if (roles.length === 0) {
        throw new AppError('At least one role is required', 400);
      }
      roles.forEach(role => this.validateRole(role));

      // Create user
      return await UserRepository.create(input);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create user', 500);
    }
  }

  /**
   * Update user with validation
   */
  static async updateUser(id: string, input: UpdateUserInput): Promise<any> {
    try {
      // Check if user exists
      const existingUser = await UserRepository.getById(id);
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }

      // Validate username if provided
      if (input.username && input.username !== existingUser.username) {
        await this.validateUsername(input.username);
      }

      // Validate email if provided
      if (input.email && input.email !== existingUser.email) {
        await this.validateEmail(input.email);
      }

      // Validate roles if provided
      if (input.roles && input.roles.length > 0) {
        if (input.roles.length === 0) {
          throw new AppError('At least one role is required', 400);
        }
        input.roles.forEach(role => this.validateRole(role));
      } else if (input.role) {
        this.validateRole(input.role);
      }

      // Update user
      return await UserRepository.update(id, input);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update user', 500);
    }
  }

  /**
   * Reset user password (generate temporary password)
   */
  static async resetPassword(userId: string): Promise<string> {
    try {
      // Check if user exists
      const user = await UserRepository.getById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Generate temporary password
      const tempPassword = this.generateTemporaryPassword();

      // Update password
      await UserRepository.changePassword(userId, tempPassword);

      return tempPassword;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error instanceof AppError ? error : new AppError('Failed to reset password', 500);
    }
  }

  /**
   * Validate username uniqueness
   */
  static async validateUsername(username: string): Promise<void> {
    // Check format
    if (username.length < 3) {
      throw new AppError('Username must be at least 3 characters long', 400);
    }

    if (username.length > 50) {
      throw new AppError('Username must not exceed 50 characters', 400);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new AppError('Username can only contain letters, numbers, and underscores', 400);
    }

    // Check uniqueness
    const existingUser = await UserRepository.getByUsername(username);
    if (existingUser) {
      throw new AppError('Username already exists', 409);
    }
  }

  /**
   * Validate email uniqueness and format
   */
  static async validateEmail(email: string): Promise<void> {
    // Check format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Check uniqueness
    const existingUser = await UserRepository.getByEmail(email);
    if (existingUser) {
      throw new AppError('Email already exists', 409);
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (!/[A-Z]/.test(password)) {
      throw new AppError('Password must contain at least one uppercase letter', 400);
    }

    if (!/[a-z]/.test(password)) {
      throw new AppError('Password must contain at least one lowercase letter', 400);
    }

    if (!/[0-9]/.test(password)) {
      throw new AppError('Password must contain at least one number', 400);
    }
  }

  /**
   * Validate role
   */
  static validateRole(role: UserRole): void {
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role)) {
      throw new AppError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
    }
  }

  /**
   * Generate temporary password
   */
  private static generateTemporaryPassword(): string {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const all = uppercase + lowercase + numbers + symbols;

    let password = '';
    
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Deactivate user
   */
  static async deactivateUser(userId: string): Promise<void> {
    try {
      const user = await UserRepository.getById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.is_active) {
        throw new AppError('User is already inactive', 400);
      }

      await UserRepository.deactivate(userId);
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to deactivate user', 500);
    }
  }

  /**
   * Reactivate user
   */
  static async reactivateUser(userId: string): Promise<void> {
    try {
      const user = await UserRepository.getById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.is_active) {
        throw new AppError('User is already active', 400);
      }

      await UserRepository.reactivate(userId);
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw error instanceof AppError ? error : new AppError('Failed to reactivate user', 500);
    }
  }
}
