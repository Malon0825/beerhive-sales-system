import { CustomerEvent } from '@/models/entities/CustomerEvent';
import { EventRepository } from '@/data/repositories/EventRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * RedemptionService
 * Handles offer redemption logic and validation
 */
export class RedemptionService {
  /**
   * Validate if offer can be redeemed
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
   * Redeem an offer
   */
  static async redeem(eventId: string, orderId: string): Promise<CustomerEvent> {
    try {
      // Get the event
      const event = await EventRepository.getById(eventId);

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Validate the offer
      const validation = this.validateOffer(event);
      if (!validation.valid) {
        throw new AppError(validation.error || 'Offer cannot be redeemed', 400);
      }

      // Mark as redeemed
      const redeemedEvent = await EventRepository.redeem(eventId, { order_id: orderId });

      return redeemedEvent;
    } catch (error) {
      console.error('Redeem offer error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to redeem offer', 500);
    }
  }

  /**
   * Calculate discount amount from event offer
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
   * Apply event offer to order
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

  /**
   * Mark offer as used (alias for redeem)
   */
  static async markRedeemed(eventId: string, orderId: string): Promise<CustomerEvent> {
    return this.redeem(eventId, orderId);
  }
}
