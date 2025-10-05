import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * GET /api/auth/session
 * Get current user session
 */
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Not authenticated',
      }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Invalid or expired session',
      }, { status: 401 });
    }

    // Get user details from users table (using admin client to bypass RLS)
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, full_name, role, is_active')
      .eq('id', user.id)
      .single();

    if (error || !userData) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'User not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        is_active: userData.is_active,
      },
    });
  } catch (error) {
    console.error('GET /api/auth/session error:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
