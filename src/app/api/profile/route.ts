import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '@/data/repositories/UserRepository';
import { UserService } from '@/core/services/users/UserService';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const profile = await UserRepository.getById(user.id);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('GET /api/profile error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * Update current user's profile
 * Users can update their own: username, email, full_name, password
 * Users CANNOT update: role, roles, is_active (business-sensitive data)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Create a Supabase client with the user's token to verify the session
    // Use server-only env names to avoid inlining NEXT_PUBLIC_* values in server bundles
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the session
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth verification error:', authError);
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { username, email, full_name, currentPassword, newPassword } = body;

    // Validate required fields
    if (!username || !email || !full_name) {
      return NextResponse.json(
        { success: false, error: 'Username, email, and full name are required' },
        { status: 400 }
      );
    }

    // Get current user data
    const currentUser = await UserRepository.getById(user.id);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Handle password change if requested
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to change password' },
          { status: 400 }
        );
      }

      // Verify current password by attempting to sign in with regular client
      // Use server-only env names to avoid leaking NEXT_PUBLIC_* into server builds
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

      // Immediately sign out to prevent session conflicts
      if (signInData?.session) {
        await supabaseClient.auth.signOut();
      }

      if (signInError) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      // Validate new password strength
      try {
        UserService.validatePasswordStrength(newPassword);
      } catch (validationError: any) {
        return NextResponse.json(
          { success: false, error: validationError.message },
          { status: 400 }
        );
      }

      // Update password
      await UserRepository.changePassword(user.id, newPassword);
    }

    // Prepare update data (excluding role and is_active)
    const updateData: any = {
      full_name,
    };

    // Only update username if changed
    if (username !== currentUser.username) {
      // Validate username
      try {
        await UserService.validateUsername(username);
        updateData.username = username;
      } catch (validationError: any) {
        return NextResponse.json(
          { success: false, error: validationError.message },
          { status: validationError.statusCode || 400 }
        );
      }
    }

    // Only update email if changed
    if (email !== currentUser.email) {
      // Validate email
      try {
        await UserService.validateEmail(email);
        updateData.email = email;
      } catch (validationError: any) {
        return NextResponse.json(
          { success: false, error: validationError.message },
          { status: validationError.statusCode || 400 }
        );
      }
    }

    // Update user profile
    const updatedUser = await UserRepository.update(user.id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/profile error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
