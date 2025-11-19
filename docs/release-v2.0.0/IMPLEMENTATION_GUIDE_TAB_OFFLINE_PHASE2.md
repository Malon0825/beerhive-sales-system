# Tab Offline-First - Implementation Guide (Phase 2: Write Operations)

**Estimated Time:** 5-6 days  
**Priority:** Critical  
**Dependencies:** Phase 1 complete

---

## Overview

Phase 2 implements offline write operations:
1. Offline tab opening with optimistic creation
2. Offline order confirmation with mutation queuing
3. Tab closing with offline payment (reuses existing PaymentPanel)

---

## Step 4: Implement Offline Tab Opening (1 day)

### 4.1 Extend MutationSyncService for Session Mutations

**File:** `src/lib/data-batching/MutationSyncService.ts`

Add new mutation type handlers:

```typescript
/**
 * Process orderSessions.create mutation
 * Syncs temp session to server and updates local ID
 */
private async processSessionCreateMutation(mutation: SyncMutation): Promise<any> {
  const { endpoint, body, local_id } = mutation.payload;
  
  console.log(`🔄 Syncing session creation: ${local_id}`);
  
  // Call API to create session
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    throw new Error(`Session creation failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Session creation failed');
  }
  
  const realSession = result.data;
  
  // Update local IndexedDB with real session ID
  await updateSessionId(local_id, realSession.id);
  await updateOrderSession(realSession.id, {
    session_number: realSession.session_number,
    _pending_sync: false,
    _temp_id: false,
    synced_at: new Date().toISOString(),
  });
  
  // Migrate any orders created under temp session
  await migrateOrdersToSession(local_id, realSession.id);
  
  console.log(`✅ Session synced: ${local_id} → ${realSession.id}`);
  
  return result;
}

/**
 * Route mutations to appropriate handler
 */
async processMutation(mutation: SyncMutation): Promise<void> {
  try {
    let result;
    
    switch (mutation.type) {
      case 'orders.create':
        result = await this.processOrderCreateMutation(mutation);
        break;
      
      case 'orderSessions.create':  // ← NEW
        result = await this.processSessionCreateMutation(mutation);
        break;
      
      case 'orderSessions.close':  // ← NEW
        result = await this.processSessionCloseMutation(mutation);
        break;
      
      // ... other cases
    }
    
    // Mark mutation as synced
    await this.markMutationSynced(mutation.id, result);
    
  } catch (error) {
    console.error(`Failed to process mutation ${mutation.id}:`, error);
    await this.markMutationFailed(mutation.id, error);
    throw error;
  }
}
```

### 4.2 Refactor QuickOpenTabModal

**File:** `src/views/tabs/QuickOpenTabModal.tsx`

Replace direct API call with optimistic creation:

```typescript
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
import { enqueueSyncMutation, putOrderSession } from '@/lib/data-batching/offlineDb';
import { MutationSyncService } from '@/lib/data-batching/MutationSyncService';
import type { OfflineOrderSession } from '@/lib/data-batching/offlineDb';

export default function QuickOpenTabModal({ 
  table, 
  isOpen, 
  onClose, 
  onConfirm 
}: QuickOpenTabModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const { isOnline } = useOfflineRuntime();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!table) return;

    setLoading(true);
    
    try {
      // Generate temp session ID
      const tempSessionId = `offline-session-${Date.now()}`;
      const tempSessionNumber = `TEMP-${Date.now().toString().slice(-6)}`;
      
      // Create optimistic session
      const tempSession: OfflineOrderSession = {
        id: tempSessionId,
        session_number: tempSessionNumber,
        table_id: table.id,
        customer_id: selectedCustomer?.id,
        status: 'open',
        opened_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        notes: notes || undefined,
        table: {
          id: table.id,
          table_number: table.table_number,
          area: table.area,
        },
        customer: selectedCustomer ? {
          id: selectedCustomer.id,
          full_name: selectedCustomer.full_name,
          tier: selectedCustomer.tier,
        } : undefined,
        _pending_sync: true,
        _temp_id: true,
      };
      
      // Save to IndexedDB immediately
      await putOrderSession(tempSession);
      console.log('💾 Created temp session:', tempSessionId);
      
      // Queue mutation for sync
      const queueId = await enqueueSyncMutation('orderSessions.create', {
        endpoint: '/api/order-sessions',
        method: 'POST',
        body: {
          table_id: table.id,
          customer_id: selectedCustomer?.id,
          notes: notes || undefined,
        },
        local_id: tempSessionId,
        created_at: new Date().toISOString(),
      });
      
      console.log(`📋 Queued session creation mutation: #${queueId}`);
      
      // Show toast
      toast({
        title: '✅ Tab Opened',
        description: isOnline
          ? 'Tab will sync in a moment...'
          : '💾 Tab will sync when online',
      });
      
      // Navigate immediately with temp ID
      router.push(`/tabs/${tempSessionId}/add-order`);
      
      // Trigger sync if online
      if (isOnline) {
        const syncService = MutationSyncService.getInstance();
        void syncService.processPendingMutations();
      }
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Failed to open tab:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to open tab. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Open Tab - {table?.table_number}
            {!isOnline && (
              <Badge variant="warning" className="ml-2">
                Offline
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Customer search... */}
          {/* Notes input... */}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Opening...' : 'Open Tab'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 4.3 Testing Step 4

**Manual test:**

1. Go offline (DevTools → Network → Offline)
2. Click "Open Tab" on any table
3. Verify:
   - Tab opens immediately
   - Session has `TEMP-xxx` number
   - Badge shows "Pending sync"
   - Navigate to add-order page works
4. Go online
5. Verify:
   - Background sync processes mutation
   - Temp ID replaced with real UUID
   - Session number updates to real `TAB-xxx`
   - Badge changes to "Synced"

---

## Step 5: Implement Offline Order Confirmation (2 days)

### 5.1 Refactor SessionOrderFlow - Load Session from IndexedDB

**File:** `src/views/pos/SessionOrderFlow.tsx`

```typescript
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
import { enqueueSyncMutation, putSessionOrder, decreaseStockForOrder } from '@/lib/data-batching/offlineDb';
import type { OfflineSessionOrder } from '@/lib/data-batching/offlineDb';

export default function SessionOrderFlow({ sessionId, onOrderConfirmed }: SessionOrderFlowProps) {
  const [session, setSession] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const { dataBatching, isOnline } = useOfflineRuntime();

  /**
   * Fetch session details
   * Try IndexedDB first, fallback to API if not cached
   */
  const fetchSession = async () => {
    try {
      // Try IndexedDB first
      const cachedSession = await dataBatching.getSessionById(sessionId);
      
      if (cachedSession) {
        setSession(cachedSession);
        setLoading(false);
        console.log('📊 Loaded session from cache:', sessionId);
        return;
      }
      
      // Fallback to API if online
      if (isOnline) {
        const response = await fetch(`/api/order-sessions/${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
          setSession(data.data);
          
          // Cache for future use
          await putOrderSession(data.data);
        }
      } else {
        // Offline and not in cache
        console.error('Session not available offline:', sessionId);
        toast({
          title: '❌ Session Unavailable',
          description: 'This session is not available offline.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  // ... rest of component
}
```

### 5.2 Refactor confirmOrder() for Offline Support

**File:** `src/views/pos/SessionOrderFlow.tsx`

```typescript
const confirmOrder = async () => {
  setConfirming(true);
  
  try {
    // Validate stock locally
    for (const item of cart) {
      if (!item.isPackage && item.product?.id) {
        const cachedProduct = await dataBatching.getProductById(item.product.id);
        if (cachedProduct && cachedProduct.current_stock < item.quantity) {
          toast({
            title: '❌ Insufficient Stock',
            description: `${item.itemName}: Only ${cachedProduct.current_stock} available`,
            variant: 'destructive',
          });
          setConfirming(false);
          return;
        }
      }
    }
    
    // Generate temp order ID
    const tempOrderId = `offline-order-${Date.now()}`;
    const tempOrderNumber = `TEMP-ORD-${Date.now().toString().slice(-6)}`;
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    
    // Create draft order locally
    const draftOrder: OfflineSessionOrder = {
      id: tempOrderId,
      session_id: sessionId,
      order_number: tempOrderNumber,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subtotal,
      discount_amount: 0,
      total_amount: subtotal,
      items: cart.map(item => ({
        id: `item-${Date.now()}-${Math.random()}`,
        order_id: tempOrderId,
        product_id: item.product?.id,
        package_id: item.package?.id,
        item_name: item.itemName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
        notes: item.notes,
      })),
      _pending_sync: true,
      _temp_id: true,
    };
    
    // Save order to IndexedDB
    await putSessionOrder(draftOrder);
    console.log('💾 Created temp order:', tempOrderId);
    
    // Queue order creation mutation
    const createQueueId = await enqueueSyncMutation('orders.create', {
      endpoint: '/api/orders',
      method: 'POST',
      body: {
        session_id: sessionId,
        items: cart.map(item => ({
          product_id: item.product?.id,
          package_id: item.package?.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
      },
      local_order_id: tempOrderId,
      created_at: new Date().toISOString(),
    });
    
    console.log(`📋 Queued order creation: #${createQueueId}`);
    
    // Queue order confirmation mutation (depends on create)
    const confirmQueueId = await enqueueSyncMutation('orders.confirm', {
      endpoint: '/api/orders/{{ORDER_ID}}/confirm',  // Placeholder, will be replaced
      method: 'PATCH',
      body: {},
      depends_on: createQueueId,
      local_order_id: tempOrderId,
      created_at: new Date().toISOString(),
    });
    
    console.log(`📋 Queued order confirmation: #${confirmQueueId}`);
    
    // Decrease stock locally (optimistic)
    const stockItems = cart
      .filter(item => !item.isPackage && item.product?.id)
      .map(item => ({
        productId: item.product!.id,
        quantity: item.quantity,
        itemName: item.itemName,
      }));
    
    if (stockItems.length > 0) {
      await decreaseStockForOrder(stockItems);
      console.log('✅ Decreased local stock for order');
    }
    
    // Update session totals locally
    await updateOrderSession(sessionId, {
      subtotal: (session.subtotal || 0) + subtotal,
      total_amount: (session.total_amount || 0) + subtotal,
    });
    
    // Clear cart
    setCart([]);
    
    // Show success toast
    toast({
      title: '✅ Order Confirmed',
      description: isOnline
        ? 'Order will be sent to kitchen...'
        : '💾 Order will sync to kitchen when online',
    });
    
    // Trigger sync if online
    if (isOnline) {
      const syncService = MutationSyncService.getInstance();
      void syncService.processPendingMutations();
    }
    
    // Navigate back or callback
    if (onOrderConfirmed) {
      onOrderConfirmed(tempOrderId);
    }
    
    // Refresh session data
    await fetchSession();
    
  } catch (error) {
    console.error('Failed to confirm order:', error);
    toast({
      title: '❌ Error',
      description: 'Failed to confirm order. Please try again.',
      variant: 'destructive',
    });
  } finally {
    setConfirming(false);
  }
};
```

### 5.3 Add Order Confirmation Handler to MutationSyncService

**File:** `src/lib/data-batching/MutationSyncService.ts`

```typescript
/**
 * Process orders.create mutation
 * Creates order on server and returns real order ID
 */
private async processOrderCreateMutation(mutation: SyncMutation): Promise<any> {
  const { endpoint, body, local_order_id } = mutation.payload;
  
  console.log(`🔄 Syncing order creation: ${local_order_id}`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    throw new Error(`Order creation failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Order creation failed');
  }
  
  const realOrder = result.data;
  
  // Store real order ID for dependent mutations
  this.orderIdMap.set(local_order_id, realOrder.id);
  
  console.log(`✅ Order created: ${local_order_id} → ${realOrder.id}`);
  
  return result;
}

/**
 * Process orders.confirm mutation
 * Confirms order and sends to kitchen
 */
private async processOrderConfirmMutation(mutation: SyncMutation): Promise<any> {
  const { endpoint, local_order_id, depends_on } = mutation.payload;
  
  // Get real order ID from previous mutation
  const realOrderId = this.orderIdMap.get(local_order_id);
  
  if (!realOrderId) {
    throw new Error(`Real order ID not found for ${local_order_id}`);
  }
  
  // Replace placeholder with real ID
  const realEndpoint = endpoint.replace('{{ORDER_ID}}', realOrderId);
  
  console.log(`🔄 Confirming order: ${realOrderId}`);
  
  const response = await fetch(realEndpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error(`Order confirmation failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Order confirmation failed');
  }
  
  console.log(`✅ Order confirmed and sent to kitchen: ${realOrderId}`);
  
  return result;
}
```

### 5.4 Testing Step 5

**Manual test:**

1. Open a tab (online or offline)
2. Add items to cart
3. Go offline
4. Click "Confirm Order"
5. Verify:
   - Order shows as "TEMP-ORD-xxx"
   - Stock decreased in local UI
   - Toast shows "Will sync to kitchen when online"
   - Cart cleared
6. Go online
7. Verify:
   - Mutations process automatically
   - Kitchen display shows order
   - Order ID updates to real UUID
   - Stock reconciled with server

---

## Step 6: Verify Tab Closing Works (Already Implemented) (0.5 days)

### 6.1 Verify PaymentPanel Offline Support

**File:** `src/views/pos/PaymentPanel.tsx`

The `PaymentPanel` component **already supports offline** mode for `close-tab`:

```typescript
// Existing code - no changes needed
const handlePayment = async () => {
  // ... validation ...
  
  if (mode === 'close-tab') {
    // Queue mutation
    const queueId = await enqueueSyncMutation('orderSessions.close', {
      endpoint: `/api/order-sessions/${sessionId}/close`,
      method: 'POST',
      body: {
        payment_method: selectedMethod,
        amount_tendered: amountTendered,
        discount_amount: discountAmount,
        // ... etc
      },
      session_id: sessionId,
      created_at: new Date().toISOString(),
    });
    
    // Build offline receipt
    const receiptData = buildOfflineSessionReceiptSnapshot();
    
    // Show receipt and complete
    onPaymentComplete(sessionId, {
      isOffline: !isOnline,
      queueId,
      localOrder: receiptData,
    });
  }
  
  // Trigger sync if online
  if (isOnline) {
    MutationSyncService.getInstance().processPendingMutations();
  }
};
```

**Key Point:** PaymentPanel already works offline! Just ensure session data is loaded from IndexedDB.

### 6.2 Update Close Tab Page to Use IndexedDB

**File:** `src/app/(dashboard)/order-sessions/[sessionId]/close/page.tsx`

```typescript
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';

export default function CloseTabPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { dataBatching, isOnline } = useOfflineRuntime();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Try IndexedDB first
        const cachedSession = await dataBatching.getSessionById(sessionId);
        
        if (cachedSession) {
          setSessionData(cachedSession);
          setLoading(false);
          return;
        }
        
        // Fallback to API if online
        if (isOnline) {
          const data = await apiGet(`/api/order-sessions/${sessionId}`);
          if (data.success) {
            setSessionData(data.data);
          }
        } else {
          // Session not available offline
          toast({
            title: '❌ Session Unavailable',
            description: 'Cannot close tab - session not in cache.',
            variant: 'destructive',
          });
          router.push('/tabs');
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // ... rest of component (PaymentPanel already supports offline)
}
```

### 6.3 Add Session Close Handler to MutationSyncService

**File:** `src/lib/data-batching/MutationSyncService.ts`

```typescript
/**
 * Process orderSessions.close mutation
 * Closes session and processes payment on server
 */
private async processSessionCloseMutation(mutation: SyncMutation): Promise<any> {
  const { endpoint, body, session_id } = mutation.payload;
  
  console.log(`🔄 Syncing session close: ${session_id}`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    throw new Error(`Session close failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Session close failed');
  }
  
  // Update session status in IndexedDB
  await updateOrderSession(session_id, {
    status: 'closed',
    closed_at: new Date().toISOString(),
    _pending_sync: false,
    synced_at: new Date().toISOString(),
  });
  
  console.log(`✅ Session closed and payment recorded: ${session_id}`);
  
  return result;
}
```

### 6.4 Testing Step 6

**Manual test:**

1. Open tab and add some orders (online)
2. Go offline
3. Click "Close Tab"
4. Select payment method and complete payment
5. Verify:
   - Receipt displays immediately
   - Session marked as "Pending sync"
   - Toast shows "Will record when online"
6. Go online
7. Verify:
   - Payment mutation syncs
   - Session marked as closed in database
   - Reports include the payment

---

## Phase 2 Completion Checklist

- [ ] MutationSyncService extended for session mutations
- [ ] `orderSessions.create` handler implemented
- [ ] `orderSessions.close` handler implemented
- [ ] `orders.create` handler implemented
- [ ] `orders.confirm` handler implemented
- [ ] QuickOpenTabModal refactored for offline tab opening
- [ ] Temp session ID generation working
- [ ] Temp → real ID migration working
- [ ] SessionOrderFlow refactored for offline orders
- [ ] Session loaded from IndexedDB
- [ ] Order confirmation queues mutations
- [ ] Local stock deduction working
- [ ] CloseTabPage loads session from IndexedDB
- [ ] PaymentPanel works offline (verified)
- [ ] All mutations sync correctly when online
- [ ] Integration testing complete

---

## Success Criteria

✅ Can open tabs offline  
✅ Temp sessions sync to real sessions  
✅ Can add orders to tabs offline  
✅ Orders sync to kitchen when online  
✅ Stock decreases locally immediately  
✅ Can close tabs and pay offline  
✅ Receipts issued immediately  
✅ Payments recorded when synced  

---

## Next Steps

Proceed to **Phase 3: Testing & Polish**

**Estimated total time for Phase 2:** 40-45 hours
