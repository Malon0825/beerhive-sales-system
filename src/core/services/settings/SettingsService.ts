import { SettingsRepository } from '@/data/repositories/SettingsRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * SettingsService
 * Business logic for system settings management
 */
export class SettingsService {
  /**
   * Default settings configuration
   */
  private static readonly DEFAULT_SETTINGS = {
    // Business Information
    'business.name': { value: 'BeerHive', dataType: 'string' as const, category: 'business' },
    'business.legal_name': { value: '', dataType: 'string' as const, category: 'business' },
    'business.registration_number': { value: '', dataType: 'string' as const, category: 'business' },
    'business.tax_id': { value: '', dataType: 'string' as const, category: 'business' },
    'business.address_line1': { value: '', dataType: 'string' as const, category: 'business' },
    'business.address_line2': { value: '', dataType: 'string' as const, category: 'business' },
    'business.city': { value: '', dataType: 'string' as const, category: 'business' },
    'business.province': { value: '', dataType: 'string' as const, category: 'business' },
    'business.postal_code': { value: '', dataType: 'string' as const, category: 'business' },
    'business.country': { value: 'Philippines', dataType: 'string' as const, category: 'business' },
    'business.phone': { value: '', dataType: 'string' as const, category: 'business' },
    'business.email': { value: '', dataType: 'string' as const, category: 'business' },
    'business.website': { value: '', dataType: 'string' as const, category: 'business' },
    'business.support_contact': { value: '', dataType: 'string' as const, category: 'business' },
    'business.additional_notes': { value: '', dataType: 'string' as const, category: 'business' },

    // Tax Settings
    'tax.enabled': { value: 'true', dataType: 'boolean' as const, category: 'tax' },
    'tax.rate': { value: '12', dataType: 'number' as const, category: 'tax' },
    'tax.inclusive': { value: 'false', dataType: 'boolean' as const, category: 'tax' },

    // Receipt Settings
    'receipt.footer_message': { value: 'Thank you for your patronage!', dataType: 'string' as const, category: 'receipt' },
    'receipt.show_qr': { value: 'false', dataType: 'boolean' as const, category: 'receipt' },
    'receipt.logo_url': { value: '', dataType: 'string' as const, category: 'receipt' },

    // Order Settings
    'order.auto_print': { value: 'true', dataType: 'boolean' as const, category: 'order' },
    'order.kitchen_auto_print': { value: 'true', dataType: 'boolean' as const, category: 'order' },
    'order.require_customer': { value: 'false', dataType: 'boolean' as const, category: 'order' },

    // Currency Settings
    'currency.code': { value: 'PHP', dataType: 'string' as const, category: 'currency' },
    'currency.symbol': { value: '₱', dataType: 'string' as const, category: 'currency' },
    'currency.decimal_places': { value: '2', dataType: 'number' as const, category: 'currency' },
  };

  private static readonly UUID_REGEX =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  private static sanitizeUpdatedBy(updatedBy?: string): string | null {
    if (!updatedBy) {
      return null;
    }

    return this.UUID_REGEX.test(updatedBy) ? updatedBy : null;
  }

  /**
   * Get setting value
   */
  static async getSetting(key: string): Promise<any> {
    try {
      const setting = await SettingsRepository.get(key);

      if (!setting) {
        // Return default if exists
        const defaultSetting = this.DEFAULT_SETTINGS[key as keyof typeof this.DEFAULT_SETTINGS];
        if (defaultSetting) {
          return SettingsRepository.parseValue(defaultSetting.value, defaultSetting.dataType);
        }
        return null;
      }

      return SettingsRepository.parseValue(setting.value, setting.data_type);
    } catch (error) {
      console.error('Get setting error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get setting', 500);
    }
  }

  /**
   * Update setting value
   */
  static async updateSetting(
    key: string,
    value: any,
    updatedBy?: string
  ): Promise<void> {
    try {
      // Validate value
      const validation = this.validateValue(key, value);
      if (!validation.valid) {
        throw new AppError(validation.error || 'Invalid setting value', 400);
      }

      const sanitizedUpdatedBy = this.sanitizeUpdatedBy(updatedBy);
      const setting = await SettingsRepository.get(key);
      const stringValue = SettingsRepository.stringifyValue(value);

      if (setting) {
        await SettingsRepository.update(key, stringValue, sanitizedUpdatedBy ?? undefined);
      } else {
        // Create new setting
        const defaultSetting = this.DEFAULT_SETTINGS[key as keyof typeof this.DEFAULT_SETTINGS];
        const dataType = defaultSetting?.dataType || this.inferDataType(value);

        await SettingsRepository.upsert(
          key,
          stringValue,
          dataType,
          sanitizedUpdatedBy ?? undefined,
          undefined,
          defaultSetting?.category
        );
      }
    } catch (error) {
      console.error('Update setting error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update setting', 500);
    }
  }

  /**
   * Get all settings by category
   */
  static async getSettingsByCategory(category: string): Promise<Record<string, any>> {
    try {
      const settings = await SettingsRepository.getByCategory(category);
      const result: Record<string, any> = {};

      settings.forEach((setting) => {
        result[setting.key] = SettingsRepository.parseValue(
          setting.value,
          setting.data_type
        );
      });

      return result;
    } catch (error) {
      console.error('Get settings by category error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to get settings', 500);
    }
  }

  /**
   * Validate setting value
   */
  static validateValue(key: string, value: any): { valid: boolean; error?: string } {
    // Tax rate validation
    if (key === 'tax.rate') {
      const rate = Number(value);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return { valid: false, error: 'Tax rate must be between 0 and 100' };
      }
    }

    // Email validation
    if (key === 'business.email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: 'Invalid email format' };
      }
    }

    if (key === 'business.website' && value) {
      try {
        const url = new URL(value.startsWith('http') ? value : `https://${value}`);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return { valid: false, error: 'Website must use http or https' };
        }
      } catch {
        return { valid: false, error: 'Invalid website URL' };
      }
    }

    // Decimal places validation
    if (key === 'currency.decimal_places') {
      const places = Number(value);
      if (isNaN(places) || places < 0 || places > 4) {
        return { valid: false, error: 'Decimal places must be between 0 and 4' };
      }
    }

    // Currency code validation
    if (key === 'currency.code' && value) {
      if (!/^[A-Z]{3}$/.test(value)) {
        return { valid: false, error: 'Currency code must be 3 uppercase letters (e.g., PHP, USD)' };
      }
    }

    return { valid: true };
  }

  /**
   * Infer data type from value
   */
  private static inferDataType(value: any): 'string' | 'number' | 'boolean' | 'json' {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'object') return 'json';
    return 'string';
  }

  /**
   * Initialize default settings
   */
  static async initializeDefaults(updatedBy?: string): Promise<void> {
    try {
      const sanitizedUpdatedBy = this.sanitizeUpdatedBy(updatedBy);
      for (const [key, config] of Object.entries(this.DEFAULT_SETTINGS)) {
        const existing = await SettingsRepository.get(key);
        if (!existing) {
          await SettingsRepository.upsert(
            key,
            config.value,
            config.dataType,
            sanitizedUpdatedBy ?? undefined,
            `Default ${key} setting`,
            config.category,
            false
          );
        }
      }
    } catch (error) {
      console.error('Initialize defaults error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to initialize default settings', 500);
    }
  }

  /**
   * Get formatted currency
   */
  static async formatCurrency(amount: number): Promise<string> {
    try {
      const symbol = await this.getSetting('currency.symbol');
      const decimalPlaces = await this.getSetting('currency.decimal_places');

      return `${symbol}${amount.toFixed(decimalPlaces)}`;
    } catch (error) {
      return `₱${amount.toFixed(2)}`; // Fallback
    }
  }

  /**
   * Calculate tax amount
   */
  static async calculateTax(amount: number): Promise<{
    taxAmount: number;
    total: number;
    taxRate: number;
  }> {
    try {
      const taxEnabled = await this.getSetting('tax.enabled');
      const taxRate = await this.getSetting('tax.rate');
      const taxInclusive = await this.getSetting('tax.inclusive');

      if (!taxEnabled) {
        return { taxAmount: 0, total: amount, taxRate: 0 };
      }

      const rate = taxRate / 100;

      if (taxInclusive) {
        // Tax is already included in amount
        const taxAmount = amount - (amount / (1 + rate));
        return {
          taxAmount: Math.round(taxAmount * 100) / 100,
          total: amount,
          taxRate,
        };
      } else {
        // Add tax to amount
        const taxAmount = amount * rate;
        return {
          taxAmount: Math.round(taxAmount * 100) / 100,
          total: Math.round((amount + taxAmount) * 100) / 100,
          taxRate,
        };
      }
    } catch (error) {
      console.error('Calculate tax error:', error);
      return { taxAmount: 0, total: amount, taxRate: 0 };
    }
  }
}
