/**
 * Currency Formatter Utility
 * Formats numbers as currency values
 */

/**
 * Format a number as currency (PHP format)
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "₱1,234.56")
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₱0.00';
  
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as currency without symbol
 * @param amount - The amount to format
 * @returns Formatted number string (e.g., "1,234.56")
 */
export function formatAmount(amount: number): string {
  if (isNaN(amount)) return '0.00';
  
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse a currency string to number
 * @param currencyString - The currency string to parse
 * @returns Parsed number value
 */
export function parseCurrency(currencyString: string): number {
  const cleaned = currencyString.replace(/[₱,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
