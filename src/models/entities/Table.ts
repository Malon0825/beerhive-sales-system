import { TableStatus } from '../enums/TableStatus';

/**
 * Restaurant Table Entity
 * Represents a physical table in the restaurant
 */
export interface RestaurantTable {
  id: string;
  table_number: string;
  area: string | null;
  capacity: number;
  status: TableStatus;
  current_order_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Type alias for convenience
export type Table = RestaurantTable;

export interface CreateTableInput {
  table_number: string;
  area?: string;
  capacity?: number;
  notes?: string;
}

export interface UpdateTableInput {
  area?: string;
  capacity?: number;
  status?: TableStatus;
  notes?: string;
  is_active?: boolean;
}
