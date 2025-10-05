import { HappyHour } from '@/models/entities/HappyHour';
import { Product } from '@/models/entities/Product';
import { HappyHourRepository } from '@/data/repositories/HappyHourRepository';
import { HappyHourUtils } from './HappyHourUtils';
import { AppError } from '@/lib/errors/AppError';

/**
 * HappyHourPricing Service
 * Server-side service for happy hour pricing with database access
 * WARNING: Only use this in API routes and server components
 * For client components, use HappyHourUtils instead
 */
export class HappyHourPricing {
  /**
   * Check if happy hour is currently active
   * @deprecated Use HappyHourUtils.isActive() in client components
   */
  static isActive(happyHour: HappyHour): boolean {
    return HappyHourUtils.isActive(happyHour);
  }

  /**
   * Check if current time is within happy hour time window
   * @deprecated Use HappyHourUtils.isWithinTimeWindow() in client components
   */
  static isWithinTimeWindow(happyHour: HappyHour): boolean {
    return HappyHourUtils.isWithinTimeWindow(happyHour);
  }

  /**
   * Check if current day is valid for happy hour
   * @deprecated Use HappyHourUtils.isValidDayOfWeek() in client components
   */
  static isValidDayOfWeek(happyHour: HappyHour): boolean {
    return HappyHourUtils.isValidDayOfWeek(happyHour);
  }

  /**
   * Check if current date is within happy hour validity range
   * @deprecated Use HappyHourUtils.isWithinDateRange() in client components
   */
  static isWithinDateRange(happyHour: HappyHour): boolean {
    return HappyHourUtils.isWithinDateRange(happyHour);
  }

  /**
   * Apply happy hour discount to a price
   * @deprecated Use HappyHourUtils.apply() in client components
   */
  static apply(
    basePrice: number,
    happyHour: HappyHour,
    orderTotal?: number
  ): number {
    return HappyHourUtils.apply(basePrice, happyHour, orderTotal);
  }

  /**
   * Get the best happy hour price for a product (server-side only)
   * This method requires database access and should only be used in API routes
   * @param product The product to calculate price for
   * @param quantity Quantity of the product
   * @param orderSubtotal Optional order subtotal for minimum order validation
   * @returns Object with price, original price, discount and applied happy hour
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
        if (!HappyHourUtils.isActive(happyHour)) {
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
        const discountedPrice = HappyHourUtils.apply(
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
   * @deprecated Use HappyHourUtils.formatTimeWindow() in client components
   */
  static formatTimeWindow(happyHour: HappyHour): string {
    return HappyHourUtils.formatTimeWindow(happyHour);
  }

  /**
   * Format days of week for display
   * @deprecated Use HappyHourUtils.formatDaysOfWeek() in client components
   */
  static formatDaysOfWeek(daysOfWeek: number[]): string {
    return HappyHourUtils.formatDaysOfWeek(daysOfWeek);
  }
}
