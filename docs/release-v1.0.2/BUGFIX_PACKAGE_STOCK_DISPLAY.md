# Bug Fix: Package Stock Display Shows Zero

**Version**: v1.0.2  
**Date**: October 21, 2025  
**Priority**: Critical  
**Status**: Fixed  

---

## Problem Statement

**Issue**: The Package Status dashboard showed **Stock: 0** for all component products, even when products had available inventory.

**User Report**: 
> "Ultimate Beer Pack has three items: 1 pc chicken (10 stock), sushi (15 stock), and tanduay select (15 stock). But on the Package Status view, it says tanduay was not in stock - showing Stock: 0 for all items."

**Impact**:
- ❌ Package availability incorrectly calculated as 0
- ❌ All packages showed as "Out of Stock" regardless of actual inventory
- ❌ Managers couldn't trust package availability data
- ❌ Critical for inventory management feature

**Screenshot Evidence**: Package Status showed all components with Stock: 0

---

## Root Cause Analysis

### Investigation Process

The bug was traced through the data flow:

```
Package Status UI → usePackageAvailability hook → PackageAvailabilityService 
→ PackageRepository.getActivePackages() → Supabase Query
```

### Root Cause

**PackageRepository was NOT fetching `current_stock` from the database.**

The Supabase queries in three methods were missing the `current_stock` field:

```typescript
// ❌ BEFORE - Missing current_stock
product:products(
  id,
  name,
  sku,
  base_price,
  vip_price,
  image_url,        // ← current_stock was missing here
  unit_of_measure,
  category:product_categories(...)
)
```

### Why This Caused Stock: 0

The `PackageAvailabilityService` calculates availability like this:

```typescript
// Line 385 in PackageAvailabilityService.ts
const currentStock = item.product?.current_stock ?? 0;  // ← Always defaulted to 0!
const requiredPerPackage = item.quantity;
const maxPackages = Math.floor(currentStock / requiredPerPackage);
```

**Result**: 
- `item.product.current_stock` was `undefined` (not fetched)
- Defaulted to `0` via `?? 0`
- All calculations: `Math.floor(0 / quantity) = 0`
- Every package showed 0 availability

---

## Solution Implementation

### Files Modified

**File**: `src/data/repositories/PackageRepository.ts`

**Fixed 3 methods**:

#### 1. `getAll()` Method (Line 18-43)
```typescript
// ✅ AFTER - Now includes current_stock
product:products(
  id,
  name,
  sku,
  base_price,
  current_stock,    // ✅ ADDED
  image_url,
  category:product_categories(...)
)
```

---

#### 2. `getById()` Method (Line 66-109)
```typescript
// ✅ AFTER - Now includes current_stock
product:products(
  id,
  name,
  sku,
  base_price,
  vip_price,
  current_stock,    // ✅ ADDED
  image_url,
  unit_of_measure,
  category:product_categories(...)
)
```

---

#### 3. `getActivePackages()` Method (Line 135-174)
```typescript
// ✅ AFTER - Now includes current_stock
product:products(
  id,
  name,
  sku,
  base_price,
  vip_price,
  current_stock,    // ✅ ADDED
  image_url,
  unit_of_measure,
  category:product_categories(...)
)
```

---

## Verification Steps

### Test Scenario: Ultimate Beer Pack

**Setup**:
- Package: "Ultimate Beer Pack"
- Components:
  - 1 pc chicken: 10 units in stock
  - Sushi: 15 units in stock  
  - Tanduay Select: 15 units in stock

**Before Fix**:
```
Stock: 0 (all components)
Max: 0 packages (bottleneck: all products)
Status: ❌ Out of Stock
```

**After Fix**:
```
Stock: 10 (1 pc chicken)    → Max: 10 packages
Stock: 15 (Sushi)           → Max: 15 packages
Stock: 15 (Tanduay Select)  → Max: 15 packages
Bottleneck: 1 pc chicken
Max Sellable: 10 packages ✅
Status: ✅ Available
```

---

## Technical Details

### Why This Bug Happened

**Missing Field in Query**: The repository queries were comprehensive but accidentally omitted `current_stock`.

**Silent Failure**: The code used the nullish coalescing operator (`?? 0`), which is defensive programming practice, but it **masked** the missing data:

```typescript
// Good practice for handling null/undefined
const currentStock = item.product?.current_stock ?? 0;

// But when current_stock is missing from query:
// item.product = { id: '...', name: '...', ... }  // no current_stock property!
// currentStock = undefined ?? 0 = 0
```

This is a **data layer issue masked by application layer defensive code**.

---

### Related Code Flow

**Data Flow**:
```
Database (products.current_stock) 
  ↓
PackageRepository.getActivePackages() [← BUG WAS HERE]
  ↓
PackageAvailabilityService.calculateComponentAvailability()
  ↓
Component UI displays stock
```

**Affected Features**:
1. ✅ Package Status Dashboard (`/inventory` → Package Status tab)
2. ✅ Package Availability Service (all calculations)
3. ✅ Low Stock Alerts (for packages)
4. ✅ Inventory Dashboard (package impact view)

---

## Testing Checklist

### Functional Tests
- [x] Package Status dashboard shows correct stock levels ✅
- [x] Package availability calculated correctly ✅
- [x] Bottleneck identification works ✅
- [x] Multiple packages display accurate data ✅
- [x] Expand components shows real stock numbers ✅

### Edge Cases
- [x] Package with 0 stock components → Shows 0 availability ✅
- [x] Package with mixed stock levels → Identifies correct bottleneck ✅
- [x] Package with all high stock → Shows available status ✅
- [x] Package with one low component → Shows low stock with correct bottleneck ✅

### Regression Tests
- [x] Creating packages still works ✅
- [x] Editing packages still works ✅
- [x] Selling packages deducts inventory correctly ✅
- [x] POS package selection works ✅

---

## Deployment Notes

**No Migration Required**: This is a code-only fix (query modification).

**No Breaking Changes**: Only adds previously missing data to responses.

**Deployment Steps**:
1. Deploy updated code
2. Clear any caches (PackageAvailabilityService has 5-min cache)
3. Verify Package Status dashboard displays correctly
4. Test a few packages to confirm stock shows

**Rollback**: Simply redeploy previous version (no data changes).

---

## Prevention Measures

### Code Review Checklist Addition

When reviewing Supabase queries, verify:
- [ ] All required fields are explicitly selected
- [ ] `current_stock` included for product inventory queries
- [ ] Related entities include necessary fields
- [ ] Test with actual data to catch missing fields

### Testing Improvements

**Add Integration Test**:
```typescript
describe('PackageRepository', () => {
  it('should fetch current_stock for package components', async () => {
    const pkg = await PackageRepository.getById('test-package-id');
    
    expect(pkg.items).toBeDefined();
    expect(pkg.items[0].product).toHaveProperty('current_stock');
    expect(typeof pkg.items[0].product.current_stock).toBe('number');
  });
});
```

**Add E2E Test**:
```typescript
test('Package Status dashboard shows real stock values', async ({ page }) => {
  await page.goto('/inventory');
  await page.click('text=Package Status');
  
  const stockElement = await page.locator('[data-testid="component-stock"]').first();
  const stockText = await stockElement.textContent();
  
  expect(stockText).not.toContain('Stock: 0');
  expect(stockText).toMatch(/Stock: \d+/);
});
```

---

## Related Issues

### Similar Pattern to Watch For

This same issue could occur in other queries if `current_stock` is needed but not selected:

**Audit these files**:
- ✅ `ProductRepository.ts` - Verified includes current_stock
- ⚠️  Any new queries joining `products` table

**Pattern to Check**:
```typescript
// ❌ Potential bug
.select('*, product:products(id, name)')  // Missing current_stock

// ✅ Correct
.select('*, product:products(id, name, current_stock)')
```

---

## Lessons Learned

### What Went Wrong
1. **Query incompleteness**: Forgot to include critical field
2. **Defensive code masked issue**: `?? 0` prevented errors but hid bug
3. **Insufficient testing**: No test validating stock field presence
4. **Late detection**: Found in production-like testing, not dev

### What Went Right ✅
1. **Clear user report**: Screenshot helped identify exact issue
2. **Systematic debugging**: Traced data flow from UI to database
3. **Minimal fix**: Single-line changes in 3 methods
4. **No data migration needed**: Code-only fix

### Improvements Made
1. **Documentation**: This comprehensive bug report
2. **Testing plan**: Added to manual test checklist
3. **Code review**: Added query field verification
4. **Related fix**: Fixed `getAll()` too (not just `getActivePackages()`)

---

## Sign-off

**Fixed By**: Senior Software Engineer  
**Date**: October 21, 2025  
**Version**: v1.0.2  
**Status**: ✅ Resolved

**Verification**: Tested with "Ultimate Beer Pack" - now correctly shows stock levels for all components and calculates availability accurately.

**Impact**: Critical bug affecting all package availability calculations - now fully functional.
