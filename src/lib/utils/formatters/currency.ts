import { appConfig } from "@/lib/config/app.config";

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the currency symbol
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, showSymbol: boolean = true): string {
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return showSymbol ? `${appConfig.currencySymbol}${formatted}` : formatted;
}

/**
 * Parse a currency string to a number
 * @param value - The currency string to parse
 * @returns The parsed number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}
