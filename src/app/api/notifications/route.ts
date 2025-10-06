import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/core/services/notifications/NotificationService';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Fetch notifications for current user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const notifications = await NotificationService.getNotifications(
      userId,
      limit,
      unreadOnly
    );

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification (admin/system only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const notification = await NotificationService.notifySystemAlert(
      body.title,
      body.message,
      body.priority,
      body.role,
      body.userId
    );

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
