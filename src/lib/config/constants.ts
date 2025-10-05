/**
 * Application Constants
 * Immutable values used throughout the application
 */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  POS: '/pos',
  KITCHEN: '/kitchen',
  BARTENDER: '/bartender',
  TABLES: '/tables',
  INVENTORY: '/inventory',
  CUSTOMERS: '/customers',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const;

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    SESSION: '/api/auth/session',
  },
  ORDERS: {
    BASE: '/api/orders',
    ACTIVE: '/api/orders/active',
    BY_ID: (id: string) => `/api/orders/${id}`,
    VOID: (id: string) => `/api/orders/${id}/void`,
  },
  PRODUCTS: {
    BASE: '/api/products',
    SEARCH: '/api/products/search',
    BY_ID: (id: string) => `/api/products/${id}`,
  },
  CUSTOMERS: {
    BASE: '/api/customers',
    SEARCH: '/api/customers/search',
    BY_ID: (id: string) => `/api/customers/${id}`,
  },
  TABLES: {
    BASE: '/api/tables',
    BY_ID: (id: string) => `/api/tables/${id}`,
    STATUS: '/api/tables/status',
  },
  KITCHEN: {
    ORDERS: '/api/kitchen/orders',
    STATUS: (id: string) => `/api/kitchen/orders/${id}/status`,
  },
} as const;

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'beerhive_auth_token',
  USER_PREFERENCES: 'beerhive_user_prefs',
  CART: 'beerhive_cart',
} as const;

export const MESSAGES = {
  ERROR: {
    GENERIC: 'An error occurred. Please try again.',
    NETWORK: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    NOT_FOUND: 'Resource not found.',
  },
  SUCCESS: {
    CREATED: 'Created successfully.',
    UPDATED: 'Updated successfully.',
    DELETED: 'Deleted successfully.',
  },
} as const;
