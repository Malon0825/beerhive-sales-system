---
description: POS product alphabetical sorting implementation
---

# POS Product Alphabetical Sorting

**Date:** November 13, 2025  
**Status:** ✅ Completed  
**Owner:** Cascade (paired with Malon0825)

---

## Overview

Changed product sorting in all POS module components from popularity-based sorting (top-selling items first) to alphabetical sorting by product name. This improves product discoverability and makes it easier for staff to quickly locate items when taking orders.

---

## Problem Statement

- Products were sorted by sales volume (top-selling first), which made it difficult for staff to find specific products
- Staff had to visually scan through popularity-ordered lists instead of using predictable alphabetical order
- Alphabetical sorting provides more consistent and intuitive product browsing experience

---

## Solution Summary

Updated all product filtering/sorting logic in POS components to use alphabetical sorting by name using JavaScript's `localeCompare()` method, which properly handles international characters and special characters.

**Implementation Details:**
1. Replaced popularity-based sorting with simple alphabetical sort
2. Removed unused `topSellingMap` dependencies from useMemo hooks
3. Updated sorting in all three POS component variants

---

## Files Modified

### 1. POSInterface.tsx
**Location:** @src/views/pos/POSInterface.tsx#716-718

**Changes:**
- Removed popularity sorting logic that checked `topSellingMap[a.id]` vs `topSellingMap[b.id]`
- Simplified to: `filtered.sort((a, b) => a.name.localeCompare(b.name))`
- Removed `topSellingMap` from useMemo dependency array (line 718)

### 2. SessionProductSelector.tsx
**Location:** @src/views/pos/SessionProductSelector.tsx#282-284, #303-305

**Changes:**
- Updated `filteredProducts` sorting (regular products view)
- Updated `filteredFeaturedProducts` sorting (featured products view)
- Removed `topSellingMap` from both useMemo dependency arrays
- Both views now sort alphabetically by name

### 3. ProductGrid.tsx
**Location:** @src/views/pos/ProductGrid.tsx#216-232

**Changes:**
- Added explicit sorting step to `filteredProducts` useMemo
- Previously was filtering only without sorting
- Now filters then sorts: `filtered.sort((a, b) => a.name.localeCompare(b.name))`

---

## Technical Details

### Sorting Method
```typescript
// Before (popularity-based)
return filtered.sort((a, b) => {
  const qa = topSellingMap[a.id] || 0;
  const qb = topSellingMap[b.id] || 0;
  if (qa !== qb) return qb - qa;
  return a.name.localeCompare(b.name);
});

// After (alphabetical)
return filtered.sort((a, b) => a.name.localeCompare(b.name));
```

### Benefits of localeCompare()
- Handles international characters correctly (é, ñ, etc.)
- Case-insensitive by default in most browsers
- Consistent sorting across different locales
- Better performance than custom string comparison

---

## Impacted Areas

### POS Modules
- **Main POS Interface** - All products view, Featured view
- **Tab Module** - Product selector for tab orders
- **Current Orders** - Product grid for ongoing orders

### User Experience Changes
- Products now appear in A-Z order making them easier to find
- Consistent sorting across all POS screens
- Staff can predict where products will appear in the list

### No Impact
- No database changes
- No API changes
- No changes to product filtering logic (search, category filters, stock availability)
- Stock tracking and reservation logic unchanged

---

## QA & Verification Checklist

1. **POS Interface**
   - [ ] Verify products in "All Products" view are sorted alphabetically
   - [ ] Verify products in "Featured" view are sorted alphabetically
   - [ ] Verify search results maintain alphabetical order
   - [ ] Verify category filtering maintains alphabetical order

2. **Tab Module**
   - [ ] Verify product selector shows products alphabetically
   - [ ] Verify featured products are sorted alphabetically
   - [ ] Verify search results are alphabetical

3. **Current Orders**
   - [ ] Verify product grid shows products alphabetically
   - [ ] Verify category filtering maintains alphabetical order

4. **Edge Cases**
   - [ ] Products with numbers in names sort correctly (e.g., "Beer 1", "Beer 10", "Beer 2")
   - [ ] Products with special characters sort correctly
   - [ ] Products with international characters sort correctly

---

## Performance Considerations

- `localeCompare()` is slightly slower than simple string comparison but negligible for typical product lists (< 1000 items)
- Removed unnecessary `topSellingMap` dependency reduces re-renders
- Sorting happens only when product list, search, or filters change (memoized)

---

## Future Enhancements

1. Consider adding a toggle to switch between alphabetical and popularity sorting
2. Add sort direction toggle (A-Z vs Z-A)
3. Consider adding sort by price, category, or stock level options
4. Store user's sort preference in session storage

---

> ✅ All POS product lists now display products in alphabetical order by name.  
> ✅ Improved product discoverability and staff efficiency in order entry.
