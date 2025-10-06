// @ts-nocheck - Supabase type inference issues
import { supabase } from '../supabase/client';
import { AppError } from '@/lib/errors/AppError';

export interface SystemSetting {
  key: string;
  value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  category: string | null;
  is_public: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface CreateSettingInput {
  key: string;
  value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  category?: string;
  is_public?: boolean;
}

/**
 * SettingsRepository
 * Data access layer for system settings
 */
export class SettingsRepository {
  /**
   * Get all settings
   */
  static async getAll(includePrivate: boolean = true): Promise<SystemSetting[]> {
    try {
      let query = supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (!includePrivate) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new AppError(`Failed to fetch settings: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get all settings error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch settings', 500);
    }
  }

  /**
   * Get setting by key
   */
  static async get(key: string): Promise<SystemSetting | null> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new AppError(`Failed to fetch setting: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Get setting error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch setting', 500);
    }
  }

  /**
   * Get settings by category
   */
  static async getByCategory(category: string): Promise<SystemSetting[]> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', category)
        .order('key', { ascending: true });

      if (error) {
        throw new AppError(`Failed to fetch settings: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get settings by category error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch settings', 500);
    }
  }

  /**
   * Create or update setting
   */
  static async upsert(
    key: string,
    value: string,
    dataType: 'string' | 'number' | 'boolean' | 'json',
    updatedBy?: string,
    description?: string,
    category?: string,
    isPublic?: boolean
  ): Promise<SystemSetting> {
    try {
      const settingData: any = {
        key,
        value,
        data_type: dataType,
        updated_by: updatedBy || null,
      };

      if (description !== undefined) settingData.description = description;
      if (category !== undefined) settingData.category = category;
      if (isPublic !== undefined) settingData.is_public = isPublic;

      const { data, error } = await supabase
        .from('system_settings')
        .upsert(settingData)
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to save setting: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Upsert setting error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to save setting', 500);
    }
  }

  /**
   * Update setting value
   */
  static async update(
    key: string,
    value: string,
    updatedBy?: string
  ): Promise<SystemSetting> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          value,
          updated_by: updatedBy || null,
        })
        .eq('key', key)
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to update setting: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Update setting error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update setting', 500);
    }
  }

  /**
   * Delete setting
   */
  static async delete(key: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('key', key);

      if (error) {
        throw new AppError(`Failed to delete setting: ${error.message}`, 500);
      }
    } catch (error) {
      console.error('Delete setting error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to delete setting', 500);
    }
  }

  /**
   * Get public settings (for frontend use)
   */
  static async getPublicSettings(): Promise<Record<string, any>> {
    try {
      const settings = await this.getAll(false);
      const result: Record<string, any> = {};

      settings.forEach((setting) => {
        result[setting.key] = this.parseValue(setting.value, setting.data_type);
      });

      return result;
    } catch (error) {
      console.error('Get public settings error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch public settings', 500);
    }
  }

  /**
   * Parse setting value based on data type
   */
  static parseValue(value: string, dataType: string): any {
    switch (dataType) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Stringify value based on data type
   */
  static stringifyValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
