/**
 * Loading Component for Customers Module
 * Displays a skeleton loader that matches the Customers list layout
 * Provides immediate visual feedback while Customers module loads
 */
import { LoadingSkeleton, TableSkeleton } from '@/components/loading/LoadingSkeleton';

/**
 * Customers Loading State
 * Mimics the customers dashboard layout
 */
export default function Loading() {
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-10 w-40" />
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <LoadingSkeleton className="h-10 w-full max-w-md" />
      </div>

      {/* Customers Table */}
      <TableSkeleton rows={10} />
    </div>
  );
}
