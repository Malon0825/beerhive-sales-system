# 🍺 BeerHive Sales System - Release v1.0.2

**Release Date:** October 20, 2025  
**Type:** Patch Release  
**Status:** ✅ Ready for Production

---

## 📋 Overview

Version 1.0.2 is a major patch release that addresses kitchen and bartender order management issues, introduces complete category and table management systems with smart validation, and enhances UI/UX with dynamic grid layouts and improved workflows.

---

## 🐛 Bug Fixes

### Critical: Cancelled Orders Visibility Issue
**Issue:** When items were removed from customer tabs while being prepared, they would disappear from kitchen/bartender displays without any notification to staff.

**Impact:** Kitchen and bartender staff would continue preparing cancelled items, leading to:
- Wasted ingredients and preparation time
- Confusion about order status
- Inventory discrepancies

**Resolution:**
- ✅ Cancelled orders now remain visible in kitchen/bartender displays
- ✅ Clear visual indicators (red badge with strikethrough text)
- ✅ Database schema updated to preserve cancelled order records
- ✅ Orders marked as CANCELLED instead of being deleted

**Technical Details:**
- Modified foreign key constraint from `ON DELETE CASCADE` to `ON DELETE SET NULL`
- Updated `KitchenOrderRepository.getActive()` to include cancelled orders
- Enhanced `OrderItemService` to mark orders as cancelled instead of deleting them

### Payment Dialog Navigation Issue
**Issue:** When closing the "Close Tab & Pay" dialog using either the X button or Close button, users were left with a white screen instead of being redirected back to the tab management page.

**Impact:** Users had to manually navigate back using browser controls

**Resolution:**
- ✅ Dialog now properly redirects to `/tabs` when closed
- ✅ Works for both X button (top right) and Close button
- ✅ Updated `handleClose` function to handle navigation correctly

### Grid Layout Animation Issue
**Issue:** When changing grid column count (3, 4, 5, 6 columns), the layout change was instant without smooth transitions.

**Impact:** Jarring visual experience when adjusting product display layout

**Resolution:**
- ✅ Added key-based re-rendering for proper animation triggers
- ✅ Implemented 500ms smooth transitions for grid restructuring
- ✅ Added fade-in and zoom-in effects (300ms) for product cards
- ✅ Enhanced visual feedback on layout changes

---

## ✨ New Features

### 1. Clear All Cancelled Orders
**Description:** Bulk delete functionality for cancelled orders to keep displays clean.

**Features:**
- Red "Clear Cancelled" button in kitchen and bartender headers
- Clears all cancelled orders for the respective station (kitchen/bartender)
- Disabled when no cancelled orders exist
- Shows count of cleared orders in success notification
- Available on both mobile and desktop layouts

**Location:** Next to "Sound On" and "Refresh" buttons

**API Endpoint:** `DELETE /api/kitchen/orders/clear-cancelled?destination={kitchen|bartender}`

---

### 2. Individual Order Remove Button
**Description:** Remove specific cancelled orders one at a time.

**Features:**
- Red "Remove" button on each cancelled order card
- Trash icon for clear visual indication
- Immediate removal from display
- Success notification on deletion

**Use Case:** When staff needs to selectively remove cancelled items while keeping others visible

**API Endpoint:** `DELETE /api/kitchen/orders/[orderId]/delete`

---

### 3. Dynamic Grid Column Selector
**Description:** Customizable product grid layout with visual dot-based selector.

**Features:**
- Click-to-cycle button showing current grid size as dots
- 4 layout options: 3, 4, 5, or 6 columns
- Session-based preference persistence (resets on page refresh)
- Visual dot representation (e.g., ••• for 3 columns, •••••• for 6 columns)
- Smooth animations when changing grid sizes
- Tooltips showing column count on hover
- Two-layer dot layout for 4+ columns (cleaner visual design)

**Location:** Available in both POS and Tab module headers

**Benefits:**
- Customize product view based on screen size and preference
- Better space utilization on large displays
- Faster product browsing with optimal layout
- Preference saves throughout work session

---

### 4. Enhanced POS & Tab Module Layouts
**Description:** Reorganized headers and consolidated controls for better UX.

**POS Module Improvements:**
- Consolidated header with all controls in one area
- Top row: Grid selector + View toggle buttons (All Products, Packages, Featured)
- Bottom row: Search bar + Category filter
- Removed redundant separate search card
- Cleaner, more spacesaving design

**Tab Module Improvements:**
- Reorganized header layout: Grid selector (left), Title (center), View buttons (right)
- Better visual balance and space utilization
- Consistent design language with POS module

**UI Enhancements:**
- Smooth 500ms transitions for grid layout changes
- Product cards fade in and zoom (300ms) when grid size changes
- Hover effects on grid selector with scale animations
- Active state highlighting for current grid size

---

### 5. Complete Category Management System
**Description:** Full CRUD system for managing product categories with intelligent validation and safety features.

**Core Features:**
- ✅ **Create Categories** - Add new categories with validation
- ✅ **Read Categories** - Fetch and display active categories
- ✅ **Update Categories** - Edit existing category details
- ✅ **Delete Categories** - Soft delete with usage protection

**Smart Validation:**
- **Case-insensitive duplicate detection**
  - "Beer" = "beer" = "BEER" (blocks duplicates)
- **Plural/singular form detection**
  - "Beer" = "Beers" (too similar, blocked)
  - "Glass" = "Glasses" (too similar, blocked)
  - "Category" = "Categories" (too similar, blocked)
- **Pattern matching** for common English plural rules
  - Simple plurals: add/remove 's'
  - ES plurals: box/boxes, glass/glasses
  - IES plurals: category/categories
  - F/FE → VES: knife/knives, shelf/shelves
  - O → OES: hero/heroes, potato/potatoes
- **Irregular plural support**
  - man/men, child/children, person/people

**Category Deletion Protection:**
- ⛔ **Pre-deletion validation** - Checks if products use the category
- 📋 **Product list display** - Shows up to 5 affected products with names and SKUs
- 🔢 **Total count indicator** - Displays "... and X more" for large counts
- 💡 **Actionable guidance** - Instructs users to reassign products before deletion
- 🔒 **Data integrity** - Prevents orphaned product references
- ⏱️ **Extended feedback** - 10-second toast notification for readability

**UI Components:**
- **Edit Category button** - Next to "Create New" in product form
- **CategoryDialog component** - Reusable modal for create/edit/delete
  - Name, description, color picker, destination selector
  - Delete button (edit mode only) with confirmation dialog
  - Rich error messages showing affected products
  - Type-safe form handling
- **Integrated into ProductForm** - Seamless category management workflow

**API Endpoints:**
- `GET /api/categories/[id]` - Fetch single category
- `PUT /api/categories/[id]` - Update with duplicate validation
- `DELETE /api/categories/[id]` - Soft delete with usage check

**Benefits:**
- Prevents confusing duplicate-like category names
- Enforces consistent naming conventions
- Maintains data integrity by blocking unsafe deletions
- Clear, actionable error messages
- Complete audit trail with soft deletes

---

### 6. Complete Table Management System
**Description:** Full CRUD system for managing restaurant tables with edit functionality and custom area creation.

**Core Features:**
- ✅ **Edit Tables** - Update table number, capacity, area, and notes
- ✅ **Create Tables** - Add new tables with validation
- ✅ **Deactivate/Reactivate Tables** - Soft delete functionality
- ✅ **Custom Area Creation** - Create unlimited custom area names
- ✅ **Smart Validation** - Case-insensitive duplicate prevention

**Custom Area Features:**
- **Flexible Area Names** - Not limited to predefined options (Indoor, Outdoor, VIP, Bar, Patio, Terrace)
- **Create Custom Areas** - "+ Create New Area" option in dropdown
- **Dynamic Input** - Input field appears when custom option selected
- **Duplicate Prevention** - Case-insensitive validation ("Garden" = "garden")
- **Predefined Conflicts** - Blocks custom areas matching predefined names
- **Data Consistency** - All custom areas normalized to lowercase
- **Database Integration** - Fetches existing areas on dialog open

**EditTableDialog Component:**
- Pre-populated form with current table data
- Edit all table properties (number, capacity, area, notes)
- Custom area detection - auto-switches to custom mode for non-predefined areas
- Real-time validation with clear error messages
- Manager/Admin only access
- Optimistic UI updates

**Tables Module Cleanup:**
- ⚡ **Focused Purpose** - Tables page purely for table management
- ❌ **Removed SessionSelector** - No more tab selection sidebar
- ✅ **Full-Width Display** - Better space utilization with full-width TableGrid
- 🔀 **Clear Separation** - Tab operations moved to dedicated Tabs module
- 📐 **SOLID Principles** - Single Responsibility Principle applied

**UI Components:**
- **Edit button** - Pencil icon on table cards (Manager/Admin only)
- **EditTableDialog** - Reusable modal for editing tables
- **Custom area input** - Dynamic field in Add/Edit dialogs
- **Area dropdown** - Enhanced with "+ Create New Area" option

**API Enhancements:**
- Updated `PATCH /api/tables/[tableId]` to use `TableService.updateTableDetails()`
- Service layer validation with duplicate checking
- Repository layer already supported updates (no changes needed)

**Benefits:**
- Flexibility - Create unlimited custom areas beyond 7 predefined options
- Data Integrity - Case-insensitive validation prevents duplicates
- Consistency - All custom areas normalized to lowercase
- User-Friendly - Clear validation messages and intuitive UI
- Backward Compatible - No impact on existing tables or areas

**Validation Rules:**
- ✅ Table number: Required, alphanumeric + spaces/hyphens, must be unique
- ✅ Capacity: Between 1 and 50 persons
- ✅ Area: Optional, alphanumeric + spaces/hyphens
- ✅ Custom areas: No duplicates (case-insensitive), no predefined conflicts
- ✅ Notes: Optional, free text

**Examples:**
```typescript
// Valid custom areas
"garden" ✅
"rooftop bar" ✅
"second-floor" ✅
"vip lounge 2" ✅

// Blocked - duplicates (case-insensitive)
"Garden" ❌ (if "garden" exists)
"ROOFTOP BAR" ❌ (if "rooftop bar" exists)

// Blocked - predefined conflicts
"Indoor" ❌
"vip" ❌
"Outdoor" ❌
```

---

### 7. Enhanced Order Status Workflow
**Description:** Streamlined order lifecycle for better kitchen/bartender operations.

**Changes:**
- ✅ **PENDING** orders → Visible (awaiting preparation)
- ✅ **PREPARING** orders → Visible (being prepared)
- ✅ **READY** orders → **Now disappear automatically** (ready for waiter pickup)
- ✅ **CANCELLED** orders → Visible until manually removed
- ✅ **SERVED** orders → Hidden (completed)

**Benefits:**
- Cleaner displays focusing on active work
- Ready orders don't clutter kitchen/bartender screens
- Cancelled orders remain visible for staff awareness

---

## 🎨 UI/UX Improvements

### Kitchen & Bartender Display Updates

**Status Summary Counts:**
- Removed "Ready" count (orders disappear when ready)
- Added "Cancelled" count with red styling
- Streamlined 3-status display: Pending, Preparing, Cancelled

**Filter Tabs:**
- Removed "Ready" filter tab
- Added "Cancelled" filter tab with red styling
- Simplified filtering to focus on actionable items

**Order Card Enhancements:**
- Red badge for cancelled orders
- Strikethrough text on cancelled items
- Remove button with trash icon
- Consistent responsive design (mobile, tablet, desktop)

---

### Reports & Analytics (All Products Sold)

**Overview:** The All Products Sold board received a UX and data alignment overhaul.

**Modes:**
- Standalone: lists products and packages as standalone items; revenue included.
- Combined: merges package component consumption into product quantities; revenue hidden.

**Interactions:**
- Directional slide animation on toggle (Combined → from left, Standalone → from right).
- Header stays fixed; only the table body animates for clarity.
- Inline package details use smooth grid-row expand/collapse with subtle fade/slide.
- Subtle border on package expand button; hover-enhanced.

**Usability:**
- Sticky table header remains visible while scrolling.
- Fixed Rank column width for consistent column alignment across modes.

**Export Alignment:**
- Export All (Excel) now reflects the active mode:
  - Sheet name includes mode (Standalone/Combined).
  - Removed Top Products sheet.
  - Combined mode exports without revenue column; Standalone includes revenue.

**Technical:**
- `getSalesByPaymentMethod` refactor for lint/type safety and robust numeric parsing.

---

## 🗄️ Database Changes

### Required Migration
**File:** `migrations/release-v1.0.2/fix_kitchen_orders_cascade_delete.sql`

**Changes:**
```sql
-- Update foreign key constraint to preserve cancelled orders
ALTER TABLE kitchen_orders 
DROP CONSTRAINT IF EXISTS kitchen_orders_order_item_id_fkey;

ALTER TABLE kitchen_orders
ADD CONSTRAINT kitchen_orders_order_item_id_fkey 
FOREIGN KEY (order_item_id) 
REFERENCES order_items(id) 
ON DELETE SET NULL;

-- Allow order_item_id to be NULL
ALTER TABLE kitchen_orders
ALTER COLUMN order_item_id DROP NOT NULL;
```

**Why This Matters:**
- Prevents automatic deletion of kitchen orders when order items are removed
- Allows cancelled orders to persist for staff visibility
- Maintains referential integrity while supporting the new workflow

---

## 📁 Files Modified

### New Files

**Kitchen/Bartender:**
1. `src/app/api/kitchen/orders/clear-cancelled/route.ts` - Bulk delete endpoint
2. `src/app/api/kitchen/orders/[orderId]/delete/route.ts` - Individual delete endpoint

**Category Management:**
3. `src/app/api/categories/[id]/route.ts` - Category CRUD endpoints (GET, PUT, DELETE)
4. `src/lib/utils/categoryNameValidator.ts` - Smart validation utility (~280 lines)
5. `src/views/inventory/CategoryDialog.tsx` - Reusable category dialog component (~400 lines)

**Table Management:**
6. `src/views/tables/EditTableDialog.tsx` - Edit table dialog component (~375 lines)

**UI/UX Enhancements:**
7. `src/lib/hooks/useSessionStorage.ts` - Session storage hook for preference persistence
8. `src/views/shared/ui/GridColumnSelector.tsx` - Dynamic grid selector component

**Documentation:**
9. `docs/release-v1.0.2/EDIT_CATEGORY_FEATURE.md` - Category edit feature guide
10. `docs/release-v1.0.2/DELETE_CATEGORY_FEATURE.md` - Category deletion guide
11. `docs/release-v1.0.2/CATEGORY_DELETION_PROTECTION.md` - Usage protection docs
12. `docs/release-v1.0.2/CATEGORY_DUPLICATE_VALIDATION.md` - Smart validation docs
13. `docs/EDIT_TABLE_FEATURE.md` - Edit table feature guide
14. `docs/CUSTOM_AREA_FEATURE.md` - Custom area creation guide
15. `docs/TABLES_MODULE_CLEANUP.md` - Tables module separation docs
16. `summary/release-v1.0.2/EDIT_CATEGORY_IMPLEMENTATION.md` - Technical summary
17. `summary/release-v1.0.2/SMART_PLURAL_DETECTION.md` - Validation algorithm docs
18. `summary/release-v1.0.2/CATEGORY_MANAGEMENT_COMPLETE.md` - Complete system overview

**Database:**
19. `migrations/release-v1.0.2/fix_kitchen_orders_cascade_delete.sql` - Database migration

### Modified Files

**Kitchen/Bartender:**
1. `src/data/repositories/KitchenOrderRepository.ts` - Updated query filters
2. `src/core/services/orders/OrderItemService.ts` - Mark orders as cancelled
3. `src/views/kitchen/components/KitchenHeader.tsx` - Added Clear button
4. `src/views/kitchen/components/FilterTabs.tsx` - Updated filter tabs
5. `src/views/kitchen/KitchenDisplay.tsx` - Added remove handlers
6. `src/views/kitchen/OrderCard.tsx` - Added remove button
7. `src/views/bartender/BartenderDisplay.tsx` - Added clear/remove functionality

**Category Management:**
8. `src/app/api/categories/route.ts` - Enhanced with smart validation
9. `src/views/inventory/ProductForm.tsx` - Integrated category edit/delete UI

**Table Management:**
10. `src/app/api/tables/[tableId]/route.ts` - Updated to use TableService.updateTableDetails()
11. `src/core/services/tables/TableService.ts` - Added updateTableDetails() method with validation
12. `src/views/tables/TableGrid.tsx` - Integrated EditTableDialog and handlers
13. `src/views/tables/TableCard.tsx` - Added edit button with pencil icon
14. `src/views/tables/AddTableDialog.tsx` - Added custom area creation support
15. `src/app/(dashboard)/tables/page.tsx` - Removed SessionSelector, simplified to TableGrid only

**UI/UX:**
16. `src/views/pos/SessionProductSelector.tsx` - Added grid selector and layout reorganization
17. `src/views/pos/POSInterface.tsx` - Consolidated header with grid selector
18. `src/views/pos/components/TabProductCard.tsx` - Added animations
19. `src/views/pos/components/ProductCard.tsx` - Added animations
20. `src/app/(dashboard)/order-sessions/[sessionId]/close/page.tsx` - Fixed navigation

---

## 🚀 Deployment Instructions

### Prerequisites
- Backup your production database before deployment
- Ensure all users are logged out during migration

### Step-by-Step Deployment

#### 1. Apply Database Migration
```bash
# Via Supabase Dashboard
1. Go to SQL Editor
2. Run migration: migrations/release-v1.0.2/fix_kitchen_orders_cascade_delete.sql

# Or via CLI
psql YOUR_DATABASE_URL -f migrations/release-v1.0.2/fix_kitchen_orders_cascade_delete.sql
```

#### 2. Deploy Application Code
```bash
# Build and deploy
npm run build
npm run start

# Or deploy to your hosting platform
# (Vercel, Netlify, etc.)
```

#### 3. Verify Deployment
- [ ] Check kitchen display loads correctly
- [ ] Check bartender display loads correctly
- [ ] Test cancelling an item from a tab
- [ ] Verify cancelled order appears with red badge
- [ ] Test "Clear Cancelled" button
- [ ] Test individual "Remove" button on cancelled orders

---

## ⚠️ Breaking Changes

### None
This is a backward-compatible patch release with no breaking changes to existing functionality.

### Behavioral Changes
- **READY orders now disappear** from kitchen/bartender displays (previously remained visible)
- **CANCELLED orders now persist** until manually cleared (previously disappeared immediately)

---

## 🧪 Testing Recommendations

### Test Scenarios

#### Scenario 1: Item Cancellation Flow
1. Create an order with kitchen/bartender items
2. Confirm the order (sends to kitchen/bartender)
3. Start preparing an item
4. Remove the item from the customer's tab
5. **Expected:** Item appears as CANCELLED in kitchen/bartender display
6. Click "Remove" button on the cancelled order
7. **Expected:** Order disappears from display

#### Scenario 2: Bulk Clear Cancelled
1. Cancel multiple items from different tables
2. **Expected:** All appear as CANCELLED in kitchen/bartender
3. Click "Clear Cancelled" button in header
4. **Expected:** All cancelled orders removed, success notification shows count

#### Scenario 3: Ready Order Workflow
1. Prepare an order and mark as READY
2. **Expected:** Order disappears from kitchen/bartender display
3. Verify order appears in waiter's ready orders list

#### Scenario 4: Dynamic Grid Layout
1. Open POS or Tab module
2. Click the grid selector button (dots)
3. **Expected:** Grid cycles through 3 → 4 → 5 → 6 columns
4. **Expected:** Smooth animation with product cards fading and zooming in
5. Verify dot count matches column count
6. Refresh the page
7. **Expected:** Grid resets to default (5 columns)

#### Scenario 5: Payment Dialog Navigation
1. Create a tab with items
2. Click "Close Tab & Pay" button
3. Payment dialog opens
4. Click the X button (top right)
5. **Expected:** User is redirected to /tabs page
6. Repeat steps 1-3
7. Click "Close" button in dialog
8. **Expected:** User is redirected to /tabs page

#### Scenario 6: Category Creation with Validation
1. Go to Inventory → Add Product
2. Click "Create New" category button
3. Enter category name "Beer"
4. **Expected:** Category created successfully
5. Try to create another category named "beer"
6. **Expected:** Error - duplicate name detected
7. Try to create category named "Beers"
8. **Expected:** Error - too similar to "Beer" (plural detection)

#### Scenario 7: Category Edit
1. Go to Inventory → Add Product
2. Select a category from dropdown
3. Click "Edit" button
4. Modify category name, color, or destination
5. Click "Update Category"
6. **Expected:** Category updated, list refreshes

#### Scenario 8: Category Deletion Protection
1. Edit a category that has products (e.g., "Beers")
2. Click "Delete Category" button
3. Confirm deletion
4. **Expected:** Error message showing up to 5 products using the category
5. **Expected:** Product names and SKUs displayed
6. **Expected:** Guidance to reassign products first
7. Edit a category with 0 products
8. Click "Delete Category"
9. **Expected:** Category deleted successfully

#### Scenario 9: Edit Table
1. Go to Tables module (`/tables`)
2. Click pencil icon on a table card
3. **Expected:** EditTableDialog opens with pre-filled data
4. Change table number to a unique value
5. Update capacity to a different number (1-50)
6. Click "Save Changes"
7. **Expected:** Table updated, card refreshes with new data
8. Try to change table number to an existing one
9. **Expected:** Error - duplicate table number

#### Scenario 10: Custom Area Creation
1. Click "Add Table" button
2. Fill in table number and capacity
3. Open Area dropdown
4. Select "+ Create New Area"
5. **Expected:** Input field appears below dropdown
6. Type "garden terrace"
7. Click "Add Table"
8. **Expected:** Table created with area "garden terrace"
9. Try to create another table with area "Garden Terrace"
10. **Expected:** Error - duplicate area (case-insensitive)
11. Try to create table with area "Indoor" (custom)
12. **Expected:** Error - conflicts with predefined area

#### Scenario 11: Edit Table with Custom Area
1. Edit a table that has a predefined area (e.g., "indoor")
2. **Expected:** Dropdown shows "Indoor" selected
3. Change to "+ Create New Area"
4. Type "rooftop bar"
5. Save changes
6. **Expected:** Table now has area "rooftop bar"
7. Edit the same table again
8. **Expected:** Dropdown shows "+ Create New Area", input shows "rooftop bar"

#### Scenario 12: Tables Module Separation
1. Go to `/tables`
2. **Expected:** Full-width TableGrid, no SessionSelector sidebar
3. **Expected:** Header says "Manage restaurant tables, update status..."
4. Click on a table
5. **Expected:** No tab selection panel appears
6. To open tabs, navigate to dedicated `/tabs` module

---

## 📊 Performance Impact

- **Minimal impact** - Additional database query for cancelled orders
- **Optimized queries** - Two-step deletion process for efficiency
- **No latency increase** - Client-side operations remain fast

---

## 🔒 Security Considerations

- All endpoints require proper authentication
- Server-side validation for order ownership
- RLS policies enforced via `supabaseAdmin` client
- No sensitive data exposed in API responses

---

## 📞 Support & Feedback

### Known Issues
- None at this time

### Reporting Issues
If you encounter any problems with this release:
1. Check the verification checklist above
2. Review server logs for error messages
3. Contact the development team with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

---

## 🎯 Next Steps

### Recommended Follow-up Actions
1. Monitor kitchen/bartender displays during first week
2. Gather staff feedback on new workflow
3. Track cancelled order metrics
4. Consider adding analytics dashboard for cancelled orders

### Future Enhancements (v1.0.3+)

**Kitchen/Bartender:**
- Analytics for most frequently cancelled items
- Automatic cleanup of old cancelled orders (configurable retention)
- Bulk actions for multiple order management
- Print receipt for cancelled items (for inventory tracking)

**Category Management:**
- Bulk category reassignment (change category for multiple products at once)
- Category usage analytics (product count, revenue per category)
- Category restore UI for soft-deleted categories
- Category hierarchies (parent/child relationships)
- Category import/export (CSV/Excel)
- Category templates for quick setup

**Table Management:**
- Bulk table edit (change multiple tables at once)
- Table usage analytics (occupancy rates, revenue per table)
- Area management page (rename, merge, delete areas)
- Visual floor plan with drag-and-drop table placement
- Table QR codes for customer access
- Table reservation system integration
- Area templates for different restaurant types

---

## 👥 Credits

**Development Team:**
- Bug Fix Implementation
- UI/UX Enhancements
- Database Schema Updates
- API Endpoint Development

**Testing & QA:**
- User Acceptance Testing
- Performance Testing
- Security Review

---

## 📝 Version History

| Version | Date | Type | Summary |
|---------|------|------|---------|
| 1.0.2 | 2025-10-20 | Patch | Cancelled orders, category/table management, grid layouts |
| 1.0.1 | 2025-10-15 | Patch | Minor bug fixes |
| 1.0.0 | 2025-10-09 | Major | Initial production release |

---

**End of Release Notes v1.0.2**

For previous release notes, see `summary/release-v1.0.1/` or `summary/release-v1.0.0/`
