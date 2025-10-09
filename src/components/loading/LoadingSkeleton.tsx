/**
 * LoadingSkeleton Component
 * Reusable skeleton loading component for various UI elements
 * Used to provide visual feedback while content is loading
 */
import React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Props for the LoadingSkeleton component
 */
interface LoadingSkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Skeleton variant type */
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  /** Number of skeleton items to render (for repeated patterns) */
  count?: number;
}

/**
 * LoadingSkeleton Component
 * Displays an animated skeleton placeholder
 * 
 * @param {LoadingSkeletonProps} props - Component props
 */
export function LoadingSkeleton({ 
  className, 
  variant = 'rectangular',
  count = 1 
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    card: 'rounded-lg h-40',
  };

  const skeletonElement = (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading..."
    />
  );

  if (count === 1) {
    return skeletonElement;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>{skeletonElement}</React.Fragment>
      ))}
    </>
  );
}

/**
 * CardSkeleton Component
 * Pre-configured skeleton for card layouts
 */
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
      <LoadingSkeleton className="h-6 w-3/4" />
      <LoadingSkeleton className="h-4 w-full" count={3} />
      <div className="flex gap-2 mt-4">
        <LoadingSkeleton className="h-10 w-24" />
        <LoadingSkeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * TableSkeleton Component
 * Pre-configured skeleton for table layouts
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      {/* Header */}
      <div className="border-b p-4">
        <LoadingSkeleton className="h-6 w-48" />
      </div>
      
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="p-4 flex gap-4">
            <LoadingSkeleton className="h-4 w-1/4" />
            <LoadingSkeleton className="h-4 w-1/4" />
            <LoadingSkeleton className="h-4 w-1/4" />
            <LoadingSkeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * GridSkeleton Component
 * Pre-configured skeleton for grid layouts (e.g., product cards)
 */
export function GridSkeleton({ columns = 4, rows = 3 }: { columns?: number; rows?: number }) {
  const totalItems = columns * rows;
  
  return (
    <div 
      className={cn(
        'grid gap-4',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
        columns === 6 && 'grid-cols-6'
      )}
    >
      {Array.from({ length: totalItems }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * DashboardSkeleton Component
 * Pre-configured skeleton for dashboard layouts
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-8 w-64" />
        <LoadingSkeleton className="h-10 w-32" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-white p-6 shadow-sm">
            <LoadingSkeleton className="h-4 w-24 mb-2" />
            <LoadingSkeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
