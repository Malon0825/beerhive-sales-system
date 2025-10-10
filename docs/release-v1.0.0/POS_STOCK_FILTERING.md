# POS Stock Filtering for Drinks

## Overview

The POS system now intelligently filters products based on stock availability. Drinks and beverages with zero stock are automatically hidden from the product list, while food items and assembled products (packages) remain visible regardless of stock levels.

## Implementation Details

### Stock Filtering Rules

1. **Drinks/Beverages** (Beer, Alcoholic, Non-Alcoholic)
   - ✅ **Hidden when stock = 0**
   - ✅ Shown when stock > 0
   - Categories affected:
     - Beer
     - Beverage
     - Drink
     - Alcohol

2. **Food Products**
   - ✅ **Always visible** regardless of stock
   - Categories: Food, Appetizer, Snack, Pulutan

3. **Packages (Assembled Products)**
   - ✅ **Always visible** regardless of stock
   - Packages are pre-configured bundles
   - Stock managed at individual item level

### Code Implementation

#### Location
**File**: `src/views/pos/POSInterface.tsx`

#### Helper Functions

```typescript
/**
 * Check if a product is a drink/beverage (beer, alcoholic, non-alcoholic)
 * These products should be hidden when out of stock
 * @param product - Product to check
 * @returns true if product is a drink/beverage
 */
const isDrinkProduct = (product: Product): boolean => {
  const categoryName = (product as any).category?.name?.toLowerCase() || '';
  return categoryName.includes('beer') || 
         categoryName.includes('beverage') || 
         categoryName.includes('drink') ||
         categoryName.includes('alcohol');
};

/**
 * Check if product should be visible based on stock
 * Drinks with no stock are hidden, other products always shown
 * @param product - Product to check
 * @returns true if product should be displayed
 */
const isProductAvailable = (product: Product): boolean => {
  // If it's a drink, check stock level
  if (isDrinkProduct(product)) {
    return product.current_stock > 0;
  }
  // Non-drink products (food, etc.) always available
  return true;
};
```

#### Applied Filters

1. **All Products Tab**
   ```typescript
   const filteredProducts = products.filter(product => {
     const matchesSearch = /* search logic */;
     const matchesCategory = /* category logic */;
     const isAvailable = isProductAvailable(product); // ← Stock filter
     return matchesSearch && matchesCategory && isAvailable;
   });
   ```

2. **Featured Products Tab**
   ```typescript
   const featuredProducts = products.filter(product => 
     product.is_featured && 
     product.is_active &&
     matchesSearch &&
     isProductAvailable(product) // ← Stock filter
   );
   ```

3. **Beer Tab**
   ```typescript
   const beerProducts = products.filter(product => {
     const isDrink = /* category check */;
     const hasStock = product.current_stock > 0; // ← Explicit stock check
     return isDrink && matchesSearch && product.is_active && hasStock;
   });
   ```

4. **Packages Tab**
   - No stock filtering applied
   - Packages always visible
   - Stock managed at item level within package

## UI Updates

### Stock Status Indicators

1. **Low Stock Warning**
   - Shown when: `current_stock <= reorder_point && current_stock > 0`
   - Display: Red text "Low Stock"

2. **Out of Stock** (All Products tab only)
   - Shown when: `current_stock === 0`
   - Display: Gray text "Out of Stock"
   - Note: Out-of-stock drinks are filtered out, so this mainly appears for non-drink items

## Business Logic

### Why This Approach?

1. **Drinks/Beverages**
   - Cannot be served without stock
   - Immediate availability required
   - Prevents customer disappointment
   - Reduces order cancellations

2. **Food Items**
   - May be preparable with substitute ingredients
   - Kitchen can confirm availability before preparation
   - More flexibility in fulfillment

3. **Packages**
   - Assembled bundles of products
   - Stock tracked at individual item level
   - Package availability checked during cart validation
   - Allows staff to verify component availability

## Testing Guide

### Test Scenario 1: Out-of-Stock Beer

1. **Setup**:
   - Product: San Miguel Beer
   - Category: Beer
   - Stock: 0 bottles

2. **Expected Behavior**:
   - ❌ Not visible in "All Products" tab
   - ❌ Not visible in "Beer" tab
   - ❌ Not visible in "Featured" tab (even if featured)
   - ✅ Cannot be added to cart

3. **Test Steps**:
   ```sql
   -- Set beer stock to 0
   UPDATE products 
   SET current_stock = 0 
   WHERE name = 'San Miguel Beer';
   ```
   - Refresh POS page
   - Check all tabs
   - Verify product is hidden

### Test Scenario 2: Low-Stock Beer

1. **Setup**:
   - Product: San Miguel Beer
   - Category: Beer
   - Stock: 5 bottles
   - Reorder Point: 10 bottles

2. **Expected Behavior**:
   - ✅ Visible in all relevant tabs
   - ✅ Shows "Low Stock" warning in red
   - ✅ Can be added to cart

3. **Test Steps**:
   ```sql
   -- Set low stock
   UPDATE products 
   SET current_stock = 5, reorder_point = 10
   WHERE name = 'San Miguel Beer';
   ```
   - Refresh POS page
   - Verify product is visible with warning

### Test Scenario 3: Out-of-Stock Food

1. **Setup**:
   - Product: Sisig
   - Category: Food
   - Stock: 0

2. **Expected Behavior**:
   - ✅ Still visible in "All Products" tab
   - ✅ Still visible in "Food" tab
   - ⚠️ Shows "Out of Stock" indicator
   - ✅ Can still be added to cart (kitchen confirms)

3. **Test Steps**:
   ```sql
   -- Set food stock to 0
   UPDATE products 
   SET current_stock = 0 
   WHERE name LIKE '%Sisig%';
   ```
   - Refresh POS page
   - Verify product still appears

### Test Scenario 4: Package Availability

1. **Setup**:
   - Package: Beer Bucket (5 beers)
   - Component Stock: Various levels

2. **Expected Behavior**:
   - ✅ Package always visible in "Packages" tab
   - ✅ Availability checked during cart operations
   - ⚠️ Warning shown if components unavailable

3. **Test Steps**:
   - Navigate to Packages tab
   - Verify all packages are displayed
   - Try adding package with out-of-stock components
   - System should validate component availability

## API Response Requirements

### Product List API

The `/api/products` endpoint must include:

```json
{
  "id": "uuid",
  "name": "Product Name",
  "current_stock": 25,
  "reorder_point": 10,
  "category": {
    "name": "Beer" // or "Food", "Beverage", etc.
  }
}
```

**Required Fields**:
- `current_stock`: Number (required for filtering)
- `category.name`: String (required for drink detection)
- `reorder_point`: Number (required for low stock warning)

## Database Schema

### Products Table

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  current_stock NUMERIC NOT NULL DEFAULT 0,
  reorder_point NUMERIC NOT NULL DEFAULT 10,
  -- other fields...
);
```

### Categories Table

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  -- other fields...
);
```

**Drink Categories** (case-insensitive):
- Beer
- Beverage
- Drink
- Alcohol (includes "alcoholic", "non-alcoholic")

## Troubleshooting

### Issue: Drinks still showing with 0 stock

**Solution**:
1. Clear browser cache
2. Verify product category name includes "beer", "beverage", or "drink"
3. Check API response includes `current_stock` field
4. Verify `current_stock` is numeric (not null or string)

### Issue: Food hidden when out of stock

**Solution**:
1. Verify category name is "Food", "Appetizer", "Snack", or "Pulutan"
2. Check `isDrinkProduct()` function is not matching food category
3. Clear browser cache and refresh

### Issue: Package not showing

**Solution**:
1. Packages are never filtered by stock
2. Check package `is_active` field is `true`
3. Verify `/api/packages?active=true` returns the package
4. Check Packages tab is selected in UI

## Performance Considerations

- **Client-Side Filtering**: All filtering happens in browser
- **Impact**: Minimal - O(n) complexity on product array
- **Load Time**: No additional API calls required
- **Memory**: No significant memory overhead

## Future Enhancements

### Possible Improvements

1. **Real-Time Stock Updates**
   - WebSocket integration for live stock changes
   - Auto-refresh when stock levels change

2. **Advanced Filtering**
   - Filter by multiple criteria simultaneously
   - Custom category-specific rules
   - Location-based stock availability

3. **Stock Reservation**
   - Reserve stock when added to cart
   - Release on cart clear/timeout
   - Prevent overselling

4. **Predictive Stock Alerts**
   - Alert when stock approaching zero
   - Suggest reorder before stockout
   - Historical demand analysis

## Related Documentation

- **Product Management**: `docs/IMPLEMENTATION_GUIDE.md`
- **Inventory System**: `docs/Database Structure.sql`
- **POS System**: `src/views/pos/POSInterface.tsx`
- **Categories**: Category management in admin panel

---

**Implementation Date**: October 6, 2024  
**Status**: ✅ Active  
**Maintainer**: Development Team
