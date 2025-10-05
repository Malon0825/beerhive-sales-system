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
 * 
 * @param activeFilter - Currently active filter
 * @param onFilterChange - Callback when filter changes
 * @param counts - Order counts for each status
 */
export function FilterTabs({ activeFilter, onFilterChange, counts }: FilterTabsProps) {
  /**
   * Get button styling based on active state
   */
  const getButtonClass = (isActive: boolean, color: string = 'blue'): string => {
    if (isActive) {
      return `px-4 py-2 rounded bg-${color}-600 text-white`;
    }
    return 'px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition';
  };

  return (
    <div className="flex gap-2 mt-4">
      <button
        onClick={() => onFilterChange('all')}
        className={
          activeFilter === 'all'
            ? 'px-4 py-2 rounded bg-blue-600 text-white'
            : 'px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition'
        }
      >
        All ({counts.all})
      </button>
      <button
        onClick={() => onFilterChange(KitchenOrderStatus.PENDING)}
        className={
          activeFilter === KitchenOrderStatus.PENDING
            ? 'px-4 py-2 rounded bg-yellow-600 text-white'
            : 'px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition'
        }
      >
        Pending ({counts.pending})
      </button>
      <button
        onClick={() => onFilterChange(KitchenOrderStatus.PREPARING)}
        className={
          activeFilter === KitchenOrderStatus.PREPARING
            ? 'px-4 py-2 rounded bg-blue-600 text-white'
            : 'px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition'
        }
      >
        Preparing ({counts.preparing})
      </button>
      <button
        onClick={() => onFilterChange(KitchenOrderStatus.READY)}
        className={
          activeFilter === KitchenOrderStatus.READY
            ? 'px-4 py-2 rounded bg-green-600 text-white'
            : 'px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition'
        }
      >
        Ready ({counts.ready})
      </button>
    </div>
  );
}
