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

/**
 * CategoryFilter Component
 * 
 * Dropdown select component for category filtering.
 * Provides a compact and accessible way to filter products by category.
 * 
 * Features:
 * - Dropdown select for category filtering
 * - Fetch categories from the database
 * - Display categories with product counts
 * - Support for "All Categories" option
 * - Compact design that saves space
 * - Accessible dropdown interface
 * 
 * @component
 */

interface Category {
  id: string;
  name: string;
  color_code?: string;
  display_order: number;
  description?: string;
}

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
   * Fetch categories from the API
   */
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/categories');
      const result = await response.json();

      if (result.success) {
        setCategories(result.data || []);
      } else {
        setError(result.error || 'Failed to load categories');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
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
