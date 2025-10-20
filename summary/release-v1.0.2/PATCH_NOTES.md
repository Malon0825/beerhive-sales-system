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

### 📂 Complete Category Management System
Manage product categories with a powerful, intelligent system:

- **Create categories** - Add new categories with validation
- **Edit categories** - Update names, colors, and settings
- **Delete categories** - Safely remove unused categories
- **Smart validation** - Prevents duplicate names automatically
  - Case-insensitive: "Beer" = "beer" = "BEER"
  - Plural detection: "Beer" = "Beers", "Glass" = "Glasses"
  - Pattern matching: "Category" = "Categories"
  - Irregular plurals: "Child" = "Children"

**Safety Features:**
- ⛔ **Cannot delete categories in use** - System blocks deletion if products use the category
- 📋 **Shows affected products** - See which products (up to 5) need reassignment
- 💡 **Clear guidance** - Actionable messages guide you through conflicts
- 🔒 **Data integrity** - Prevents orphaned product references

### 🎛️ Dynamic Grid Layout Control
Customize your product display with a flexible grid system:

- **Click-to-cycle grid selector** with visual dot indicators
- **4 layout options:** 3, 4, 5, or 6 columns
- **Session persistence** - your preference saves during your work session
- **Smooth animations** when changing grid sizes
- **Available in both POS and Tab modules**

### 🏠 Complete Table Management System
Manage restaurant tables with comprehensive CRUD functionality:

- **Edit Tables** - Update table number, capacity, area, and notes
- **Custom Areas** - Create custom area names beyond predefined options
- **Smart Validation** - Prevents duplicate areas (case-insensitive)
  - "Garden" and "garden" are treated as the same
  - "Rooftop Bar" normalized to "rooftop bar"
- **Predefined Areas** - Quick selection: Indoor, Outdoor, VIP, Bar, Patio, Terrace
- **Data Consistency** - All custom areas stored in lowercase
- **Manager/Admin Only** - Proper role-based access control

**Tables Module Cleanup:**
- 🎯 **Focused Purpose** - Tables page now purely for table management
- ❌ **Removed Tab Selection** - No more SessionSelector sidebar
- ✅ **Full-Width Display** - Better space utilization
- 🔀 **Clear Separation** - Tab operations moved to Tabs module

### 🖼️ Enhanced POS & Tab Layouts
- **Reorganized headers** for better space utilization
- **Consolidated controls** - all tools in one place
- **Cleaner design** - removed redundant UI elements
- **Improved navigation** - fixed payment dialog redirect issues

---

## 🔧 Technical Updates

### Database Migration Required
A database schema update ensures cancelled orders persist correctly. Run the migration file before deploying:
```
migrations/release-v1.0.2/fix_kitchen_orders_cascade_delete.sql
```

### New API Endpoints

**Kitchen/Bartender:**
- `DELETE /api/kitchen/orders/clear-cancelled` - Clear all cancelled orders
- `DELETE /api/kitchen/orders/[orderId]/delete` - Remove individual order

**Category Management:**
- `GET /api/categories/[id]` - Fetch single category details
- `PUT /api/categories/[id]` - Update category with validation
- `DELETE /api/categories/[id]` - Soft delete with usage protection

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

### For Inventory Management

**To edit a category:**
1. Open "Add Product" dialog
2. Select a category from the dropdown
3. Click "Edit" button next to "Create New"
4. Modify name, description, color, or destination
5. Click "Update Category"

**To delete a category:**
1. Edit the category (steps above)
2. Click red "Delete Category" button
3. Confirm deletion in popup
4. If products use the category, you'll see which ones need reassignment

**Smart validation prevents:**
- Duplicate names: "Beer" and "beer" are the same
- Similar names: "Beer" and "Beers" are too similar
- Data loss: Can't delete categories with products

### For Table Management

**To edit a table:**
1. Go to Tables module (`/tables`)
2. Click the pencil icon on any table card
3. Modify table number, capacity, area, or notes
4. Click "Save Changes"

**To create a custom area:**
1. Click "Add Table" or "Edit" on a table
2. Open the Area dropdown
3. Select "+ Create New Area"
4. Input field appears - type custom area name
5. System validates for duplicates (case-insensitive)
6. Area saved in lowercase for consistency

**Examples of custom areas:**
- ✅ "garden" - simple custom area
- ✅ "rooftop bar" - with spaces
- ✅ "second-floor" - with hyphens
- ❌ "Garden" - blocked if "garden" exists
- ❌ "Indoor" - blocked (predefined area)

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
| Payment dialog shows white screen on close | Now properly redirects to tabs page |
| Grid layout changes not animated | Added smooth transitions with key-based re-rendering |
| Duplicate category names allowed | Smart validation prevents duplicates and similar names |
| Categories deleted with products in use | Usage protection blocks deletion and shows affected products |
| No edit table function | Added EditTableDialog with full validation |
| Limited to predefined areas | Custom area creation with duplicate validation |
| Tables module mixed with tabs | Separated - Tables for table management, Tabs for tab operations |

---

## 📦 What's Included

**Kitchen/Bartender Improvements:**
- ✅ Cancelled order visibility fix
- ✅ Clear All Cancelled button
- ✅ Individual Remove button per order
- ✅ Auto-hide ready orders
- ✅ Updated UI/filters

**Category Management:**
- ✅ Complete CRUD system (Create, Read, Update, Delete)
- ✅ Smart duplicate detection (case-insensitive + plural forms)
- ✅ Category deletion protection with product usage check
- ✅ Edit category UI with color picker and destination selector
- ✅ Reusable CategoryDialog component

**Table Management:**
- ✅ Edit table function with full validation
- ✅ Custom area creation with smart validation
- ✅ Case-insensitive duplicate prevention
- ✅ EditTableDialog component
- ✅ Tables module cleanup (removed tab selection)
- ✅ Focused, single-purpose table management

**UI/UX Enhancements:**
- ✅ Dynamic grid column selector (3/4/5/6 columns)
- ✅ Session-based preference persistence
- ✅ Enhanced POS & Tab layouts
- ✅ Smooth grid animations
- ✅ Payment dialog navigation fix

**Technical:**
- ✅ Database migration for cancelled orders
- ✅ New API endpoints (Kitchen + Category management)
- ✅ Smart validation utilities
- ✅ Comprehensive documentation

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
