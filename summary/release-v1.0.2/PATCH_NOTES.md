# Patch Notes - Version 1.0.2
**Released:** October 20, 2025

---

## 🎯 What's Fixed

### Cancelled Orders Now Visible to Kitchen & Bartender Staff
Previously, when customers removed items from their tabs, these items would silently disappear from kitchen and bartender displays - leaving staff unaware that they should stop preparing them. This caused wasted ingredients and confusion.

**Now:** Cancelled items remain visible with a clear red "CANCELLED" badge, allowing staff to see what was removed and stop preparation immediately.

---

## ✨ What's New

### 🗑️ Clear Cancelled Orders
Keep your kitchen and bartender displays clean with new cleanup options:

- **Clear All** button removes all cancelled orders at once
- **Individual Remove** button on each cancelled order card for selective cleanup
- Cancelled orders stay visible until manually removed by staff

### 📊 Streamlined Display
- **Ready orders** now automatically disappear once marked as ready (cleaner workspace)
- **Removed clutter** - only active orders and cancelled items are shown
- **Better focus** - staff see only what needs attention

### 🎨 Visual Improvements
- Red badges clearly mark cancelled orders
- Trash icons for intuitive order removal
- Updated filter tabs: All, Pending, Preparing, Cancelled
- Cancelled order count in status summary

---

## 🔧 Technical Updates

### Database Migration Required
A database schema update ensures cancelled orders persist correctly. Run the migration file before deploying:
```
migrations/release-v1.0.2/fix_kitchen_orders_cascade_delete.sql
```

### New API Endpoints
- `DELETE /api/kitchen/orders/clear-cancelled` - Clear all cancelled orders
- `DELETE /api/kitchen/orders/[orderId]/delete` - Remove individual order

---

## 💡 How to Use

### For Kitchen & Bartender Staff

**When an order is cancelled:**
1. Item appears with red "CANCELLED" badge
2. Stop preparing the item
3. Click "Remove" to clear it from your display

**To clear multiple cancelled orders:**
1. Click red "Clear Cancelled" button in the header
2. All cancelled orders are removed at once

**Normal order flow:**
- **Pending** → Click "Start Preparing"
- **Preparing** → Click "Mark Ready"  
- **Ready** → Order disappears automatically (waiter handles from here)

---

## ⚠️ Important Notes

- **No breaking changes** - All existing functionality works as before
- **Backwards compatible** - No changes needed to current workflows
- **Database backup recommended** before applying migration

---

## 🐛 Bug Fixes Summary

| Issue | Resolution |
|-------|------------|
| Cancelled orders disappear from kitchen/bartender | Now remain visible until manually removed |
| Staff unaware of cancellations | Clear red "CANCELLED" badge added |
| Ready orders clutter display | Now auto-hide when marked ready |
| No way to clear old cancelled orders | Added Clear All and individual Remove buttons |

---

## 📦 What's Included

- ✅ Cancelled order visibility fix
- ✅ Clear All Cancelled button
- ✅ Individual Remove button per order
- ✅ Auto-hide ready orders
- ✅ Updated UI/filters
- ✅ Database migration
- ✅ New API endpoints

---

## 🚀 Upgrade Steps

1. **Backup your database**
2. **Apply migration:** `fix_kitchen_orders_cascade_delete.sql`
3. **Deploy new version**
4. **Verify displays load correctly**
5. **Test order cancellation flow**

---

**Questions or issues?** Contact your development team.

*Previous version: [v1.0.1](../release-v1.0.1/) | Next version: TBD*
