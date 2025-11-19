# Package Cost Price Implementation

**Release:** v1.1.1  
**Date:** November 19, 2025  
**Type:** Feature Enhancement  
**Status:** ✅ Completed

## Overview

This feature enables packages to have their own cost price, which is used to compute net income in the reports module. Previously, only individual products had cost prices, but packages could not track their cost, limiting the ability to analyze package profitability.

## Problem Statement

Users needed to set a cost price for packages to accurately compute net income for package sales in reports. Individual inventory items already supported cost pricing, but packages (bundles of products) did not have this capability.

## Solution

Added a `cost_price` column to the packages table and integrated it throughout the application stack:
- Database schema update
- TypeScript entities and interfaces
- Package creation/update forms
- Repository layer
- Reports computation logic

## Technical Implementation

### 1. Database Changes

**Migration File:** `migrations/release-v1.1.1/add_cost_price_to_packages.sql`

```sql
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2);

COMMENT ON COLUMN packages.cost_price IS 'Cost price of the package used to compute net income in reports. Can be different from sum of individual item costs.';

CREATE INDEX IF NOT EXISTS idx_packages_cost_price ON packages(cost_price) WHERE cost_price IS NOT NULL;
```

**Key Points:**
- Column is nullable to support existing packages without cost price
- Index added for reporting query performance
- Can be set independently of individual item costs (allows for packaging/labor overhead)

### 2. Entity & Interface Updates

**File:** `src/models/entities/Package.ts`

Added `cost_price: number | null` to:
- `Package` interface
- `CreatePackageInput` interface
- `UpdatePackageInput` interface

### 3. UI Changes

**File:** `src/views/packages/PackageForm.tsx`

Added cost price input field in the pricing section:
```tsx
<div>
  <Label htmlFor="cost_price">Cost Price (₱)</Label>
  <Input
    id="cost_price"
    type="number"
    step="0.01"
    value={formData.cost_price || ''}
    onChange={(e) => setFormData({ 
      ...formData, 
      cost_price: parseFloat(e.target.value) || undefined 
    })}
    placeholder="For net income calculation"
  />
</div>
```

**Layout Changes:**
- Changed pricing section grid from 3 columns to 2 columns to accommodate the new field
- Fields: Package Type, Base Price, VIP Price, Cost Price

### 4. Repository Updates

**File:** `src/data/repositories/PackageRepository.ts`

**Create Method:**
```typescript
.insert({
  // ... other fields
  cost_price: input.cost_price,
  // ... rest
})
```

**Update Method:**
```typescript
if ('cost_price' in input) {
  updateData.cost_price = input.cost_price ?? null;
}
```

### 5. Reports Query Updates

**File:** `src/data/queries/reports.queries.ts`

**Function:** `getAllProductsAndPackagesSold()`

**Before:** Package sales didn't include cost_price or net_income calculation

**After:**
```typescript
// Fetch package cost_price
.select(`
  package_id,
  item_name,
  quantity,
  total,
  order:order_id(completed_at, status),
  package:package_id(base_price, cost_price)  // ← Added cost_price
`)

// Store cost_price in aggregation
byId.set(key, {
  // ...
  base_price: item.package?.base_price,
  cost_price: item.package?.cost_price,  // ← Added
});

// Compute net income for BOTH products and packages
byId.forEach((val) => {
  if (val.cost_price === null || val.cost_price === undefined || val.base_price === undefined) {
    val.net_income = null;
  } else {
    val.net_income = (val.base_price - val.cost_price) * val.order_count;
  }
});
```

## User Guide

### Setting Package Cost Price

1. Navigate to **Packages Module** (Manager/Admin access required)
2. Create a new package or edit an existing one
3. In the pricing section, you'll see four fields:
   - **Package Type:** Regular, VIP Only, or Promotional
   - **Base Price:** Selling price (required)
   - **VIP Price:** Special VIP pricing (optional)
   - **Cost Price:** Your cost for the package (optional)
4. Enter the cost price for the package
5. Save the package

### Viewing Net Income in Reports

1. Go to **Reports Module**
2. Select the **Products & Packages** report
3. The report will show:
   - Product/Package name
   - Total quantity sold
   - Total revenue
   - **Net Income:** (Base Price - Cost Price) × Quantity Sold
4. Packages without a cost price will show "N/A" for net income

### Cost Price Flexibility

The package cost price can be:
- **Sum of component costs:** If you simply want to track raw material costs
- **Higher than component costs:** To account for packaging materials, labor, overhead
- **Different from individual item costs:** Since packages may have different supplier pricing or preparation costs

## Business Logic

### Net Income Calculation

```
Net Income = (Base Price - Cost Price) × Order Count
```

**Example:**
- Package: "Ultimate Beer Bucket"
- Base Price: ₱500
- Cost Price: ₱350
- Orders Sold: 10
- **Net Income:** (₱500 - ₱350) × 10 = ₱1,500

### Handling Null Values

- If `cost_price` is not set → Net Income shows as `null` or "N/A"
- If `base_price` is not available → Net Income shows as `null` or "N/A"
- This ensures reports remain accurate and don't show misleading data

## Testing Checklist

- [x] Database migration runs without errors
- [x] Can create new package with cost price
- [x] Can edit existing package to add/update cost price
- [x] Cost price field is optional (packages without it still work)
- [x] Reports query fetches package cost_price
- [x] Net income computed correctly for packages with cost price
- [x] Net income shows null for packages without cost price
- [x] Both products and packages show net income in reports

## Migration Steps

### For Existing Deployments

1. **Apply Database Migration:**
   ```bash
   psql -U postgres -d beerhive_db -f migrations/release-v1.1.1/add_cost_price_to_packages.sql
   ```

2. **Deploy Application Code:**
   - Entity updates are backward compatible (nullable field)
   - UI changes are additive (new optional field)
   - Reports will gracefully handle packages with/without cost_price

3. **Update Existing Packages (Optional):**
   - Existing packages will have `cost_price = null`
   - They will continue to function normally
   - Net income will show as "N/A" until cost price is set
   - Admins/Managers can gradually update cost prices as needed

## Files Changed

### Database
- `migrations/release-v1.1.1/add_cost_price_to_packages.sql` (new)

### Models
- `src/models/entities/Package.ts` (modified)

### Views
- `src/views/packages/PackageForm.tsx` (modified)

### Data Layer
- `src/data/repositories/PackageRepository.ts` (modified)
- `src/data/queries/reports.queries.ts` (modified)

### Documentation
- `docs/release-v1.1.1/PACKAGE_COST_PRICE_IMPLEMENTATION.md` (new)

## Backward Compatibility

✅ **Fully Backward Compatible**

- Existing packages without `cost_price` continue to work
- Database column is nullable
- Reports gracefully handle null values
- UI shows empty field for existing packages (can be updated anytime)
- No breaking changes to APIs or data structures

## Performance Considerations

- Added database index on `cost_price` for reporting queries
- Index is partial (only on non-null values) for efficiency
- Reports query already fetches package data; cost_price adds minimal overhead

## Future Enhancements

Potential improvements for future releases:
1. **Auto-calculate cost price** from component items (with override option)
2. **Cost price history tracking** for trend analysis
3. **Profit margin warnings** for packages with low margins
4. **Bulk cost price updates** for multiple packages

## Related Documentation

- Product cost pricing: See individual product implementation
- Reports module: See `docs/REPORTS_MODULE.md`
- Database schema: See `docs/release-v1.0.0/Database Structure.sql`

## Support

For questions or issues related to package cost pricing:
1. Check if database migration was applied
2. Verify package has cost_price set (not null)
3. Review reports query logs for errors
4. Contact development team with specific error details
