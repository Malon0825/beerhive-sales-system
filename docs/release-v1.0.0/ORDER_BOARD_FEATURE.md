# Order Board Feature Documentation

## Overview
The Order Board is a real-time display system that shows all customer orders as they are created and updated by cashiers. This feature allows managers, admins, and customers to view order information in real-time.

## Features

### 1. Real-Time Updates
- **Automatic refresh**: Orders update automatically when cashiers create or modify them
- **Supabase Realtime**: Uses Supabase's real-time subscription to receive instant updates
- **No polling required**: Efficient real-time connection without constant API calls

### 2. Order Display
- **Order cards**: Each order is displayed in an easy-to-read card format
- **Order details**: Shows order number, customer info, table number, items, and total
- **Status badges**: Color-coded badges for order status (pending, completed, voided)
- **Timestamps**: Displays when orders were created

### 3. Filtering & Statistics
- **Status filters**: Filter orders by all, pending, completed, or voided
- **Statistics dashboard**: Shows count of orders by status
- **Manual refresh**: Option to manually refresh order list

## Architecture

### File Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   └── order-board/
│   │       └── page.tsx                    # Order board page route
│   └── api/
│       └── orders/
│           └── board/
│               └── route.ts                # API endpoint for orders
├── views/
│   └── order-board/
│       ├── OrderBoard.tsx                  # Main order board component
│       └── OrderBoardCard.tsx              # Individual order card component
├── data/
│   └── repositories/
│       └── OrderRepository.ts              # Added getAllWithDetails method
└── core/
    └── utils/
        └── formatters/
            ├── currency.ts                 # Currency formatting utility
            └── date.ts                     # Date formatting utility
```

### Components

#### 1. OrderBoard Component (`src/views/order-board/OrderBoard.tsx`)
**Purpose**: Main component that manages the order board display

**Features**:
- Fetches orders from API on mount
- Subscribes to real-time order updates
- Provides filtering by order status
- Displays statistics (total, pending, completed, voided)
- Manual refresh functionality

**State Management**:
- `orders`: Array of all orders
- `loading`: Loading state
- `filterStatus`: Current filter selection
- `lastUpdate`: Timestamp of last update

**Real-time Subscription**:
```typescript
useRealtime({
  table: 'orders',
  event: '*',
  onChange: handleOrderUpdate,
});
```

#### 2. OrderBoardCard Component (`src/views/order-board/OrderBoardCard.tsx`)
**Purpose**: Displays individual order information

**Features**:
- Order number and timestamp
- Status badge with color coding
- Customer information (if available)
- Table information (if available)
- List of order items with quantities and prices
- Total amount display

**Props**:
```typescript
interface OrderBoardCardProps {
  order: {
    id: string;
    order_number: string;
    customer?: { full_name: string; customer_number: string } | null;
    table?: { table_number: string; area?: string } | null;
    order_items: OrderItem[];
    total_amount: number;
    status: string;
    created_at: string;
  };
}
```

### API Endpoints

#### GET /api/orders/board
**Purpose**: Fetch all orders with full details for display

**Query Parameters**:
- `status` (optional): Filter by order status
- `limit` (optional): Limit number of results (default: 50)

**Response**:
```json
{
  "success": true,
  "orders": [
    {
      "id": "uuid",
      "order_number": "ORD24010100001",
      "customer": {
        "id": "uuid",
        "full_name": "John Doe",
        "customer_number": "CUST00001"
      },
      "table": {
        "id": "uuid",
        "table_number": "5",
        "area": "indoor"
      },
      "order_items": [
        {
          "id": "uuid",
          "item_name": "Beer",
          "quantity": 2,
          "unit_price": 150.00,
          "total": 300.00,
          "notes": null
        }
      ],
      "total_amount": 300.00,
      "status": "pending",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "count": 1
}
```

### Database Integration

#### OrderRepository.getAllWithDetails()
**Purpose**: Fetches all orders with related data (customer, table, order items)

**Implementation**:
```typescript
static async getAllWithDetails(options?: {
  status?: string;
  limit?: number;
}): Promise<any[]> {
  let query = supabaseAdmin
    .from('orders')
    .select(`
      *,
      customer:customers(id, full_name, customer_number, tier),
      table:restaurant_tables(id, table_number, area),
      order_items(id, item_name, quantity, unit_price, total, notes)
    `)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status as OrderStatus);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new AppError(error.message, 500);
  return data || [];
}
```

## Usage

### Accessing the Order Board
1. Navigate to `/order-board` in the dashboard
2. The page is accessible to all authenticated users (customers, managers, admins)
3. Orders will automatically update as cashiers create or modify them

### Filtering Orders
- Click on filter buttons: **All**, **Pending**, **Completed**, **Voided**
- The count for each status is displayed on the button
- Statistics dashboard updates based on the current data

### Manual Refresh
- Click the **Refresh** button in the top-right corner
- Loading spinner indicates when refresh is in progress

## Real-Time Configuration

### Supabase Realtime Setup
Ensure the `orders` table has Realtime enabled in Supabase:

1. Go to **Database** → **Replication** in Supabase
2. Enable replication for the `orders` table
3. The application will automatically subscribe to changes

### How It Works
1. Component subscribes to `orders` table changes on mount
2. When any INSERT, UPDATE, or DELETE occurs on orders table:
   - Supabase sends a real-time event
   - Component receives the event via `useRealtime` hook
   - Component refreshes order list via API call
3. UI updates automatically with new data

## Utilities Created

### Currency Formatter (`src/core/utils/formatters/currency.ts`)
```typescript
formatCurrency(amount: number): string
// Returns: "₱1,234.56"

formatAmount(amount: number): string
// Returns: "1,234.56"

parseCurrency(currencyString: string): number
// Parses "₱1,234.56" to 1234.56
```

### Date Formatter (`src/core/utils/formatters/date.ts`)
```typescript
formatDate(date: string | Date): string
// Returns: "Jan 15, 2024, 2:30 PM"

formatDateShort(date: string | Date): string
// Returns: "Jan 15, 2024"

formatTime(date: string | Date): string
// Returns: "2:30 PM"

formatDateTime(date: string | Date): string
// Returns: "Jan 15, 2024 at 2:30 PM"

formatRelativeTime(date: string | Date): string
// Returns: "5 minutes ago"
```

## Testing Checklist

- [ ] Navigate to `/order-board` page
- [ ] Verify orders display correctly with all details
- [ ] Create a new order from POS - verify it appears on order board
- [ ] Update order status - verify status badge updates in real-time
- [ ] Test status filters (All, Pending, Completed, Voided)
- [ ] Verify statistics dashboard shows correct counts
- [ ] Test manual refresh button
- [ ] Check responsive design on mobile/tablet
- [ ] Verify customer and table information displays correctly
- [ ] Test with orders that have no customer or table assigned

## Integration with Existing System

### No Breaking Changes
- All code is additive - no existing functionality was modified
- Existing POS, Kitchen, and other modules continue to work as before
- New API endpoint is separate from existing order endpoints

### Database Considerations
- Uses existing `orders`, `order_items`, `customers`, and `restaurant_tables` tables
- No new tables or schema changes required
- Uses admin client to bypass RLS (consistent with existing code)

### Code Standards Compliance
- **Comments**: All functions and classes have JSDoc comments
- **Component size**: No files exceed 200 lines (within 500 line limit)
- **Next.js patterns**: Uses App Router, Server/Client components correctly
- **Clean architecture**: Follows repository → service → API → view pattern
- **Type safety**: Full TypeScript typing throughout

## Future Enhancements

1. **Audio notifications**: Play sound when new orders arrive
2. **Order details modal**: Click to view full order details
3. **Search functionality**: Search orders by order number or customer name
4. **Date range filter**: Filter orders by creation date
5. **Export functionality**: Export order list to CSV/Excel
6. **Print view**: Optimized view for printing order summaries
7. **Grouped view**: Group orders by table or status
8. **Auto-scroll**: Automatically scroll to new orders

## Troubleshooting

### Orders Not Updating in Real-Time
1. Check Supabase Realtime is enabled for `orders` table
2. Verify browser console for subscription errors
3. Check network tab for WebSocket connection
4. Try manual refresh to test API endpoint

### Missing Order Details
1. Verify customer/table data exists in database
2. Check API response in network tab
3. Verify RLS policies allow reading related data

### Performance Issues
1. Adjust `limit` parameter in API call (default: 50)
2. Consider pagination for large order volumes
3. Optimize real-time subscription frequency

## Security Considerations

- Uses `supabaseAdmin` client to bypass RLS policies
- API endpoint is accessible to all authenticated users
- No sensitive data (payment details, etc.) is exposed
- Order data is public within the organization context

## Conclusion

The Order Board feature provides a modern, real-time solution for viewing customer orders without breaking any existing functionality. It follows the project's coding standards and architecture patterns while providing an intuitive user experience.
