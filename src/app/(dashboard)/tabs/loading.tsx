/**
 * Loading Component for Tabs Module
 * Displays a skeleton loader that matches the Tab management interface
 * Provides immediate visual feedback while Tabs module loads
 */
import { LoadingSkeleton, GridSkeleton } from '@/components/loading/LoadingSkeleton';

/**
 * Tabs Loading State
 * Mimics the tab management dashboard layout
 */
export default function Loading() {
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-8 w-64" />
        <LoadingSkeleton className="h-10 w-32" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
            <LoadingSkeleton className="h-4 w-24 mb-2" />
            <LoadingSkeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Tab Grid */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <LoadingSkeleton className="h-6 w-48 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <LoadingSkeleton className="h-5 w-32" />
              <LoadingSkeleton className="h-4 w-full" count={2} />
              <div className="flex gap-2 pt-2">
                <LoadingSkeleton className="h-9 w-24" />
                <LoadingSkeleton className="h-9 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
