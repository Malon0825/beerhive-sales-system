# Kitchen Display Realtime Implementation

## Overview
The kitchen display now supports realtime order updates using Supabase realtime subscriptions. Orders automatically appear on the kitchen display when they are created by the cashier, without requiring manual refresh.

## Features Implemented

### 1. Realtime Order Updates
- **Automatic Sync**: Kitchen orders are automatically fetched and displayed in realtime
- **Supabase Subscriptions**: Uses Supabase's `postgres_changes` to listen for INSERT, UPDATE, and DELETE events on the `kitchen_orders` table
- **Toast Notifications**: Shows notifications when new orders arrive

### 2. Component Architecture
The implementation follows Next.js component patterns with clear separation of concerns:

```
src/views/kitchen/
├── KitchenDisplay.tsx          # Main container with realtime logic
├── OrderCard.tsx                # Individual order display card
└── components/
    ├── KitchenHeader.tsx        # Header with status summary
    ├── FilterTabs.tsx           # Status filter tabs
    ├── OrderStatusBadge.tsx     # Status badge component
    └── index.ts                 # Component exports
```

### 3. Type Safety
- **KitchenOrderWithRelations**: TypeScript interface for kitchen orders with related data
- Proper typing throughout all components
- No `any` types in component props

### 4. Status Management
Orders can be updated through the UI with the following statuses:
- **Pending**: New orders waiting to be prepared
- **Preparing**: Orders currently being worked on
- **Ready**: Orders ready for serving
- **Served**: Completed orders

### 5. Visual Indicators
- **Urgent Orders**: Red border and URGENT badge
- **Delayed Orders**: Red text and left border for orders over 15 minutes
- **Time Elapsed**: Shows minutes since order was sent with clock icon
- **Status Summary**: Header displays counts for each status

## Technical Implementation

### Realtime Subscription Setup
```typescript
const channel = supabase
  .channel('kitchen-orders-realtime')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'kitchen_orders',
    },
    async (payload) => {
      // Refetch orders on any change
      await fetchOrders();
      
      // Show notification for new orders
      if (payload.eventType === 'INSERT') {
        toast({ title: 'New Order', description: 'New order received!' });
      }
    }
  )
  .subscribe();
```

### Status Update Flow
1. User clicks status button (Start Preparing, Mark Ready, Mark Served)
2. API call to `/api/kitchen/orders/[orderId]/status` with PATCH method
3. Supabase realtime detects the update
4. All connected kitchen displays automatically refresh
5. Toast notification confirms the action

## Testing the Implementation

### Prerequisites
1. **Enable Realtime in Supabase**:
   - Go to Database → Replication in Supabase dashboard
   - Enable realtime for the `kitchen_orders` table

2. **Environment Variables**:
   Ensure `.env.local` has:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

### Test Scenarios

#### Test 1: Realtime Order Creation
1. Open the kitchen page in one browser window: `http://localhost:3000/kitchen`
2. Open the POS page in another window: `http://localhost:3000/pos`
3. Create a new order with food items in the POS
4. **Expected**: Order should appear automatically on kitchen display with toast notification

#### Test 2: Status Updates
1. Open kitchen page: `http://localhost:3000/kitchen`
2. Click "Start Preparing" on a pending order
3. **Expected**: 
   - Order moves to "Preparing" tab
   - Toast notification shows success message
   - Status badge updates to blue

4. Click "Mark Ready"
5. **Expected**:
   - Order moves to "Ready" tab
   - Status badge updates to green

#### Test 3: Multiple Kitchen Displays
1. Open kitchen page in two different browsers or incognito windows
2. Update status in one window
3. **Expected**: Both displays should update simultaneously

#### Test 4: Filtering
1. Click on different status tabs (All, Pending, Preparing, Ready)
2. **Expected**: Orders filtered correctly by status

#### Test 5: Urgent Orders
1. Create an order marked as urgent
2. **Expected**: 
   - Red border around the order card
   - "URGENT" badge displayed
   - Order appears with higher visual prominence

#### Test 6: Delayed Orders
1. Wait for an order to be pending for more than 15 minutes
2. **Expected**:
   - Time text turns red and bold
   - Red left border on the card

## API Endpoints Used

### GET `/api/kitchen/orders`
Fetches all kitchen orders for a specific destination (kitchen/bartender)
```typescript
Query params: ?destination=kitchen
```

### PATCH `/api/kitchen/orders/[orderId]/status`
Updates kitchen order status
```typescript
Body: { status: KitchenOrderStatus, notes?: string }
```

## Files Modified/Created

### New Files
- `src/models/types/KitchenOrderWithRelations.ts`
- `src/views/kitchen/components/OrderStatusBadge.tsx`
- `src/views/kitchen/components/KitchenHeader.tsx`
- `src/views/kitchen/components/FilterTabs.tsx`
- `src/views/kitchen/components/index.ts`

### Modified Files
- `src/views/kitchen/KitchenDisplay.tsx` - Added realtime subscriptions
- `src/views/kitchen/OrderCard.tsx` - Updated with proper types and icons
- `src/app/layout.tsx` - Added Toaster component

## Dependencies Used
- `@supabase/supabase-js` - Supabase client for realtime
- `lucide-react` - Icons (Clock, AlertTriangle, RefreshCw)
- `useToast` hook - Toast notifications

## Troubleshooting

### Orders Not Appearing Realtime
1. Check Supabase realtime is enabled for `kitchen_orders` table
2. Check browser console for subscription status logs
3. Verify Supabase environment variables are correct

### Toast Notifications Not Showing
1. Verify `Toaster` component is in the root layout
2. Check browser console for errors
3. Ensure `useToast` hook is imported correctly

### Status Updates Not Working
1. Check API route `/api/kitchen/orders/[orderId]/status` exists
2. Verify user has permissions to update kitchen orders
3. Check network tab for API call errors

## Performance Considerations
- Realtime subscription is cleaned up on component unmount
- Orders are fetched once on initial load, then updated via realtime
- Manual refresh button available if needed
- Optimistic UI updates for better perceived performance

## Future Enhancements
- [ ] Add sound notifications for new orders
- [ ] Implement order priority reordering (drag & drop)
- [ ] Add preparation timer per order
- [ ] Filter by table/area
- [ ] Print order tickets
- [ ] Kitchen staff assignment tracking
