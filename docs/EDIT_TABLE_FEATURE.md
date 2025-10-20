# Edit Table Feature Implementation

## Overview
This document describes the implementation of the edit table functionality for the BeerHive Sales System, following professional software engineering principles and SOLID architecture patterns.

## Feature Summary
**What**: Allow managers and admins to edit table details (table number, capacity, area, notes)  
**Where**: Tables Management Module (`/tables`)  
**Who**: Manager and Admin roles only  
**Why**: Enable table information updates without recreating tables

## Architecture

### Layer Structure (Following SOLID Principles)

```
┌─────────────────────────────────────────┐
│  Frontend Layer (UI Components)         │
│  - EditTableDialog.tsx                  │
│  - TableCard.tsx (edit button)          │
│  - TableGrid.tsx (orchestration)        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  API Layer (HTTP Handler)               │
│  - PATCH /api/tables/[tableId]          │
│    (Routes to service layer)            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Service Layer (Business Logic)         │
│  - TableService.updateTableDetails()    │
│    • Validates input                    │
│    • Checks business rules              │
│    • Sanitizes data                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Repository Layer (Data Access)         │
│  - TableRepository.update()             │
│    • Database operations only           │
└─────────────────────────────────────────┘
```

## Implementation Details

### 1. Service Layer (`TableService.ts`)

**Method**: `updateTableDetails()`

**Purpose**: Handles business logic and validation for table editing

**Validation Rules**:
- Table number: Required, alphanumeric + spaces/hyphens, must be unique
- Capacity: Between 1 and 50 persons
- Area: Optional, sanitized (empty → null)
- Notes: Optional, sanitized (empty → null)

**Error Handling**:
- 404: Table not found
- 400: Validation failure
- 409: Duplicate table number
- 500: Database error

**Code Location**: `src/core/services/tables/TableService.ts` (lines 193-281)

### 2. API Endpoint

**Route**: `PATCH /api/tables/[tableId]`

**Authorization**: Manager or Admin only (`requireManagerOrAbove`)

**Request Body**:
```json
{
  "table_number": "A1",
  "capacity": 4,
  "area": "indoor",
  "notes": "Near window"
}
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "table_number": "A1",
    "capacity": 4,
    "area": "indoor",
    "notes": "Near window",
    "status": "available",
    "is_active": true,
    "created_at": "2024-01-20T10:00:00Z",
    "updated_at": "2024-01-20T10:30:00Z"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Table number 'A1' already exists"
}
```

**Code Location**: `src/app/api/tables/[tableId]/route.ts` (line 128)

### 3. Frontend Components

#### EditTableDialog (`EditTableDialog.tsx`)

**Purpose**: Modal dialog for editing table details

**Features**:
- Pre-populated with current table data
- Real-time validation
- Loading states during submission
- Error display
- Keyboard navigation (ESC to close)

**Props**:
```typescript
interface EditTableDialogProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tableId: string, tableData: UpdateData) => Promise<void>;
}
```

**Code Location**: `src/views/tables/EditTableDialog.tsx`

#### TableCard Updates

**Change**: Added edit button to card header

**Features**:
- Pencil icon button
- Only visible to managers/admins (`canEdit` prop)
- Positioned next to status badge
- Prevents event propagation (doesn't trigger card click)

**Code Location**: `src/views/tables/TableCard.tsx` (lines 162-172)

#### TableGrid Updates

**Changes**:
1. Added `showEditDialog` state
2. Added `handleEditClick` handler
3. Added `handleEditTable` API call
4. Integrated `EditTableDialog` component
5. Passed `onEdit` and `canEdit` props to TableCard

**Code Location**: `src/views/tables/TableGrid.tsx`

## User Flow

```
1. User (Manager/Admin) views tables at /tables
   ↓
2. Clicks edit (pencil) icon on a table card
   ↓
3. EditTableDialog opens with pre-filled data
   ↓
4. User modifies fields (table_number, capacity, area, notes)
   ↓
5. Clicks "Save Changes"
   ↓
6. Frontend validates input
   ↓
7. API call: PATCH /api/tables/[tableId]
   ↓
8. TableService validates business rules
   ↓
9. TableRepository updates database
   ↓
10. Success response returned
   ↓
11. UI updates optimistically
   ↓
12. Success toast displayed
   ↓
13. Dialog closes
```

## Security

### Authorization
- **Frontend**: Edit button only visible to managers/admins
- **API**: `requireManagerOrAbove()` middleware enforces role check
- **Database**: Uses `supabaseAdmin` client (bypasses RLS for service accounts)

### Validation
- **Client-side**: Immediate feedback for UX
- **Server-side**: Authoritative validation in service layer
- **Database**: Final constraint enforcement (unique table_number)

### Input Sanitization
- Trim whitespace from all string inputs
- Convert empty strings to null for optional fields
- Regex validation for table_number format
- Numeric bounds checking for capacity

## Testing Checklist

### Manual Testing
- [ ] Edit button only visible to managers/admins
- [ ] Edit button not visible to cashiers/waiters
- [ ] Dialog pre-fills with current table data
- [ ] Can update table number (unique check works)
- [ ] Can update capacity (1-50 validation works)
- [ ] Can update area (dropdown works)
- [ ] Can update notes (textarea works)
- [ ] Cannot submit empty table number
- [ ] Cannot submit capacity < 1 or > 50
- [ ] Cannot change to duplicate table number
- [ ] Success toast appears on update
- [ ] Error toast appears on failure
- [ ] Real-time subscription updates other clients
- [ ] Can edit table with any status
- [ ] Changes persist after page refresh

### Error Scenarios
- [ ] Network failure handling
- [ ] 409 conflict (duplicate table_number)
- [ ] 404 not found
- [ ] 401 unauthorized (if not manager/admin)
- [ ] 500 server error

## Database Schema

**Table**: `restaurant_tables`

**Editable Fields**:
- `table_number` (string, unique, required)
- `capacity` (integer, 1-50, required)
- `area` (string, nullable)
- `notes` (text, nullable)

**Automatically Updated**:
- `updated_at` (timestamp, auto-set on update)

**Not Editable via Edit Dialog**:
- `id` (primary key)
- `status` (managed by status actions)
- `current_order_id` (managed by order flow)
- `is_active` (managed by deactivate/reactivate)
- `created_at` (immutable)

## API Reference

### Update Table Details

**Endpoint**: `PATCH /api/tables/:tableId`

**Authorization**: Bearer token (Manager/Admin)

**Request**:
```http
PATCH /api/tables/abc-123
Content-Type: application/json
Authorization: Bearer <token>

{
  "table_number": "A1",
  "capacity": 4,
  "area": "indoor",
  "notes": "Corner table"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "table_number": "A1",
    "capacity": 4,
    "area": "indoor",
    "notes": "Corner table",
    "status": "available",
    "current_order_id": null,
    "is_active": true,
    "created_at": "2024-01-20T10:00:00Z",
    "updated_at": "2024-01-20T15:30:00Z"
  }
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "success": false,
  "error": "Capacity must be at least 1"
}
```

409 Conflict:
```json
{
  "success": false,
  "error": "Table number 'A1' already exists"
}
```

404 Not Found:
```json
{
  "success": false,
  "error": "Table not found"
}
```

## Code Quality

### Documentation
- ✅ All methods have JSDoc comments
- ✅ Parameters and return types documented
- ✅ Business rules explained in remarks
- ✅ Error conditions listed

### SOLID Principles
- ✅ **Single Responsibility**: Each layer has one clear purpose
- ✅ **Open/Closed**: Extends existing update infrastructure
- ✅ **Liskov Substitution**: N/A (no inheritance)
- ✅ **Interface Segregation**: Props are focused and minimal
- ✅ **Dependency Inversion**: Services injected as dependencies

### Error Handling
- ✅ Graceful degradation
- ✅ User-friendly error messages
- ✅ Logging for debugging
- ✅ Consistent error format across layers

## Future Enhancements

1. **Bulk Edit**: Edit multiple tables at once
2. **Edit History**: Track who edited what and when
3. **Validation Preview**: Show which tables would conflict before saving
4. **Keyboard Shortcuts**: Ctrl+E to edit selected table
5. **Undo Support**: Allow undo of recent edits
6. **Field-level Permissions**: Different roles can edit different fields

## Module Separation

**Tables Module** (`/tables`):
- Pure table management (create, edit, deactivate, status updates)
- No tab/session functionality
- Focus on physical table configuration

**Tabs Module** (Separate):
- All tab/session management
- Opening and closing tabs
- Tab-based ordering

This separation follows the **Single Responsibility Principle** - each module has one clear purpose.

## Related Documentation

- `ADD_TABLE_FEATURE.md` - Creating new tables
- `DEACTIVATE_TABLE_FEATURE.md` - Deactivating tables
- `TABLE_STATUS_MANAGEMENT.md` - Status transitions
- `ROLE_BASED_ACCESS.md` - Authorization patterns

## Changelog

### v1.0.2 (Current)
- ✅ Edit table functionality implemented
- ✅ Service layer validation added
- ✅ EditTableDialog component created
- ✅ TableCard edit button integrated
- ✅ TableGrid orchestration complete
- ✅ Full documentation provided

---

**Last Updated**: 2024-10-20  
**Author**: Development Team  
**Status**: ✅ Completed and Documented
