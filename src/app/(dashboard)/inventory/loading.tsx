/**
 * Loading Component for Inventory Module
 * Displays a skeleton loader that matches the Inventory dashboard layout
 * Provides immediate visual feedback while Inventory module loads
 */
import { LoadingSkeleton, TableSkeleton } from '@/components/loading/LoadingSkeleton';

/**
 * Inventory Loading State
 * Mimics the inventory dashboard layout with table and controls
 */
export default function Loading() {
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <LoadingSkeleton className="h-10 w-32" />
          <LoadingSkeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex gap-4">
          <LoadingSkeleton className="h-10 flex-1" />
          <LoadingSkeleton className="h-10 w-40" />
          <LoadingSkeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Inventory Table */}
      <TableSkeleton rows={10} />
    </div>
  );
}
