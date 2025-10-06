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

    // Type assertion to ensure is_active is recognized
    const userData = user as any;
    if (!userData.is_active) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // Verify password with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: userData.email,
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
      .eq('id', userData.id);

    // Ensure roles array exists (backward compatibility)
    // If database has roles array, use it; otherwise convert single role to array
    const userRoles = userData.roles && Array.isArray(userData.roles) && userData.roles.length > 0
      ? userData.roles
      : [userData.role];

    // Ensure role (singular) matches first role in array
    const primaryRole = userRoles[0];

    // Create response with cookies for middleware
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          full_name: userData.full_name,
          role: primaryRole, // Primary role (backward compatibility)
          roles: userRoles,  // All roles (new)
          is_active: userData.is_active,
        },
        session: authData.session,
      },
      message: 'Login successful',
    });

    // Set cookies for middleware authentication and authorization
    // These cookies will be used by middleware to check route access
    if (authData.session) {
      // Cookie configuration for production reliability
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        // Don't set domain to allow cookies on current domain and subdomains
      };

      response.cookies.set('auth-token', authData.session.access_token, cookieOptions);

      // Store roles as JSON array string for middleware
      response.cookies.set('user-roles', JSON.stringify(userRoles), cookieOptions);
      
      // Store user ID for quick reference (helps with debugging)
      response.cookies.set('user-id', userData.id, cookieOptions);
      
      console.log('[AUTH] Cookies set successfully for user:', userData.id);
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
