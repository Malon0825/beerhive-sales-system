# Tab Offline Testing Checklist

**Phase 3 - Step 8.3: Manual Testing Checklist**

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

## Test Scenario 8: Multiple Offline Operations
1. [ ] Go offline
2. [ ] Open 3 tabs on different tables
3. [ ] Add orders to each tab
4. [ ] Close 1 tab with payment
5. [ ] Go online
6. [ ] Verify:
   - [ ] All 3 tabs created on server
   - [ ] All orders synced to kitchen
   - [ ] 1 payment recorded
   - [ ] Mutation queue cleared

## Test Scenario 9: Failed Sync Recovery
1. [ ] Go offline
2. [ ] Open tab and add order
3. [ ] Go online but simulate server error (block API in DevTools)
4. [ ] Wait for sync attempt
5. [ ] Verify:
   - [ ] Mutations marked as failed
   - [ ] User notified of sync failure
   - [ ] Operations remain in queue
6. [ ] Unblock API
7. [ ] Manually retry sync
8. [ ] Verify successful sync

## Test Scenario 10: Concurrent Users (Advanced)
1. [ ] User A: Open tab offline
2. [ ] User B: Open same table online (should fail - table occupied)
3. [ ] User A: Go online and sync
4. [ ] User B: Refresh - should see table as occupied
5. [ ] Verify: No double-booking occurred

## Pass Criteria
- [ ] All scenarios pass
- [ ] No console errors
- [ ] No data loss
- [ ] Kitchen receives all orders
- [ ] Payments recorded correctly
- [ ] Stock accurate after sync
- [ ] UI indicators clear and accurate
- [ ] Toast messages consistent
- [ ] No orphaned temp records

## Performance Checks
- [ ] Dashboard loads in < 1 second (offline)
- [ ] Tab opens in < 500ms (offline)
- [ ] Order confirmation in < 500ms (offline)
- [ ] Sync completes in < 5 seconds (online, 3 operations)

## Browser Compatibility
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if applicable)
- [ ] Mobile browsers (Chrome Mobile, Safari iOS)

## Notes
- Record any issues or unexpected behavior
- Document error messages seen
- Note any performance concerns
- Capture screenshots of UI indicators
