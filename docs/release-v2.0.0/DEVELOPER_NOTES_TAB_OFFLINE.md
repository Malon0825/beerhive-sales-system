# Tab Offline - Developer Notes

**Phase 3 - Step 10.2: Developer Documentation**

## Architecture Summary

Tab module uses the same offline-first architecture as POS:
- **IndexedDB stores**: `order_sessions`, `session_orders`
- **Read path**: Always IndexedDB first, fallback to API when online
- **Write path**: Queue mutations via `MutationSyncService`, sync in background
- **Sync service**: Handles all mutations with dependency management

### Key Principles

1. **Optimistic UI Updates** - Update UI immediately, sync in background
2. **Temporary IDs** - Use client-generated IDs, migrate to server IDs on sync
3. **Dependency Management** - Queue dependent operations (create → confirm)
4. **Idempotent Operations** - Handle duplicate syncs gracefully
5. **Stock Tracking** - Local stock decreases immediately to prevent overselling

## Key Files

### Core Services
- `src/lib/data-batching/offlineDb.ts` - IndexedDB CRUD operations
- `src/lib/data-batching/DataBatchingService.ts` - Catalog sync (read path)
- `src/lib/data-batching/MutationSyncService.ts` - Mutation queue (write path)
- `src/lib/contexts/OfflineRuntimeContext.tsx` - React context for offline state

### UI Components
- `src/views/tabs/TabManagementDashboard.tsx` - Dashboard (IndexedDB-first)
- `src/views/tabs/TableWithTabCard.tsx` - Session cards with sync badges
- `src/views/tabs/QuickOpenTabModal.tsx` - Offline tab opening
- `src/views/pos/SessionOrderFlow.tsx` - Offline order confirmation
- `src/views/pos/PaymentPanel.tsx` - Offline payment (shared with POS)
- `src/app/(dashboard)/order-sessions/[sessionId]/close/page.tsx` - Close tab page

### Utilities
- `src/lib/utils/toastMessages.ts` - Consistent toast messages
- `src/lib/utils/apiClient.ts` - API wrapper with error handling

## Database Schema

### IndexedDB Stores

#### `order_sessions`
```typescript
interface OfflineOrderSession {
  id: string;                    // Primary key
  session_number: string;        // Display number (TEMP-xxx or TAB-xxx)
  table_id: string;
  customer_id?: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  
  // Denormalized relations
  table?: { id: string; table_number: string; area?: string };
  customer?: { id: string; full_name: string; tier?: string };
  
  // Offline metadata
  _pending_sync?: boolean;       // True if not yet synced
  _temp_id?: boolean;           // True if using client-generated ID
  synced_at?: string;           // Last sync timestamp
}
```

#### `session_orders`
```typescript
interface OfflineSessionOrder {
  id: string;                    // Primary key
  session_id: string;            // Foreign key to order_sessions
  order_number: string;          // Display number
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  
  // Order items (embedded)
  items: Array<{
    id: string;
    order_id: string;
    product_id?: string;
    package_id?: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes?: string;
  }>;
  
  // Offline metadata
  _pending_sync?: boolean;
  _temp_id?: boolean;
  synced_at?: string;
}
```

## Mutation Types

### 1. orderSessions.create
**Triggers:** Opening a new tab

**Payload:**
```typescript
{
  endpoint: '/api/order-sessions',
  method: 'POST',
  body: {
    table_id: string,
    customer_id?: string,
    notes?: string
  },
  local_id: string  // Temp session ID for migration
}
```

**Processing:**
1. Creates session on server
2. Updates IndexedDB: `updateSessionId(localId, realId)`
3. Migrates associated orders: `migrateOrdersToSession(localId, realId)`
4. Updates session metadata: `_temp_id = false, _pending_sync = false`

### 2. orders.create
**Triggers:** Confirming an order in a session

**Payload:**
```typescript
{
  endpoint: '/api/orders',
  method: 'POST',
  body: {
    session_id: string,
    items: Array<{ product_id?, package_id?, quantity, notes? }>
  },
  local_order_id: string  // For order.confirm dependency
}
```

**Processing:**
1. Creates order on server
2. Stores `localOrderId → realOrderId` in `MutationSyncService.orderIdMap`
3. Returns real order ID for dependent mutations

### 3. orders.confirm
**Triggers:** Automatically after orders.create (dependent)

**Payload:**
```typescript
{
  endpoint: '/api/orders/{{ORDER_ID}}/confirm',
  method: 'PATCH',
  body: {},
  depends_on: number,        // Queue ID of orders.create
  local_order_id: string     // To lookup real ID from orderIdMap
}
```

**Processing:**
1. Looks up real order ID from `orderIdMap`
2. Replaces `{{ORDER_ID}}` placeholder with real ID
3. Confirms order and sends to kitchen
4. **Error Handling**: Detects "insufficient stock" and marks as failed (no retry)

### 4. orderSessions.close
**Triggers:** Processing payment and closing tab

**Payload:**
```typescript
{
  endpoint: '/api/order-sessions/:id/close',
  method: 'POST',
  body: {
    payment_method: string,
    amount_tendered: number,
    reference_number?: string,
    discount_type?: string,
    discount_value?: number,
    discount_amount?: number
  },
  session_id: string  // For local IndexedDB update
}
```

**Processing:**
1. Closes session and records payment on server
2. Updates IndexedDB: `status = 'closed', _pending_sync = false`
3. **Error Handling**: If "already closed", treats as idempotent success

## Temp ID Pattern

### Format
- **Sessions**: `offline-session-{timestamp}`
- **Orders**: `offline-order-{timestamp}`
- **Session Numbers**: `TEMP-{6-digit-timestamp}`
- **Order Numbers**: `TEMP-ORD-{6-digit-timestamp}`

### Migration Flow
```
1. Client creates: offline-session-1234567890
2. Store in IndexedDB with _temp_id = true
3. Queue orderSessions.create mutation
4. Server responds: { id: 'uuid-real-abc-123' }
5. Update IndexedDB: updateSessionId('offline-session-1234567890', 'uuid-real-abc-123')
6. Migrate orders: UPDATE session_orders SET session_id = 'uuid-real-abc-123' WHERE session_id = 'offline-session-1234567890'
7. Update metadata: _temp_id = false, _pending_sync = false
```

## Error Handling

### Network Errors
- **Retry**: Automatic with exponential backoff
- **Max Retries**: 5 attempts
- **User Notification**: After 3 failed attempts

### Stock Errors
- **Detection**: `errorMsg.includes('insufficient stock')`
- **Action**: Mark as failed, no auto-retry
- **User Action**: Manual review and resolution

### Idempotent Errors
- **Session Already Closed**: Treat as success, update local state
- **Order Already Confirmed**: Treat as success
- **Duplicate Payment**: Log warning, mark as synced

### Conflict Errors
- **Detection**: `errorMsg.includes('conflict')`
- **Action**: Mark as conflict (separate status)
- **User Action**: Manual resolution via conflict UI (future feature)

## Testing

### Unit Tests
```bash
npm test src/lib/data-batching/__tests__/TabOffline.test.ts
```

Tests:
- Temp session creation
- Session ID migration
- Order creation and linking
- Order migration on session ID change
- Stock decrease operations

### Integration Tests
```bash
npm test src/__tests__/integration/TabOfflineFlow.test.tsx
```

Tests:
- Full offline tab workflow
- Mixed online/offline operations
- Sync completion after reconnection

### Manual Testing
See: `docs/release-v2.0.0/TESTING_CHECKLIST_TAB_OFFLINE.md`

## Performance Considerations

### IndexedDB Operations
- **Bulk writes**: Use transactions for multiple operations
- **Indexes**: `order_sessions.status`, `syncQueue.status`
- **Query optimization**: Filter at index level, not in memory

### Sync Performance
- **Batch size**: 100 records per sync batch
- **Parallelization**: Process mutations sequentially (dependencies)
- **Throttling**: Wait 1 second between retry attempts

### Memory Management
- **Cart state**: Reset after order confirmation
- **Stock tracker**: Release reservations on cart clear
- **Order ID map**: Clear after batch completion

## Known Limitations

1. **Session History**: Only active sessions cached (not closed sessions)
2. **Realtime Sync**: Polling-based (not Supabase Realtime yet)
3. **Conflict Resolution**: Manual (no automatic merge)
4. **File Uploads**: Not supported offline (receipts are text-only)

## Future Enhancements

### Short Term
- [ ] Supabase Realtime for instant sync notifications
- [ ] Background sync using Service Workers
- [ ] Progressive Web App (PWA) installation
- [ ] Offline receipt printing (local printer API)

### Long Term
- [ ] Optimistic locking for concurrent edits
- [ ] Session history caching for offline reporting
- [ ] Automatic conflict resolution with CRDTs
- [ ] Multi-device sync with WebSocket

## Debugging

### Enable Verbose Logging
```javascript
// In browser console
localStorage.setItem('DEBUG_OFFLINE', 'true');
```

### View IndexedDB
1. Chrome DevTools → Application → IndexedDB
2. Database: `beerhive_pos_offline`
3. Stores: `order_sessions`, `session_orders`, `syncQueue`

### Monitor Sync Queue
```javascript
// In browser console
import { getAllPendingMutations } from '@/lib/data-batching/offlineDb';
getAllPendingMutations().then(console.log);
```

### Force Sync
```javascript
// In browser console
import { MutationSyncService } from '@/lib/data-batching/MutationSyncService';
MutationSyncService.getInstance().processPendingMutations();
```

### Clear Offline Data
```javascript
// In browser console
indexedDB.deleteDatabase('beerhive_pos_offline');
location.reload();
```

## Code Style

### Naming Conventions
- **Offline types**: Prefix with `Offline` (e.g., `OfflineOrderSession`)
- **Temp IDs**: Prefix with `offline-` (e.g., `offline-session-123`)
- **Metadata fields**: Prefix with `_` (e.g., `_pending_sync`, `_temp_id`)
- **Console logs**: Use emojis for quick visual scanning (💾 save, 🔄 sync, ✅ success, ❌ error)

### Error Messages
- **User-facing**: Clear, actionable (e.g., "Insufficient stock for Beer A")
- **Developer logs**: Detailed with context (e.g., "Stock error for product abc-123: need 10, available 5")

### Comments
- **Public APIs**: Full JSDoc with examples
- **Complex logic**: Inline comments explaining "why", not "what"
- **TODOs**: Include ticket number and description

## Security Considerations

### Data Protection
- **No sensitive data in IndexedDB**: Payment details stored temporarily, cleared after sync
- **HTTPS only**: Offline mode disabled on non-secure origins
- **CORS**: API requests restricted to same origin

### Authentication
- **Token storage**: Uses httpOnly cookies (not IndexedDB)
- **Session validation**: Revalidate token when going online
- **Expired tokens**: Clear offline data and redirect to login

## Migration Guide

### Upgrading from Phase 1 (Read-Only)
1. Deploy Phase 2 code with mutation queue
2. Test tab opening offline
3. Monitor sync logs for errors
4. Gradually enable for all users

### Database Migration
- **Version**: Increment `OFFLINE_DB_VERSION` from 1 to 2
- **Stores**: Add `order_sessions`, `session_orders`
- **Indexes**: Add `status` index on both stores
- **Migration**: Runs automatically on first load

---

**Version:** 2.0.0  
**Last Updated:** November 2024  
**Maintainer:** Development Team  
**Module:** Tab Management Offline-First
