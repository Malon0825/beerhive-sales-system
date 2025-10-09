import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/core/services/notifications/NotificationService';

/**
 * PATCH /api/notifications/[notificationId]
 * Mark notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { notificationId } = await params;

    const success = await NotificationService.markAsRead(notificationId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to mark notification as read' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[notificationId]
 * Delete a notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { notificationId } = await params;

    const success = await NotificationService.deleteNotification(notificationId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
