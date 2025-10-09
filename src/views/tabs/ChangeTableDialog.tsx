'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/views/shared/ui/dialog';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { AlertCircle, Check, Users, MapPin } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';

interface Table {
  id: string;
  table_number: string;
  capacity: number;
  area?: string;
  status: string;
  current_session_id?: string;
  is_active?: boolean;
}

interface ChangeTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  currentTableNumber: string;
  onSuccess: () => void;
}

/**
 * ChangeTableDialog Component
 * Allows staff to move a customer's tab to a different table
 * 
 * Features:
 * - Shows only available tables
 * - Displays table details (capacity, area)
 * - Prevents moving to occupied tables
 * - Updates session and table status
 * 
 * Use case: Customer requests to switch tables during their dining session
 */
export function ChangeTableDialog({
  open,
  onOpenChange,
  sessionId,
  currentTableNumber,
  onSuccess,
}: ChangeTableDialogProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  /**
   * Fetch available tables
   */
  useEffect(() => {
    if (open) {
      fetchAvailableTables();
    }
  }, [open]);

  const fetchAvailableTables = async () => {
    try {
      setIsFetching(true);
      const response = await fetch('/api/tables');
      const data = await response.json();

      if (data.success) {
        // Filter to show only available tables
        const availableTables = data.data.filter(
          (table: Table) => table.status === 'available' && table.is_active !== false
        );
        setTables(availableTables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available tables',
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
    }
  };

  /**
   * Handle table change
   */
  const handleChangeTable = async () => {
    if (!selectedTableId) {
      toast({
        title: 'No Table Selected',
        description: 'Please select a table to move to',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/order-sessions/${sessionId}/change-table`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newTableId: selectedTableId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newTable = tables.find((t) => t.id === selectedTableId);
        toast({
          title: 'Table Changed',
          description: `Customer moved to table ${newTable?.table_number}`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Failed to Change Table',
          description: data.error || 'An error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error changing table:', error);
      toast({
        title: 'Error',
        description: 'Failed to change table',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get area badge color
   */
  const getAreaColor = (area?: string) => {
    switch (area) {
      case 'indoor':
        return 'bg-blue-100 text-blue-700';
      case 'outdoor':
        return 'bg-green-100 text-green-700';
      case 'vip_section':
        return 'bg-purple-100 text-purple-700';
      case 'bar_area':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Change Table</DialogTitle>
          <DialogDescription>
            Select a new table to move this customer's tab from{' '}
            <span className="font-semibold">{currentTableNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isFetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading tables...</span>
            </div>
          ) : tables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">No Available Tables</p>
              <p className="text-sm text-gray-500 mt-1">
                All tables are currently occupied or inactive
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => setSelectedTableId(table.id)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${
                      selectedTableId === table.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Selection Indicator */}
                  {selectedTableId === table.id && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-blue-600 text-white rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  )}

                  {/* Table Number */}
                  <div className="text-center mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{table.table_number}</h3>
                  </div>

                  {/* Area Badge */}
                  {table.area && (
                    <div className="flex justify-center mb-2">
                      <Badge variant="outline" className={`text-xs ${getAreaColor(table.area)}`}>
                        <MapPin className="w-3 h-3 mr-1" />
                        {table.area.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}

                  {/* Capacity */}
                  <div className="flex items-center justify-center text-xs text-gray-600">
                    <Users className="w-3 h-3 mr-1" />
                    {table.capacity} seats
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleChangeTable}
            disabled={!selectedTableId || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Moving...
              </>
            ) : (
              'Change Table'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
