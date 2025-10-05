import { Customer } from '@/models/entities/Customer';
import { CustomerEvent, CreateCustomerEventInput } from '@/models/entities/CustomerEvent';
import { EventType } from '@/models/enums/EventType';
import { EventRepository } from '@/data/repositories/EventRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * EventService
 * Business logic for customer events management
 */
export class EventService {
  /**
   * Create customer event from customer profile
   */
  static async createFromCustomer(customer: Customer): Promise<CustomerEvent[]> {
    const events: CustomerEvent[] = [];

    try {
      // Create birthday event if birth_date exists
      if (customer.birth_date) {
        const birthdayEvent = await this.createBirthdayEvent(customer);
        if (birthdayEvent) {
          events.push(birthdayEvent);
        }
      }

      // Create anniversary event if anniversary_date exists
      if (customer.anniversary_date) {
        const anniversaryEvent = await this.createAnniversaryEvent(customer);
        if (anniversaryEvent) {
          events.push(anniversaryEvent);
        }
      }

      return events;
    } catch (error) {
      console.error('Create events from customer error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create events', 500);
    }
  }

  /**
   * Create birthday event for customer
   */
  private static async createBirthdayEvent(customer: Customer): Promise<CustomerEvent | null> {
    if (!customer.birth_date) return null;

    try {
      // Get current year's birthday
      const birthDate = new Date(customer.birth_date);
      const now = new Date();
      const currentYearBirthday = new Date(
        now.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate()
      );

      // If birthday has passed this year, create for next year
      if (currentYearBirthday < now) {
        currentYearBirthday.setFullYear(now.getFullYear() + 1);
      }

      const eventInput: CreateCustomerEventInput = {
        customer_id: customer.id,
        event_type: EventType.BIRTHDAY,
        event_date: currentYearBirthday.toISOString().split('T')[0],
        offer_description: 'Happy Birthday! Enjoy a special discount on your next visit.',
        discount_type: 'percentage',
        discount_value: 15, // 15% birthday discount
        offer_valid_from: this.getValidFrom(currentYearBirthday, 7), // Valid 7 days before
        offer_valid_until: this.getValidUntil(currentYearBirthday, 7), // Valid 7 days after
      };

      return await EventRepository.create(eventInput);
    } catch (error) {
      console.error('Create birthday event error:', error);
      return null;
    }
  }

  /**
   * Create anniversary event for customer
   */
  private static async createAnniversaryEvent(customer: Customer): Promise<CustomerEvent | null> {
    if (!customer.anniversary_date) return null;

    try {
      // Get current year's anniversary
      const anniversaryDate = new Date(customer.anniversary_date);
      const now = new Date();
      const currentYearAnniversary = new Date(
        now.getFullYear(),
        anniversaryDate.getMonth(),
        anniversaryDate.getDate()
      );

      // If anniversary has passed this year, create for next year
      if (currentYearAnniversary < now) {
        currentYearAnniversary.setFullYear(now.getFullYear() + 1);
      }

      const eventInput: CreateCustomerEventInput = {
        customer_id: customer.id,
        event_type: EventType.ANNIVERSARY,
        event_date: currentYearAnniversary.toISOString().split('T')[0],
        offer_description: 'Happy Anniversary! Celebrate with a special offer.',
        discount_type: 'percentage',
        discount_value: 20, // 20% anniversary discount
        offer_valid_from: this.getValidFrom(currentYearAnniversary, 7),
        offer_valid_until: this.getValidUntil(currentYearAnniversary, 7),
      };

      return await EventRepository.create(eventInput);
    } catch (error) {
      console.error('Create anniversary event error:', error);
      return null;
    }
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
   * Check if customer has active offers
   */
  static async hasActiveOffers(customerId: string): Promise<boolean> {
    try {
      const offers = await EventRepository.getActiveForCustomer(customerId);
      return offers.length > 0;
    } catch (error) {
      console.error('Check active offers error:', error);
      return false;
    }
  }

  /**
   * Get best offer for customer
   */
  static async getBestOffer(customerId: string): Promise<CustomerEvent | null> {
    try {
      const offers = await EventRepository.getActiveForCustomer(customerId);

      if (offers.length === 0) return null;

      // Sort by discount value (highest first)
      offers.sort((a, b) => {
        const aValue = a.discount_value || 0;
        const bValue = b.discount_value || 0;
        return bValue - aValue;
      });

      return offers[0];
    } catch (error) {
      console.error('Get best offer error:', error);
      return null;
    }
  }

  /**
   * Validate event dates
   */
  static validateEventDates(input: CreateCustomerEventInput): { valid: boolean; error?: string } {
    // Check event date is not in the past
    const eventDate = new Date(input.event_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (eventDate < now) {
      return { valid: false, error: 'Event date cannot be in the past' };
    }

    // Check validity dates
    if (input.offer_valid_from && input.offer_valid_until) {
      const validFrom = new Date(input.offer_valid_from);
      const validUntil = new Date(input.offer_valid_until);

      if (validFrom > validUntil) {
        return { valid: false, error: 'Offer valid from date must be before valid until date' };
      }

      if (validUntil < now) {
        return { valid: false, error: 'Offer valid until date cannot be in the past' };
      }
    }

    return { valid: true };
  }
}
