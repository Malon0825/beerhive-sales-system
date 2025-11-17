# Bugfix: Package Items Missing on Receipt

**Date**: 2024-11-17  
**Version**: v2.0.0  
**Type**: Data Structure / Display Issue

## Issue Description

**Symptom**: When printing receipts for orders containing packages (like "Ultimate Beer Bucket"), the receipt shows:
```
1x Ultimate Beer Bucket  ₱800.00
```

But doesn't show what's **included** in the package:
```
1x Ultimate Beer Bucket  ₱800.00
  • 5x San Mig Light (Bottle)
```

**Impact**:
- ❌ Customers can't see what they're getting
- ❌ Kitchen staff can't verify package contents
- ❌ No transparency on package composition
- ❌ Appears unprofessional

## Root Cause

When creating orders with packages, the system was storing:
- ✅ Package name (`Ultimate Beer Bucket`)
- ✅ Package price (`₱800.00`)
- ✅ Package ID (UUID)
- ❌ **Package items breakdown** (MISSING!)

The `order_items` table has a `complex_product_metadata` JSONB column that was designed for this purpose, but it was **never being populated** during order creation.

## Solution

### 1. Store Package Items in Order Creation

**File**: `src/core/use-cases/orders/CreateOrder.ts`

When processing package items, now stores the package contents in `complex_product_metadata`:

```typescript
// Fetch package with items (already included in getById)
const pkg = await PackageRepository.getById(item.package_id);

// Store package items in metadata for receipt display
const packageMetadata = (pkg.items && pkg.items.length > 0) ? {
  package_items: pkg.items.map((pi: any) => ({
    product_id: pi.product_id,
    product_name: pi.product?.name || 'Unknown Item',
    quantity: pi.quantity,
    is_choice_item: pi.is_choice_item || false,
    choice_group: pi.choice_group || null,
  }))
} : null;

// Include in order item
const orderItem = {
  // ... other fields ...
  complex_product_metadata: packageMetadata,
};
```

**What's stored**:
```json
{
  "package_items": [
    {
      "product_id": "uuid",
      "product_name": "San Mig Light (Bottle)",
      "quantity": 5,
      "is_choice_item": false,
      "choice_group": null
    }
  ]
}
```

### 2. Update OrderItem Type

**File**: `src/models/entities/Order.ts`

Added `complex_product_metadata` to the OrderItem interface:

```typescript
export interface OrderItem {
  // ... existing fields ...
  complex_product_metadata?: {
    package_items?: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      is_choice_item?: boolean;
      choice_group?: string | null;
    }>;
  } | null;
  created_at: string;
}
```

### 3. Display Package Items on Receipt

**File**: `src/views/pos/PrintableReceipt.tsx`

Added package items breakdown after the main item:

```tsx
{/* Package items breakdown */}
{item.package_id && item.complex_product_metadata?.package_items && (
  <tr>
    <td colSpan={3} style={{ fontSize: '8px', paddingLeft: '8px', color: '#666' }}>
      {item.complex_product_metadata.package_items.map((pi, idx) => (
        <div key={idx}>
          • {pi.quantity}x {pi.product_name}
        </div>
      ))}
    </td>
  </tr>
)}
```

## Receipt Output

### Before (Missing Info)
```
Items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Item                Qty   Total
Ultimate Beer       1x    ₱800.00
Bucket                 
```

### After (Complete Info)
```
Items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Item                Qty   Total
Ultimate Beer       1x    ₱800.00
Bucket
  • 5x San Mig Light (Bottle)
```

## Data Migration

### Existing Orders

**Old orders** (created before this fix) will **NOT** have package items data since it wasn't stored. They will display as before (just the package name).

**New orders** (created after this fix) will have full package breakdowns on receipts.

### Optional: Backfill Script

If you need to add package items to existing orders:

```sql
-- Backfill complex_product_metadata for existing package orders
UPDATE order_items oi
SET complex_product_metadata = jsonb_build_object(
  'package_items', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'product_id', pi.product_id,
        'product_name', p.name,
        'quantity', pi.quantity,
        'is_choice_item', pi.is_choice_item,
        'choice_group', pi.choice_group
      )
    )
    FROM package_items pi
    LEFT JOIN products p ON p.id = pi.product_id
    WHERE pi.package_id = oi.package_id
  )
)
WHERE oi.package_id IS NOT NULL
  AND oi.complex_product_metadata IS NULL;
```

**Note**: This backfill is **optional**. Only run if you need historical receipts to show package items.

## Testing

### Test New Orders

1. **Create package order**:
   - Go to POS
   - Add "Ultimate Beer Bucket" to cart
   - Complete payment
   - View/print receipt

2. **Verify receipt shows**:
   ```
   1x Ultimate Beer Bucket  ₱800.00
     • 5x San Mig Light (Bottle)
   ```

3. **Test multiple packages**:
   - Add 2x Beer Tower
   - Add 1x Ultimate Beer Bucket
   - Verify both show their items

4. **Test mixed orders**:
   - Add regular products
   - Add packages
   - Verify packages show items, products don't

### Database Verification

```sql
-- Check if package items are being stored
SELECT 
  o.order_number,
  oi.item_name,
  oi.package_id,
  oi.complex_product_metadata->'package_items' as package_items
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE oi.package_id IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 5;
```

Expected output:
```
order_number         item_name             package_items
ORD251117-0025-123   Ultimate Beer Bucket  [{"product_id":"...","product_name":"San Mig Light (Bottle)","quantity":5}]
```

## Benefits

### For Customers
- ✅ **Transparency** - See exactly what's in the package
- ✅ **Verification** - Confirm correct items received
- ✅ **Trust** - Professional itemized receipt

### For Kitchen
- ✅ **Clear instructions** - Know what to prepare
- ✅ **No guessing** - Package contents explicit
- ✅ **Accurate fulfillment** - Reduce errors

### For Business
- ✅ **Professional appearance** - Detailed receipts
- ✅ **Reduced disputes** - Clear documentation
- ✅ **Better tracking** - Know what's being sold

## Technical Details

### Database Schema

**Table**: `order_items`  
**Column**: `complex_product_metadata` (JSONB)  
**Purpose**: Store rich metadata for complex products (packages)

**Structure**:
```typescript
{
  package_items?: Array<{
    product_id: string;      // For inventory tracking
    product_name: string;    // For display
    quantity: number;        // Items per package
    is_choice_item?: boolean;// For choice packages
    choice_group?: string;   // Grouping for choices
  }>;
}
```

### Performance

**Impact**: Minimal
- Package data already fetched by `PackageRepository.getById()`
- No additional queries required
- JSONB storage is efficient
- Receipt rendering unaffected

### Future Enhancements

Consider for future releases:
- **Choice packages** - Allow customers to select items
- **Package customization** - Add/remove items
- **Dietary restrictions** - Flag allergens in package items
- **Ingredient substitutions** - Track item swaps
- **Package photos** - Show visual breakdown

## Related Files

1. **Modified**:
   - `src/core/use-cases/orders/CreateOrder.ts` - Store package metadata
   - `src/models/entities/Order.ts` - Add metadata to interface
   - `src/views/pos/PrintableReceipt.tsx` - Display package items

2. **Database**:
   - `order_items.complex_product_metadata` - JSONB column (existing)

3. **Related Fixes**:
   - [BUGFIX_PACKAGE_ITEMS_CACHE_STALE.md](./BUGFIX_PACKAGE_ITEMS_CACHE_STALE.md) - Package items sync
   - [FEATURE_MANUAL_CATALOG_SYNC.md](./FEATURE_MANUAL_CATALOG_SYNC.md) - Catalog refresh

## Summary

**Problem**: Package items not shown on receipts  
**Cause**: Package contents not stored in order_items  
**Solution**: Store package breakdown in complex_product_metadata  
**Result**: Receipts now show itemized package contents  
**Impact**: Better transparency and professional appearance
