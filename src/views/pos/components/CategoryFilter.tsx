'use client';

import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/views/shared/ui/select';
import { Loader2 } from 'lucide-react';
import { readAllRecords } from '@/lib/data-batching/offlineDb';
import type { OfflineCategory } from '@/lib/data-batching/offlineDb';

/**
 * CategoryFilter Component - OFFLINE-FIRST
 * 
 * Dropdown select component for category filtering.
 * Reads categories from IndexedDB for instant offline support.
 * 
 * Features:
 * - Dropdown select for category filtering
 * - Reads from IndexedDB (offline-first)
 * - Display categories with product counts
 * - Support for "All Categories" option
 * - Compact design that saves space
 * - Accessible dropdown interface
 * 
 * @component
 */

// Use OfflineCategory from IndexedDB schema
type Category = OfflineCategory;

interface CategoryFilterProps {
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  showProductCount?: boolean;
  productCountPerCategory?: Record<string, number>;
}

export default function CategoryFilter({
  selectedCategoryId,
  onCategoryChange,
  showProductCount = false,
  productCountPerCategory = {},
}: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch categories from IndexedDB - OFFLINE-FIRST
   * ALWAYS reads from IndexedDB, never blocks on API calls
   * DataBatchingService handles background sync automatically
   */
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('💾 [CategoryFilter] Reading categories from IndexedDB (offline-first)...');
      
      // Read from IndexedDB (local cache)
      const cachedCategories = await readAllRecords('categories');
      
      if (cachedCategories.length === 0) {
        console.warn('⚠️ [CategoryFilter] No categories in cache - waiting for sync');
        setError('Categories are syncing...');
      } else {
        // Sort by display order (if available) or name
        const sortedCategories = cachedCategories.sort((a, b) => {
          if (a.sort_order !== undefined && b.sort_order !== undefined) {
            return a.sort_order - b.sort_order;
          }
          return a.name.localeCompare(b.name);
        });
        
        setCategories(sortedCategories);
        console.log(`✅ [CategoryFilter] Loaded ${sortedCategories.length} categories from cache`);
      }
    } catch (err) {
      console.error('❌ [CategoryFilter] Error reading categories from IndexedDB:', err);
      setError('Failed to load categories from cache');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get display value for selected category
   */
  const getDisplayValue = () => {
    if (!selectedCategoryId) {
      const count = productCountPerCategory['all'];
      return showProductCount && count !== undefined
        ? `All Categories (${count})`
        : 'All Categories';
    }

    const category = categories.find((c) => c.id === selectedCategoryId);
    if (!category) return 'Select category...';

    const count = productCountPerCategory[category.id];
    return showProductCount && count !== undefined
      ? `${category.name} (${count})`
      : category.name;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading categories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-2 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <Select
      value={selectedCategoryId || 'all'}
      onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          {getDisplayValue()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* All Categories Option */}
        <SelectItem value="all">
          All Categories
          {showProductCount && productCountPerCategory['all'] !== undefined && (
            <span className="ml-2 text-xs text-gray-500">
              ({productCountPerCategory['all']})
            </span>
          )}
        </SelectItem>

        {/* Category Options */}
        {categories.map((category) => {
          const productCount = productCountPerCategory[category.id];
          return (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
              {showProductCount && productCount !== undefined && (
                <span className="ml-2 text-xs text-gray-500">
                  ({productCount})
                </span>
              )}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
