# Testing Guide: Table Deactivation Feature

## Prerequisites
- System running locally or on dev environment
- Access to Tables page at `/tables`
- At least 3-5 test tables in the database

## Test Scenarios

### Scenario 1: Deactivate an Available Table ✅

**Steps:**
1. Navigate to `/tables`
2. Find a table with status "Available" (green badge)
3. Click the "Deactivate Table" button at the bottom of the card
4. Verify confirmation dialog appears with:
   - Table number and details
   - Warning message
   - "Deactivate Table" and "Cancel" buttons
5. Click "Deactivate Table"
6. Verify:
   - Table disappears from active grid
   - Success toast appears
   - Inactive count increases in "Show Inactive" button

**Expected Result:** ✅ Table is deactivated and removed from active list

---

### Scenario 2: Cannot Deactivate Occupied Table ❌

**Steps:**
1. Create an order and assign it to a table (table becomes OCCUPIED)
2. Go to `/tables`
3. Find the occupied table (red badge)
4. Verify: No "Deactivate Table" button appears

**Expected Result:** ✅ Deactivate button is hidden for occupied tables

---

### Scenario 3: View Inactive Tables 👁️

**Steps:**
1. Navigate to `/tables`
2. Click the "Show Inactive (X)" button in the filter bar
3. Verify:
   - Button changes to "Hide Inactive (X)"
   - "Inactive Tables" section appears below active tables
   - Each inactive table has:
     - Dimmed appearance
     - "Inactive" badge in top-right
     - No action buttons (Occupy, Reserve, etc.)
     - "Reactivate Table" button at bottom

**Expected Result:** ✅ Inactive tables displayed correctly in separate section

---

### Scenario 4: Reactivate an Inactive Table ✅

**Steps:**
1. Navigate to `/tables`
2. Click "Show Inactive (X)" button
3. Find an inactive table
4. Click "Reactivate Table" button
5. Verify:
   - Table moves to active section
   - Table appears with "Available" status
   - Success toast notification
   - Inactive count decreases

**Expected Result:** ✅ Table is reactivated and appears in active list

---

### Scenario 5: Deactivate Reserved Table

**Steps:**
1. Reserve a table (status becomes RESERVED - yellow badge)
2. Note: You must first cancel the reservation
3. Click "Cancel" button to cancel reservation
4. Table should now show "Deactivate Table" button
5. Click "Deactivate Table"
6. Confirm deactivation

**Expected Result:** ✅ Reserved table can be deactivated after canceling reservation

---

### Scenario 6: Real-time Updates 🔄

**Steps:**
1. Open Tables page in two browser windows
2. In Window 1: Deactivate a table
3. In Window 2: Verify the table disappears automatically (real-time)
4. In Window 1: Click "Show Inactive"
5. Reactivate the table
6. In Window 2: Verify table reappears in active list

**Expected Result:** ✅ Changes reflect in real-time across all windows

---

### Scenario 7: Filter Inactive Tables

**Steps:**
1. Navigate to `/tables`
2. Click "Show Inactive" button
3. Use status filter dropdown
4. Use area filter dropdown
5. Verify filters work on both active AND inactive tables

**Expected Result:** ✅ Filters apply to both active and inactive sections

---

### Scenario 8: Statistics Accuracy

**Steps:**
1. Note the current statistics at the top:
   - Total Tables
   - Available
   - Occupied
   - Reserved
   - Cleaning
2. Deactivate an available table
3. Verify:
   - Total Tables count decreases by 1
   - Available count decreases by 1
   - Inactive count in toggle button increases by 1
4. Reactivate the table
5. Verify counts return to original values

**Expected Result:** ✅ Statistics update correctly

---

### Scenario 9: Error Handling - Deactivate Occupied Table via Dialog

**Steps:**
1. Have a table with an active order
2. Somehow trigger the deactivate dialog (if accessible)
3. Click confirm
4. Verify error message appears:
   - "Cannot deactivate table with active order"
   - Deactivate button is disabled

**Expected Result:** ✅ Clear error message prevents deactivation

---

### Scenario 10: Multiple Deactivations

**Steps:**
1. Deactivate 5 different tables one by one
2. Click "Show Inactive"
3. Verify all 5 appear in inactive section
4. Reactivate all 5 tables
5. Verify all return to active section

**Expected Result:** ✅ Multiple deactivations/reactivations work correctly

---

## API Testing (Optional - Using Postman/Curl)

### Deactivate Table
```bash
curl -X PATCH http://localhost:3000/api/tables/{TABLE_ID} \
  -H "Content-Type: application/json" \
  -d '{"action": "deactivate"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "table_number": "...",
    "is_active": false,
    "status": "available",
    ...
  }
}
```

### Reactivate Table
```bash
curl -X PATCH http://localhost:3000/api/tables/{TABLE_ID} \
  -H "Content-Type: application/json" \
  -d '{"action": "reactivate"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "is_active": true,
    "status": "available",
    ...
  }
}
```

### Error Case - Deactivate Occupied Table
```bash
curl -X PATCH http://localhost:3000/api/tables/{OCCUPIED_TABLE_ID} \
  -H "Content-Type: application/json" \
  -d '{"action": "deactivate"}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Cannot deactivate table with active order"
}
```

---

## Edge Cases to Test

### Edge Case 1: Rapid Toggle
- Click "Show/Hide Inactive" button rapidly
- Verify no race conditions or UI glitches

### Edge Case 2: Network Failure
- Disable network
- Try to deactivate a table
- Verify error toast appears
- Re-enable network
- Verify can retry successfully

### Edge Case 3: Deactivate During Order Creation
- Start creating an order on POS
- Before completing, try to deactivate the table
- Verify appropriate handling

---

## Browser Compatibility Testing

Test in:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance Testing

1. **Large Dataset:**
   - Create 50+ tables
   - Deactivate 20 of them
   - Toggle "Show/Hide Inactive" multiple times
   - Verify smooth performance

2. **Real-time Load:**
   - Open 5 browser tabs on Tables page
   - Perform deactivations in one tab
   - Verify all tabs update smoothly

---

## Database Verification

After running tests, verify in database:

```sql
-- Check active tables
SELECT table_number, status, is_active 
FROM restaurant_tables 
WHERE is_active = true;

-- Check inactive tables
SELECT table_number, status, is_active 
FROM restaurant_tables 
WHERE is_active = false;

-- Verify no orphaned data
SELECT * FROM restaurant_tables 
WHERE current_order_id IS NOT NULL 
AND is_active = false;
-- Should return 0 rows
```

---

## Checklist Summary

### Core Functionality
- [ ] Can deactivate available table
- [ ] Can deactivate reserved table (after canceling)
- [ ] Can deactivate cleaning table
- [ ] Cannot deactivate occupied table
- [ ] Can view inactive tables
- [ ] Can reactivate inactive tables
- [ ] Deactivate button hidden when not allowed

### UI/UX
- [ ] Confirmation dialog works correctly
- [ ] Toast notifications appear
- [ ] Real-time updates work
- [ ] Statistics update correctly
- [ ] Filters work with inactive tables
- [ ] Toggle button shows correct count
- [ ] Inactive section styled correctly

### Error Handling
- [ ] Error shown for occupied table deactivation
- [ ] Network errors handled gracefully
- [ ] Loading states display correctly
- [ ] Validation messages are clear

### Integration
- [ ] POS doesn't show inactive tables
- [ ] Orders cannot be assigned to inactive tables
- [ ] Data integrity maintained
- [ ] Timestamps update correctly

---

## Regression Testing

Ensure existing functionality still works:
- [ ] Create new table
- [ ] Reserve table
- [ ] Occupy table
- [ ] Release table to cleaning
- [ ] Mark table as cleaned
- [ ] Cancel reservation
- [ ] Assign order to table
- [ ] Complete order and release table

---

## Sign-off

**Tester:** _________________  
**Date:** _________________  
**Pass/Fail:** _________________  
**Notes:** _________________
