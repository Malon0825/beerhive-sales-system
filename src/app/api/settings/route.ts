import { NextRequest, NextResponse } from 'next/server';
import { SettingsRepository } from '@/data/repositories/SettingsRepository';
import { SettingsService } from '@/core/services/settings/SettingsService';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/settings
 * Get all settings or by category
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const publicOnly = searchParams.get('public_only') === 'true';

    let settings;

    if (category) {
      const categorySettings = await SettingsService.getSettingsByCategory(category);
      settings = Object.entries(categorySettings).map(([key, value]) => ({
        key,
        value,
      }));
    } else if (publicOnly) {
      settings = await SettingsRepository.getPublicSettings();
    } else {
      settings = await SettingsRepository.getAll();
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Update multiple settings at once
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.settings || !Array.isArray(body.settings)) {
      return NextResponse.json(
        { success: false, error: 'Settings array is required' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from session
    const userId = body.updated_by || 'system';

    // Update each setting
    for (const setting of body.settings) {
      if (!setting.key || setting.value === undefined) {
        continue;
      }

      await SettingsService.updateSetting(setting.key, setting.value, userId);
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Update settings error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
