# Tab Module Offline-First - Implementation Summary

**Date:** November 17, 2025  
**Status:** ✅ Approved - Ready for Implementation  
**Architecture Pattern:** Mirror POS Module

---

## User Decisions (Final)

| Operation | Behavior | Implementation |
|-----------|----------|----------------|
| **Tab Opening** | ✅ Allow offline | Optimistic creation with temp IDs, queue mutation |
| **Order Confirmation** | ✅ Queue offline | Queue mutations like POS, kitchen gets order when synced |
| **Tab Closing/Payment** | ✅ Queue offline | Same as POS payment, issue offline receipt |
| **Sync Mechanism** | ✅ Reuse POS | Same buttons, same services, unified infrastructure |

---

## Architecture Overview

```
Tab Module = POS Module Pattern
  ↓
IndexedDB First (Read)
  - Tables cached
  - Sessions cached
  - Orders cached
  ↓
Mutation Queue (Write)
  - Tab openings queued
  - Order confirmations queued
  - Payments queued
  ↓
Background Sync
  - DataBatchingService (catalog + sessions)
  - MutationSyncService (all mutations)
  ↓
Kitchen/Reports Updated When Sync Completes
```

---

## Complete Workflow

### 1. Dashboard (Read-Only)
- Load tables + sessions from IndexedDB (instant)
- Background sync refreshes data
- Display with "pending sync" indicators

### 2. Open Tab (Write)
- Create temp session locally: `offline-session-{timestamp}`
- Store in IndexedDB
- Queue `orderSessions.create` mutation
- Navigate to add-order page immediately
- Sync replaces temp ID with real ID

### 3. Add Orders (Write)
- Load session from IndexedDB
- Add items to local cart
- On confirm:
  - Create draft order locally
  - Queue `orders.create` + `orders.confirm` mutations
  - Decrease stock locally
  - Clear cart
- Kitchen gets order when sync completes

### 4. Close Tab (Write)
- Load session from IndexedDB
- Calculate bill from cached data
- PaymentPanel (mode="close-tab")
- On payment:
  - Queue `orderSessions.close` mutation
  - Mark session closed locally
  - Issue offline receipt
- Payment recorded when sync completes

### 5. Manual Sync
- Reuse existing POS sync buttons
- Same `DataBatchingService.forceFullSync()`
- Same `MutationSyncService.processPendingMutations()`

---

## Key Implementation Changes

### IndexedDB Extensions
**New stores:**
- `order_sessions` - Active/closed sessions
- `session_orders` - Orders per session

**New methods:**
```typescript
// offlineDb.ts
putOrderSession(session)
getOrderSessionById(id)
getActiveOrderSessions()
putSessionOrder(order)
getOrdersBySession(sessionId)
updateSessionId(tempId, realId)
```

### DataBatchingService Extensions
**New methods:**
```typescript
// DataBatchingService.ts
syncOrderSessions()         // Fetch from Supabase, cache locally
getActiveSessionsSnapshot() // Read from IndexedDB
getSessionById(id)          // Read from IndexedDB
```

### MutationSyncService Extensions
**New mutation types:**
- `orderSessions.create` - Tab opening
- `orderSessions.close` - Payment/tab closing
- `orders.create` - Draft order in session
- `orders.confirm` - Kitchen notification

**Mutation chaining:**
```typescript
orders.create → orders.confirm (depends_on)
```

### UI Refactoring
**TabManagementDashboard.tsx:**
- Change from `apiGet()` to IndexedDB reads
- Background sync triggers

**SessionOrderFlow.tsx:**
- Load session from IndexedDB
- Queue mutations instead of direct API calls

**PaymentPanel.tsx:**
- Already supports offline (no changes needed)
- Just ensure sessionData from IndexedDB

---

## Offline Indicators

### UI Elements
- **Dashboard:** Badge shows "🔄 Syncing" or "⚠️ X pending"
- **Session card:** "TEMP-xxx" number if not synced
- **Order list:** "💾 Pending sync" badge
- **Receipt:** "⚠️ OFFLINE RECEIPT" header

### Toast Messages
```typescript
// Tab opened offline
toast({ title: '✅ Tab opened', description: '💾 Will sync when online' });

// Order confirmed offline
toast({ title: '✅ Order confirmed', description: '💾 Kitchen will receive when online' });

// Payment offline
toast({ title: '✅ Payment processed', description: '💾 Will record when online' });

// Sync completed
toast({ title: '✅ Synced', description: 'Kitchen updated, payment recorded' });
```

---

## Sync Behavior

### Online (Normal Operation)
1. User action → Queue mutation
2. Immediately trigger `processPendingMutations()`
3. Sync completes in 1-3 seconds
4. Kitchen/reports updated immediately
5. User experience: feels real-time

### Offline (Degraded Operation)
1. User action → Queue mutation
2. Show "pending sync" indicator
3. User continues working
4. When connection returns → auto-sync
5. Kitchen/reports catch up
6. User experience: transparent queueing

---

## Testing Strategy

### Phase 1: Unit Tests
- IndexedDB operations (CRUD for sessions/orders)
- Mutation queue serialization
- ID migration logic (temp → real)

### Phase 2: Integration Tests
- End-to-end tab workflow offline
- Sync resolution after reconnect
- Multiple tabs with pending mutations

### Phase 3: Manual QA
- Open tab offline → verify temp ID
- Add order offline → verify kitchen gets it after reconnect
- Close tab offline → verify payment recorded after reconnect
- Mixed online/offline operations

---

## Implementation Plan

### Week 1: Foundation
- [ ] Extend IndexedDB schema (new stores)
- [ ] Add offlineDb methods for sessions
- [ ] Extend DataBatchingService for session sync
- [ ] Refactor TabManagementDashboard to IndexedDB-first

### Week 2: Write Operations
- [ ] Implement optimistic tab opening
- [ ] Refactor SessionOrderFlow for mutation queue
- [ ] Test order confirmation with kitchen integration
- [ ] Verify payment flow uses existing PaymentPanel

### Week 3: Polish & Testing
- [ ] Add offline indicators throughout UI
- [ ] Implement mutation chaining (create → confirm)
- [ ] Integration testing (offline → online transitions)
- [ ] Documentation and user training

**Estimated Effort:** 10-12 development days

---

## Success Criteria

✅ Tab dashboard loads instantly from IndexedDB  
✅ Can open tabs offline with temp IDs  
✅ Can add orders to tabs offline  
✅ Kitchen receives orders when sync completes  
✅ Can close tabs and process payments offline  
✅ Receipts issued immediately (offline mode)  
✅ All mutations sync reliably when connection returns  
✅ No data loss during offline operations  
✅ Clear UI indicators for pending sync status  
✅ Manual sync buttons work for both catalog and mutations  

---

## Risk Mitigation

**Risk:** Kitchen misses orders if staff doesn't notice offline status  
**Mitigation:** Large ⚠️ warning when confirming orders offline

**Risk:** Temp session IDs cause confusion  
**Mitigation:** Show "TEMP-xxx" clearly + "pending sync" badge

**Risk:** Payment recorded twice if sync fails and user retries  
**Mitigation:** Idempotency keys in mutations + server-side deduplication

**Risk:** Stock oversold if offline too long  
**Mitigation:** Server validates stock on sync, reject if insufficient

---

**Status:** Ready to implement. Tab module will achieve full offline parity with POS module.
