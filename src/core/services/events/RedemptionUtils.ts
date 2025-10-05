import { CustomerEvent } from '@/models/entities/CustomerEvent';

/**
 * RedemptionUtils
 * Pure utility functions for event offer redemption (client-safe, no database dependencies)
 * Use this in client components that need to validate or format offers
 */
export class RedemptionUtils {
  /**
   * Validate if offer can be redeemed (pure validation, no database access)
   * @param event The customer event to validate
   * @returns Validation result with error message if invalid
   */
  static validateOffer(event: CustomerEvent): { valid: boolean; error?: string } {
    // Check if already redeemed
    if (event.is_redeemed) {
      return { valid: false, error: 'This offer has already been redeemed' };
    }

    // Check if offer has started
    if (event.offer_valid_from) {
      const validFrom = new Date(event.offer_valid_from);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (now < validFrom) {
        return { valid: false, error: 'This offer is not yet valid' };
      }
    }

    // Check if offer has expired
    if (event.offer_valid_until) {
      const validUntil = new Date(event.offer_valid_until);
      const now = new Date();
      now.setHours(23, 59, 59, 999);

      if (now > validUntil) {
        return { valid: false, error: 'This offer has expired' };
      }
    }

    // Check if offer has discount or free item
    if (
      !event.discount_value &&
      !event.free_item_product_id &&
      event.discount_type !== 'complimentary'
    ) {
      return { valid: false, error: 'This offer has no valid discount' };
    }

    return { valid: true };
  }

  /**
   * Calculate discount amount from event offer
   * @param event The customer event with discount information
   * @param orderSubtotal The order subtotal to apply discount to
   * @returns The calculated discount amount
   */
  static calculateDiscount(event: CustomerEvent, orderSubtotal: number): number {
    if (!event.discount_value && event.discount_type !== 'complimentary') {
      return 0;
    }

    switch (event.discount_type) {
      case 'percentage':
        return Math.round((orderSubtotal * (event.discount_value || 0)) / 100 * 100) / 100;

      case 'fixed_amount':
        return Math.min(event.discount_value || 0, orderSubtotal);

      case 'complimentary':
        return orderSubtotal; // Full discount

      default:
        return 0;
    }
  }

  /**
   * Apply event offer to order and calculate new total
   * @param event The customer event with offer details
   * @param orderSubtotal The order subtotal before discount
   * @returns Object with discount amount, new total, and description
   */
  static applyOffer(
    event: CustomerEvent,
    orderSubtotal: number
  ): {
    discount: number;
    newTotal: number;
    discountDescription: string;
  } {
    const discount = this.calculateDiscount(event, orderSubtotal);
    const newTotal = Math.max(0, orderSubtotal - discount);

    let discountDescription = '';
    if (event.discount_type === 'percentage') {
      discountDescription = `${event.discount_value}% ${event.event_type} discount`;
    } else if (event.discount_type === 'fixed_amount') {
      discountDescription = `₱${event.discount_value} ${event.event_type} discount`;
    } else if (event.discount_type === 'complimentary') {
      discountDescription = `Complimentary ${event.event_type} offer`;
    }

    return {
      discount: Math.round(discount * 100) / 100,
      newTotal: Math.round(newTotal * 100) / 100,
      discountDescription,
    };
  }

  /**
   * Check if event offer is expiring soon
   * @param event The customer event to check
   * @param daysThreshold Number of days to consider as "expiring soon" (default: 3)
   * @returns True if the offer expires within the threshold
   */
  static isExpiringSoon(event: CustomerEvent, daysThreshold: number = 3): boolean {
    if (!event.offer_valid_until || event.is_redeemed) {
      return false;
    }

    const validUntil = new Date(event.offer_valid_until);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold;
  }

  /**
   * Get days until offer expires
   * @param event The customer event to check
   * @returns Number of days until expiry, or null if no expiry date
   */
  static getDaysUntilExpiry(event: CustomerEvent): number | null {
    if (!event.offer_valid_until) {
      return null;
    }

    const validUntil = new Date(event.offer_valid_until);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilExpiry;
  }

  /**
   * Format offer for display
   * @param event The customer event to format
   * @returns Formatted offer description string
   */
  static formatOffer(event: CustomerEvent): string {
    if (event.offer_description) {
      return event.offer_description;
    }

    if (event.discount_type === 'percentage' && event.discount_value) {
      return `${event.discount_value}% discount`;
    }

    if (event.discount_type === 'fixed_amount' && event.discount_value) {
      return `₱${event.discount_value} discount`;
    }

    if (event.discount_type === 'complimentary') {
      return 'Complimentary offer';
    }

    if (event.free_item_product_id) {
      return 'Free item offer';
    }

    return 'Special offer';
  }
}
