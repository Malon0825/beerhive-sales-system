import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Logout current user (client handles session clearing)
 */
export async function POST(request: NextRequest) {
  try {
    // Client will handle calling supabase.auth.signOut()
    // This endpoint is just for consistency
    return NextResponse.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('POST /api/auth/logout error:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
