# Tab System - User Guide

**Date**: October 7, 2025  
**Feature**: Integrated Table Selection & Tab Management  
**Status**: ✅ Ready to Use

---

## Overview

The tab system is now fully integrated into the **Tables** module. You can select a table and instantly open or resume tabs without navigating between multiple screens.

---

## How to Use

### 1️⃣ **Access the Tables Module**

**From Sidebar:**
- Click **"Tables"** in the sidebar menu
- Or navigate to: `http://localhost:3000/tables`

**Accessible by:**
- ✅ Admin
- ✅ Manager
- ✅ Cashier
- ✅ Waiter

---

### 2️⃣ **Select a Table**

**On the Tables page:**

```
┌─────────────────────────────────────────────────────────────┐
│  LEFT SIDE (2/3 width)        │  RIGHT SIDE (1/3 width)     │
│  • Visual grid of all tables  │  • Session Selector Panel   │
│  • Color-coded by status      │  • Shows active tab info    │
│  • Click to select            │  • Open/Resume tab buttons  │
└─────────────────────────────────────────────────────────────┘
```

**Steps:**
1. View all tables in the grid
2. Tables are color-coded:
   - 🟢 **Green** = Available
   - 🔴 **Red** = Occupied
   - 🟡 **Yellow** = Reserved
   - ⚪ **Gray** = Cleaning
3. **Click on any table** to select it
4. Selected table will show a **blue ring** around it

---

### 3️⃣ **Open or Resume Tab**

Once a table is selected, the **Session Selector panel** on the right will show:

#### **Scenario A: No Active Tab**

```
┌────────────────────────────────┐
│  No Active Tab                 │
│  Open a new tab to start       │
│  taking orders                 │
│                                │
│  [📄 Open New Tab]            │
└────────────────────────────────┘
```

**Action:**
- Click **"Open New Tab"** button
- System creates: `TAB-20251007-001`
- Table status changes to **Occupied**
- Navigates to order entry screen

#### **Scenario B: Active Tab Exists**

```
┌────────────────────────────────┐
│  🟢 Active Tab                 │
│  TAB-20251007-001              │
│                                │
│  ⏰ Duration: 25 min           │
│  💵 Total: ₱450.00             │
│                                │
│  [Resume Tab & Add Orders]     │
└────────────────────────────────┘
```

**Action:**
- Click **"Resume Tab & Add Orders"** button
- Navigates to existing session
- Can add more orders to the tab

---

### 4️⃣ **Complete Order Flow**

**After Opening/Resuming Tab:**

```
Step 1: Add Items
  └─> Select products/packages
      └─> Add to cart
          └─> Click "Confirm Order"
              └─> Kitchen/Bartender receives items ✅
              └─> NO PAYMENT YET

Step 2: Customer Enjoys Food
  └─> Orders are being prepared
      └─> Kitchen status updates automatically

Step 3: Customer Wants More (Optional)
  └─> Go back to Tables
      └─> Select same table
          └─> Click "Resume Tab"
              └─> Add more items
                  └─> Confirm again

Step 4: Customer Ready to Leave
  └─> Click "View Bill" (preview)
      └─> Click "Close Tab & Pay"
          └─> Enter payment amount
              └─> System prints receipt
                  └─> Table released ✅
```

---

## Visual Guide

### Tables Grid Features

**Table Card Layout:**
```
┌──────────────────────────┐
│  T-05  [Area: Main]      │  ← Table number and area
│  🟢 AVAILABLE            │  ← Status indicator
│  👥 Capacity: 4          │  ← Seating capacity
│                          │
│  [Reserve] [Occupy]      │  ← Action buttons
└──────────────────────────┘
```

**When Selected:**
```
┌──────────────────────────┐
│ ╔══════════════════════╗ │  ← Blue ring indicates
│ ║  T-05  [Area: Main]  ║ │     selected table
│ ║  🟢 AVAILABLE        ║ │
│ ║  👥 Capacity: 4      ║ │
│ ║                      ║ │
│ ║  [Reserve] [Occupy]  ║ │
│ ╚══════════════════════╝ │
└──────────────────────────┘
```

---

## Statistics Dashboard

**At the top of the page:**

```
┌─────────────────────────────────────────────────────────┐
│  Total: 20  │  Available: 12  │  Occupied: 6  │ ...    │
└─────────────────────────────────────────────────────────┘
```

Real-time statistics showing:
- Total active tables
- Available tables
- Occupied tables
- Reserved tables
- Cleaning status

---

## Filters

**Filter Tables by:**
- **Status**: All, Available, Occupied, Reserved, Cleaning
- **Area**: All, Main, VIP, Outdoor, Bar, etc.

**Quick Actions:**
- **Clear Filters**: Reset all filters
- **Show/Hide Inactive**: Toggle inactive tables
- **Add Table**: Create new table (Manager/Admin only)

---

## Key Features

### ✅ Real-Time Updates
- Table status changes instantly
- Active sessions sync across devices
- No page refresh needed

### ✅ Visual Feedback
- Selected table highlighted with blue ring
- Color-coded status indicators
- Sticky session panel (stays visible when scrolling)

### ✅ Smart Navigation
- Opens/resumes tabs automatically
- Navigates to order entry screen
- Remembers selected table

### ✅ Role-Based Access
- Different permissions by role
- Cashiers can open tabs
- Managers can manage everything

---

## Troubleshooting

### Issue: "Please select a table first"
**Solution**: Click on a table card in the grid to select it

### Issue: "User not authenticated"
**Solution**: Make sure you're logged in. Refresh the page if needed.

### Issue: Table not showing active session
**Solution**: 
1. Check if tab was opened on a different table
2. Verify table status is "Occupied"
3. Check "Active Tabs" module for all open sessions

### Issue: Can't click "Open New Tab"
**Solution**: 
1. Ensure a table is selected (blue ring visible)
2. Verify table is not already occupied
3. Check you have Cashier/Manager/Admin role

---

## Tips & Best Practices

### 🎯 **For Cashiers**
1. Always select the correct table before opening tab
2. Double-check table number with customer location
3. Use "Resume Tab" for customers ordering more items
4. Close tabs immediately after payment

### 🎯 **For Managers**
1. Monitor active tabs from sidebar "Active Tabs" menu
2. Use filters to find specific tables quickly
3. Check abandoned sessions regularly
4. Reserve tables for VIP customers in advance

### 🎯 **For Waiters**
1. Use this module to check table status
2. Mark tables as "Cleaning" when customers leave
3. Check active tabs to coordinate with cashiers
4. Update table status to "Available" after cleaning

---

## Related Modules

| Module | Purpose | URL |
|--------|---------|-----|
| **Tables** | Select table & open tab | `/tables` |
| **Active Tabs** | View all open sessions | `/active-tabs` |
| **POS** | Traditional order entry | `/pos` |
| **Order Board** | Monitor all orders | `/order-board` |
| **Kitchen** | Prepare food orders | `/kitchen` |
| **Bartender** | Prepare drink orders | `/bartender` |

---

## API Endpoints Used

**Behind the scenes, this module uses:**

- `GET /api/order-sessions/by-table/[tableId]` - Check for active session
- `POST /api/order-sessions` - Create new tab
- `GET /api/order-sessions` - List all active tabs
- `PATCH /api/tables/[tableId]` - Update table status

---

## What's Next?

After opening a tab, you'll be redirected to the **order entry screen** where you can:
- Add products to the order
- Add packages to the order
- Confirm orders (send to kitchen)
- View running total
- Close tab and process payment

---

## Summary

**Complete Workflow:**
```
1. Sidebar → Click "Tables"
2. Grid → Click on a table (e.g., T-05)
3. Panel → Click "Open New Tab"
4. Order Screen → Add items
5. Order Screen → Click "Confirm Order" (kitchen receives)
6. [Customer eats...]
7. Order Screen → Click "Close Tab & Pay"
8. Payment → Enter amount, print receipt
9. Done! Table released ✅
```

---

## Support

**Need Help?**
- Check the tab system documentation: `TAB_SYSTEM_IMPLEMENTATION.md`
- View API reference: `docs/TAB_SYSTEM_INTEGRATION_GUIDE.md`
- Quick start guide: `TAB_SYSTEM_QUICK_START.md`

---

**Last Updated**: October 7, 2025  
**Feature Status**: ✅ Production Ready  
**Tested On**: Chrome, Edge, Safari
