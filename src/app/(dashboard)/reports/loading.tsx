/**
 * Loading Component for Reports Module
 * Displays a skeleton loader that matches the Reports dashboard
 * Provides immediate visual feedback while Reports module loads
 */
import { LoadingSkeleton, CardSkeleton } from '@/components/loading/LoadingSkeleton';

/**
 * Reports Loading State
 * Mimics the reports dashboard layout with charts and metrics
 */
export default function Loading() {
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <LoadingSkeleton className="h-10 w-40" />
          <LoadingSkeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
            <LoadingSkeleton className="h-4 w-32 mb-2" />
            <LoadingSkeleton className="h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <CardSkeleton />
    </div>
  );
}
