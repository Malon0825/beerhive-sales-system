# Cart Table Selection Fix

**Version:** 1.0.1  
**Date:** 2025-01-11  
**Type:** Bug Fix

## Problem

After implementing local-first architecture, the cart required a table to be selected **before** adding items. This broke the existing POS workflow where cashiers often add items first and select the table later.

**Error:**
```
Error: Please select a table first
at CartProvider.useCallback[ensureCurrentOrder]
```

## Root Cause

The `ensureCurrentOrder()` function threw an error when no table was selected because:
1. IndexedDB order creation requires a table number for broadcasting
2. Customer display sync requires a table to route updates

## Solution

### Graceful Degradation

**Allow cart to work without a table, sync when table is selected:**

1. **Cart without table** - Items added to React state only
2. **Table selected** - Order created in IndexedDB, existing items synced
3. **Subsequent changes** - Synced to IndexedDB and broadcast to customer display

### Code Changes

#### 1. Modified `ensureCurrentOrder()`

**Before:**
```typescript
if (!table?.table_number) {
  throw new Error('Please select a table first');
}
```

**After:**
```typescript
if (!table?.table_number) {
  console.warn('[CartContext] No table selected, cart will work locally only');
  return null; // Allow cart without order ID
}
```

#### 2. Updated `addItem()` and `addPackage()`

**Handle null orderId gracefully:**
```typescript
const orderId = await ensureCurrentOrder();

// Add to cart state regardless of orderId
setItems(prevItems => {
  const updatedItems = [...prevItems, newItem];
  
  // Sync to IndexedDB only if we have an order
  if (orderId) {
    setTimeout(() => syncToIndexedDB(orderId), 0);
  }
  return updatedItems;
});

// Broadcast only if we have order and table
if (orderId && table?.table_number) {
  await saveOrderItem(localItem);
  broadcastItemAdded(orderId, table.table_number, itemId, localItem);
} else if (!orderId) {
  console.log('⚠️ Item added to cart only (no table selected)');
}
```

#### 3. Enhanced `setTable()`

**Sync existing cart when table is selected:**
```typescript
const setTable = useCallback(async (newTable: RestaurantTable | null) => {
  const previousTable = table;
  setTableState(newTable);
  
  // If table is being set for the first time and we have items in cart
  if (!previousTable && newTable?.table_number && items.length > 0) {
    console.log('📍 Table selected with existing cart items, creating order...');
    
    // Create order now that we have a table
    const orderId = await ensureCurrentOrder();
    
    if (orderId) {
      // Sync all existing items to IndexedDB
      await syncToIndexedDB(orderId);
      console.log('💾 Existing cart synced to customer display');
    }
  }
}, [currentOrderId, table, items, syncToIndexedDB, ensureCurrentOrder]);
```

## Workflow

### Scenario 1: Table First (Customer Display Active)
```
1. Cashier selects table → Order created in IndexedDB
2. Cashier adds items → Synced to IndexedDB + broadcast
3. Customer sees updates in real-time ✅
```

### Scenario 2: Items First (No Customer Display Yet)
```
1. Cashier adds items → Stored in React state only
2. Cashier selects table → Order created + existing items synced
3. Customer sees complete order instantly ✅
4. Further changes → Synced to IndexedDB + broadcast
```

### Scenario 3: No Table (POS Only)
```
1. Cashier adds items → Stored in React state only
2. Cashier proceeds to payment → Works normally ✅
3. No customer display (no table selected)
```

## Benefits

✅ **Flexible workflow** - Cashiers can add items before or after selecting table  
✅ **No breaking changes** - Existing POS workflow preserved  
✅ **Graceful degradation** - Cart works even if IndexedDB/broadcast fails  
✅ **Better UX** - No forced order of operations  
✅ **Customer display** - Still gets instant updates when table is selected  

## Console Logs

**Items added without table:**
```
⚠️ [CartContext] No table selected, cart will work locally only
⚠️ [CartContext] Item added to cart only (no table selected, not synced to customer display)
```

**Table selected with existing items:**
```
📍 [CartContext] Table selected with existing cart items, creating order...
💾 [CartContext] Local order created in IndexedDB: local_order_...
💾 [CartContext] Existing cart synced to customer display for table: Table 5
📡 [CartContext] Order broadcast to table: Table 5
```

## Testing

1. **Test without table:**
   - Add items without selecting table
   - Verify items appear in cart
   - No errors in console

2. **Test table selection:**
   - Add 2-3 items without table
   - Select a table
   - Verify customer display shows all items instantly

3. **Test normal flow:**
   - Select table first
   - Add items
   - Verify real-time sync to customer display

## Files Modified

- `src/lib/contexts/CartContext.tsx` (~50 lines modified)
  - `ensureCurrentOrder()` - Returns null instead of throwing
  - `addItem()` - Handles null orderId
  - `addPackage()` - Handles null orderId
  - `setTable()` - Syncs existing cart when table selected

## Summary

The cart now works flexibly whether the cashier selects a table first or adds items first. Customer displays receive updates only when a table is selected, maintaining the real-time sync benefits while not breaking the POS workflow.
