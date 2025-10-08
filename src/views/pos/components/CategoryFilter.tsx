'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { Loader2 } from 'lucide-react';

/**
 * CategoryFilter Component
 * Displays category filter buttons for product selection
 * 
 * Features:
 * - Fetch categories from the database
 * - Display categories with color coding
 * - Support for "All" option
 * - Active state management
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
   * Get button style based on category color
   */
  const getCategoryButtonStyle = (category: Category, isSelected: boolean) => {
    if (!category.color_code) {
      return isSelected ? 'default' : 'outline';
    }

    if (isSelected) {
      return {
        backgroundColor: category.color_code,
        color: '#ffffff',
        borderColor: category.color_code,
      };
    }

    return {
      backgroundColor: 'transparent',
      color: category.color_code,
      borderColor: category.color_code,
    };
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
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
      {/* All Categories Button */}
      <Button
        size="sm"
        variant={selectedCategoryId === null ? 'default' : 'outline'}
        onClick={() => onCategoryChange(null)}
        className="flex-shrink-0"
      >
        All
        {showProductCount && productCountPerCategory['all'] !== undefined && (
          <Badge className="ml-2 bg-gray-200 text-gray-700">
            {productCountPerCategory['all']}
          </Badge>
        )}
      </Button>

      {/* Category Buttons */}
      {categories.map((category) => {
        const isSelected = selectedCategoryId === category.id;
        const buttonStyle = getCategoryButtonStyle(category, isSelected);
        const productCount = productCountPerCategory[category.id];

        return (
          <Button
            key={category.id}
            size="sm"
            variant={typeof buttonStyle === 'string' ? buttonStyle : 'outline'}
            style={typeof buttonStyle === 'object' ? buttonStyle : undefined}
            onClick={() => onCategoryChange(category.id)}
            className="flex-shrink-0 flex items-center gap-2"
            title={category.description}
          >
            {category.name}
            {showProductCount && productCount !== undefined && (
              <Badge 
                className="ml-1" 
                style={{
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                  color: isSelected ? '#ffffff' : 'inherit'
                }}
              >
                {productCount}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}
