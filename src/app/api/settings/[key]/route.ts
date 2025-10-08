import { NextRequest, NextResponse } from 'next/server';
import { SettingsRepository } from '@/data/repositories/SettingsRepository';
import { SettingsService } from '@/core/services/settings/SettingsService';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/settings/:key
 * Get single setting by key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const value = await SettingsService.getSetting(key);

    if (value === null) {
      return NextResponse.json(
        { success: false, error: 'Setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        key,
        value,
      },
    });
  } catch (error) {
    console.error('Get setting error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch setting' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/:key
 * Update single setting
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();

    if (body.value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Value is required' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from session
    const userId = body.updated_by || 'system';

    await SettingsService.updateSetting(key, body.value, userId);

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully',
    });
  } catch (error) {
    console.error('Update setting error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}
