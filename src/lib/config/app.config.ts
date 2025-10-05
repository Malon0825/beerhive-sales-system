/**
 * Application Configuration
 * Central configuration file for app-wide settings
 */

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'BeerHive POS',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Pagination
  defaultPageSize: 20,
  maxPageSize: 100,
  
  // Session
  sessionTimeout: 30, // minutes
  
  // Currency
  currency: 'PHP',
  currencySymbol: '₱',
  
  // Tax
  defaultTaxRate: 0, // 0% (configurable in settings)
  
  // Inventory
  lowStockThreshold: 10,
  
  // Orders
  orderNumberPrefix: 'ORD',
  maxOrderItems: 50,
  
  // Discounts
  maxDiscountWithoutApproval: 20, // percentage
  
  // API
  apiTimeout: 30000, // 30 seconds
} as const;

export type AppConfig = typeof appConfig;
