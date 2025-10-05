import { HappyHour } from '@/models/entities/HappyHour';

/**
 * HappyHourUtils
 * Pure utility functions for happy hour pricing (client-safe, no database dependencies)
 * Use this in client components that need to check happy hour status or format display
 */
export class HappyHourUtils {
  /**
   * Check if happy hour is currently active based on time and date
   * @param happyHour The happy hour to check
   * @returns True if the happy hour is currently active
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
   * @param happyHour The happy hour to check
   * @returns True if current time is within the happy hour time window
   */
  static isWithinTimeWindow(happyHour: HappyHour): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    return currentTime >= happyHour.start_time && currentTime <= happyHour.end_time;
  }

  /**
   * Check if current day is valid for happy hour
   * @param happyHour The happy hour to check
   * @returns True if current day is valid for the happy hour
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
   * @param happyHour The happy hour to check
   * @returns True if current date is within the validity range
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
   * Apply happy hour discount to a price (pure calculation, no database access)
   * @param basePrice The base price to apply discount to
   * @param happyHour The happy hour with discount information
   * @param orderTotal Optional total order amount for minimum order validation
   * @returns The discounted price
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
   * Format time window for display
   * @param happyHour The happy hour to format
   * @returns Formatted time window string (e.g., "17:00 - 20:00")
   */
  static formatTimeWindow(happyHour: HappyHour): string {
    const start = happyHour.start_time.substring(0, 5); // HH:MM
    const end = happyHour.end_time.substring(0, 5); // HH:MM
    return `${start} - ${end}`;
  }

  /**
   * Format days of week for display
   * @param daysOfWeek Array of day numbers (1-7 for Monday-Sunday)
   * @returns Formatted days string (e.g., "Weekdays", "Mon, Wed, Fri")
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

  /**
   * Calculate discount amount
   * @param basePrice The base price
   * @param discountedPrice The discounted price
   * @returns The discount amount
   */
  static calculateDiscountAmount(basePrice: number, discountedPrice: number): number {
    return Math.max(0, basePrice - discountedPrice);
  }

  /**
   * Calculate discount percentage
   * @param basePrice The base price
   * @param discountedPrice The discounted price
   * @returns The discount percentage
   */
  static calculateDiscountPercentage(basePrice: number, discountedPrice: number): number {
    if (basePrice === 0) return 0;
    return Math.round(((basePrice - discountedPrice) / basePrice) * 100);
  }
}
