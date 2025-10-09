/**
 * Loading Component for POS Module
 * Displays a skeleton loader that matches the POS interface layout
 * Provides immediate visual feedback while POS module loads
 */
import { LoadingSkeleton } from '@/components/loading/LoadingSkeleton';

/**
 * POS Loading State
 * Mimics the actual POS interface layout for better perceived performance
 */
export default function Loading() {
  return (
    <div className="animate-in fade-in duration-300 h-full">
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Product Selection Area */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Search Bar */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <LoadingSkeleton className="h-10 w-full" />
          </div>
          
          {/* Category Filter */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex gap-2">
              <LoadingSkeleton className="h-9 w-24" count={6} />
            </div>
          </div>
          
          {/* Product Grid */}
          <div className="flex-1 bg-white rounded-lg p-4 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <LoadingSkeleton className="h-32 w-full" />
                  <LoadingSkeleton className="h-4 w-3/4" />
                  <LoadingSkeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Area */}
        <div className="w-[420px] flex-shrink-0">
          <div className="bg-white rounded-lg p-4 shadow-sm h-full flex flex-col">
            <LoadingSkeleton className="h-8 w-48 mb-4" />
            <div className="flex-1 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <LoadingSkeleton key={index} className="h-16 w-full" />
              ))}
            </div>
            <div className="pt-4 border-t space-y-3 mt-4">
              <LoadingSkeleton className="h-6 w-full" />
              <LoadingSkeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
