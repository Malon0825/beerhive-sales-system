'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * CategoryFilter Component
 * 
 * Horizontal slider with category filter buttons for product selection.
 * Designed to handle many categories efficiently with smooth scrolling.
 * 
 * Features:
 * - Horizontal scrollable slider with navigation arrows
 * - Fetch categories from the database
 * - Display categories with color coding
 * - Support for "All" option
 * - Active state management
 * - Responsive design (mobile to desktop)
 * - Smooth scroll behavior
 * - Navigation arrows appear/disappear based on scroll position
 * - Touch/swipe support for mobile devices
 * - Optimized for screens with many categories
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Touch state for swipe gestures on mobile/tablet
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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
   * Check scroll position and update arrow visibility
   */
  const checkScrollPosition = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

    // Apply small thresholds to avoid flickering of arrows near edges
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  /**
   * Update arrow visibility when categories load
   */
  useEffect(() => {
    const handleResize = () => {
      // Delay to ensure the layout has updated before measuring
      setTimeout(checkScrollPosition, 100);
    };

    checkScrollPosition();

    // Add resize and orientation change listeners for responsive behavior
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [categories, checkScrollPosition]);

  /**
   * Scroll left by visible width
   */
  /**
   * Scroll left by a responsive portion of visible width
   * - Mobile: 90% of container width for fewer taps
   * - Desktop: 75% of container width for finer control
   */
  const scrollLeft = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const isMobile = window.innerWidth < 768;
    const scrollAmount = scrollContainerRef.current.clientWidth * (isMobile ? 0.9 : 0.75);
    scrollContainerRef.current.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  /**
   * Scroll right by visible width
   */
  /**
   * Scroll right by a responsive portion of visible width
   * - Mobile: 90% of container width for fewer taps
   * - Desktop: 75% of container width for finer control
   */
  const scrollRight = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const isMobile = window.innerWidth < 768;
    const scrollAmount = scrollContainerRef.current.clientWidth * (isMobile ? 0.9 : 0.75);
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  /**
   * Handle touch start for swipe gestures
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  /**
   * Handle touch move for swipe gestures
   */
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  /**
   * Handle touch end to detect swipe and trigger scroll
   * Minimum swipe distance: 50px
   */
  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    // Swipe left = scroll right, swipe right = scroll left
    if (isLeftSwipe && canScrollRight) {
      scrollRight();
    }
    if (isRightSwipe && canScrollLeft) {
      scrollLeft();
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

  // Wrapper uses overflow-hidden and isolate to ensure absolute elements (arrows/gradients)
  // never cause page-level horizontal overflow or overlap with adjacent content.
  return (
    <div className="relative w-full max-w-full min-w-0 overflow-hidden isolate">
      {/* Left Fade Gradient - matches the amber gradient background */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-amber-50 via-amber-50 to-transparent z-10 pointer-events-none" />
      )}

      {/* Left Navigation Arrow */}
      {canScrollLeft && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 pl-1">
          <Button
            variant="ghost"
            onClick={scrollLeft}
            className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 p-0 rounded-full bg-white shadow-lg hover:bg-gray-50 border border-gray-200 active:scale-90"
            style={{ touchAction: 'manipulation' }}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
          </Button>
        </div>
      )}

      {/* Scrollable Category Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScrollPosition}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide scroll-smooth py-2 w-full min-w-0 max-w-full"
        style={{
          // Hide scrollbar but keep functionality
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          // Prevent viewport from horizontally scrolling when this container scrolls
          overscrollBehaviorX: 'contain',
          touchAction: 'manipulation',
          paddingLeft: canScrollLeft ? '2.5rem' : '0.25rem',
          paddingRight: canScrollRight ? '2.5rem' : '0.25rem',
        }}
      >
        {/* All Categories Button */}
        <Button
          size="sm"
          variant={selectedCategoryId === null ? 'default' : 'outline'}
          onClick={() => onCategoryChange(null)}
          className={`
            flex-shrink-0 
            ${selectedCategoryId === null ? 'bg-amber-600 hover:bg-amber-700' : ''}
            text-xs sm:text-sm md:text-base
            px-3 sm:px-4 md:px-5
            h-8 sm:h-9 md:h-10
            active:scale-95
          `}
          style={{ touchAction: 'manipulation' }}
        >
          <span>All</span>
          {showProductCount && productCountPerCategory['all'] !== undefined && (
            <Badge className="ml-1.5 text-xs px-1.5 py-0.5 bg-opacity-20">
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
              style={typeof buttonStyle === 'object' ? { ...buttonStyle, touchAction: 'manipulation' } : { touchAction: 'manipulation' }}
              onClick={() => onCategoryChange(category.id)}
              className={`
                flex-shrink-0 flex items-center gap-1.5
                text-xs sm:text-sm md:text-base
                px-3 sm:px-4 md:px-5
                h-8 sm:h-9 md:h-10
                transition-all duration-200 active:scale-95
              `}
              title={category.description}
            >
              <span className="whitespace-nowrap">{category.name}</span>
              {showProductCount && productCount !== undefined && (
                <Badge 
                  className="text-xs px-1.5 py-0.5" 
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

      {/* Right Fade Gradient - matches the amber gradient background */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-orange-50 via-orange-50 to-transparent z-10 pointer-events-none" />
      )}

      {/* Right Navigation Arrow */}
      {canScrollRight && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 pr-1">
          <Button
            variant="ghost"
            onClick={scrollRight}
            className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 p-0 rounded-full bg-white shadow-lg hover:bg-gray-50 border border-gray-200 touch-manipulation active:scale-90"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
          </Button>
        </div>
      )}
    </div>
  );
}
