Bugfix-V1.1.1

## Bugs

### Set Package Cost Price for Net Income

#### Description

Each package can now be assigned its own cost price in the Packages module. This cost price is used in the reports module to compute that package's net income.

**Key Features:**
- Add cost price field to package creation/editing form
- Cost price is optional and can be set independently of component item costs
- Reports module computes net income as: (Base Price - Cost Price) × Quantity Sold
- Packages without cost price show "N/A" for net income in reports
- Fully backward compatible with existing packages

#### Implementation Details

**Database Changes:**
- Added `cost_price` column to `packages` table (nullable, DECIMAL(10, 2))
- Added partial index for reporting query performance

**Code Changes:**
- Updated Package entity and TypeScript interfaces
- Enhanced PackageForm UI with cost price input field
- Modified PackageRepository create/update methods
- Updated reports query to fetch and compute net income for packages

**See detailed documentation:** `docs/release-v1.1.1/PACKAGE_COST_PRICE_IMPLEMENTATION.md`

#### How to Use

1. Go to Packages Module
2. Create new package or edit existing package
3. Enter cost price in the "Cost Price (₱)" field (optional)
4. Save the package
5. View net income in Reports → Products & Packages report

#### Files Changed

- `migrations/release-v1.1.1/add_cost_price_to_packages.sql` (new)
- `src/models/entities/Package.ts` (modified)
- `src/views/packages/PackageForm.tsx` (modified)
- `src/data/repositories/PackageRepository.ts` (modified)
- `src/data/queries/reports.queries.ts` (modified)

#### Bugfix: Package Net Income Not Displaying

**Status:** ✅ Fixed  
**Date:** November 19, 2025

**Problem:** Packages with cost_price set were not showing net income in the "All Products Sold" report. The NET INCOME column displayed "-" even when the package had a valid cost_price.

**Root Cause - TWO BUGS:**

1. **Backend (Minor):** The `getAllProductsAndPackagesSold()` function used falsy checks instead of proper null/undefined checks when parsing package prices.

2. **Frontend (Primary Bug):** The `TopProductsTable` component had hardcoded logic that ALWAYS displayed "-" for packages, regardless of whether they had cost_price or net_income data:
   ```typescript
   // ❌ Buggy code
   {product.item_type === 'product' ? (
     // Show net income
   ) : (
     <span className="text-gray-400">-</span>  // Always "-" for packages!
   )}
   ```

**Fix:**

1. **Backend:** Changed to proper null checks:
   ```typescript
   base_price: item.package?.base_price != null ? parseFloat(...) : undefined,
   cost_price: item.package?.cost_price != null ? parseFloat(...) : null,
   ```

2. **Frontend:** Removed package discrimination and unified the logic:
   ```typescript
   // ✅ Fixed - Works for BOTH products and packages
   {product.cost_price === null || product.cost_price === undefined ? (
     <span className="text-xs text-gray-500">-</span>
   ) : (
     <div>{formatCurrency(product.net_income)}</div>
   )}
   ```

**See detailed documentation:** `docs/release-v1.1.1/BUGFIX_PACKAGE_NET_INCOME_DISPLAY.md`

**Files Changed:**
- `src/data/queries/reports.queries.ts` (backend fix)
- `src/views/reports/TopProductsTable.tsx` (frontend fix - PRIMARY)

### Receipt elements are a little bit smaller

#### Description

Receipt elements in the POS module were too small and lacked visual hierarchy. Fixed by implementing a unified sizing system based on the Total label size.

#### Solution

**Implemented unified sizing system:**
- **Base size:** 12px for all main content (items, prices, subtotal, discount, tax)
- **Total emphasis:** Total label 14px, Total amount 18px (most prominent)
- **Secondary info:** Order details, payment header 11px

**Size increases:**
- Items table: 9px → 12px (+33%)
- Subtotal/Discount/Tax: 10px → 12px (+20%)
- Total label: 12px → 14px (+17%)
- Total amount: 14px → 18px (+29%)
- Payment details: 10px → 12px (+20%)

**Benefits:**
- Better readability on screen and print
- Clear visual hierarchy (Total stands out)
- Professional appearance
- Still fits 80mm thermal paper width

**See detailed documentation:** `docs/release-v1.1.1/RECEIPT_SIZE_FIX.md`

**Files Changed:**
- `src/views/pos/PrintableReceipt.tsx` (modified)


### Able to void a Tab Order

#### Description

Able to void a Tab Order

