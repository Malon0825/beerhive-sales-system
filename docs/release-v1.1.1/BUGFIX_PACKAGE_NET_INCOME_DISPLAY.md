# Package Net Income Display Bugfix

**Release:** v1.1.1  
**Date:** November 19, 2025  
**Type:** Bug Fix  
**Status:** ✅ Fixed

## Problem

Packages with cost prices set were not showing net income in the "All Products Sold" report. The NET INCOME column showed "-" (null) even though the package had a valid `cost_price` configured.

### Reproduction
1. Create a package with cost_price (e.g., Ultimate Beer Pack with base_price ₱200, cost_price ₱150)
2. Sell the package through POS
3. View Reports → All Products Sold
4. **Bug:** Package shows NET INCOME as "-" instead of ₱50

### Root Cause

**TWO BUGS were found:**

#### Bug 1: Backend Query - Incorrect Parsing Logic
**File:** `src/data/queries/reports.queries.ts` (Lines 400-401)

**Problematic Code:**
```typescript
base_price: item.package?.base_price ? parseFloat(item.package.base_price) : undefined,
cost_price: item.package?.cost_price ? parseFloat(item.package.cost_price) : null,
```

**Issue:** Used falsy check instead of proper null/undefined check.

#### Bug 2: Frontend Display - Hardcoded to Hide Package Net Income
**File:** `src/views/reports/TopProductsTable.tsx` (Lines 238-252)

**Problematic Code:**
```typescript
{product.item_type === 'product' ? (
  // Shows net income for products
  ...
) : (
  <span className="text-gray-400">-</span>  // ❌ ALWAYS shows "-" for packages!
)}
```

**Issue:** The UI had hardcoded logic that ALWAYS displayed "-" for packages, regardless of whether they had cost_price or net_income data. This was the PRIMARY bug preventing the display.

## Solution

### Fix 1: Backend Query (reports.queries.ts)

Changed the conditional checks to use explicit null/undefined checks:

```typescript
// ✅ FIXED
base_price: item.package?.base_price != null ? parseFloat(item.package.base_price) : undefined,
cost_price: item.package?.cost_price != null ? parseFloat(item.package.cost_price) : null,
```

### Fix 2: Frontend Display (TopProductsTable.tsx) - **PRIMARY FIX**

Removed the hardcoded package exclusion and unified the logic for both products and packages:

```typescript
// ✅ FIXED - Works for BOTH products AND packages
{product.cost_price === null || product.cost_price === undefined ? (
  <span className="text-xs text-gray-500">-</span>
) : (
  <div className="text-sm font-medium text-gray-900">
    {product.net_income !== null && product.net_income !== undefined
      ? formatCurrency(product.net_income)
      : '-'}
  </div>
)}
```

### Why This Works

**Backend:**
- `!= null` checks for both `null` and `undefined` (loose equality)
- Numeric `0` is properly handled (0 != null is `true`)
- Maintains intended fallback behavior for actual null/undefined values

**Frontend:**
- Removed discriminatory logic that excluded packages
- Both products and packages now checked the same way: if `cost_price` exists, show `net_income`
- Displays "-" only when cost_price is truly not set

## Files Changed

### Modified
- `src/data/queries/reports.queries.ts` - Fixed `getAllProductsAndPackagesSold()` function (Backend)
- `src/views/reports/TopProductsTable.tsx` - Fixed net income display logic for packages (Frontend)

## Testing

### Verification Steps

1. **Database Verification:**
   ```sql
   SELECT id, name, base_price, cost_price
   FROM packages 
   WHERE name LIKE '%Ultimate Beer Pack%';
   ```
   Expected: Shows cost_price as 150.00

2. **Order Data Verification:**
   ```sql
   SELECT oi.package_id, oi.item_name, p.base_price, p.cost_price
   FROM order_items oi
   JOIN orders o ON oi.order_id = o.id
   LEFT JOIN packages p ON oi.package_id = p.id
   WHERE oi.package_id IS NOT NULL
     AND o.status = 'completed';
   ```
   Expected: Shows package with cost_price

3. **Report Verification:**
   - Navigate to Reports → All Products Sold
   - Select date range that includes package sales
   - Find "Ultimate Beer Pack" in the list
   - **Expected:** NET INCOME shows ₱50 (or calculated value: (base_price - cost_price) × quantity)

## Impact

### Before Fix
- Packages with cost_price showed "-" for net income
- No way to track package profitability in reports
- Data was correct in database but not displayed

### After Fix
- Packages with cost_price show correct net income calculation
- Reports accurately reflect package profitability
- Net income = (base_price - cost_price) × order_count

## Backward Compatibility

✅ **Fully Backward Compatible**

- No database changes required
- No API changes
- Existing packages without cost_price still show "-" as expected
- Only affects display logic for packages with cost_price set

## Related Issues

- Original feature: `PACKAGE_COST_PRICE_IMPLEMENTATION.md`
- This bugfix completes the package cost price feature implementation

## Edge Cases Handled

1. **Package with cost_price = 0:** Now correctly calculates net income as base_price × quantity
2. **Package with cost_price = null:** Shows "-" as intended
3. **Package with cost_price > base_price:** Shows negative net income (loss)

## Prevention

To prevent similar issues in the future:

1. **Always use null/undefined checks for numeric parsing:**
   ```typescript
   // ❌ Bad - fails for 0
   value: data?.field ? parseFloat(data.field) : null
   
   // ✅ Good - handles 0 correctly
   value: data?.field != null ? parseFloat(data.field) : null
   ```

2. **Test with edge case values:** 0, null, undefined, negative numbers
3. **Verify data flow from database → query → display**

## Deployment Notes

This is a code-only fix with no migration required:

1. Deploy updated code
2. No database changes needed
3. Reports will immediately show correct net income for packages
4. No cache clearing required
