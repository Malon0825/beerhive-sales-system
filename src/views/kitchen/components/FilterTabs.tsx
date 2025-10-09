import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';

interface FilterTabsProps {
  activeFilter: 'all' | KitchenOrderStatus;
  onFilterChange: (filter: 'all' | KitchenOrderStatus) => void;
  counts: {
    all: number;
    pending: number;
    preparing: number;
    ready: number;
  };
}

/**
 * FilterTabs Component
 * Displays filter tabs for kitchen order statuses
 * Optimized for phone screens with horizontal scrolling
 * 
 * @param activeFilter - Currently active filter
 * @param onFilterChange - Callback when filter changes
 * @param counts - Order counts for each status
 */
export function FilterTabs({ activeFilter, onFilterChange, counts }: FilterTabsProps) {
  /**
   * Get button styling based on active state
   * Unused helper kept for potential future use
   */
  const getButtonClass = (isActive: boolean, color: string = 'blue'): string => {
    if (isActive) {
      return `px-4 py-2 rounded bg-${color}-600 text-white`;
    }
    return 'px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition';
  };

  return (
    <div className="flex gap-2 mt-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
      <button
        onClick={() => onFilterChange('all')}
        className={`
          flex-shrink-0 px-3 sm:px-4 py-2 rounded text-sm sm:text-base font-medium transition snap-start
          ${activeFilter === 'all'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }
        `}
      >
        All ({counts.all})
      </button>
      <button
        onClick={() => onFilterChange(KitchenOrderStatus.PENDING)}
        className={`
          flex-shrink-0 px-3 sm:px-4 py-2 rounded text-sm sm:text-base font-medium transition snap-start
          ${activeFilter === KitchenOrderStatus.PENDING
            ? 'bg-yellow-600 text-white shadow-md'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }
        `}
      >
        Pending ({counts.pending})
      </button>
      <button
        onClick={() => onFilterChange(KitchenOrderStatus.PREPARING)}
        className={`
          flex-shrink-0 px-3 sm:px-4 py-2 rounded text-sm sm:text-base font-medium transition snap-start
          ${activeFilter === KitchenOrderStatus.PREPARING
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }
        `}
      >
        Preparing ({counts.preparing})
      </button>
      <button
        onClick={() => onFilterChange(KitchenOrderStatus.READY)}
        className={`
          flex-shrink-0 px-3 sm:px-4 py-2 rounded text-sm sm:text-base font-medium transition snap-start
          ${activeFilter === KitchenOrderStatus.READY
            ? 'bg-green-600 text-white shadow-md'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }
        `}
      >
        Ready ({counts.ready})
      </button>
    </div>
  );
}
