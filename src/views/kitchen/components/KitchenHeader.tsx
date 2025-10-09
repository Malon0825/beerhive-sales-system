import { RefreshCw } from 'lucide-react';

interface KitchenHeaderProps {
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

/**
 * KitchenHeader Component
 * Displays kitchen dashboard header with status summary and refresh button
 * Optimized for phone and tablet screens with responsive layout
 * 
 * @param pendingCount - Number of pending orders
 * @param preparingCount - Number of orders being prepared
 * @param readyCount - Number of ready orders
 * @param onRefresh - Callback when refresh button is clicked
 * @param isRefreshing - Whether data is currently refreshing
 */
export function KitchenHeader({
  pendingCount,
  preparingCount,
  readyCount,
  onRefresh,
  isRefreshing = false,
}: KitchenHeaderProps) {
  return (
    <div className="bg-white shadow-md p-2 sm:p-4 sticky top-0 z-10">
      {/* Mobile Layout: Stack vertically */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* Title and Refresh Button Row */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Kitchen Display</h1>
            <p className="text-xs text-gray-600">
              {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
        
        {/* Status Summary - Compact Mobile View */}
        <div className="flex justify-around gap-2 bg-gray-50 rounded p-2">
          <div className="text-center flex-1">
            <p className="text-xs text-gray-600">Pending</p>
            <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-gray-600">Preparing</p>
            <p className="text-xl font-bold text-blue-600">{preparingCount}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-gray-600">Ready</p>
            <p className="text-xl font-bold text-green-600">{readyCount}</p>
          </div>
        </div>
      </div>

      {/* Tablet and Desktop Layout: Horizontal */}
      <div className="hidden md:flex justify-between items-center">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Kitchen Display</h1>
          <p className="text-xs lg:text-sm text-gray-600">
            {new Date().toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Status Summary */}
        <div className="flex gap-3 lg:gap-4">
          <div className="text-center">
            <p className="text-xs lg:text-sm text-gray-600">Pending</p>
            <p className="text-xl lg:text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="text-center">
            <p className="text-xs lg:text-sm text-gray-600">Preparing</p>
            <p className="text-xl lg:text-2xl font-bold text-blue-600">{preparingCount}</p>
          </div>
          <div className="text-center">
            <p className="text-xs lg:text-sm text-gray-600">Ready</p>
            <p className="text-xl lg:text-2xl font-bold text-green-600">{readyCount}</p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="bg-blue-600 text-white px-3 lg:px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`h-4 lg:h-5 w-4 lg:w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm lg:text-base">Refresh</span>
        </button>
      </div>
    </div>
  );
}
