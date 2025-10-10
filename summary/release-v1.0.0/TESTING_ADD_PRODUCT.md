# Testing Guide: Add Product Feature

**Feature:** Inventory Management - Add Product  
**Route:** `/inventory`  
**Date:** 2025-10-05

## Prerequisites

1. **Database Setup**
   - Ensure Supabase is running
   - Product categories table has data
   - Products table is accessible

2. **Application Running**
   ```bash
   npm run dev
   ```

3. **User Authentication**
   - Login with admin or manager account
   - Navigate to `/inventory`

## Test Cases

### Test 1: Open Add Product Dialog
**Steps:**
1. Navigate to `/inventory` route
2. Locate "Add Product" button (top-right, with Package icon)
3. Click the button

**Expected Result:**
- ✅ Modal dialog opens
- ✅ Dialog title: "Add New Product"
- ✅ Dialog description visible
- ✅ Form loads with empty fields
- ✅ Categories dropdown shows "Loading categories..." or populated list

---

### Test 2: Form Validation - Required Fields
**Steps:**
1. Open Add Product dialog
2. Click "Create Product" without filling any fields

**Expected Result:**
- ✅ Form does not submit
- ✅ Error messages appear:
  - "SKU is required"
  - "Product name is required"
  - "Base price must be greater than 0"
- ✅ Error text in red color
- ✅ Submit button remains enabled

---

### Test 3: SKU Field Validation
**Steps:**
1. Enter SKU: "TEST-001"
2. Clear the SKU field
3. Re-enter SKU: "TEST-001"

**Expected Result:**
- ✅ Error message disappears when typing
- ✅ Field accepts alphanumeric and special characters
- ✅ No length restriction (database: VARCHAR(50))

---

### Test 4: Product Name Validation
**Steps:**
1. Enter name: "Test Beer Product"
2. Clear the field
3. Re-enter a long name (> 200 characters)

**Expected Result:**
- ✅ Error clears on typing
- ✅ Accepts long names up to 200 characters
- ✅ No validation error for length within limit

---

### Test 5: Base Price Validation
**Steps:**
1. Enter base price: 0
2. Try to submit
3. Enter base price: -10
4. Try to submit
5. Enter base price: 100.50

**Expected Result:**
- ✅ Error: "Base price must be greater than 0" for 0 or negative
- ✅ Accepts positive decimal values
- ✅ Error clears when valid price entered

---

### Test 6: VIP Price Validation
**Steps:**
1. Set base price: 100
2. Set VIP price: 120
3. Try to submit

**Expected Result:**
- ✅ Error: "VIP price must be less than base price"
- ✅ Form doesn't submit

**Then:**
1. Set VIP price: 80

**Expected Result:**
- ✅ Error clears
- ✅ Form accepts the value

---

### Test 7: Category Selection
**Steps:**
1. Click on Category dropdown
2. Observe loaded categories
3. Select a category
4. Clear selection (if possible)

**Expected Result:**
- ✅ Dropdown opens with smooth animation
- ✅ Categories listed alphabetically
- ✅ Check icon appears on selected item
- ✅ Selected category name shows in trigger
- ✅ Categories load from `/api/categories`

---

### Test 8: Unit of Measure Selection
**Steps:**
1. Click on Unit of Measure dropdown
2. View available options

**Expected Result:**
- ✅ Options available:
  - Piece (default)
  - Bottle
  - Can
  - Liter
  - Kilogram
  - Pack
- ✅ Dropdown closes after selection

---

### Test 9: Stock and Inventory Fields
**Steps:**
1. Enter Current Stock: -5

**Expected Result:**
- ✅ Error: "Stock cannot be negative" (if validation added)
- ✅ Or accepts value (negative stock for backorders)

**Then:**
1. Enter Current Stock: 100
2. Enter Reorder Point: 20
3. Enter Reorder Quantity: 50

**Expected Result:**
- ✅ All values accepted
- ✅ Decimal values supported

---

### Test 10: Alcohol Percentage Validation
**Steps:**
1. Enter Alcohol %: -5
2. Try to submit
3. Enter Alcohol %: 150
4. Try to submit
5. Enter Alcohol %: 5.5

**Expected Result:**
- ✅ Error for values < 0 or > 100
- ✅ Accepts values between 0-100
- ✅ Decimal precision supported

---

### Test 11: Optional Fields
**Steps:**
1. Fill only required fields:
   - SKU: "MIN-001"
   - Name: "Minimal Product"
   - Base Price: 50
2. Click "Create Product"

**Expected Result:**
- ✅ Form submits successfully
- ✅ No errors for empty optional fields
- ✅ Toast notification: "Product created successfully!"

---

### Test 12: Complete Form Submission
**Steps:**
1. Fill all fields:
   ```
   SKU: SMG-PALE-330
   Barcode: 1234567890123
   Name: San Miguel Pale Pilsen
   Description: Classic Filipino lager beer
   Category: (Select "Beer" or similar)
   Base Price: 85.00
   VIP Price: 75.00
   Cost Price: 60.00
   Current Stock: 100
   Unit of Measure: Bottle
   Reorder Point: 20
   Reorder Quantity: 50
   Size/Variant: 330ml
   Alcohol %: 5.0
   Image URL: https://example.com/beer.jpg
   ```
2. Click "Create Product"

**Expected Result:**
- ✅ Button shows "Creating..." text
- ✅ Button disabled during submission
- ✅ Loader icon appears
- ✅ API call to POST `/api/products`
- ✅ Success toast appears
- ✅ Toast message: "San Miguel Pale Pilsen has been added to inventory."
- ✅ Dialog closes automatically
- ✅ Product appears in inventory list
- ✅ Statistics update (total count increases)

---

### Test 13: Cancel Button
**Steps:**
1. Open dialog
2. Fill some fields
3. Click "Cancel"

**Expected Result:**
- ✅ Dialog closes
- ✅ No API call made
- ✅ Data not saved
- ✅ Can reopen dialog with empty form

---

### Test 14: Error Handling - API Failure
**Steps:**
1. Disconnect from internet or stop Supabase
2. Fill form with valid data
3. Click "Create Product"

**Expected Result:**
- ✅ Error toast appears
- ✅ Toast title: "Failed to create product"
- ✅ Error description shows reason
- ✅ Dialog remains open
- ✅ Form data preserved
- ✅ User can retry after fixing issue

---

### Test 15: Duplicate SKU (Database Constraint)
**Steps:**
1. Create a product with SKU: "DUP-001"
2. Try to create another product with same SKU: "DUP-001"

**Expected Result:**
- ✅ Database returns error (UNIQUE constraint violation)
- ✅ Error toast appears with message
- ✅ User can correct SKU and retry

---

### Test 16: Close Dialog via Overlay
**Steps:**
1. Open dialog
2. Click on dark overlay outside dialog

**Expected Result:**
- ✅ Dialog closes
- ✅ Form resets for next use

---

### Test 17: Close Dialog via X Button
**Steps:**
1. Open dialog
2. Click X button in top-right of dialog

**Expected Result:**
- ✅ Dialog closes
- ✅ Same behavior as Cancel button

---

### Test 18: Keyboard Navigation
**Steps:**
1. Open dialog
2. Press Tab key multiple times
3. Use arrow keys in dropdowns
4. Press Escape key

**Expected Result:**
- ✅ Tab moves through fields in logical order
- ✅ Arrow keys navigate dropdown options
- ✅ Escape key closes dialog
- ✅ Enter key submits form (when in text field)

---

### Test 19: Responsive Design
**Steps:**
1. Resize browser to mobile width (375px)
2. Open Add Product dialog
3. Fill and submit form

**Expected Result:**
- ✅ Dialog is scrollable on small screens
- ✅ Form fields stack vertically
- ✅ All fields accessible
- ✅ Buttons visible and clickable

---

### Test 20: Multiple Rapid Submissions
**Steps:**
1. Fill form
2. Click "Create Product" multiple times rapidly

**Expected Result:**
- ✅ Button disabled after first click
- ✅ Only one API request sent
- ✅ No duplicate products created
- ✅ Button re-enables after response

---

## API Testing

### Test API Endpoint Directly

```bash
# Test GET categories
curl http://localhost:3000/api/categories

# Expected: List of categories

# Test POST product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "API-TEST-001",
    "name": "API Test Product",
    "base_price": 100,
    "current_stock": 10,
    "unit_of_measure": "piece"
  }'

# Expected: 201 Created with product data
```

## Database Verification

After successful creation, verify in Supabase:

```sql
-- Check if product exists
SELECT * FROM products 
WHERE sku = 'TEST-001';

-- Verify all fields saved correctly
SELECT 
  id, sku, name, base_price, vip_price, 
  current_stock, unit_of_measure, is_active,
  created_at
FROM products 
WHERE sku = 'TEST-001';
```

## Performance Testing

1. **Load Time:**
   - Dialog should open in < 200ms
   - Categories should load in < 500ms

2. **Form Submission:**
   - API call should complete in < 1s (local)
   - Toast should appear immediately after success

3. **List Refresh:**
   - Inventory list should refresh in < 1s
   - No page reload required

## Browser Compatibility

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Android Chrome)

## Accessibility Testing

1. **Screen Reader:**
   - Form labels read correctly
   - Error messages announced
   - Success notifications announced

2. **Keyboard Only:**
   - Can navigate entire form
   - Can submit without mouse
   - Can cancel without mouse

3. **High Contrast Mode:**
   - Form visible in high contrast
   - Errors clearly visible
   - Focus indicators visible

## Issue Resolution

### Common Issues

**Issue 1: Categories not loading**
- Check `/api/categories` endpoint
- Verify database connection
- Check browser console for errors

**Issue 2: Form won't submit**
- Check validation errors
- Verify all required fields filled
- Check browser console for JavaScript errors

**Issue 3: Toast not appearing**
- Verify Toaster component in layout
- Check useToast hook import
- Clear browser cache

**Issue 4: Product not appearing in list**
- Refresh page manually
- Check database for inserted record
- Verify is_active = true

## Success Criteria

✅ All 20 test cases pass  
✅ No console errors  
✅ Form validation works correctly  
✅ API integration successful  
✅ Toast notifications appear  
✅ Dialog opens and closes smoothly  
✅ Product appears in inventory list  
✅ Database record created correctly  
✅ Responsive on all screen sizes  
✅ Accessible via keyboard  

## Sign-off

- [ ] Developer tested all cases
- [ ] QA verified functionality
- [ ] Product Owner approved
- [ ] Ready for production

---

**Tested by:** _________________  
**Date:** _________________  
**Status:** _________________
