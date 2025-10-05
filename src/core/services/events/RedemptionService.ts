import { CustomerEvent } from '@/models/entities/CustomerEvent';
import { EventRepository } from '@/data/repositories/EventRepository';
import { RedemptionUtils } from './RedemptionUtils';
import { AppError } from '@/lib/errors/AppError';

/**
 * RedemptionService
 * Server-side service for offer redemption with database access
 * WARNING: Only use this in API routes and server components
 * For client components, use RedemptionUtils instead
 */
export class RedemptionService {
  /**
   * Validate if offer can be redeemed
   * @deprecated Use RedemptionUtils.validateOffer() in client components
   */
  static validateOffer(event: CustomerEvent): { valid: boolean; error?: string } {
    return RedemptionUtils.validateOffer(event);
  }

  /**
   * Redeem an offer (server-side only - requires database access)
   * @param eventId The event ID to redeem
   * @param orderId The order ID for the redemption
   * @returns The redeemed customer event
   */
  static async redeem(eventId: string, orderId: string): Promise<CustomerEvent> {
    try {
      // Get the event
      const event = await EventRepository.getById(eventId);

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Validate the offer
      const validation = RedemptionUtils.validateOffer(event);
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
   * @deprecated Use RedemptionUtils.calculateDiscount() in client components
   */
  static calculateDiscount(event: CustomerEvent, orderSubtotal: number): number {
    return RedemptionUtils.calculateDiscount(event, orderSubtotal);
  }

  /**
   * Apply event offer to order
   * @deprecated Use RedemptionUtils.applyOffer() in client components
   */
  static applyOffer(
    event: CustomerEvent,
    orderSubtotal: number
  ): {
    discount: number;
    newTotal: number;
    discountDescription: string;
  } {
    return RedemptionUtils.applyOffer(event, orderSubtotal);
  }

  /**
   * Check if event offer is expiring soon
   * @deprecated Use RedemptionUtils.isExpiringSoon() in client components
   */
  static isExpiringSoon(event: CustomerEvent, daysThreshold: number = 3): boolean {
    return RedemptionUtils.isExpiringSoon(event, daysThreshold);
  }

  /**
   * Get days until offer expires
   * @deprecated Use RedemptionUtils.getDaysUntilExpiry() in client components
   */
  static getDaysUntilExpiry(event: CustomerEvent): number | null {
    return RedemptionUtils.getDaysUntilExpiry(event);
  }

  /**
   * Format offer for display
   * @deprecated Use RedemptionUtils.formatOffer() in client components
   */
  static formatOffer(event: CustomerEvent): string {
    return RedemptionUtils.formatOffer(event);
  }

  /**
   * Mark offer as used (alias for redeem, server-side only)
   * @param eventId The event ID to redeem
   * @param orderId The order ID for the redemption
   * @returns The redeemed customer event
   */
  static async markRedeemed(eventId: string, orderId: string): Promise<CustomerEvent> {
    return this.redeem(eventId, orderId);
  }
}
