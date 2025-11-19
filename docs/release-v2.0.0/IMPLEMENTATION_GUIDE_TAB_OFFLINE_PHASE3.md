# Tab Offline-First - Implementation Guide (Phase 3: Testing & Polish)

**Estimated Time:** 2-3 days  
**Priority:** High  
**Dependencies:** Phase 1 & 2 complete

---

## Overview

Phase 3 focuses on:
1. Comprehensive testing (unit, integration, manual)
2. UI polish and offline indicators
3. Error handling improvements
4. Documentation and training materials

---

## Step 7: Add Offline Indicators Throughout UI (1 day)

### 7.1 Session Card Indicators

**File:** `src/views/tabs/TableWithTabCard.tsx`

Add pending sync badges:

```typescript
export default function TableWithTabCard({ table, session, ... }: TableWithTabCardProps) {
  return (
    <Card>
      <CardHeader>
        {session && (
          <div className="flex items-center justify-between">
            <div>
              <h3>{session.session_number}</h3>
              
              {/* Pending sync indicator */}
              {session._pending_sync && (
                <Badge variant="warning" className="mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending Sync
                </Badge>
              )}
              
              {/* Temp session indicator */}
              {session._temp_id && (
                <Badge variant="secondary" className="mt-1">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Temporary
                </Badge>
              )}
            </div>
            
            <Badge>{formatCurrency(session.total_amount)}</Badge>
          </div>
        )}
      </CardHeader>
      
      {/* ... rest of card */}
    </Card>
  );
}
```

### 7.2 Order List Indicators

**File:** `src/views/pos/SessionOrderFlow.tsx`

Add badges to order items:

```typescript
const OrderListItem = ({ order }: { order: OfflineSessionOrder }) => {
  return (
    <div className="border rounded p-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{order.order_number}</span>
            
            {/* Pending sync badge */}
            {order._pending_sync && (
              <Badge variant="outline" size="sm">
                💾 Syncing...
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-gray-500 mt-1">
            {order.items.length} items • {formatCurrency(order.total_amount)}
          </div>
        </div>
        
        <Badge variant={order.status === 'confirmed' ? 'success' : 'default'}>
          {order.status}
        </Badge>
      </div>
    </div>
  );
};
```

### 7.3 Global Sync Status (Reuse POS)

**File:** `src/components/layouts/Header.tsx` (or wherever sync indicator lives)

Ensure session mutations are included in sync status:

```typescript
const SyncStatusIndicator = () => {
  const { syncStatus } = useOfflineRuntime();
  const [pendingMutations, setPendingMutations] = useState(0);
  const [failedMutations, setFailedMutations] = useState(0);

  useEffect(() => {
    const loadMutationStatus = async () => {
      const mutations = await getAllPendingMutations();
      setPendingMutations(mutations.filter(m => m.status === 'pending').length);
      setFailedMutations(mutations.filter(m => m.status === 'failed').length);
    };
    
    loadMutationStatus();
    
    // Poll every 5 seconds
    const interval = setInterval(loadMutationStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <WifiIcon className="w-5 h-5" />
          
          {/* Badge for pending mutations */}
          {pendingMutations > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0">
              {pendingMutations}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Sync Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Status details */}
        <div className="p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Connection:</span>
            <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Pending Operations:</span>
            <span className="font-medium">{pendingMutations}</span>
          </div>
          
          {failedMutations > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Failed Operations:</span>
              <span className="font-medium">{failedMutations}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>Last Sync:</span>
            <span className="text-gray-500">
              {syncStatus.lastSync ? formatDistanceToNow(new Date(syncStatus.lastSync)) : 'Never'}
            </span>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Actions */}
        <DropdownMenuItem onClick={() => dataBatching.forceFullSync()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync Catalog Now
        </DropdownMenuItem>
        
        {failedMutations > 0 && (
          <DropdownMenuItem onClick={() => mutationSync.retryFailedMutations()}>
            <AlertCircle className="w-4 h-4 mr-2" />
            Retry Failed Operations
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

### 7.4 Toast Improvements

Create consistent toast messages:

```typescript
// utils/toastMessages.ts
export const OfflineToasts = {
  tabOpened: (isOnline: boolean) => ({
    title: '✅ Tab Opened',
    description: isOnline 
      ? 'Tab will sync in a moment...' 
      : '💾 Tab will sync when online',
  }),
  
  orderConfirmed: (isOnline: boolean) => ({
    title: '✅ Order Confirmed',
    description: isOnline
      ? 'Sending to kitchen...'
      : '💾 Kitchen will receive when online',
  }),
  
  paymentProcessed: (isOnline: boolean) => ({
    title: '✅ Payment Processed',
    description: isOnline
      ? 'Recording payment...'
      : '💾 Will record when online',
  }),
  
  syncComplete: () => ({
    title: '✅ Synced',
    description: 'All changes saved to server',
  }),
  
  syncFailed: (error: string) => ({
    title: '❌ Sync Failed',
    description: error,
    variant: 'destructive' as const,
  }),
};

// Usage
toast(OfflineToasts.tabOpened(isOnline));
```

---

## Step 8: Comprehensive Testing (1 day)

### 8.1 Unit Tests

**File:** `src/lib/data-batching/__tests__/TabOffline.test.ts`

```typescript
describe('Tab Offline Functionality', () => {
  describe('Session Creation', () => {
    it('should create temp session with optimistic ID', async () => {
      const tempSessionId = `offline-session-${Date.now()}`;
      const session = {
        id: tempSessionId,
        session_number: 'TEMP-123',
        table_id: 'table-1',
        status: 'open' as const,
        // ... other fields
        _temp_id: true,
        _pending_sync: true,
      };
      
      await putOrderSession(session);
      const retrieved = await getOrderSessionById(tempSessionId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?._temp_id).toBe(true);
      expect(retrieved?._pending_sync).toBe(true);
    });
    
    it('should update temp session ID to real ID', async () => {
      const tempId = 'offline-session-123';
      const realId = 'real-uuid-456';
      
      await putOrderSession({ id: tempId, ... });
      await updateSessionId(tempId, realId);
      
      const oldSession = await getOrderSessionById(tempId);
      const newSession = await getOrderSessionById(realId);
      
      expect(oldSession).toBeNull();
      expect(newSession).toBeDefined();
      expect(newSession?.id).toBe(realId);
    });
  });
  
  describe('Order Management', () => {
    it('should create order and link to session', async () => {
      const sessionId = 'session-1';
      const orderId = 'offline-order-123';
      
      const order = {
        id: orderId,
        session_id: sessionId,
        order_number: 'TEMP-ORD-123',
        // ... other fields
      };
      
      await putSessionOrder(order);
      const orders = await getOrdersBySession(sessionId);
      
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe(orderId);
    });
    
    it('should migrate orders when session ID changes', async () => {
      const tempSessionId = 'offline-session-123';
      const realSessionId = 'real-session-456';
      
      // Create orders under temp session
      await putSessionOrder({ id: 'order-1', session_id: tempSessionId, ... });
      await putSessionOrder({ id: 'order-2', session_id: tempSessionId, ... });
      
      // Migrate
      await migrateOrdersToSession(tempSessionId, realSessionId);
      
      // Verify
      const oldOrders = await getOrdersBySession(tempSessionId);
      const newOrders = await getOrdersBySession(realSessionId);
      
      expect(oldOrders).toHaveLength(0);
      expect(newOrders).toHaveLength(2);
    });
  });
  
  describe('Stock Management', () => {
    it('should decrease stock locally for order items', async () => {
      const productId = 'product-1';
      
      // Set initial stock
      await putProduct({ id: productId, current_stock: 10, ... });
      
      // Decrease stock
      await decreaseStockForOrder([
        { productId, quantity: 3, itemName: 'Test Product' }
      ]);
      
      // Verify
      const product = await getProductById(productId);
      expect(product?.current_stock).toBe(7);
    });
  });
});
```

### 8.2 Integration Tests

**File:** `src/__tests__/integration/TabOfflineFlow.test.tsx`

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TabManagementDashboard from '@/views/tabs/TabManagementDashboard';

describe('Tab Offline Integration', () => {
  beforeEach(() => {
    // Mock offline runtime
    global.navigator.onLine = false;
    
    // Clear IndexedDB
    indexedDB.deleteDatabase('beerhive_pos_offline');
  });

  it('should complete full tab workflow offline', async () => {
    const user = userEvent.setup();
    
    // 1. Load dashboard
    render(<TabManagementDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
    });
    
    // 2. Open tab
    const table1 = screen.getByText('Table 1');
    await user.click(table1);
    
    const openTabBtn = screen.getByRole('button', { name: /open tab/i });
    await user.click(openTabBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/TEMP-/)).toBeInTheDocument();
    });
    
    // 3. Add order (navigate to add-order page)
    // ... add items to cart
    // ... confirm order
    
    await waitFor(() => {
      expect(screen.getByText(/will sync to kitchen when online/i)).toBeInTheDocument();
    });
    
    // 4. Close tab (navigate to close page)
    // ... process payment
    
    await waitFor(() => {
      expect(screen.getByText(/will record when online/i)).toBeInTheDocument();
    });
    
    // 5. Verify all mutations queued
    const mutations = await getAllPendingMutations();
    expect(mutations).toHaveLength(3); // create session, create order, close session
  });
  
  it('should sync all operations when connection returns', async () => {
    // ... setup offline operations ...
    
    // Go online
    global.navigator.onLine = true;
    window.dispatchEvent(new Event('online'));
    
    // Wait for sync to complete
    await waitFor(() => {
      const mutations = await getAllPendingMutations();
      expect(mutations.filter(m => m.status === 'synced')).toHaveLength(3);
    }, { timeout: 10000 });
  });
});
```

### 8.3 Manual Testing Checklist

Create comprehensive test scenarios:

**File:** `docs/release-v2.0.0/TESTING_CHECKLIST_TAB_OFFLINE.md`

```markdown
# Tab Offline Testing Checklist

## Prerequisites
- [ ] Database has sample tables and products
- [ ] DevTools open for network simulation
- [ ] Browser console visible for logs

## Test Scenario 1: Offline Tab Opening
1. [ ] Go offline (DevTools → Network → Offline)
2. [ ] Navigate to Tab Management dashboard
3. [ ] Verify dashboard loads with cached tables
4. [ ] Click "Open Tab" on any table
5. [ ] Verify modal shows "Offline" badge
6. [ ] Enter customer (optional) and notes
7. [ ] Click "Open Tab"
8. [ ] Verify:
   - [ ] Tab opens immediately
   - [ ] Session number shows "TEMP-xxx"
   - [ ] "Pending sync" badge visible
   - [ ] Navigate to add-order page works
9. [ ] Go online
10. [ ] Wait 5-10 seconds
11. [ ] Verify:
    - [ ] Session number updates to real "TAB-xxx"
    - [ ] "Pending sync" badge removed
    - [ ] Table status synced

## Test Scenario 2: Offline Order Confirmation
1. [ ] Open tab (online or offline)
2. [ ] Navigate to add-order page
3. [ ] Add 2-3 products to cart
4. [ ] Go offline
5. [ ] Click "Confirm Order"
6. [ ] Verify:
   - [ ] Order shows as "TEMP-ORD-xxx"
   - [ ] Toast shows "Kitchen will receive when online"
   - [ ] Cart cleared
   - [ ] Stock decreased in local product list
7. [ ] Go online
8. [ ] Wait for sync
9. [ ] Verify:
   - [ ] Kitchen display shows order
   - [ ] Order number updates to real number
   - [ ] Stock reconciled with server

## Test Scenario 3: Offline Payment
1. [ ] Have tab with confirmed orders
2. [ ] Go offline
3. [ ] Navigate to close tab page
4. [ ] Verify session loads from cache
5. [ ] Select payment method (cash)
6. [ ] Enter amount tendered
7. [ ] Click "Complete Payment"
8. [ ] Verify:
   - [ ] Receipt displays immediately
   - [ ] Receipt shows "OFFLINE RECEIPT" badge
   - [ ] Toast shows "Will record when online"
   - [ ] Navigate back to dashboard
9. [ ] Go online
10. [ ] Wait for sync
11. [ ] Verify:
    - [ ] Payment recorded in database
    - [ ] Session marked as closed
    - [ ] Reports include payment

## Test Scenario 4: Mixed Online/Offline
1. [ ] Online: Open tab
2. [ ] Offline: Add order 1
3. [ ] Online: Add order 2 (should sync immediately)
4. [ ] Offline: Add order 3
5. [ ] Online: Close tab
6. [ ] Verify all operations synced correctly

## Test Scenario 5: Connection Interruption
1. [ ] Start tab opening (online)
2. [ ] Go offline mid-process
3. [ ] Verify graceful fallback to offline mode
4. [ ] Complete operation offline
5. [ ] Go online
6. [ ] Verify sync completes

## Test Scenario 6: Stock Validation
1. [ ] Product A has stock = 5
2. [ ] Go offline
3. [ ] Try to add order with quantity = 10 for Product A
4. [ ] Verify error: "Insufficient stock"
5. [ ] Add order with quantity = 3 (valid)
6. [ ] Verify local stock shows 2 remaining
7. [ ] Try to add another order with quantity = 3
8. [ ] Verify error (only 2 available locally)

## Test Scenario 7: Temp ID Migration
1. [ ] Go offline
2. [ ] Open tab (gets temp ID: offline-session-123)
3. [ ] Add order (linked to offline-session-123)
4. [ ] Go online
5. [ ] Wait for session sync
6. [ ] Verify:
   - [ ] Session ID changed to real UUID
   - [ ] Order's session_id updated to real UUID
   - [ ] No orphaned records

## Pass Criteria
- [ ] All scenarios pass
- [ ] No console errors
- [ ] No data loss
- [ ] Kitchen receives all orders
- [ ] Payments recorded correctly
- [ ] Stock accurate after sync
```

---

## Step 9: Error Handling & Edge Cases (0.5 days)

### 9.1 Handle Sync Conflicts

**File:** `src/lib/data-batching/MutationSyncService.ts`

```typescript
private async handleSyncConflict(mutation: SyncMutation, error: any): Promise<void> {
  console.error(`⚠️ Sync conflict for mutation ${mutation.id}:`, error);
  
  // Check if it's a specific conflict error
  if (error.message?.includes('already exists') || error.message?.includes('conflict')) {
    // Mark as conflict, don't retry
    await this.markMutationConflict(mutation.id, error.message);
    
    // Notify user
    toast({
      title: '⚠️ Sync Conflict',
      description: 'Some changes could not be synced. Please review.',
      variant: 'warning',
      action: (
        <Button onClick={() => router.push('/sync-conflicts')}>
          Review
        </Button>
      ),
    });
  } else {
    // Regular error, allow retry
    throw error;
  }
}
```

### 9.2 Handle Insufficient Stock on Sync

```typescript
private async processOrderConfirmMutation(mutation: SyncMutation): Promise<any> {
  try {
    const response = await fetch(endpoint, { method: 'PATCH', ... });
    const result = await response.json();
    
    if (!result.success) {
      // Check for stock error
      if (result.error?.includes('insufficient stock')) {
        // Notify user - don't retry automatically
        toast({
          title: '❌ Order Rejected',
          description: 'Insufficient stock on server. Order was not confirmed.',
          variant: 'destructive',
        });
        
        await this.markMutationFailed(mutation.id, result.error);
        
        // TODO: Optionally reverse local stock deduction
        
        return;
      }
      
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    throw error;
  }
}
```

### 9.3 Handle Session Already Closed

```typescript
private async processSessionCloseMutation(mutation: SyncMutation): Promise<any> {
  const { session_id } = mutation.payload;
  
  try {
    const response = await fetch(endpoint, { method: 'POST', ... });
    const result = await response.json();
    
    if (!result.success) {
      // Check if session already closed
      if (result.error?.includes('already closed') || result.error?.includes('not open')) {
        console.log(`ℹ️ Session ${session_id} already closed on server`);
        
        // Mark mutation as synced (idempotent)
        await this.markMutationSynced(mutation.id, result);
        return result;
      }
      
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    throw error;
  }
}
```

---

## Step 10: Documentation & Training (0.5 days)

### 10.1 User Guide

**File:** `docs/USER_GUIDE_TAB_OFFLINE.md`

```markdown
# Tab Management Offline Guide

## What is Offline Mode?

The Tab Management system can now work without an internet connection. You can:
- View existing tabs
- Open new tabs
- Add orders to tabs
- Close tabs and process payments

All operations are saved locally and will sync to the server when your connection returns.

## How to Know You're Offline

Look for the **Offline Mode** badge in the top-right corner of the dashboard.

## Opening a Tab Offline

1. Click on any available table
2. Click "Open Tab"
3. You'll see an "Offline" badge on the modal
4. The tab will be created with a temporary number (TEMP-xxx)
5. When online, the temporary number will update to a real tab number

## Adding Orders Offline

1. Click "Add Order" on any tab
2. Select products as usual
3. Click "Confirm Order"
4. You'll see a message: "Kitchen will receive when online"
5. The order is saved locally and will be sent to the kitchen when you reconnect

**Important:** Stock is decreased immediately in your local view, even offline.

## Closing Tabs Offline

1. Click "Close Tab"
2. Process payment as usual
3. A receipt will be printed with an "OFFLINE RECEIPT" header
4. Payment is recorded locally and will sync when online

## What Happens When You Go Back Online?

The system automatically syncs all pending operations:
- New tabs are created on the server
- Orders are sent to the kitchen
- Payments are recorded

You'll see a notification when sync completes.

## Troubleshooting

**Q: I opened a tab offline, but the number is still TEMP-xxx**  
A: Check your internet connection. The system will update the number automatically when online.

**Q: Will the kitchen receive my offline orders?**  
A: Yes, as soon as your connection returns. Orders are queued and sent automatically.

**Q: What if I run out of stock offline?**  
A: The system tracks stock locally. If you try to order more than available, you'll see an error.

**Q: Can I see which operations are pending sync?**  
A: Yes, check the sync status indicator (WiFi icon) in the top-right corner.
```

### 10.2 Developer Notes

**File:** `docs/DEVELOPER_NOTES_TAB_OFFLINE.md`

```markdown
# Tab Offline - Developer Notes

## Architecture Summary

Tab module uses the same offline-first architecture as POS:
- IndexedDB stores: `order_sessions`, `session_orders`
- Read path: Always IndexedDB first
- Write path: Queue mutations, sync in background
- Sync service: MutationSyncService handles all mutations

## Key Files

- `src/lib/data-batching/offlineDb.ts` - IndexedDB operations
- `src/lib/data-batching/DataBatchingService.ts` - Session sync
- `src/lib/data-batching/MutationSyncService.ts` - Mutation queue
- `src/views/tabs/TabManagementDashboard.tsx` - Dashboard (IndexedDB-first)
- `src/views/tabs/QuickOpenTabModal.tsx` - Offline tab opening
- `src/views/pos/SessionOrderFlow.tsx` - Offline order confirmation
- `src/views/pos/PaymentPanel.tsx` - Offline payment (already implemented)

## Mutation Types

1. **orderSessions.create** - Tab opening
2. **orders.create** - Draft order in session
3. **orders.confirm** - Kitchen notification
4. **orderSessions.close** - Payment/tab closing

## Temp ID Pattern

Offline operations use temporary IDs:
- Sessions: `offline-session-{timestamp}`
- Orders: `offline-order-{timestamp}`
- Session numbers: `TEMP-{6-digit}`

When synced, temp IDs are replaced with real UUIDs from server.

## Testing

Run tests:
```bash
npm test offlineDb.sessions
npm test TabOffline.test
```

Manual testing checklist: `docs/release-v2.0.0/TESTING_CHECKLIST_TAB_OFFLINE.md`

## Known Limitations

- Session history not cached (only active sessions)
- Realtime sync not implemented (polling-based for now)
- Conflict resolution is manual (no automatic merge)

## Future Enhancements

- Supabase Realtime subscriptions for instant sync
- Optimistic locking for concurrent edits
- Session history caching for offline reporting
```

---

## Phase 3 Completion Checklist

- [ ] Offline indicators added throughout UI
- [ ] Session cards show pending sync badges
- [ ] Order lists show sync status
- [ ] Global sync status indicator updated
- [ ] Consistent toast messages implemented
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Manual testing checklist created
- [ ] All test scenarios pass
- [ ] Error handling for sync conflicts
- [ ] Error handling for stock issues
- [ ] Error handling for closed sessions
- [ ] User guide written
- [ ] Developer notes documented
- [ ] Training materials prepared

---

## Success Criteria

✅ All UI shows clear offline/syncing indicators  
✅ Users understand when operations are pending  
✅ All tests pass (unit + integration + manual)  
✅ Error handling is robust and user-friendly  
✅ Documentation is complete and clear  
✅ Team trained on offline behavior  

---

## Final Deliverables

1. ✅ Working offline-first Tab module
2. ✅ Comprehensive test suite
3. ✅ User guide and training materials
4. ✅ Developer documentation
5. ✅ Manual testing checklist
6. ✅ Production-ready code

**Total estimated time for Phase 3:** 16-20 hours

---

## Complete Implementation Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | IndexedDB + DataBatchingService + Dashboard | 8-10 hours |
| Phase 2 | Tab opening + Orders + Payment | 40-45 hours |
| Phase 3 | Testing + Polish + Documentation | 16-20 hours |
| **Total** | **Complete offline-first Tab module** | **64-75 hours (8-9 days)** |

---

**Implementation Status:** Ready to begin Phase 1 ✅
