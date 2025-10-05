import { Product } from '@/models/entities/Product';
import { Customer } from '@/models/entities/Customer';
import { CustomerTier } from '@/models/enums/CustomerTier';
import { supabase } from '@/data/supabase/client';
import { AppError } from '@/lib/errors/AppError';

/**
 * PricingService
 * Determines final product prices based on customer tier, happy hour, and promotions
 */
export class PricingService {
  /**
   * Get final price for a product
   */
  static async getProductPrice(
    product: Product,
    customer?: Customer | null,
    quantity: number = 1
  ): Promise<{
    unitPrice: number;
    total: number;
    isVIPPrice: boolean;
    isHappyHourPrice: boolean;
    originalPrice: number;
    discount: number;
  }> {
    try {
      let unitPrice = product.base_price;
      let isVIPPrice = false;
      let isHappyHourPrice = false;
      const originalPrice = product.base_price;

      // Check VIP pricing first
      if (customer && customer.tier !== CustomerTier.REGULAR && product.vip_price) {
        unitPrice = product.vip_price;
        isVIPPrice = true;
      }

      // Check happy hour pricing (overrides VIP if lower)
      const happyHourPrice = await this.checkHappyHourPrice(product.id);
      if (happyHourPrice !== null && happyHourPrice < unitPrice) {
        unitPrice = happyHourPrice;
        isHappyHourPrice = true;
        isVIPPrice = false; // Happy hour takes precedence
      }

      const total = unitPrice * quantity;
      const discount = (originalPrice - unitPrice) * quantity;

      return {
        unitPrice: Math.round(unitPrice * 100) / 100,
        total: Math.round(total * 100) / 100,
        isVIPPrice,
        isHappyHourPrice,
        originalPrice,
        discount: Math.round(discount * 100) / 100,
      };
    } catch (error) {
      console.error('Get product price error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to calculate price', 500);
    }
  }

  /**
   * Check if product has active happy hour pricing
   */
  private static async checkHappyHourPrice(productId: string): Promise<number | null> {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
      const currentDay = now.getDay() || 7; // 1-7 (Monday-Sunday)
      const currentDate = now.toISOString().split('T')[0];

      // Query active happy hours
      const { data: happyHours, error } = await supabase
        .from('happy_hour_pricing')
        .select(`
          *,
          happy_hour_products(
            product_id,
            custom_price
          )
        `)
        .eq('is_active', true)
        .lte('start_time', currentTime)
        .gte('end_time', currentTime)
        .or(`valid_from.is.null,valid_from.lte.${currentDate}`)
        .or(`valid_until.is.null,valid_until.gte.${currentDate}`);

      if (error || !happyHours || happyHours.length === 0) {
        return null;
      }

      // Check if any happy hour applies to this product and current day
      for (const happyHour of happyHours) {
        // Check day of week
        if (
          happyHour.days_of_week &&
          !happyHour.days_of_week.includes(currentDay)
        ) {
          continue;
        }

        // Check if applies to all products
        if (happyHour.applies_to_all_products) {
          // Calculate discount
          if (happyHour.discount_type === 'percentage') {
            // Will be calculated at item level
            return null; // Signal to apply percentage discount
          }
          // Fixed amount discount handled differently
          return null;
        }

        // Check if product is in happy hour products
        const productHappyHour = (happyHour as any).happy_hour_products?.find(
          (php: any) => php.product_id === productId
        );

        if (productHappyHour && productHappyHour.custom_price) {
          return productHappyHour.custom_price;
        }
      }

      return null;
    } catch (error) {
      console.error('Check happy hour price error:', error);
      return null; // Fail gracefully
    }
  }

  /**
   * Get active happy hour details
   */
  static async getActiveHappyHour() {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];
      const currentDay = now.getDay() || 7;
      const currentDate = now.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('happy_hour_pricing')
        .select('*')
        .eq('is_active', true)
        .lte('start_time', currentTime)
        .gte('end_time', currentTime)
        .or(`valid_from.is.null,valid_from.lte.${currentDate}`)
        .or(`valid_until.is.null,valid_until.gte.${currentDate}`)
        .limit(1)
        .single();

      if (error || !data) return null;

      // Check day of week
      if (data.days_of_week && !data.days_of_week.includes(currentDay)) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Get active happy hour error:', error);
      return null;
    }
  }

  /**
   * Calculate VIP discount percentage
   */
  static getVIPDiscountPercentage(tier: CustomerTier): number {
    switch (tier) {
      case CustomerTier.VIP_PLATINUM:
        return 20; // 20% discount
      case CustomerTier.VIP_GOLD:
        return 15; // 15% discount
      case CustomerTier.VIP_SILVER:
        return 10; // 10% discount
      case CustomerTier.REGULAR:
      default:
        return 0;
    }
  }

  /**
   * Check if customer has VIP benefits
   */
  static hasVIPBenefits(customer?: Customer | null): boolean {
    if (!customer) return false;
    
    // Check if VIP membership is active
    if (customer.tier === CustomerTier.REGULAR) return false;

    // Check expiry date if exists
    if (customer.vip_expiry_date) {
      const expiryDate = new Date(customer.vip_expiry_date);
      const now = new Date();
      return expiryDate > now;
    }

    return true;
  }
}
