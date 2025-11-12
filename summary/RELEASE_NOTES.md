# BeerHive Sales System – Release v1.1.0

**Release Date:** November 13, 2025  
**Status:** ✅ Ready for Production  
**Type:** Major Feature Release

---

## 📋 Overview

Version 1.1.0 introduces powerful new discount capabilities, order customization through item notes, and significant UX improvements. This release empowers cashiers to apply flexible discounts, enables kitchen staff to receive detailed preparation instructions, and streamlines product selection with alphabetical sorting. Additionally, critical fixes ensure accurate discount reporting and prevent accidental data changes.

---

## ✨ Key Features

### 💰 POS & Tab Discount System
The most requested feature is here! Apply discounts at checkout for both direct POS sales and tab closures.

**Capabilities:**
- **Percentage Discounts** - Apply 10%, 20%, or any percentage discount
- **Fixed Amount Discounts** - Apply ₱50, ₱100, or any fixed amount discount
- **Discount Reasons** - Optionally record why the discount was given (senior citizen, promo, loyalty, etc.)
- **Real-time Preview** - See the discount impact before applying
- **Full Reporting** - All discounts automatically tracked in Discount Analysis reports
- **Works Everywhere** - Apply to POS orders and tab closures using the same interface

**Impact:** Cashiers can now handle promotions, loyalty discounts, and special pricing without manager intervention for standard discount amounts.

### 📝 Order Item Notes
Add special instructions to individual order items so kitchen and bar staff know exactly how to prepare them.

**Use Cases:**
- Product variations: "BBQ flavor", "Original", "Spicy"
- Cooking preferences: "Well done", "Medium rare", "Extra crispy"
- Modifications: "No onions", "Extra sauce", "Light ice"
- Substitutions: "Coke instead of Sprite"

**Benefits:**
- No need to create separate SKUs for every variation
- Reduces order errors and customer complaints
- Notes visible on kitchen screens and receipts
- Works for both POS and tab orders

**Impact:** Restaurants can maintain a lean product catalog while offering extensive customization options.

### 🔤 Alphabetical Product Sorting
Products now display in A-Z order by name instead of popularity-based sorting.

**Why This Matters:**
- **Faster Product Location** - Staff can predict where items appear
- **Consistent Experience** - Same ordering across all POS screens
- **Reduced Order Time** - Less hunting through lists

**Applied To:** Main POS, Tab Module, Current Orders, All product grids

---

## 🐛 Critical Fixes

### Tab Discount Reporting Bug (CRITICAL)
**Issue:** Tab discounts were being saved but then reset to zero due to a database trigger conflict.

**Impact:** Reports showed incomplete discount data, causing accounting discrepancies.

**Resolution:** Reordered database operations to prevent the trigger from overwriting discount values. Tab discounts now persist correctly in both `order_sessions` and `discounts` tables.

**Result:** Historical and current discount reports are now accurate.

### Numeric Input Scroll Protection
**Issue:** Mouse wheel scrolling over number fields accidentally changed quantities and prices.

**Impact:** Staff were creating order errors without realizing it.

**Resolution:** Disabled wheel events on all `<input type="number">` fields globally while preserving keyboard input functionality.

**Result:** No more accidental value changes from scrolling.

---

## 🎨 UX Improvements

### Package Management UI Refactor
- Cleaner package editing interface
- Better validation for pricing and item configuration
- Improved visual feedback for adding/removing package items

### Enhanced Visual Feedback
- Green badge indicates active discounts
- Blue highlight boxes show order notes on kitchen screens
- Toast notifications confirm discount application
- Clear error messages for invalid discount values

---

## 🔧 Technical Highlights

### New Components
- **`DiscountInput`** - Reusable discount input with validation and preview
- Enhanced `CurrentOrderPanel` with integrated discount controls
- Enhanced `PaymentPanel` supporting both POS and tab discounts

### Service Layer Updates
- **`OrderSessionService.closeTab()`** - Handles tab-level discount application and proper database sequencing
- **`OrderCalculation.applyDiscount()`** - Centralized discount calculation logic used by both POS and tabs

### API Enhancements
- **`POST /api/order-sessions/[sessionId]/close`** - Now accepts and validates discount payloads
- Discount data properly persisted to `discounts` table for comprehensive reporting

### Database Operations
- Fixed trigger timing to prevent discount value overwrites
- No schema migrations required - uses existing table structures
- Order notes leverage existing `notes` column

---

## 📊 Reporting Improvements

All discounts (both POS and tab) now appear correctly in:
- Discount Analysis Reports
- Sales Summary Reports
- Order History
- Financial reconciliation exports

Managers can track:
- Total discounts given per day/week/month
- Discount types (percentage vs. fixed amount)
- Discount reasons (when provided)
- Cashier who applied each discount

---

## 🎯 Business Impact

### For Restaurant Operations
- **Faster Service** - Alphabetical sorting reduces order entry time
- **Flexible Pricing** - Staff can apply promotional discounts on the fly
- **Better Accuracy** - Order notes reduce preparation errors
- **Improved Reports** - Complete visibility into discount patterns

### For Management
- **Accurate Financials** - All discounts properly tracked and reported
- **Data-Driven Decisions** - Clear discount analytics for pricing strategy
- **Operational Insight** - Understand which products need most customization

### For Staff
- **Intuitive Interface** - Discount application is simple and fast
- **Error Prevention** - No more accidental number changes from scrolling
- **Clear Instructions** - Kitchen notes eliminate confusion

---

## 📦 Deployment Notes

- **Zero Downtime** - All changes are backwards compatible
- **No Migration Required** - Uses existing database schema
- **Immediate Availability** - Features available as soon as deployment completes
- **Training Recommended** - Brief staff on discount and notes features

---

## 🔜 What's Next

Future enhancements being considered:
- Discount approval workflows for large amounts
- Preset discount buttons for common promotions
- Enhanced discount analytics dashboard
- Order notes templates for common modifications

---

## ✅ Verification Checklist

### Discount Functionality
1. Create a POS order, apply a 10% discount, verify total calculation
2. Create a POS order, apply a ₱100 fixed discount, verify total calculation
3. Create a tab with items, close with 20% discount, check discount appears in reports
4. Verify both POS and tab discounts show in Discount Analysis report

### Order Notes
1. Add item to POS cart, add note "Extra spicy", submit order
2. Check kitchen screen - verify note appears in blue highlighted box
3. Add item to tab cart, add note "No onions", create order
4. Verify note appears on bartender/kitchen screen

### Product Sorting
1. Open main POS screen - verify products appear A-Z alphabetically
2. Open tab product selector - verify alphabetical sorting
3. Search for product - verify results maintain alphabetical order

### Numeric Input Protection
1. Add item to cart, hover over quantity field, scroll mouse - verify no change
2. Type new quantity value - verify typing works normally
3. Test on price fields, discount fields - verify scroll protection works

### Regression Testing
1. Complete a normal POS sale without discount - verify works correctly
2. Complete a tab order without discount or notes - verify normal operation
3. Check that existing reports still generate correctly
4. Verify package purchases still work as expected

---

## 📎 References

- [Changelog Entry](./CHANGELOG.md#110---2025-11-13)
- [Patch Notes](./PATCH_NOTES.md)
- Detailed Implementation Docs:
  - [POS Discount Implementation](./release-v1.1.0/POS_DISCOUNT_IMPLEMENTATION.md)
  - [Tab Discount Reporting Fix](./release-v1.1.0/TAB_DISCOUNT_REPORTING_FIX.md)
  - [Order Item Notes](./release-v1.1.0/ORDER_ITEM_NOTES_IMPLEMENTATION.md)
  - [Alphabetical Sorting](./release-v1.1.0/POS_PRODUCT_ALPHABETICAL_SORTING.md)
  - [Numeric Input UX](./release-v1.1.0/NUMERIC_INPUT_UX_IMPROVEMENTS.md)
  - [Package Dialog Refactor](./release-v1.1.0/PACKAGE_DIALOG_REFACTOR.md)
- Key source files:
  - `src/views/pos/DiscountInput.tsx` (new)
  - `src/views/pos/CurrentOrderPanel.tsx`
  - `src/views/pos/PaymentPanel.tsx`
  - `src/views/pos/components/OrderSummaryPanel.tsx`
  - `src/views/pos/SessionOrderFlow.tsx`
  - `src/views/pos/POSInterface.tsx`
  - `src/views/pos/SessionProductSelector.tsx`
  - `src/views/pos/ProductGrid.tsx`
  - `src/core/services/orders/OrderSessionService.ts`
  - `src/app/api/order-sessions/[sessionId]/close/route.ts`
  - `src/views/shared/ui/input.tsx`
