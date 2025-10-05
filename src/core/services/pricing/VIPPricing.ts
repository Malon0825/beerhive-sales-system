import { Customer } from '@/models/entities/Customer';
import { Product } from '@/models/entities/Product';
import { CustomerTier } from '@/models/enums/CustomerTier';

/**
 * VIPPricing Service
 * Handles VIP customer pricing logic and tier-based discounts
 */
export class VIPPricing {
  /**
   * Check if customer has active VIP benefits
   */
  static hasActiveBenefits(customer: Customer | null | undefined): boolean {
    if (!customer) return false;

    // Check if customer has VIP tier
    if (customer.tier === CustomerTier.REGULAR) {
      return false;
    }

    // Check VIP expiry date if exists
    if (customer.vip_expiry_date) {
      const expiryDate = new Date(customer.vip_expiry_date);
      const now = new Date();
      
      if (expiryDate < now) {
        return false; // VIP membership expired
      }
    }

    return true;
  }

  /**
   * Get VIP price for a product
   */
  static getVIPPrice(product: Product, customer: Customer): number {
    // Check if customer has active VIP benefits
    if (!this.hasActiveBenefits(customer)) {
      return product.base_price;
    }

    // Use product's VIP price if available
    if (product.vip_price && product.vip_price > 0) {
      return product.vip_price;
    }

    // Otherwise, calculate based on tier discount
    const discountPercentage = this.getDiscountPercentage(customer.tier);
    const discount = (product.base_price * discountPercentage) / 100;
    
    return Math.max(0, product.base_price - discount);
  }

  /**
   * Apply VIP pricing to a product
   */
  static apply(
    product: Product,
    customer: Customer | null | undefined,
    quantity: number = 1
  ): {
    unitPrice: number;
    total: number;
    discount: number;
    isVIPPrice: boolean;
  } {
    if (!customer || !this.hasActiveBenefits(customer)) {
      const total = product.base_price * quantity;
      return {
        unitPrice: product.base_price,
        total: Math.round(total * 100) / 100,
        discount: 0,
        isVIPPrice: false,
      };
    }

    const vipPrice = this.getVIPPrice(product, customer);
    const total = vipPrice * quantity;
    const discount = (product.base_price - vipPrice) * quantity;

    return {
      unitPrice: Math.round(vipPrice * 100) / 100,
      total: Math.round(total * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      isVIPPrice: true,
    };
  }

  /**
   * Get discount percentage based on VIP tier
   */
  static getDiscountPercentage(tier: CustomerTier): number {
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
   * Get tier display name
   */
  static getTierDisplayName(tier: CustomerTier): string {
    switch (tier) {
      case CustomerTier.VIP_PLATINUM:
        return 'VIP Platinum';
      case CustomerTier.VIP_GOLD:
        return 'VIP Gold';
      case CustomerTier.VIP_SILVER:
        return 'VIP Silver';
      case CustomerTier.REGULAR:
      default:
        return 'Regular';
    }
  }

  /**
   * Get tier color for UI display
   */
  static getTierColor(tier: CustomerTier): string {
    switch (tier) {
      case CustomerTier.VIP_PLATINUM:
        return '#E5E7EB'; // Platinum/Silver color
      case CustomerTier.VIP_GOLD:
        return '#FCD34D'; // Gold color
      case CustomerTier.VIP_SILVER:
        return '#9CA3AF'; // Silver color
      case CustomerTier.REGULAR:
      default:
        return '#6B7280'; // Gray color
    }
  }

  /**
   * Check if customer needs VIP renewal reminder
   */
  static needsRenewalReminder(customer: Customer, daysBeforeExpiry: number = 30): boolean {
    if (!customer.vip_expiry_date) {
      return false;
    }

    if (customer.tier === CustomerTier.REGULAR) {
      return false;
    }

    const expiryDate = new Date(customer.vip_expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return daysUntilExpiry > 0 && daysUntilExpiry <= daysBeforeExpiry;
  }

  /**
   * Get days until VIP expiry
   */
  static getDaysUntilExpiry(customer: Customer): number | null {
    if (!customer.vip_expiry_date) {
      return null;
    }

    const expiryDate = new Date(customer.vip_expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return daysUntilExpiry;
  }

  /**
   * Calculate total savings for VIP customer
   */
  static calculateSavings(
    products: { product: Product; quantity: number }[],
    customer: Customer
  ): number {
    if (!this.hasActiveBenefits(customer)) {
      return 0;
    }

    let totalSavings = 0;

    for (const { product, quantity } of products) {
      const baseTotal = product.base_price * quantity;
      const vipPrice = this.getVIPPrice(product, customer);
      const vipTotal = vipPrice * quantity;
      const savings = baseTotal - vipTotal;

      totalSavings += savings;
    }

    return Math.round(totalSavings * 100) / 100;
  }
}
