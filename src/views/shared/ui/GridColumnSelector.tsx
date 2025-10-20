'use client';

import React from 'react';

/**
 * GridColumnSelector Component
 * 
 * Visual dot-based selector for choosing grid column count.
 * Provides an intuitive interface for users to adjust product grid layout.
 * 
 * Features:
 * - Dot-based visual design (1 dot = 3 cols, 2 dots = 4 cols, etc.)
 * - Hover states and tooltips
 * - Active state indication
 * - Accessible and keyboard-friendly
 * - Responsive design
 * 
 * @component
 */

export interface GridColumnSelectorProps {
  /** Currently selected number of columns */
  columns: number;
  /** Callback when column count changes */
  onColumnsChange: (columns: number) => void;
  /** Optional className for styling */
  className?: string;
}

const COLUMN_OPTIONS = [
  { value: 3, label: '3 Columns', dots: 3 },
  { value: 4, label: '4 Columns', dots: 4 },
  { value: 5, label: '5 Columns', dots: 5 },
  { value: 6, label: '6 Columns', dots: 6 },
] as const;

export function GridColumnSelector({
  columns,
  onColumnsChange,
  className = '',
}: GridColumnSelectorProps) {
  // Find current option and calculate next option
  const currentIndex = COLUMN_OPTIONS.findIndex((opt) => opt.value === columns);
  const currentOption = COLUMN_OPTIONS[currentIndex] || COLUMN_OPTIONS[2]; // Default to 5 columns
  
  // Cycle to next size on click
  const handleCycle = () => {
    const nextIndex = (currentIndex + 1) % COLUMN_OPTIONS.length;
    onColumnsChange(COLUMN_OPTIONS[nextIndex].value);
  };
  
  // Calculate dot layout based on column count
  const getDotLayout = (count: number) => {
    if (count === 3) {
      // Single row of 3 dots
      return { rows: [3] };
    } else if (count === 4) {
      // Two rows of 2 dots each (2x2 grid)
      return { rows: [2, 2] };
    } else if (count === 5) {
      // Two rows: 3 on top, 2 on bottom
      return { rows: [3, 2] };
    } else if (count === 6) {
      // Two rows of 3 dots each (3x2 grid)
      return { rows: [3, 3] };
    }
    return { rows: [count] };
  };
  
  const layout = getDotLayout(currentOption.dots);
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Single Cycling Button */}
      <button
        type="button"
        onClick={handleCycle}
        className="
          group relative px-3 py-1.5 rounded-md
          bg-white border border-gray-300 hover:border-blue-400 hover:bg-blue-50
          transition-all duration-200 shadow-sm
          active:scale-95 hover:shadow-md
        "
        title={`${currentOption.label} - Click to cycle`}
        aria-label={`Grid layout: ${currentOption.label}. Click to change.`}
      >
        {/* Dots in grid layout */}
        <div className="flex flex-col gap-1 transition-all duration-300 ease-in-out">
          {layout.rows.map((dotsInRow, rowIndex) => (
            <div 
              key={`row-${rowIndex}-${currentOption.value}`} 
              className="flex items-center gap-0.5 justify-center"
            >
              {Array.from({ length: dotsInRow }).map((_, dotIndex) => (
                <span
                  key={`dot-${rowIndex}-${dotIndex}-${currentOption.value}`}
                  className="
                    w-1.5 h-1.5 rounded-full bg-blue-600 
                    transition-all duration-200 ease-in-out
                    transform hover:scale-110
                  "
                />
              ))}
            </div>
          ))}
        </div>
        
        {/* Tooltip on hover */}
        <span className="
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
          px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded
          opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity
          whitespace-nowrap z-10
        ">
          {currentOption.label}
          <span className="
            absolute top-full left-1/2 transform -translate-x-1/2
            border-4 border-transparent border-t-gray-900
          "></span>
        </span>
      </button>
    </div>
  );
}

export default GridColumnSelector;
