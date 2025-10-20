'use client';

import React, { useState, useEffect } from 'react';
import { Table } from '@/models/entities/Table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../shared/ui/dialog';
import { Input } from '../shared/ui/input';
import { Button } from '../shared/ui/button';
import { Label } from '../shared/ui/label';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/data/supabase/client';

interface EditTableDialogProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    tableId: string,
    tableData: {
      table_number: string;
      capacity: number;
      area?: string;
      notes?: string;
    }
  ) => Promise<void>;
}

/**
 * EditTableDialog Component
 * Dialog for editing an existing table's details
 * 
 * Features:
 * - Pre-populated with current table data
 * - Table number input (required, must be unique)
 * - Capacity input (required, 1-50)
 * - Area selection (optional)
 * - Notes field (optional)
 * - Validation before submission
 * 
 * Frontend Integration:
 * - Called with table object to edit
 * - Validates input client-side before API call
 * - Returns updated table data via onConfirm callback
 * - Handles errors and displays to user
 */
export default function EditTableDialog({ table, isOpen, onClose, onConfirm }: EditTableDialogProps) {
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [area, setArea] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [existingAreas, setExistingAreas] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Predefined area options (same as AddTableDialog for consistency)
   */
  const areaOptions = [
    { value: '', label: 'General (No specific area)' },
    { value: 'indoor', label: 'Indoor' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'vip', label: 'VIP Section' },
    { value: 'bar', label: 'Bar Area' },
    { value: 'patio', label: 'Patio' },
    { value: 'terrace', label: 'Terrace' },
    { value: '__custom__', label: '+ Create New Area' },
  ];

  /**
   * Fetch existing areas from database when dialog opens
   */
  useEffect(() => {
    if (isOpen) {
      fetchExistingAreas();
    }
  }, [isOpen]);

  /**
   * Fetch all unique areas from existing tables
   */
  const fetchExistingAreas = async () => {
    try {
      const { data: tables, error } = await supabase
        .from('restaurant_tables')
        .select('area')
        .not('area', 'is', null);

      if (error) throw error;

      // Get unique areas (case-insensitive)
      const uniqueAreas = Array.from(
        new Set(
          tables
            ?.map((t) => t.area?.toLowerCase().trim())
            .filter((area): area is string => Boolean(area))
        )
      );

      setExistingAreas(uniqueAreas);
    } catch (err) {
      console.error('Error fetching areas:', err);
      // Non-critical error, continue with empty list
      setExistingAreas([]);
    }
  };

  /**
   * Populate form fields when table changes
   * Reset form when dialog opens with a new table
   */
  useEffect(() => {
    if (table && isOpen) {
      setTableNumber(table.table_number || '');
      setCapacity(table.capacity?.toString() || '');
      
      // Check if current area is a predefined option or custom
      const currentArea = table.area || '';
      const isPredefined = areaOptions.some(opt => opt.value === currentArea);
      
      if (isPredefined || !currentArea) {
        setArea(currentArea);
        setCustomArea('');
      } else {
        // Existing area is custom - set to custom mode
        setArea('__custom__');
        setCustomArea(currentArea);
      }
      
      setNotes(table.notes || '');
      setError(null);
    }
  }, [table, isOpen]);

  /**
   * Validate form inputs
   * @returns Error message or null if valid
   */
  const validateForm = (): string | null => {
    if (!tableNumber.trim()) {
      return 'Table number is required';
    }

    if (!/^[a-zA-Z0-9\s-]+$/.test(tableNumber.trim())) {
      return 'Table number can only contain letters, numbers, spaces, and hyphens';
    }

    const capacityNum = parseInt(capacity);
    if (!capacity || isNaN(capacityNum) || capacityNum < 1) {
      return 'Capacity must be at least 1';
    }

    if (capacityNum > 50) {
      return 'Capacity cannot exceed 50 persons';
    }

    // Validate custom area if selected
    if (area === '__custom__') {
      const trimmedCustomArea = customArea.trim();
      
      if (!trimmedCustomArea) {
        return 'Custom area name is required';
      }

      if (!/^[a-zA-Z0-9\s-]+$/.test(trimmedCustomArea)) {
        return 'Area name can only contain letters, numbers, spaces, and hyphens';
      }

      // Check for duplicate (case-insensitive)
      // Exclude current table's area if it's the same
      const normalizedCustomArea = trimmedCustomArea.toLowerCase();
      const currentTableArea = table?.area?.toLowerCase();
      
      if (normalizedCustomArea !== currentTableArea && existingAreas.includes(normalizedCustomArea)) {
        return `Area "${trimmedCustomArea}" already exists`;
      }

      // Check against predefined options (case-insensitive)
      const predefinedAreas = areaOptions
        .filter(opt => opt.value && opt.value !== '__custom__')
        .map(opt => opt.value.toLowerCase());
      
      if (predefinedAreas.includes(normalizedCustomArea)) {
        return `Area "${trimmedCustomArea}" already exists as a predefined option`;
      }
    }

    return null;
  };

  /**
   * Handle form submission
   * Validates input and calls API via onConfirm callback
   */
  const handleSubmit = async () => {
    if (!table) return;
    
    setError(null);

    // Validate
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);

      // Determine final area value
      let finalArea: string | undefined;
      if (area === '__custom__') {
        // Use custom area (normalized to lowercase for consistency)
        finalArea = customArea.trim().toLowerCase();
      } else if (area) {
        finalArea = area;
      }

      const tableData = {
        table_number: tableNumber.trim(),
        capacity: parseInt(capacity),
        area: finalArea,
        notes: notes.trim() || undefined,
      };

      await onConfirm(table.id, tableData);

      // Success - close dialog
      onClose();
    } catch (err: any) {
      console.error('Error updating table:', err);
      setError(err.message || 'Failed to update table');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle dialog close
   * Prevent closing while submitting
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Table</DialogTitle>
          <DialogDescription>
            Update table information. Changes will be reflected immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Table Number */}
          <div className="space-y-2">
            <Label htmlFor="tableNumber" className="required">
              Table Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="tableNumber"
              type="text"
              placeholder="e.g., 1, A1, VIP 1, Table 15"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Use a unique identifier (letters, numbers, spaces, and hyphens allowed)
            </p>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity">
              Capacity (Persons) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="50"
              placeholder="e.g., 4"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              Number of persons this table can accommodate
            </p>
          </div>

          {/* Area */}
          <div className="space-y-2">
            <Label htmlFor="area">Area (Optional)</Label>
            <select
              id="area"
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                if (e.target.value !== '__custom__') {
                  setCustomArea(''); // Reset custom area when changing selection
                }
              }}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {areaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            {/* Custom Area Input - Shows when "Create New Area" is selected */}
            {area === '__custom__' && (
              <div className="mt-2">
                <Input
                  id="customArea"
                  type="text"
                  placeholder="Enter new area name (e.g., Garden, Rooftop)"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Area name will be saved in lowercase for consistency
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="e.g., Near window, Corner table"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
