# Quick Reference: Manage Order Items Feature

**Last Updated:** 2025-10-10  
**Feature:** Edit/Remove Confirmed Order Items  
**Version:** 1.0

## 🎯 Quick Access

### For End Users

**Location**: Tab Management Dashboard → Table Card → **"Manage Items"** button

**When to Use**:
- Customer changes their mind after ordering
- Need to fix order mistakes
- Remove items before preparation starts

**Restrictions**:
- ✅ Only works on **CONFIRMED** orders
- ❌ Cannot edit items that are **PREPARING**, **READY**, or **SERVED**

---

## 📱 User Guide

### How to Remove an Item

1. Open Tab Management Dashboard
2. Find the table with active tab
3. Click **"Manage Items"** button
4. Select the order containing the item
5. Click the **× (remove)** icon next to the item
6. Confirm removal in the popup
7. ✅ Item removed, stock returned, kitchen notified

### How to Change Quantity

1. Open Tab Management Dashboard
2. Click **"Manage Items"** button
3. Select the order containing the item
4. Click the **Edit** icon next to the item
5. Enter new quantity
6. Click **Save**
7. ✅ Quantity updated, stock adjusted, totals recalculated

### Visual Indicators

**Status Badges**:
- 🔵 **CONFIRMED** - Can be edited
- 🟠 **PREPARING** - Cannot be edited (being made)
- 🟢 **READY** - Cannot be edited (ready to serve)
- 🟣 **SERVED** - Cannot be edited (already served)

---

## 🔧 Technical Quick Reference

### API Endpoints

```typescript
// Remove an item
DELETE /api/orders/:orderId/items/:itemId
// Response: Updated order object

// Update quantity
PATCH /api/orders/:orderId/items/:itemId
// Body: { quantity: number }
// Response: Updated order object

// Get item details
GET /api/orders/:orderId/items/:itemId
// Response: Order item object
```

### Service Methods

```typescript
// Remove item
OrderItemService.removeOrderItem(orderId, itemId, userId)

// Update quantity
OrderItemService.updateOrderItemQuantity(orderId, itemId, newQuantity, userId)

// Get item
OrderItemService.getOrderItem(itemId)
```

### React Components

```typescript
// Session-level management
<SessionItemsManagerModal
  sessionId="uuid"
  sessionNumber="TAB-001"
  isOpen={true}
  onClose={() => {}}
  onItemsChanged={() => {}}
/>

// Order-level management
<ManageOrderItemsModal
  orderId="uuid"
  orderNumber="ORD-001"
  sessionId="uuid"
  isOpen={true}
  onClose={() => {}}
  onItemsChanged={() => {}}
/>
```

---

## 🔍 Troubleshooting

### Common Errors

**"Cannot remove items from preparing orders"**
- **Cause**: Item already being prepared in kitchen/bar
- **Solution**: Too late, item is being made
- **Action**: Let it complete, customer still pays

**"Cannot edit item quantity after preparation has started"**
- **Cause**: Kitchen started preparing
- **Solution**: Cannot change quantity now
- **Action**: Add new order if customer wants more

**"Insufficient stock. Available: X"**
- **Cause**: Trying to increase quantity beyond available stock
- **Solution**: Check inventory levels
- **Action**: Reduce quantity or restock first

**"Order item not found"**
- **Cause**: Item already removed or doesn't exist
- **Solution**: Refresh the modal
- **Action**: Close and reopen "Manage Items"

### Debug Checklist

1. ✅ Is order status **CONFIRMED**?
2. ✅ Is item status **PENDING** in kitchen?
3. ✅ Is there sufficient stock (for increases)?
4. ✅ Is user authenticated?
5. ✅ Are there active kitchen orders for the item?

---

## 📊 What Happens Behind the Scenes

### When You Remove an Item:

```
1. Validate order status (must be CONFIRMED)
2. Find kitchen orders for this item
3. Validate kitchen orders (must be PENDING)
4. Delete kitchen orders ────────────────┐
                                          │
5. Return stock to inventory              ├──► Realtime Updates
                                          │
6. Delete order item                      │
                                          │
7. Recalculate order totals               │
                                          │
8. Update session totals ─────────────────┘
```

**Result**:
- ✅ Item removed from order
- ✅ Stock returned to inventory
- ✅ Kitchen/bar order disappears immediately
- ✅ Order total decreases
- ✅ Session total updates
- ✅ Bill reflects changes

### When You Change Quantity:

**Decreasing**:
```
1. Calculate difference (e.g., 5 → 3 = -2)
2. Return 2 units to stock
3. Update item quantity to 3
4. Recalculate totals
```

**Increasing**:
```
1. Calculate difference (e.g., 3 → 5 = +2)
2. Check if 2 units available in stock
3. Update item quantity to 5
4. Recalculate totals
5. Stock deducted when customer pays
```

---

## 🎓 Best Practices

### For Staff

1. **Act Quickly**: Remove items before kitchen starts preparing
2. **Communicate**: Tell kitchen immediately if items are removed
3. **Check Status**: Look at order status badge before editing
4. **Verify Changes**: Check totals updated correctly
5. **Inform Customer**: Let them know item was removed/changed

### For Developers

1. **Always Validate Status**: Check order and kitchen order status
2. **Handle Errors Gracefully**: Show clear messages to users
3. **Log Everything**: Use emoji-prefixed console logs
4. **Test Realtime**: Verify kitchen display updates
5. **Maintain Audit Trail**: User ID tracked for all changes

---

## 📈 Metrics to Monitor

### Business Metrics
- Number of items removed per day
- Most frequently removed items
- Time from order to removal
- Percentage of orders with modifications

### Technical Metrics
- API response times
- Failed removal attempts
- Stock synchronization accuracy
- Kitchen order deletion success rate

---

## 🚨 Important Notes

⚠️ **Cannot Undo**: Item removal is permanent  
⚠️ **Stock Impact**: Removed items return stock immediately  
⚠️ **Kitchen Impact**: Kitchen orders deleted in real-time  
⚠️ **Payment Impact**: Order totals recalculated automatically  
⚠️ **Audit Trail**: All actions logged with user ID  

---

## 📞 Support

**For Issues**:
1. Check browser console for errors
2. Verify order status in database
3. Check kitchen_orders table
4. Verify inventory_movements logs
5. Contact system administrator

**Log Locations**:
- Browser Console: F12 → Console tab
- Server Logs: Check application logs
- Database: Check `inventory_movements` table

---

## 🔗 Related Documentation

- [TAB_ORDER_ITEM_MANAGEMENT_FEATURE.md](./TAB_ORDER_ITEM_MANAGEMENT_FEATURE.md) - Full technical documentation
- [INVENTORY_POS_TAB_INTEGRATION.md](./INVENTORY_POS_TAB_INTEGRATION.md) - Stock management
- [REALTIME_KITCHEN_ROUTING.md](./REALTIME_KITCHEN_ROUTING.md) - Kitchen display updates
- [TAB_SYSTEM_IMPLEMENTATION.md](./TAB_SYSTEM_IMPLEMENTATION.md) - Tab system overview

---

**Questions?** Refer to the full documentation: `TAB_ORDER_ITEM_MANAGEMENT_FEATURE.md`
