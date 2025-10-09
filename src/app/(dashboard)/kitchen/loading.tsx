/**
 * Loading Component for Kitchen Module
 * Displays a skeleton loader that matches the Kitchen order display
 * Provides immediate visual feedback while Kitchen module loads
 */
import { LoadingSkeleton, CardSkeleton } from '@/components/loading/LoadingSkeleton';

/**
 * Kitchen Loading State
 * Mimics the kitchen order board layout
 */
export default function Loading() {
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <LoadingSkeleton className="h-8 w-56" />
        <LoadingSkeleton className="h-10 w-32" />
      </div>

      {/* Order Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
