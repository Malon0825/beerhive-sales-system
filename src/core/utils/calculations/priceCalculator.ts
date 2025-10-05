/**
 * Calculate subtotal from quantity and unit price
 * @param quantity - Item quantity
 * @param unitPrice - Price per unit
 * @returns Calculated subtotal
 */
export function calculateSubtotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Calculate discount amount
 * @param amount - Original amount
 * @param discountPercent - Discount percentage
 * @returns Discount amount
 */
export function calculateDiscountAmount(
  amount: number,
  discountPercent: number
): number {
  return Math.round(amount * (discountPercent / 100) * 100) / 100;
}

/**
 * Calculate tax amount
 * @param amount - Taxable amount
 * @param taxRate - Tax rate percentage
 * @returns Tax amount
 */
export function calculateTaxAmount(amount: number, taxRate: number): number {
  return Math.round(amount * (taxRate / 100) * 100) / 100;
}

/**
 * Calculate total after discount and tax
 * @param subtotal - Subtotal amount
 * @param discountAmount - Discount amount
 * @param taxAmount - Tax amount
 * @returns Total amount
 */
export function calculateTotal(
  subtotal: number,
  discountAmount: number = 0,
  taxAmount: number = 0
): number {
  return Math.round((subtotal - discountAmount + taxAmount) * 100) / 100;
}

/**
 * Calculate change amount
 * @param amountTendered - Amount given by customer
 * @param totalAmount - Total order amount
 * @returns Change amount
 */
export function calculateChange(
  amountTendered: number,
  totalAmount: number
): number {
  return Math.max(0, Math.round((amountTendered - totalAmount) * 100) / 100);
}
