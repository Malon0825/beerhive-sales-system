# Patch Notes - Version 1.1.0
**Released:** November 13, 2025

---

## 🎯 What's Fixed

### Tab Discount Reporting Bug
**The Problem:** When cashiers applied discounts to tabs, the discount amount was being saved initially but then mysteriously reset to zero. This made reports inaccurate and caused confusion about actual discounts given.

**Why It Happened:** A database trigger that recalculates tab totals was running at the wrong time, overwriting the discount amount after it was saved.

**How We Fixed It:** We changed the order of operations so the discount is saved AFTER all other updates are complete. Tab discounts now show up correctly in both the order history and discount reports.

### Accidental Number Changes While Scrolling
**The Problem:** Staff were accidentally changing quantities, prices, and other numbers just by scrolling their mouse over input fields. This led to order mistakes and pricing errors.

**How We Fixed It:** Mouse wheel scrolling over number fields is now disabled. You can still type numbers normally, but scrolling won't change values anymore.

---

## ✨ What's New

### 💰 Apply Discounts at Checkout
Give customers discounts right in the POS system! Works for both direct sales and tab closures.

**Features:**
- Choose between percentage discounts (10%, 20%, etc.) or fixed amount discounts (₱50, ₱100)
- See a preview of the discount before applying it
- Add an optional reason for the discount (senior citizen, promo, loyalty, etc.)
- All discounts are automatically tracked in reports
- Green badge shows when a discount is active

**How to Use:**
1. Add items to the cart
2. Click the "Discount" button in the payment box
3. Choose percentage or fixed amount
4. Enter the discount value
5. Click "Apply" - the total updates instantly!

### 📝 Add Special Instructions to Orders
Cashiers can now add notes to individual items so the kitchen knows exactly how to prepare them.

**Examples:**
- "BBQ flavor" for chicken
- "Extra spicy" for noodles
- "No onions" for burgers
- "Well done" for steaks

**Features:**
- Add notes to any item in your cart
- Notes appear on kitchen/bartender screens in a blue highlighted box
- Works for both direct POS orders and tab orders
- No need to create separate products for every variation!

**How to Use:**
1. Add an item to your cart
2. Find the "Special instructions" field below the item
3. Type your notes (e.g., "BBQ flavor")
4. Notes save automatically

### 🔤 Products Sorted Alphabetically
All products in the POS system are now sorted A-Z by name instead of by popularity.

**Why This Helps:**
- Faster to find products when you know the name
- No more hunting through lists
- Consistent ordering across all screens

**Where It Works:**
- Main POS screen
- Tab order screen
- Current orders screen

### 📦 Improved Package Management
The package editing screen has been cleaned up with better validation and an easier interface for adding/removing items.

---

## 🔧 Technical Updates

### For Managers & IT Staff

**Discount System:**
- New `DiscountInput` component handles all discount logic
- `PaymentPanel` now supports discounts for both POS and tab payments
- `OrderSessionService` properly handles discount calculations and database updates
- All discounts recorded in `discounts` table for accurate reporting

**Order Notes:**
- Uses existing `notes` column in order items table (no database changes needed)
- Notes displayed in kitchen/bartender order cards
- Real-time updates in cart state

**Product Sorting:**
- Changed from popularity sorting (top sellers first) to alphabetical sorting
- Uses JavaScript `localeCompare()` for proper international character handling
- Applied to: `POSInterface`, `SessionProductSelector`, `ProductGrid`

**UI Protection:**
- Shared `Input` component now blocks `wheel` events on number fields globally
- Prevents accidental value changes from mouse scrolling

---

## 💡 How to Use - Quick Reference

### For Cashiers

**Applying Discounts:**
1. Add items to cart
2. Click "Discount" button
3. Choose type and enter amount
4. Click "Apply"

**Adding Notes to Items:**
1. Add item to cart
2. Type notes in "Special instructions" field below the item
3. Notes save automatically

### For Kitchen/Bar Staff

**Reading Order Notes:**
- Look for blue highlighted boxes on order cards
- These show special instructions like "BBQ flavor" or "No onions"
- Prepare the item according to the notes

### For Managers

**Checking Discount Reports:**
- All POS and tab discounts now appear correctly in Discount Analysis reports
- Tab totals now show the correct discount amounts
- Historical data remains accurate

---

## ⚠️ Important Notes

- **No database migration required** for this release - all changes use existing table structures
- Discount reports now include both POS and tab discounts accurately
- Order notes use the existing `notes` column in the database
- Product sorting changes are UI-only and don't affect data

---

## ✅ Testing Recommendations

### Test Discounts
1. Create a POS order and apply a 10% discount - verify total updates correctly
2. Create a POS order and apply a ₱50 fixed discount - verify calculation
3. Create a tab, add items, close with discount - verify discount appears in reports
4. Check Discount Analysis report to confirm both POS and tab discounts appear

### Test Order Notes
1. Add a product to cart, type notes, submit order - verify notes appear on kitchen screen
2. Add multiple items with different notes - verify each shows correctly
3. Check that notes print on receipts (if applicable)

### Test Product Sorting
1. Open POS screen - verify products appear alphabetically A-Z
2. Search for a product - verify results still alphabetical
3. Filter by category - verify products still alphabetical

### Test Numeric Input Protection
1. Add item to cart, hover over quantity field, scroll mouse wheel - verify quantity doesn't change
2. Try typing in quantity field - verify typing still works normally

---

**Questions or issues?** Contact your system administrator or development team.
