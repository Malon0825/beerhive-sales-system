'use client';

import React, { useState, useEffect } from 'react';
import { RestaurantTable } from '@/models/entities/Table';
import { TableStatus } from '@/models/enums/TableStatus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../shared/ui/dialog';
import { Button } from '../shared/ui/button';
import { Badge } from '../shared/ui/badge';
import { Armchair, Users, MapPin } from 'lucide-react';
import { supabase } from '@/data/supabase/client';

interface TableSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTable: (table: RestaurantTable) => void;
}

/**
 * TableSelector Component
 * Displays a grid of available tables for selection in the POS
 * Features:
 * - Visual grid layout with table status
 * - Filter by area (indoor, outdoor, VIP, bar)
 * - Color-coded status indicators
 * - Real-time availability updates via Supabase subscriptions
 */
export function TableSelector({ open, onOpenChange, onSelectTable }: TableSelectorProps) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  /**
   * Fetch all tables from API
   */
  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tables');
      const result = await response.json();

      if (result.success) {
        setTables(result.data);
      } else {
        console.error('Error fetching tables:', result.error);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load tables when dialog opens
   */
  useEffect(() => {
    if (open) {
      fetchTables();
    }
  }, [open]);

  /**
   * Set up real-time subscription for table status updates
   */
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel('pos_table_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_tables',
        },
        (payload) => {
          console.log('POS Table change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setTables((prev) => [...prev, payload.new as RestaurantTable]);
          } else if (payload.eventType === 'UPDATE') {
            setTables((prev) =>
              prev.map((table) =>
                table.id === payload.new.id ? (payload.new as RestaurantTable) : table
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTables((prev) =>
              prev.filter((table) => table.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  /**
   * Handle table selection
   * Allows selection of available and reserved tables
   * Reserved tables can be selected when the customer with reservation arrives to order
   */
  const handleSelectTable = (table: RestaurantTable) => {
    if (table.status !== 'available' && table.status !== 'reserved') {
      alert('This table is not available. Please select an available or reserved table.');
      return;
    }

    onSelectTable(table);
    onOpenChange(false);
  };

  /**
   * Get status badge configuration
   */
  const getStatusConfig = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return {
          color: 'bg-green-500 text-white hover:bg-green-600',
          label: 'Available',
          icon: '✓',
        };
      case 'occupied':
        return {
          color: 'bg-red-500 text-white',
          label: 'Occupied',
          icon: '✕',
        };
      case 'reserved':
        return {
          color: 'bg-yellow-500 text-white',
          label: 'Reserved',
          icon: '⏱',
        };
      case 'cleaning':
        return {
          color: 'bg-gray-400 text-white',
          label: 'Cleaning',
          icon: '🧹',
        };
      default:
        return {
          color: 'bg-gray-300 text-gray-700',
          label: 'Unknown',
          icon: '?',
        };
    }
  };

  /**
   * Filter tables by area
   */
  const filteredTables = selectedArea
    ? tables.filter((table) => table.area === selectedArea)
    : tables;

  /**
   * Get unique areas from tables
   */
  const areas = Array.from(new Set(tables.map((table) => table.area).filter(Boolean))) as string[];

  /**
   * Get statistics for display
   */
  const stats = {
    total: tables.length,
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Armchair className="h-5 w-5" />
            Select Table
          </DialogTitle>
          <DialogDescription>
            Choose an available or reserved table for this order. Green tables are available, yellow tables are reserved.
          </DialogDescription>
        </DialogHeader>

        {/* Statistics Bar */}
        <div className="grid grid-cols-4 gap-2 py-2 border-b">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <div className="text-xs text-gray-500">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.occupied}</div>
            <div className="text-xs text-gray-500">Occupied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.reserved}</div>
            <div className="text-xs text-gray-500">Reserved</div>
          </div>
        </div>

        {/* Area Filter */}
        {areas.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Filter by Area:</span>
            <Button
              variant={selectedArea === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedArea(null)}
            >
              All Areas
            </Button>
            {areas.map((area) => (
              <Button
                key={area}
                variant={selectedArea === area ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedArea(area)}
              >
                <MapPin className="h-3 w-3 mr-1" />
                {area}
              </Button>
            ))}
          </div>
        )}

        {/* Tables Grid */}
        <div className="py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading tables...</div>
          ) : filteredTables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tables found in this area
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredTables.map((table) => {
                const statusConfig = getStatusConfig(table.status);
                const isSelectable = table.status === 'available' || table.status === 'reserved';

                return (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    disabled={!isSelectable}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all
                      ${
                        table.status === 'available'
                          ? 'border-green-500 hover:border-green-600 hover:shadow-lg cursor-pointer'
                          : table.status === 'reserved'
                          ? 'border-yellow-500 hover:border-yellow-600 hover:shadow-lg cursor-pointer'
                          : 'border-gray-300 opacity-60 cursor-not-allowed'
                      }
                    `}
                  >
                    {/* Table Icon */}
                    <div className="flex flex-col items-center space-y-2">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold
                          ${statusConfig.color}
                        `}
                      >
                        {table.table_number}
                      </div>

                      {/* Table Info */}
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-700">
                          Table {table.table_number}
                        </div>
                        
                        {table.capacity && (
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mt-1">
                            <Users className="h-3 w-3" />
                            <span>{table.capacity}</span>
                          </div>
                        )}

                        {table.area && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {table.area}
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <Badge
                        className={`text-xs ${statusConfig.color}`}
                        variant={isSelectable ? 'default' : 'secondary'}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Visual indicator for selectable tables */}
                    {isSelectable && (
                      <div className={`absolute top-1 right-1 w-3 h-3 rounded-full animate-pulse ${
                        table.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="border-t pt-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Status Legend:</div>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Reserved</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span>Cleaning</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={fetchTables}
          >
            Refresh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
