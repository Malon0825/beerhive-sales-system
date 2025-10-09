/**
 * Loading Component for Current Orders Module
 * Displays a skeleton loader that matches the Current Orders display
 * Provides immediate visual feedback while Current Orders module loads
 */
import { LoadingSkeleton, TableSkeleton } from '@/components/loading/LoadingSkeleton';

/**
 * Current Orders Loading State
 * Mimics the current orders dashboard layout
 */
export default function Loading() {
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-8 w-56" />
        <div className="flex gap-2">
          <LoadingSkeleton className="h-10 w-32" />
          <LoadingSkeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
            <LoadingSkeleton className="h-4 w-24 mb-2" />
            <LoadingSkeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <TableSkeleton rows={8} />
    </div>
  );
}
