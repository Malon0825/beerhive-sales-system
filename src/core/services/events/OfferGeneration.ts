import { Customer } from '@/models/entities/Customer';
import { CreateCustomerEventInput } from '@/models/entities/CustomerEvent';
import { EventType } from '@/models/enums/EventType';
import { CustomerTier } from '@/models/enums/CustomerTier';
import { EventRepository } from '@/data/repositories/EventRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * OfferGeneration Service
 * Auto-generates special offers for customer events
 */
export class OfferGeneration {
  /**
   * Generate offers for all upcoming customer events
   */
  static async generateUpcomingOffers(daysAhead: number = 30): Promise<number> {
    try {
      // This would typically be run as a scheduled job
      // For now, it's a utility method
      
      // TODO: Implement scheduled offer generation
      // 1. Query customers with upcoming birthdays/anniversaries
      // 2. Check if offers already exist
      // 3. Generate new offers if needed

      return 0; // Count of offers generated
    } catch (error) {
      console.error('Generate upcoming offers error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to generate offers', 500);
    }
  }

  /**
   * Generate birthday offer for a customer
   */
  static async generateBirthdayOffer(
    customer: Customer,
    customDiscount?: number
  ): Promise<CreateCustomerEventInput> {
    if (!customer.birth_date) {
      throw new AppError('Customer does not have a birth date', 400);
    }

    const birthDate = new Date(customer.birth_date);
    const now = new Date();
    const currentYearBirthday = new Date(
      now.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate()
    );

    // If birthday has passed this year, use next year
    if (currentYearBirthday < now) {
      currentYearBirthday.setFullYear(now.getFullYear() + 1);
    }

    // Calculate discount based on tier if not provided
    const discountValue = customDiscount || this.getBirthdayDiscount(customer.tier);

    const offer: CreateCustomerEventInput = {
      customer_id: customer.id,
      event_type: EventType.BIRTHDAY,
      event_date: currentYearBirthday.toISOString().split('T')[0],
      offer_description: this.getBirthdayOfferDescription(customer.tier, discountValue),
      discount_type: 'percentage',
      discount_value: discountValue,
      offer_valid_from: this.getValidFrom(currentYearBirthday, 7),
      offer_valid_until: this.getValidUntil(currentYearBirthday, 7),
    };

    return offer;
  }

  /**
   * Generate anniversary offer for a customer
   */
  static async generateAnniversaryOffer(
    customer: Customer,
    customDiscount?: number
  ): Promise<CreateCustomerEventInput> {
    if (!customer.anniversary_date) {
      throw new AppError('Customer does not have an anniversary date', 400);
    }

    const anniversaryDate = new Date(customer.anniversary_date);
    const now = new Date();
    const currentYearAnniversary = new Date(
      now.getFullYear(),
      anniversaryDate.getMonth(),
      anniversaryDate.getDate()
    );

    // If anniversary has passed this year, use next year
    if (currentYearAnniversary < now) {
      currentYearAnniversary.setFullYear(now.getFullYear() + 1);
    }

    // Calculate discount based on tier if not provided
    const discountValue = customDiscount || this.getAnniversaryDiscount(customer.tier);

    const offer: CreateCustomerEventInput = {
      customer_id: customer.id,
      event_type: EventType.ANNIVERSARY,
      event_date: currentYearAnniversary.toISOString().split('T')[0],
      offer_description: this.getAnniversaryOfferDescription(customer.tier, discountValue),
      discount_type: 'percentage',
      discount_value: discountValue,
      offer_valid_from: this.getValidFrom(currentYearAnniversary, 7),
      offer_valid_until: this.getValidUntil(currentYearAnniversary, 7),
    };

    return offer;
  }

  /**
   * Generate custom event offer
   */
  static generateCustomOffer(
    customerId: string,
    eventName: string,
    eventDate: string,
    discountValue: number,
    discountType: 'percentage' | 'fixed_amount' | 'complimentary' = 'percentage',
    validityDays: number = 7
  ): CreateCustomerEventInput {
    const eventDateObj = new Date(eventDate);

    return {
      customer_id: customerId,
      event_type: EventType.CUSTOM,
      event_name: eventName,
      event_date: eventDate,
      offer_description: `Special offer for ${eventName}`,
      discount_type: discountType,
      discount_value: discountValue,
      offer_valid_from: this.getValidFrom(eventDateObj, validityDays),
      offer_valid_until: this.getValidUntil(eventDateObj, validityDays),
    };
  }

  /**
   * Get birthday discount percentage based on tier
   */
  private static getBirthdayDiscount(tier: CustomerTier): number {
    switch (tier) {
      case CustomerTier.VIP_PLATINUM:
        return 25; // 25% for platinum
      case CustomerTier.VIP_GOLD:
        return 20; // 20% for gold
      case CustomerTier.VIP_SILVER:
        return 15; // 15% for silver
      case CustomerTier.REGULAR:
      default:
        return 10; // 10% for regular
    }
  }

  /**
   * Get anniversary discount percentage based on tier
   */
  private static getAnniversaryDiscount(tier: CustomerTier): number {
    switch (tier) {
      case CustomerTier.VIP_PLATINUM:
        return 30; // 30% for platinum
      case CustomerTier.VIP_GOLD:
        return 25; // 25% for gold
      case CustomerTier.VIP_SILVER:
        return 20; // 20% for silver
      case CustomerTier.REGULAR:
      default:
        return 15; // 15% for regular
    }
  }

  /**
   * Get birthday offer description
   */
  private static getBirthdayOfferDescription(tier: CustomerTier, discount: number): string {
    const tierName = tier === CustomerTier.REGULAR ? '' : ` VIP ${tier.replace('vip_', '').toUpperCase()}`;
    return `Happy Birthday${tierName}! Enjoy ${discount}% off your celebration. Valid 7 days before and after your special day.`;
  }

  /**
   * Get anniversary offer description
   */
  private static getAnniversaryOfferDescription(tier: CustomerTier, discount: number): string {
    const tierName = tier === CustomerTier.REGULAR ? '' : ` VIP ${tier.replace('vip_', '').toUpperCase()}`;
    return `Happy Anniversary${tierName}! Celebrate with ${discount}% off. Valid 7 days before and after your anniversary.`;
  }

  /**
   * Get validity start date (days before event)
   */
  private static getValidFrom(eventDate: Date, daysBefore: number): string {
    const validFrom = new Date(eventDate);
    validFrom.setDate(validFrom.getDate() - daysBefore);
    return validFrom.toISOString().split('T')[0];
  }

  /**
   * Get validity end date (days after event)
   */
  private static getValidUntil(eventDate: Date, daysAfter: number): string {
    const validUntil = new Date(eventDate);
    validUntil.setDate(validUntil.getDate() + daysAfter);
    return validUntil.toISOString().split('T')[0];
  }

  /**
   * Set validity window for an offer
   */
  static setValidityWindow(
    offer: CreateCustomerEventInput,
    daysBefore: number,
    daysAfter: number
  ): CreateCustomerEventInput {
    const eventDate = new Date(offer.event_date);

    return {
      ...offer,
      offer_valid_from: this.getValidFrom(eventDate, daysBefore),
      offer_valid_until: this.getValidUntil(eventDate, daysAfter),
    };
  }
}
