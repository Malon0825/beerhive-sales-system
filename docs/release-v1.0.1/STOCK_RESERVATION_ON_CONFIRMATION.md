# Stock Reservation System: Deduct on Confirmation

**Date:** 2025-10-10  
**Critical Feature:** Stock Deduction Timing  
**Status:** ✅ IMPLEMENTED

## 🎯 Problem Solved

### **The Overbooking Problem**

**Before (WRONG):**
```
Initial Stock: 10 chickens

Table 1: Orders 5 chickens → Confirmed → Stock still shows 10 ❌
Table 2: Orders 10 chickens → Confirmed → Stock still shows 10 ❌
Kitchen: Starts preparing 15 chickens total
Table 1: Closes tab → Stock deducted (10 - 5 = 5) ✅
Table 2: Closes tab → Stock deducted (5 - 10 = -5) ❌ DISASTER!

Result: Negative stock, kitchen can't fulfill, customer disappointed
```

**After (CORRECT):**
```
Initial Stock: 10 chickens

Table 1: Orders 5 chickens → Confirmed → Stock deducted (10 - 5 = 5) ✅
Table 2: Tries to order 10 chickens → ERROR: Only 5 available! ✅
Table 2: Orders 5 chickens → Confirmed → Stock deducted (5 - 5 = 0) ✅
Kitchen: Only prepares what's available (10 total)
Table 1: Closes tab → No stock change (already deducted) ✅
Table 2: Closes tab → No stock change (already deducted) ✅

Result: Perfect inventory control, no overbooking!
```

---

## 📋 New Business Logic

### **When Stock is Deducted**

| Event | Old Behavior | New Behavior |
|-------|-------------|--------------|
| **Add to cart** | No change | No change |
| **Confirm order** | No change ❌ | **Stock deducted** ✅ |
| **Kitchen prepares** | No change | No change (already deducted) |
| **Customer pays** | Stock deducted ❌ | No change (already deducted) ✅ |
| **Remove confirmed item** | N/A | Stock returned |
| **Void order** | Stock returned | Stock returned |

### **Stock Lifecycle**

```
┌─────────────────┐
│  Product Stock  │
│   Available: 10 │
└────────┬────────┘
         │
         ▼
    [Add to Cart]
         │
         ▼ Cart doesn't reserve stock
┌─────────────────┐
│  Draft Order    │
│   5 items       │
│   Stock: 10     │ ← Still available
└────────┬────────┘
         │
         ▼
  [CONFIRM ORDER] ◄── STOCK DEDUCTED HERE!
         │
         ▼
┌─────────────────┐
│ Confirmed Order │
│   5 items       │
│   Stock: 5      │ ← Reduced immediately
└────────┬────────┘
         │
         ▼
   [Send to Kitchen]
         │
         ▼
┌─────────────────┐
│ Preparing       │
│   Stock: 5      │ ← No change
└────────┬────────┘
         │
         ▼
  [Customer Pays]
         │
         ▼
┌─────────────────┐
│   Completed     │
│   Stock: 5      │ ← No change (already deducted)
└─────────────────┘
```

---

## 🔧 Implementation Details

### **1. Order Confirmation (OrderService.confirmOrder)**

**File:** `src/core/services/orders/OrderService.ts`

**New Flow:**
```typescript
static async confirmOrder(orderId: string, userId?: string): Promise<Order> {
  // 1. Get order
  const order = await OrderRepository.getById(orderId);
  
  // 2. CHECK STOCK AVAILABILITY
  const stockCheck = await StockDeduction.checkStockAvailability(items);
  if (!stockCheck.available) {
    throw new AppError('Insufficient stock to confirm order');
  }
  
  // 3. DEDUCT STOCK IMMEDIATELY
  await StockDeduction.deductForOrder(orderId, items, userId);
  
  // 4. Mark as confirmed
  await OrderRepository.updateStatus(orderId, 'CONFIRMED');
  
  // 5. Route to kitchen
  await KitchenRouting.routeOrder(orderId, items);
  
  return confirmedOrder;
}
```

**Key Changes:**
- ✅ Stock availability checked BEFORE confirmation
- ✅ Stock deducted IMMEDIATELY when confirmed
- ✅ If stock deduction fails, order is NOT confirmed
- ✅ User ID tracked for audit trail

### **2. Tab Closing (OrderSessionService.closeTab)**

**File:** `src/core/services/orders/OrderSessionService.ts`

**Old Code (REMOVED):**
```typescript
// ❌ OLD: Deducted at payment time
await StockDeduction.deductForOrder(orderId, items, userId);
```

**New Code:**
```typescript
// ✅ NEW: Stock already deducted at confirmation
console.log('Stock was already deducted at confirmation time');
// No stock changes needed
```

**Key Changes:**
- ❌ Removed stock deduction from tab closing
- ✅ Added informational logging
- ✅ Payment processes without touching inventory

### **3. Order Completion (OrderService.completeOrder)**

**File:** `src/core/services/orders/OrderService.ts`

**Old Code (REMOVED):**
```typescript
// ❌ OLD: Deducted at completion
await StockDeduction.deductForOrder(orderId, items, userId);
```

**New Code:**
```typescript
// ✅ NEW: Stock already deducted
console.log('Stock was already deducted at confirmation time');
// No stock changes needed
```

### **4. API Endpoint Update**

**File:** `src/app/api/orders/[orderId]/confirm/route.ts`

**Changes:**
```typescript
// Get authenticated user for audit trail
const authenticatedUser = await getAuthenticatedUser(request);
const userId = authenticatedUser?.id || (await UserRepository.getDefaultPOSUser()).id;

// Confirm order (checks stock and deducts)
const confirmedOrder = await OrderService.confirmOrder(orderId, userId);

return {
  message: 'Order confirmed and sent to kitchen. Stock has been reserved.'
};
```

**Key Changes:**
- ✅ Gets authenticated user for audit trail
- ✅ Passes userId to confirmOrder
- ✅ Updated success message to indicate stock reservation

---

## 🔄 Integration Points

### **Order Item Management**

When items are removed from confirmed orders:

**File:** `src/core/services/orders/OrderItemService.ts`

```typescript
// Remove item from confirmed order
await OrderItemService.removeOrderItem(orderId, itemId, userId);

// This automatically:
// 1. Returns stock to inventory
// 2. Deletes kitchen orders
// 3. Recalculates order totals
```

**Result:** Stock is returned immediately when items are removed.

### **Void Orders**

When orders are voided:

**File:** `src/core/services/orders/VoidOrderService.ts`

```typescript
// Void order with stock return
await VoidOrderService.voidOrder(orderId, managerId, reason, returnInventory: true);

// This automatically:
// 1. Marks order as VOIDED
// 2. Returns stock to inventory
// 3. Logs void reason
```

**Result:** Stock is returned when orders are voided.

---

## 📊 User Experience Changes

### **For Cashiers/Waiters**

**What Changes:**
1. ✅ **Instant Stock Validation**: Can't confirm orders without sufficient stock
2. ✅ **Clear Error Messages**: "Insufficient stock. Available: 5, Requested: 10"
3. ✅ **No Surprises**: Know immediately if item is available

**Example Scenario:**
```
Waiter: Takes order for 10 chickens
Waiter: Tries to confirm order
System: ❌ "Insufficient stock to confirm order. 
         Product abc123: requested 10, available 5"
Waiter: Informs customer only 5 available
Customer: "OK, I'll take 5 then"
Waiter: Confirms order for 5 chickens
System: ✅ "Order confirmed and sent to kitchen. Stock has been reserved."
```

### **For Kitchen/Bar**

**What Changes:**
1. ✅ **Only Confirmed Orders**: Kitchen only receives orders that have stock
2. ✅ **No Cancellations Due to Stock**: Can't happen anymore
3. ✅ **Reliable Prep Queue**: What they see is what they need to make

### **For Managers**

**What Changes:**
1. ✅ **Real-time Stock Accuracy**: Stock levels always reflect reality
2. ✅ **No Negative Stock**: Impossible to oversell
3. ✅ **Better Inventory Control**: Can trust the numbers

---

## 🧪 Testing Scenarios

### **Test Case 1: Prevent Overbooking**

**Setup:**
- Product: Chicken Wings
- Initial Stock: 10

**Steps:**
1. Table 1: Add 5 wings to cart → Stock: 10 (unchanged)
2. Table 2: Add 8 wings to cart → Stock: 10 (unchanged)
3. Table 1: Confirm order → Stock: 5 ✅ (deducted immediately)
4. Table 2: Try to confirm order → ❌ Error: "Insufficient stock. Available: 5, Requested: 8"
5. Table 2: Reduce to 5 wings
6. Table 2: Confirm order → Stock: 0 ✅
7. Table 3: Try to order wings → ❌ Error: "Insufficient stock. Available: 0"

**Expected Result:** ✅ No overbooking, both tables served correctly

### **Test Case 2: Remove Items Returns Stock**

**Setup:**
- Product: Beer
- Initial Stock: 20

**Steps:**
1. Table 1: Order 10 beers → Confirm → Stock: 10
2. Customer: "Actually, just 5 beers"
3. Waiter: Opens "Manage Items" → Removes 5 beers
4. System: Stock: 15 ✅ (5 returned)
5. Table 2: Can now order those 5 beers

**Expected Result:** ✅ Stock returned, available for other orders

### **Test Case 3: Void Order Returns Stock**

**Setup:**
- Product: Pasta
- Initial Stock: 8

**Steps:**
1. Table 1: Order 5 pasta → Confirm → Stock: 3
2. Manager: Voids order (customer left)
3. System: Stock: 8 ✅ (5 returned)
4. Table 2: Can order the pasta

**Expected Result:** ✅ Stock fully returned on void

### **Test Case 4: Payment Doesn't Deduct Again**

**Setup:**
- Product: Sandwich
- Initial Stock: 15

**Steps:**
1. Table 1: Order 5 sandwiches → Confirm → Stock: 10
2. Kitchen: Prepares sandwiches → Stock: 10 (no change)
3. Customer: Pays for order → Stock: 10 ✅ (no change)
4. Verify: Only one deduction happened (at confirmation)

**Expected Result:** ✅ No double deduction

---

## ⚠️ Important Considerations

### **Draft Orders Don't Reserve Stock**

**Why?**
- Customers might browse the menu for 30 minutes
- Items in cart shouldn't block other customers
- Only committed orders (confirmed) reserve stock

**Impact:**
- Multiple tables can have the same item in cart
- First to confirm gets the stock
- Others get error if insufficient stock remains

### **Stock is Reserved Until Payment or Void**

**Scenario:**
```
Table 1: Confirms 10 chickens (stock deducted)
Table 1: Never pays (customer leaves)
Manager: Must void the order to return stock
```

**Best Practice:**
- Monitor abandoned sessions
- Void abandoned orders promptly
- Stock will be returned and available again

### **Edit Items After Confirmation**

**Increasing Quantity:**
```
Order confirmed: 5 chickens (stock: 95)
Edit to: 10 chickens
System checks: Need 5 more, available? Yes
Deducts: 5 more chickens (stock: 90)
```

**Decreasing Quantity:**
```
Order confirmed: 10 chickens (stock: 90)
Edit to: 5 chickens
System returns: 5 chickens (stock: 95)
```

---

## 🔍 Audit Trail

### **Inventory Movements Log**

Every stock change is logged:

```sql
SELECT * FROM inventory_movements 
WHERE movement_type = 'sale' 
ORDER BY created_at DESC;
```

**Fields Tracked:**
- `product_id`: What product
- `quantity_change`: How much (negative for deduction)
- `movement_type`: 'sale' for order confirmations
- `reason`: Order ID
- `performed_by`: User who confirmed the order
- `created_at`: Timestamp

**Example Entry:**
```json
{
  "product_id": "abc-123",
  "quantity_change": -5,
  "movement_type": "sale",
  "reason": "Order confirmation for order-456",
  "performed_by": "user-789",
  "created_at": "2025-10-10T12:30:00Z"
}
```

---

## 📈 Benefits

### **Business Benefits**

1. ✅ **No Overbooking**: Can't sell what you don't have
2. ✅ **Customer Satisfaction**: No disappointing "we're out" after ordering
3. ✅ **Kitchen Efficiency**: Only prepare what's available
4. ✅ **Inventory Accuracy**: Real-time stock levels
5. ✅ **Revenue Protection**: Don't lose sales due to bad stock data

### **Technical Benefits**

1. ✅ **Data Integrity**: Stock levels always correct
2. ✅ **No Negative Stock**: Impossible scenario
3. ✅ **Clear Audit Trail**: Every movement tracked
4. ✅ **Simple Logic**: Deduct once, at the right time
5. ✅ **Fewer Bugs**: No race conditions between tables

---

## 🚨 Migration Notes

### **For Existing Systems**

If upgrading from old system where stock was deducted at payment:

**IMPORTANT:** 
- Existing CONFIRMED orders may not have stock deducted yet
- Need to run a migration to:
  1. Identify all CONFIRMED orders
  2. Deduct stock for those orders
  3. Mark them as migrated

**Migration Script (Pseudo-code):**
```typescript
// Find all confirmed orders without stock deduction
const confirmedOrders = await getConfirmedOrdersBeforeDate('2025-10-10');

for (const order of confirmedOrders) {
  // Deduct stock for this order
  await StockDeduction.deductForOrder(
    order.id,
    order.order_items,
    'migration-script'
  );
  
  // Mark as migrated
  await logMigration(order.id);
}
```

**Alternative:**
- If migration is complex, can void old confirmed orders
- Start fresh with new system
- Adjust stock manually to match reality

---

## 📚 Related Documentation

- [Stock Deduction Service](./STOCK_DEDUCTION_SERVICE.md)
- [Order Item Management](./TAB_ORDER_ITEM_MANAGEMENT_FEATURE.md)
- [Void Order Service](./VOID_ORDER_SERVICE.md)
- [Inventory Movement Logging](./INVENTORY_MOVEMENT_LOGGING.md)

---

## ✅ Checklist for Developers

When working with orders:

- [ ] Understand stock is deducted at CONFIRMATION, not payment
- [ ] Always check stock availability before confirming
- [ ] Return stock when removing items or voiding orders
- [ ] Don't deduct stock at payment/completion
- [ ] Log all inventory movements with user ID
- [ ] Handle "insufficient stock" errors gracefully
- [ ] Inform users when stock is reserved
- [ ] Test multi-table scenarios

---

## 🎓 Key Takeaways

1. **Stock deducts when order is CONFIRMED** (sent to kitchen)
2. **Payment does NOT deduct stock** (already done)
3. **Removing items RETURNS stock** (immediately available)
4. **Voiding orders RETURNS stock** (back to inventory)
5. **Cart doesn't reserve stock** (only confirmed orders do)
6. **Can't oversell** (stock check prevents it)
7. **Real-time accuracy** (stock levels always correct)

---

**This is a critical business logic change that prevents revenue loss and customer dissatisfaction!**
