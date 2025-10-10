# Cashier Access Fix - Dashboard, Tables, and Customers

## Issues
Cashiers were being blocked from accessing multiple routes:
1. Dashboard (`/`) - redirected to `/pos`
2. Tables (`/tables`) - redirected to `/pos`
3. Customers (`/customers`) - redirected to `/pos`

Error messages:
```
⛔ Middleware: Access denied to / for roles cashier
⛔ Middleware: Access denied to /tables for roles cashier
⛔ Middleware: Access denied to /customers for roles cashier
↪️  Redirecting to: /pos
```

## Root Cause
Route access rules had these modules restricted to admin and manager only, but cashiers need access to:
- Dashboard: View order history
- Tables: Assign tables to orders
- Customers: Lookup customers during checkout

## Files Fixed

### 1. Route Access Configuration
**File**: `src/lib/utils/roleBasedAccess.ts`

**Changed Routes**:

#### Dashboard Route
```typescript
// Before
{
  path: '/',
  allowedRoles: [UserRole.ADMIN],  // ❌ Admin only
}

// After
{
  path: '/',
  allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],  // ✅ Cashier added
}
```

#### Customers Route
```typescript
// Before
{
  path: '/customers',
  allowedRoles: [UserRole.ADMIN, UserRole.MANAGER],  // ❌ No cashier access
}

// After
{
  path: '/customers',
  allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],  // ✅ Cashier added
}
```

#### Tables Route
```typescript
// Before
{
  path: '/tables',
  allowedRoles: [UserRole.ADMIN, UserRole.MANAGER],  // ❌ No cashier access
}

// After
{
  path: '/tables',
  allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],  // ✅ Cashier added
}
```

### 2. Dashboard Page
**File**: `src/app/(dashboard)/page.tsx`

**Added**:
- Imported `RouteGuard` and `UserRole`
- Wrapped page content with `<RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>`
- Updated JSDoc comment to indicate access levels

### 3. Customers Page
**File**: `src/app/(dashboard)/customers/page.tsx`

**Changed**:
```typescript
// Before
<RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER]}>

// After
<RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
```

### 4. Tables Page
**File**: `src/app/(dashboard)/tables/page.tsx`

**Changed**:
```typescript
// Before
<RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER]}>

// After
<RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
```

## Access Levels Now

### ✅ Cashier Can Access
| Module | Route | Reason |
|--------|-------|--------|
| Dashboard | `/` | View order history and statistics |
| POS | `/pos` | Create and process orders |
| Customers | `/customers` | Lookup customer info for orders |
| Tables | `/tables` | Assign tables to orders |

### ✅ Full Access Matrix
| Route | Admin | Manager | Cashier | Kitchen | Bartender | Waiter |
|-------|-------|---------|---------|---------|-----------|--------|
| `/` Dashboard | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/pos` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/customers` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/tables` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/kitchen` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `/bartender` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `/waiter` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `/reports` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/inventory` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/settings` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

## Testing

### Test Cashier Access
1. Login as cashier
2. Navigate to `/` - ✅ Should see dashboard
3. Navigate to `/tables` - ✅ Should see table management
4. Navigate to `/customers` - ✅ Should see customer list
5. Navigate to `/pos` - ✅ Should see POS system
6. No "Access denied" errors in console

### Expected Redirects (Still Blocked)
- Navigate to `/kitchen` → Redirected to `/pos`
- Navigate to `/bartender` → Redirected to `/pos`
- Navigate to `/reports` → Redirected to `/pos`
- Navigate to `/inventory` → Redirected to `/pos`
- Navigate to `/settings` → Redirected to `/pos`

## Related Files
- `src/lib/utils/roleBasedAccess.ts` - Route access rules (middleware level)
- `src/app/(dashboard)/page.tsx` - Dashboard page with guard
- `src/app/(dashboard)/customers/page.tsx` - Customers list page with guard
- `src/app/(dashboard)/tables/page.tsx` - Tables management page with guard
- `src/middleware.ts` - Middleware that enforces rules

## Rationale

### Why Cashiers Need These Modules

**Dashboard (`/`)**
- View order history and statistics
- Quick access to customer information
- Overview of daily operations

**Customers (`/customers`)**
- Lookup customer information during checkout
- Verify VIP status for discounts
- Access loyalty points
- Check special event offers (birthdays, anniversaries)
- Register new customers at POS

**Tables (`/tables`)**
- Assign tables to orders
- Check table availability
- View occupied tables
- Manage table status during service

**POS (`/pos`)**
- Primary work station
- Create and process orders
- Handle payments
- Print receipts

## Status
✅ **FIXED** - Cashiers now have full access to required modules

---

**Date**: October 6, 2025  
**Issue Type**: Access Control Configuration  
**Priority**: High (Blocking cashier workflow)  
**Status**: Resolved  
**Changes**: 
- 3 routes updated in `roleBasedAccess.ts` (middleware level)
- 3 page components updated with RouteGuard (component level)
- Total: 6 files modified
