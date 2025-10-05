import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { AppError } from '@/lib/errors/AppError';

/**
 * POST /api/auth/login
 * Authenticate user with username and password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get user by username (using admin client to bypass RLS)
    // Fetch both role (singular) and roles (array) for backward compatibility
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, email, full_name, role, roles, is_active')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // Verify password with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (authError) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Ensure roles array exists (backward compatibility)
    // If database has roles array, use it; otherwise convert single role to array
    const userRoles = user.roles && Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : [user.role];

    // Ensure role (singular) matches first role in array
    const primaryRole = userRoles[0];

    // Create response with cookies for middleware
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: primaryRole, // Primary role (backward compatibility)
          roles: userRoles,  // All roles (new)
          is_active: user.is_active,
        },
        session: authData.session,
      },
      message: 'Login successful',
    });

    // Set cookies for middleware authentication and authorization
    // These cookies will be used by middleware to check route access
    if (authData.session) {
      response.cookies.set('auth-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      // Store roles as JSON array string for middleware
      response.cookies.set('user-roles', JSON.stringify(userRoles), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    
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
