import { appConfig } from "@/lib/config/app.config";

/**
 * Generate a unique order number
 * Format: ORD-YYYYMMDD-XXXX
 * @returns Generated order number
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${appConfig.orderNumberPrefix}-${year}${month}${day}-${random}`;
}

/**
 * Validate order number format
 * @param orderNumber - Order number to validate
 * @returns True if valid
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  const pattern = new RegExp(`^${appConfig.orderNumberPrefix}-\\d{8}-\\d{4}$`);
  return pattern.test(orderNumber);
}
