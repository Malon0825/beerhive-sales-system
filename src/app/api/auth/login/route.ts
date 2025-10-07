import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { createClient } from '@supabase/supabase-js';
import { AppError } from '@/lib/errors/AppError';

/**
 * POST /api/auth/login
 * Authenticate user with username and password
 * 
 * Authentication Flow:
 * 1. Validate request payload (username + password required)
 * 2. Lookup user in database by username
 * 3. Check if user account is active
 * 4. Verify password against Supabase Auth
 * 5. Update last login timestamp
 * 6. Return user data + session + set auth cookies
 * 
 * @returns User object with session tokens and auth cookies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Step 1: Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Step 2: Get user by username (using admin client to bypass RLS)
    // Fetch both role (singular) and roles (array) for backward compatibility
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, email, full_name, role, roles, is_active')
      .eq('username', username)
      .single();

    if (userError || !user) {
      // Log error for debugging but return generic message for security
      console.error('[AUTH] User lookup failed:', userError?.message || 'User not found');
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Type assertion to ensure is_active is recognized
    const userData = user as any;
    
    // Step 3: Check if user account is active
    if (!userData.is_active) {
      console.warn(`[AUTH] Login attempt for inactive user: ${username}`);
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // Step 4: Verify password with Supabase Auth
    // CRITICAL: Create an ISOLATED client for each login request to prevent session interference
    // Using the shared admin client can cause session pollution in production with concurrent users
    // This isolated client has its own session state that won't affect other requests
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new AppError('Server configuration error', 500);
    }
    
    // Create isolated client for this login attempt only
    const isolatedClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    
    // Verify password using the isolated client
    const { data: authData, error: authError } = await isolatedClient.auth.signInWithPassword({
      email: userData.email,
      password: password,
    });

    if (authError) {
      // Log detailed error for debugging
      console.error('[AUTH] Password verification failed:', {
        username,
        email: userData.email,
        error: authError.message,
        code: authError.code,
      });
      
      // Return generic error message for security
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Step 5: Update last login timestamp
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id);

    // Step 6: Normalize roles data structure
    // Ensure roles array exists (backward compatibility)
    // If database has roles array, use it; otherwise convert single role to array
    const userRoles = userData.roles && Array.isArray(userData.roles) && userData.roles.length > 0
      ? userData.roles
      : [userData.role];

    // Ensure role (singular) matches first role in array
    const primaryRole = userRoles[0];
    
    console.log('[AUTH] Login successful:', {
      username: userData.username,
      userId: userData.id,
      roles: userRoles,
      primaryRole,
    });

    // Step 7: Create response with cookies for middleware
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

    // Step 8: Set cookies for middleware authentication and authorization
    // These cookies will be used by middleware to check route access
    if (authData.session) {
      // Cookie configuration for production reliability
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24, // 24 hours (full day session for in-house staff)
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
