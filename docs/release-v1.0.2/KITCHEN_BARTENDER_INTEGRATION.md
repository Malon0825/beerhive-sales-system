# Kitchen & Bartender Station Integration

## Overview

The Manage Tab Items system is **FULLY INTEGRATED** with both kitchen AND bartender stations. When order items are modified (quantity reduced or removed), the appropriate station(s) receive real-time notifications.

---

## How It Works

### Two Stations, One System

The system uses the `kitchen_orders` table for **BOTH** stations:

```
kitchen_orders table
├── destination: 'kitchen'    → Kitchen display
├── destination: 'bartender'  → Bartender display
└── destination: 'both'       → BOTH displays
```

**Key Point**: Despite the table name, it handles kitchen AND bartender orders!

---

## Order Routing by Product Type

When an order is created, items are routed based on product category:

### Food Items → Kitchen
```typescript
Product Category: "Appetizers", "Main Course", "Desserts", etc.
  ↓
destination = 'kitchen'
  ↓
Appears on Kitchen Display
```

### Drinks → Bartender
```typescript
Product Category: "Beer", "Wine", "Cocktails", "Spirits", etc.
  ↓
destination = 'bartender'
  ↓
Appears on Bartender Display
```

### Mixed Orders → Both
```typescript
Order contains: 5x Wings + 3x Beer
  ↓
Wings → destination = 'kitchen'
Beer → destination = 'bartender'
  ↓
Kitchen sees: "5x Wings"
Bartender sees: "3x Beer"
```

---

## Modification Flow by Station

### Scenario: Customer Reduces Beer Order

**Original Order**: 5x Beer (routed to bartender)

**Customer Changes**: "Actually, I only want 3 beers"

#### What Happens:

1. **System detects destination**: `'bartender'`

2. **Check bartender status**:
   - ✅ Pending → Safe to cancel
   - ⚠️ Preparing → Bartender is making drinks
   - ⚠️ Ready → Drinks already made

3. **If Pending**:
   ```
   ✅ Cancel old bartender order (5x Beer)
   ✅ Cashier sees: "Order updated"
   ✅ Bartender display: Order disappears
   ✅ No waste
   ```

4. **If Preparing or Ready**:
   ```
   ⚠️ Create NEW bartender order with MODIFIED flag
   
   Bartender Display Shows:
   ┌─────────────────────────────────┐
   │ ⚠️ MODIFIED - URGENT            │
   │ Beer                            │
   │ Changed from 5 to 3 units      │
   │ Order: ORD-123                 │
   └─────────────────────────────────┘
   
   ✅ Bartender sees change immediately
   ✅ Can adjust (2 beers may be wasted)
   ```

5. **Stock Adjusted**:
   ```
   ✅ 2 beers returned to inventory
   ✅ Audit trail logged
   ✅ Order total reduced
   ```

---

### Scenario: Customer Reduces Wings Order

**Original Order**: 5x Wings (routed to kitchen)

**Customer Changes**: "Just 3 wings please"

#### What Happens:

1. **System detects destination**: `'kitchen'`

2. **Check kitchen status**:
   - ✅ Pending → Safe to cancel
   - ⚠️ Preparing → Chef is cooking
   - ⚠️ Ready → Food already plated

3. **If Pending**:
   ```
   ✅ Cancel old kitchen order (5x Wings)
   ✅ Kitchen display: Order removed
   ✅ No food waste
   ```

4. **If Preparing or Ready**:
   ```
   ⚠️ Create NEW kitchen order with MODIFIED flag
   
   Kitchen Display Shows:
   ┌─────────────────────────────────┐
   │ ⚠️ MODIFIED - URGENT            │
   │ Chicken Wings                   │
   │ Changed from 5 to 3 units      │
   │ Order: ORD-123                 │
   └─────────────────────────────────┘
   
   ✅ Chef sees change immediately
   ✅ Can adjust preparation
   ```

5. **Stock Adjusted**:
   ```
   ✅ 2 wings returned to inventory
   ✅ Audit trail logged
   ✅ Order total reduced
   ```

---

### Scenario: Mixed Order Modification

**Original Order**:
- 5x Wings → Kitchen
- 3x Beer → Bartender

**Customer Changes**: "Only 3 wings"

#### What Happens:

1. **System identifies**: Wings are kitchen items

2. **Kitchen notified**: New MODIFIED order created

3. **Bartender unaffected**: Beer order unchanged

4. **Result**:
   ```
   Kitchen: Gets MODIFIED notification (5→3 wings)
   Bartender: No change (still sees 3 beers)
   
   ✅ Only affected station notified
   ✅ Other station continues normally
   ```

---

## Station Display Examples

### Kitchen Display

```
┌─────────────────────────────────────────┐
│ KITCHEN ORDERS                          │
├─────────────────────────────────────────┤
│ PENDING (2)                             │
│ ✓ Table 5 - Wings x3                   │
│ ✓ Table 7 - Burger x1                  │
├─────────────────────────────────────────┤
│ ⚠️ URGENT - MODIFIED (1)                │
│ ⚠️ Table 5 - Wings                      │
│    Changed from 5 to 3 units           │
│    [URGENT - Customer Modification]    │
├─────────────────────────────────────────┤
│ PREPARING (1)                           │
│ 🔥 Table 3 - Steak x2                   │
└─────────────────────────────────────────┘
```

### Bartender Display

```
┌─────────────────────────────────────────┐
│ BARTENDER ORDERS                        │
├─────────────────────────────────────────┤
│ PENDING (2)                             │
│ ✓ Table 2 - Beer x4                    │
│ ✓ Table 8 - Margarita x2               │
├─────────────────────────────────────────┤
│ ⚠️ URGENT - MODIFIED (1)                │
│ ⚠️ Table 6 - Mojito                     │
│    Changed from 3 to 2 units           │
│    [URGENT - Customer Modification]    │
├─────────────────────────────────────────┤
│ PREPARING (1)                           │
│ 🍹 Table 4 - Long Island x1             │
└─────────────────────────────────────────┘
```

---

## Code Implementation

### How System Preserves Destination

```typescript
// OrderModificationService.ts

// Step 1: Get existing kitchen/bartender orders
const kitchenOrders = await getKitchenOrdersForItem(orderId, itemId);

// Step 2: Check destination from original order
const destination = existingOrders[0].destination;
// destination can be: 'kitchen' | 'bartender' | 'both'

// Step 3: Create modified order with SAME destination
await KitchenOrderRepository.create({
  order_id: orderId,
  order_item_id: itemId,
  product_name: itemName,
  destination: destination, // ✅ Preserves original routing!
  special_instructions: `⚠️ MODIFIED: Changed from ${oldQty} to ${newQty}`,
  is_urgent: true,
});

// Result: Goes to same station(s) as original order
```

### Logging Shows Which Station

```typescript
console.log(
  `📢 [OrderModificationService] Notifying ${destination} station(s) of modification`
);

// Logs:
// "Notifying kitchen station(s) of modification"
// "Notifying bartender station(s) of modification"  
// "Notifying both station(s) of modification"
```

---

## Database Schema

### kitchen_orders Table

```sql
CREATE TABLE kitchen_orders (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  order_item_id UUID REFERENCES order_items(id),
  product_name TEXT,
  destination TEXT CHECK (destination IN ('kitchen', 'bartender', 'both')),
  status TEXT CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  special_instructions TEXT,
  is_urgent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Key Fields**:
- `destination` → Which station(s) see this order
- `status` → Preparation progress
- `is_urgent` → TRUE for modified orders (appears at top)
- `special_instructions` → Shows "⚠️ MODIFIED" message

---

## Real-World Examples

### Example 1: Beer Order Reduced

```
11:23 AM - Customer orders 5x Corona
         → Bartender display: "Table 7 - Corona x5"
         
11:24 AM - Bartender starts making drinks (status: preparing)

11:25 AM - Customer: "Actually just 3 beers"
         → Cashier reduces quantity in Manage Tab Items
         
11:25 AM - System Actions:
         ✅ Check destination: 'bartender'
         ✅ Check status: 'preparing' 
         ⚠️ Warning: "Item is currently being prepared at station"
         ✅ Create new order with MODIFIED flag
         
11:25 AM - Bartender Display:
         ⚠️ URGENT notification appears
         ⚠️ "Corona - Changed from 5 to 3 units"
         
11:26 AM - Bartender sees change, stops at 3 beers
         ✅ 2 beers not made, no waste
         
Result: Perfect communication between cashier and bartender
```

### Example 2: Wings Order Reduced

```
12:15 PM - Customer orders 10x Wings
         → Kitchen display: "Table 3 - Wings x10"
         
12:17 PM - Chef starts cooking (status: preparing)

12:18 PM - Customer: "Sorry, only 6 wings"
         → Cashier reduces quantity
         
12:18 PM - System Actions:
         ✅ Check destination: 'kitchen'
         ✅ Check status: 'preparing'
         ⚠️ Warning: "Item is currently being prepared at station"
         ✅ Create MODIFIED order
         
12:18 PM - Kitchen Display:
         ⚠️ URGENT notification
         ⚠️ "Wings - Changed from 10 to 6 units"
         
12:19 PM - Chef sees change, adjusts portion
         ⚠️ 4 wings may be partially cooked (waste)
         
Result: Chef informed immediately, can minimize waste
```

### Example 3: Mixed Order (Kitchen + Bartender)

```
1:00 PM - Customer orders:
        - 2x Burger → Kitchen
        - 3x Beer → Bartender
        
1:05 PM - Customer changes mind: "Only 1 burger"
        → Cashier reduces burger quantity
        
1:05 PM - System Actions:
        ✅ Check burger destination: 'kitchen'
        ✅ Create MODIFIED order for kitchen only
        ✅ Beer order untouched
        
1:05 PM - Displays:
        Kitchen: ⚠️ "Burger - Changed from 2 to 1"
        Bartender: (no change, still shows 3 beers)
        
Result: Only relevant station notified
```

---

## Benefits

### 1. Clear Communication
- ✅ Kitchen knows when food orders change
- ✅ Bartender knows when drink orders change
- ✅ No confusion or miscommunication

### 2. Waste Reduction
- ✅ Pending items cancelled (no preparation started)
- ✅ In-progress items get URGENT notification
- ✅ Staff can adjust quickly

### 3. Accurate Inventory
- ✅ Stock automatically adjusted
- ✅ Both food and beverage inventory updated
- ✅ Real-time accuracy

### 4. Professional Operation
- ✅ Matches high-end restaurant POS systems
- ✅ Separate kitchen/bar workflows
- ✅ Industry-standard patterns

---

## Testing Both Stations

### Test Scenario 1: Kitchen Item
1. Create tab order with food item (Wings)
2. Reduce quantity using Manage Tab Items
3. Verify:
   - ✅ Kitchen display shows MODIFIED notification
   - ✅ Bartender display unchanged
   - ✅ Food inventory adjusted

### Test Scenario 2: Bartender Item
1. Create tab order with drink item (Beer)
2. Reduce quantity using Manage Tab Items
3. Verify:
   - ✅ Bartender display shows MODIFIED notification
   - ✅ Kitchen display unchanged
   - ✅ Beverage inventory adjusted

### Test Scenario 3: Mixed Order
1. Create tab with food AND drinks
2. Reduce food item quantity
3. Verify:
   - ✅ Kitchen notified
   - ✅ Bartender NOT notified
4. Reduce drink item quantity
5. Verify:
   - ✅ Bartender notified
   - ✅ Kitchen NOT notified

---

## Conclusion

The Manage Tab Items system provides **COMPLETE INTEGRATION** with both kitchen and bartender stations through:

1. **Smart Routing** - Items go to correct station(s)
2. **Status Awareness** - Knows if preparing/ready
3. **Real-time Notifications** - URGENT modified orders
4. **Selective Updates** - Only affected stations notified
5. **Inventory Sync** - Both food and beverage stock updated

**Both kitchen AND bartender staff stay perfectly informed of all order modifications.**
