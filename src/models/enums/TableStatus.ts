/**
 * Table Status Enumeration
 * Defines the availability states of restaurant tables
 */
export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning',
}

export type TableStatusType = `${TableStatus}`;
