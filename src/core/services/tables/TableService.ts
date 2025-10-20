import { TableRepository } from '@/data/repositories/TableRepository';
import { Table } from '@/models/entities/Table';
import { TableStatus } from '@/models/enums/TableStatus';
import { AppError } from '@/lib/errors/AppError';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/models/database.types';

/**
 * TableService
 * Business logic for table management
 */
export class TableService {
  /**
   * Get all tables grouped by area
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getTablesByArea(client?: SupabaseClient<Database>) {
    try {
      const tables = await TableRepository.getAll(client);
      
      // Group by area
      const grouped = tables.reduce((acc, table) => {
        const area = table.area || 'General';
        if (!acc[area]) {
          acc[area] = [];
        }
        acc[area].push(table);
        return acc;
      }, {} as Record<string, Table[]>);

      return grouped;
    } catch (error) {
      console.error('Get tables by area error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get tables', 500);
    }
  }

  /**
   * Get table availability summary
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getAvailabilitySummary(client?: SupabaseClient<Database>) {
    try {
      const tables = await TableRepository.getAll(client);
      
      const summary = {
        total: tables.length,
        available: tables.filter(t => t.status === TableStatus.AVAILABLE).length,
        occupied: tables.filter(t => t.status === TableStatus.OCCUPIED).length,
        reserved: tables.filter(t => t.status === TableStatus.RESERVED).length,
        cleaning: tables.filter(t => t.status === TableStatus.CLEANING).length,
      };

      return summary;
    } catch (error) {
      console.error('Get availability summary error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get availability summary', 500);
    }
  }

  /**
   * Find available table by capacity
   * @param requiredCapacity - Minimum required capacity
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async findAvailableByCapacity(requiredCapacity: number, client?: SupabaseClient<Database>): Promise<Table | null> {
    try {
      const availableTables = await TableRepository.getByStatus(TableStatus.AVAILABLE, client);
      
      // Find table with capacity >= required, prefer smallest suitable table
      const suitable = availableTables
        .filter(t => t.capacity >= requiredCapacity)
        .sort((a, b) => a.capacity - b.capacity);

      return suitable[0] || null;
    } catch (error) {
      console.error('Find available table error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to find available table', 500);
    }
  }

  /**
   * Occupy table (assign order)
   * Can occupy both AVAILABLE and RESERVED tables
   * Reserved tables are occupied when the customer with reservation arrives to order
   */
  static async occupyTable(tableId: string, orderId: string, client?: SupabaseClient<Database>): Promise<Table> {
    try {
      const table = await TableRepository.getById(tableId, client);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }

      // Allow occupying both available and reserved tables
      if (table.status !== TableStatus.AVAILABLE && table.status !== TableStatus.RESERVED) {
        throw new AppError(`Table is ${table.status} and cannot be occupied`, 400);
      }

      return await TableRepository.assignOrder(tableId, orderId);
    } catch (error) {
      console.error('Occupy table error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to occupy table', 500);
    }
  }

  /**
   * Release table after order completion
   */
  static async releaseTable(tableId: string, client?: SupabaseClient<Database>): Promise<Table> {
    try {
      const table = await TableRepository.getById(tableId, client);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }

      // Set to cleaning first, then frontend can mark as available
      const released = await TableRepository.updateStatus(tableId, TableStatus.CLEANING, client);
      
      // Clear order reference
      return await TableRepository.releaseTable(tableId);
    } catch (error) {
      console.error('Release table error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to release table', 500);
    }
  }

  /**
   * Mark table as cleaned and available
   */
  static async markCleaned(tableId: string, client?: SupabaseClient<Database>): Promise<Table> {
    try {
      return await TableRepository.updateStatus(tableId, TableStatus.AVAILABLE, client);
    } catch (error) {
      console.error('Mark table cleaned error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to mark table as cleaned', 500);
    }
  }

  /**
   * Reserve table
   */
  static async reserveTable(tableId: string, notes?: string, client?: SupabaseClient<Database>): Promise<Table> {
    try {
      const table = await TableRepository.getById(tableId, client);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }

      if (table.status !== TableStatus.AVAILABLE) {
        throw new AppError(`Table is ${table.status} and cannot be reserved`, 400);
      }

      const updates: Partial<Table> = {
        status: TableStatus.RESERVED,
      };

      if (notes) {
        updates.notes = notes;
      }

      return await TableRepository.update(tableId, updates);
    } catch (error) {
      console.error('Reserve table error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to reserve table', 500);
    }
  }

  /**
   * Cancel table reservation
   */
  static async cancelReservation(tableId: string, client?: SupabaseClient<Database>): Promise<Table> {
    try {
      const table = await TableRepository.getById(tableId, client);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }

      if (table.status !== TableStatus.RESERVED) {
        throw new AppError('Table is not reserved', 400);
      }

      return await TableRepository.updateStatus(tableId, TableStatus.AVAILABLE, client);
    } catch (error) {
      console.error('Cancel reservation error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to cancel reservation', 500);
    }
  }

  /**
   * Update table details (table number, capacity, area, notes)
   * Validates business rules before updating
   * 
   * @param tableId - Table ID to update
   * @param updates - Fields to update (table_number, capacity, area, notes)
   * @param client - Optional Supabase client instance (for server-side usage)
   * @returns Updated table
   * 
   * @throws AppError if table not found
   * @throws AppError if validation fails
   * @throws AppError if table_number already exists
   * 
   * @remarks
   * - Table number can be changed even if table is occupied
   * - Capacity must be between 1 and 50
   * - Cannot change to a table_number that already exists
   * - Area can be set to null/empty for general area
   */
  static async updateTableDetails(
    tableId: string, 
    updates: {
      table_number?: string;
      capacity?: number;
      area?: string | null;
      notes?: string | null;
    },
    client?: SupabaseClient<Database>
  ): Promise<Table> {
    try {
      // Fetch existing table
      const table = await TableRepository.getById(tableId, client);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }

      // Validate table_number if provided
      if (updates.table_number !== undefined) {
        const trimmedNumber = updates.table_number.trim();
        
        if (!trimmedNumber) {
          throw new AppError('Table number cannot be empty', 400);
        }

        if (!/^[a-zA-Z0-9\s-]+$/.test(trimmedNumber)) {
          throw new AppError('Table number can only contain letters, numbers, spaces, and hyphens', 400);
        }

        // Check if table_number already exists (excluding current table)
        if (trimmedNumber !== table.table_number) {
          const existingTable = await TableRepository.getByTableNumber(trimmedNumber, client);
          if (existingTable && existingTable.id !== tableId) {
            throw new AppError(`Table number '${trimmedNumber}' already exists`, 409);
          }
        }

        updates.table_number = trimmedNumber;
      }

      // Validate capacity if provided
      if (updates.capacity !== undefined) {
        if (updates.capacity < 1) {
          throw new AppError('Capacity must be at least 1', 400);
        }

        if (updates.capacity > 50) {
          throw new AppError('Capacity cannot exceed 50 persons', 400);
        }
      }

      // Sanitize area (empty string becomes null)
      if (updates.area !== undefined) {
        updates.area = updates.area?.trim() || null;
      }

      // Sanitize notes (empty string becomes null)
      if (updates.notes !== undefined) {
        updates.notes = updates.notes?.trim() || null;
      }

      // Update table using repository
      return await TableRepository.update(tableId, updates);
    } catch (error) {
      console.error('Update table details error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update table', 500);
    }
  }
}
