import { HappyHour } from '@/models/entities/HappyHour';
import { Product } from '@/models/entities/Product';
import { HappyHourRepository } from '@/data/repositories/HappyHourRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * HappyHourPricing Service
 * Handles happy hour pricing logic and time-based validations
 */
export class HappyHourPricing {
  /**
   * Check if happy hour is currently active
   */
  static isActive(happyHour: HappyHour): boolean {
    const now = new Date();
    
    // Check time window
    if (!this.isWithinTimeWindow(happyHour)) {
      return false;
    }

    // Check day of week
    if (!this.isValidDayOfWeek(happyHour)) {
      return false;
    }

    // Check date validity
    if (!this.isWithinDateRange(happyHour)) {
      return false;
    }

    return happyHour.is_active;
  }

  /**
   * Check if current time is within happy hour time window
   */
  static isWithinTimeWindow(happyHour: HappyHour): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    return currentTime >= happyHour.start_time && currentTime <= happyHour.end_time;
  }

  /**
   * Check if current day is valid for happy hour
   */
  static isValidDayOfWeek(happyHour: HappyHour): boolean {
    if (!happyHour.days_of_week || happyHour.days_of_week.length === 0) {
      return true; // No restriction
    }

    const currentDay = new Date().getDay() || 7; // 1-7 (Monday-Sunday)
    return happyHour.days_of_week.includes(currentDay);
  }

  /**
   * Check if current date is within happy hour validity range
   */
  static isWithinDateRange(happyHour: HappyHour): boolean {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];

    // Check start date
    if (happyHour.valid_from && currentDate < happyHour.valid_from) {
      return false;
    }

    // Check end date
    if (happyHour.valid_until && currentDate > happyHour.valid_until) {
      return false;
    }

    return true;
  }

  /**
   * Apply happy hour discount to a price
   */
  static apply(
    basePrice: number,
    happyHour: HappyHour,
    orderTotal?: number
  ): number {
    // Check minimum order amount
    if (happyHour.min_order_amount && orderTotal) {
      if (orderTotal < happyHour.min_order_amount) {
        return basePrice; // Minimum not met
      }
    }

    // Apply discount based on type
    switch (happyHour.discount_type) {
      case 'percentage':
        const percentageDiscount = (basePrice * happyHour.discount_value) / 100;
        return Math.max(0, basePrice - percentageDiscount);

      case 'fixed_amount':
        return Math.max(0, basePrice - happyHour.discount_value);

      case 'complimentary':
        return 0;

      default:
        return basePrice;
    }
  }

  /**
   * Get the best happy hour price for a product
   */
  static async getBestPrice(
    product: Product,
    quantity: number = 1,
    orderSubtotal?: number
  ): Promise<{
    price: number;
    originalPrice: number;
    discount: number;
    happyHour: HappyHour | null;
  }> {
    try {
      const activeHappyHours = await HappyHourRepository.getActive();

      if (activeHappyHours.length === 0) {
        return {
          price: product.base_price * quantity,
          originalPrice: product.base_price * quantity,
          discount: 0,
          happyHour: null,
        };
      }

      let bestPrice = product.base_price;
      let bestHappyHour: HappyHour | null = null;

      for (const happyHour of activeHappyHours) {
        // Check if happy hour is truly active
        if (!this.isActive(happyHour)) {
          continue;
        }

        // Check if product is eligible
        const isEligible = await this.isProductEligible(product.id, happyHour);
        if (!isEligible) {
          continue;
        }

        // Check for custom price
        const customPrice = await this.getCustomPrice(product.id, happyHour.id);
        if (customPrice !== null) {
          if (customPrice < bestPrice) {
            bestPrice = customPrice;
            bestHappyHour = happyHour;
          }
          continue;
        }

        // Apply discount
        const discountedPrice = this.apply(
          product.base_price,
          happyHour,
          orderSubtotal
        );

        if (discountedPrice < bestPrice) {
          bestPrice = discountedPrice;
          bestHappyHour = happyHour;
        }
      }

      const finalPrice = bestPrice * quantity;
      const originalPrice = product.base_price * quantity;

      return {
        price: Math.round(finalPrice * 100) / 100,
        originalPrice: Math.round(originalPrice * 100) / 100,
        discount: Math.round((originalPrice - finalPrice) * 100) / 100,
        happyHour: bestHappyHour,
      };
    } catch (error) {
      console.error('Get best happy hour price error:', error);
      // Return original price on error
      return {
        price: product.base_price * quantity,
        originalPrice: product.base_price * quantity,
        discount: 0,
        happyHour: null,
      };
    }
  }

  /**
   * Check if product is eligible for a happy hour
   */
  private static async isProductEligible(
    productId: string,
    happyHour: HappyHour
  ): Promise<boolean> {
    // Check if applies to all products
    if (happyHour.applies_to_all_products) {
      return true;
    }

    // Check if product is specifically associated
    const products = await HappyHourRepository.getHappyHourProducts(happyHour.id);
    return products.some(p => p.product_id === productId);
  }

  /**
   * Get custom price for a product in a happy hour
   */
  private static async getCustomPrice(
    productId: string,
    happyHourId: string
  ): Promise<number | null> {
    try {
      const products = await HappyHourRepository.getHappyHourProducts(happyHourId);
      const product = products.find(p => p.product_id === productId);
      return product?.custom_price || null;
    } catch (error) {
      console.error('Get custom price error:', error);
      return null;
    }
  }

  /**
   * Format time window for display
   */
  static formatTimeWindow(happyHour: HappyHour): string {
    const start = happyHour.start_time.substring(0, 5); // HH:MM
    const end = happyHour.end_time.substring(0, 5); // HH:MM
    return `${start} - ${end}`;
  }

  /**
   * Format days of week for display
   */
  static formatDaysOfWeek(daysOfWeek: number[]): string {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    if (!daysOfWeek || daysOfWeek.length === 0) {
      return 'Every day';
    }

    if (daysOfWeek.length === 7) {
      return 'Every day';
    }

    // Check for weekdays (Mon-Fri)
    if (
      daysOfWeek.length === 5 &&
      daysOfWeek.includes(1) &&
      daysOfWeek.includes(2) &&
      daysOfWeek.includes(3) &&
      daysOfWeek.includes(4) &&
      daysOfWeek.includes(5)
    ) {
      return 'Weekdays';
    }

    // Check for weekends (Sat-Sun)
    if (daysOfWeek.length === 2 && daysOfWeek.includes(6) && daysOfWeek.includes(7)) {
      return 'Weekends';
    }

    // Return specific days
    return daysOfWeek
      .sort()
      .map(day => dayNames[day - 1])
      .join(', ');
  }
}
