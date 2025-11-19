1. Mutation types for Tab flow
Use one consistent set of mutation types for both POS and Tab, with extra metadata fields for mapping:

orderSessions.create (Open Tab)
Endpoint: /api/order-sessions
Payload (queued):
endpoint: '/api/order-sessions'
method: 'POST'
body: { table_id, customer_id, notes, ... }
local_id: offlineSessionId (e.g. offline-session-...)
orders.create (Add order into tab)
Endpoint: /api/orders (same as existing)
Payload:
endpoint: '/api/orders'
method: 'POST'
body: { session_id: offlineSessionId, items: [...], ... }
local_order_id: offlineOrderId (e.g. offline-order-...)
orders.confirm (Confirm tab order → send to kitchen)
Endpoint template: /api/orders/{{ORDER_ID}}/confirm
Payload:
endpoint: '/api/orders/{{ORDER_ID}}/confirm'
method: 'PATCH'
local_order_id: offlineOrderId
orderSessions.close (Close tab & payment)
Endpoint template: /api/order-sessions/{{SESSION_ID}}/close
Payload:
endpoint: '/api/order-sessions/{{SESSION_ID}}/close'
method: 'POST'
body: { payment_method, amount_tendered, discount_type/value/amount, notes? }
session_id: offlineSessionId
2. ID mapping rules in 
MutationSyncService
You already have good pieces; just need to enforce mapping consistently:

2.1 orderSessions.create → 
processSessionCreateMutation
 (already there)
Input: localId = offlineSessionId.
After successful API call:
this.sessionIdMap.set(localId, realSession.id).
updateSessionId(localId, realSession.id)
marks temp session _synced_id = realId, _pending_sync = false.
updateOrderSession(realSession.id, {...totals})
.
migrateOrdersToSession(localId, realSession.id)
.
→ No change in concept; just ensure callers always pass local_id when enqueuing orderSessions.create.

2.2 orders.create → 
processOrderCreateMutation
 (already partly there)
Before calling API:
If body.session_id is offline-session-*:
Resolve realSessionId from:
this.sessionIdMap, else
IndexedDB: 
getOrderSessionById(tempSessionId)
 or 
getActiveOrderSessions
 by table_id.
Replace body.session_id = realSessionId.
If no mapping yet → throw (“session not yet synced”) so queue processes in correct order.
After success:
this.orderIdMap.set(localOrderId, realOrder.id);
(Optional extension) update IndexedDB order record with _synced_id (see below).*_
→ Again, main requirement: callers must pass local_order_id for tab orders too.

2.3 orders.confirm → 
processOrderConfirmMutation
 (already there)
Uses localOrderId → orderIdMap → builds real endpoint:
endpoint.replace('{{ORDER_ID}}', realOrderId).
After success:
Already refreshes session totals from /api/order-sessions/{session_id} and calls 
updateOrderSession
.
→ No conceptual change. Just ensure queued mutations always set local_order_id.

2.4 orderSessions.close → extend 
processSessionCloseMutation
Currently it just does:

ts
apiPost(endpoint, body);
You need one more mapping step:

If sessionId starts with offline-session-:
Resolve realSessionId similar to 
processOrderCreateMutation
:
from sessionIdMap, else
from IndexedDB (
getOrderSessionById
 or 
getActiveOrderSessions
 by table_id or _synced_id).
Rewrite:
const realEndpoint = endpoint.replace(sessionId, realSessionId);
Optionally, add body.session_id = realSessionId if server uses it.
Then call apiPost(realEndpoint, body)._
On success or idempotent “already closed” case:

Remove the offline session from IndexedDB:
Delete both the offline temp and (optionally) the real one, or:
Delete only the offline alias; keep the real one for read-only history if you want.
This removes the 22P02 error and ensures only real UUIDs hit OrderSessionService.closeTab.

3. Additional fields in offlineDb for tab sessions & orders
You already have good sync metadata; we just need to extend it slightly for rebuild/diagnostics.

3.1 
OfflineOrderSession
Current fields (relevant):

id: string (can be offline or real)
status: 'open' | 'closed' | 'abandoned'
Financials: subtotal, discount_amount, tax_amount, total_amount, payment_method?
Metadata: opened_by?, closed_by?, notes?
Sync:
_pending_sync?: boolean
_temp_id?: boolean
_synced_id?: string (real session ID)
synced_at?: string_
I’d keep this as is. It already supports:

flagging unsynced sessions (_pending_sync),
knowing which are temp (_temp_id),
linking to real UUID (_synced_id)._
Optional additions (only if you want more observability):

last_sync_error?: string – to show in UI when a tab failed to sync.
origin?: 'offline' | 'online' – distinguish sessions that originated offline vs server.
3.2 
OfflineSessionOrder
Current fields:

Core: id, session_id, order_number, status
Timestamps: created_at, confirmed_at?, updated_at
Financial: subtotal, discount_amount, total_amount
Items: items: OfflineOrderItem[]
Sync:
_pending_sync?: boolean
_temp_id?: boolean
synced_at?: string
Recommended additions:

 _synced_id?: string;
Real order UUID after sync (similar to _synced_id on session).
This lets 
rebuildIdMappings()
 recover orderIdMap on reload by scanning session_orders store.
(Optional) remote_session_id?: string
To help debug cases where local session_id is still offline but we already know the real session.
These additions are small but make the mapping more robust and restart-safe.

4. Quick checklist for implementation
When queuing mutations:
Always include:
local_id for orderSessions.create
local_order_id for orders.create and orders.confirm
session_id for orderSessions.close (offline ID)
In 
MutationSyncService
:
Ensure 
processSessionCreateMutation
, 
processOrderCreateMutation
, 
processOrderConfirmMutation
 are used for Tab mutations as described.
Extend 
processSessionCloseMutation
 to resolve temp session IDs → real UUID before calling the API.
In offlineDb:
Add _synced_id to 
OfflineSessionOrder
.
Optionally add last_sync_error/origin to sessions and orders if you want better UI around failed syncs._