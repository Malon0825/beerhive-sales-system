# Table Status Management System

**Date**: 2025-10-05  
**Feature**: Automatic table status management for orders  
**Status**: ✅ Implemented

---

## Overview

The system automatically manages restaurant table statuses throughout the order lifecycle. When a customer purchases at a table, the table is automatically marked as **OCCUPIED** and linked to the order.

---

## Table Status Flow

### Status Types

```typescript
enum TableStatus {
  AVAILABLE = 'available',   // Table is free and can be assigned
  OCCUPIED = 'occupied',      // Table has an active order
  RESERVED = 'reserved',      // Table is reserved for future use
  CLEANING = 'cleaning'       // Table is being cleaned after use
}
```

### Status Lifecycle

```
┌─────────────┐
│  AVAILABLE  │ ◄──────────────────────┐
└──────┬──────┘                        │
       │ Order Created                 │
       │                               │
       ▼                               │
┌─────────────┐                        │
│  OCCUPIED   │                        │
└──────┬──────┘                        │
       │ Order Completed               │
       │                               │
       ▼                               │
┌─────────────┐                        │
│  CLEANING   │                        │
└──────┬──────┘                        │
       │ Cleaned                       │
       │                               │
       └───────────────────────────────┘
```

---

## Implementation Details

### When Order is Created

**File**: `src/core/use-cases/orders/CreateOrder.ts` (Lines 91-102)

```typescript
// Step 8: Update table status to OCCUPIED if assigned
if (dto.table_id) {
  try {
    await TableRepository.assignOrder(dto.table_id, order.id);
    console.log(`✅ Table ${dto.table_id} marked as OCCUPIED for order ${order.id}`);
  } catch (tableError) {
    console.error('⚠️ Table assignment error (non-fatal):', tableError);
    console.warn('Order created successfully but table status not updated');
  }
}
```

**What Happens**:
1. Order is created successfully
2. System attempts to assign table to order
3. Table status changed to `OCCUPIED`
4. Table's `current_order_id` set to order ID
5. If assignment fails, order still succeeds (table update is non-critical)

### Table Assignment Method

**File**: `src/data/repositories/TableRepository.ts` (Lines 165-184)

```typescript
/**
 * Assign order to table
 * - Sets status to OCCUPIED
 * - Links table to order via current_order_id
 * Uses admin client to bypass RLS policies
 */
static async assignOrder(id: string, orderId: string): Promise<Table> {
  try {
    const { data, error } = await supabaseAdmin
      .from('restaurant_tables')
      .update({ 
        current_order_id: orderId,
        status: TableStatus.OCCUPIED,  // ✅ Table marked as occupied
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data as Table;
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to assign order', 500);
  }
}
```

**Database Changes**:
- `status` → `'occupied'`
- `current_order_id` → order UUID
- `updated_at` → current timestamp

---

## Table Release (Order Completion)

### When to Release Table

Tables should be released (set back to AVAILABLE or CLEANING) when:
- ✅ Order is completed
- ✅ Order is voided
- ✅ Payment is received
- ✅ Customers leave

### Release Method

**File**: `src/data/repositories/TableRepository.ts` (Lines 190-210)

```typescript
/**
 * Release table (set status to available)
 * - Clears current_order_id
 * - Sets status to AVAILABLE
 * Uses admin client to bypass RLS policies
 */
static async releaseTable(id: string): Promise<Table> {
  try {
    const { data, error } = await supabaseAdmin
      .from('restaurant_tables')
      .update({ 
        current_order_id: null,
        status: TableStatus.AVAILABLE,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data as Table;
  } catch (error) {
    console.error('Error releasing table:', error);
    throw error instanceof AppError ? error : new AppError('Failed to release table', 500);
  }
}
```

### TODO: Implement Auto-Release

Currently, tables must be manually released. Implement automatic release when:

```typescript
// In OrderRepository or OrderService
static async completeOrder(orderId: string) {
  // 1. Update order status to COMPLETED
  await OrderRepository.updateStatus(orderId, OrderStatus.COMPLETED);
  
  // 2. Get order details
  const order = await OrderRepository.getById(orderId);
  
  // 3. Release table if assigned
  if (order.table_id) {
    await TableRepository.releaseTable(order.table_id);
    console.log(`✅ Table ${order.table_id} released (order completed)`);
  }
}
```

---

## Database Schema

### Table Structure

```sql
CREATE TABLE restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number VARCHAR(10) UNIQUE NOT NULL,
    area VARCHAR(50),
    capacity INTEGER DEFAULT 4,
    status table_status DEFAULT 'available',
    current_order_id UUID,  -- Links to active order
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Status Column

```sql
CREATE TYPE table_status AS ENUM (
  'available',  -- Free to use
  'occupied',   -- Has active order
  'reserved',   -- Reserved for later
  'cleaning'    -- Being cleaned
);
```

---

## Testing

### Test Scenario 1: Order with Table

**Steps**:
1. Open POS system
2. Add products to cart
3. **Select a table** from available tables
4. Complete payment

**Expected Result**:
```
✅ Order created successfully
✅ Table marked as OCCUPIED
✅ Table's current_order_id = order.id
✅ Console: "✅ Table {id} marked as OCCUPIED for order {orderId}"
```

**Verify in Database**:
```sql
-- Check table status
SELECT 
  t.id,
  t.table_number,
  t.status,
  t.current_order_id,
  o.order_number,
  o.total_amount,
  o.status as order_status
FROM restaurant_tables t
LEFT JOIN orders o ON t.current_order_id = o.id
WHERE t.table_number = '[your-table]';

-- Expected:
-- status = 'occupied'
-- current_order_id = [order UUID]
-- order linked correctly
```

---

### Test Scenario 2: Order without Table

**Steps**:
1. Add products to cart
2. **Do NOT select a table**
3. Complete payment

**Expected Result**:
```
✅ Order created successfully
✅ No table status changes
✅ Order has table_id = null
```

---

### Test Scenario 3: Invalid Table ID

**Steps**:
1. Cart has stale/invalid table reference
2. Complete payment

**Expected Result**:
```
✅ Order created successfully
⚠️ Console: "Table not found, creating order without table"
✅ Table status unchanged
✅ Order has table_id = null
```

---

## API Endpoints

### Get Available Tables

```typescript
// GET /api/tables?status=available
const availableTables = await TableRepository.getByStatus(TableStatus.AVAILABLE);
```

### Get Occupied Tables

```typescript
// GET /api/tables?status=occupied
const occupiedTables = await TableRepository.getByStatus(TableStatus.OCCUPIED);
```

### Get Table with Order Details

```sql
SELECT 
  t.*,
  o.order_number,
  o.total_amount,
  o.created_at as order_time,
  c.full_name as customer_name
FROM restaurant_tables t
LEFT JOIN orders o ON t.current_order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
WHERE t.status = 'occupied';
```

---

## Console Logging

### Success Messages

```
✅ Table {uuid} marked as OCCUPIED for order {uuid}
```

### Warning Messages

```
⚠️ Table assignment error (non-fatal): [error details]
⚠️ Order created successfully but table status not updated
```

### Info Messages

```
ℹ️ Table {uuid} not found, creating order without table
ℹ️ No table assigned to this order
```

---

## Error Handling

### Non-Fatal Errors

These errors are logged but don't block order creation:

1. **Table Not Found**
   - Warning logged
   - table_id cleared
   - Order proceeds without table

2. **Table Assignment Failed**
   - Error logged
   - Order already created
   - Manual table assignment may be needed

### Fatal Errors

These errors will block order creation:

1. **Product Not Found** ❌
2. **Invalid Payment Method** ❌
3. **Empty Cart** ❌
4. **Database Connection Lost** ❌

---

## Best Practices

### ✅ DO

1. **Check table availability** before showing to user
2. **Release tables** when orders complete
3. **Monitor occupied tables** for long durations
4. **Handle cleaning status** for table turnover
5. **Log all table status changes** for audit

### ❌ DON'T

1. **Don't manually set status to OCCUPIED** (use assignOrder)
2. **Don't forget to release tables** after orders complete
3. **Don't reuse table_id** without checking status
4. **Don't block order creation** if table assignment fails
5. **Don't allow multiple orders** per table

---

## Future Enhancements

### Auto-Release on Order Completion

```typescript
// Add to OrderService
async function completeOrder(orderId: string) {
  const order = await OrderRepository.updateStatus(orderId, OrderStatus.COMPLETED);
  
  if (order.table_id) {
    await TableRepository.releaseTable(order.table_id);
  }
}
```

### Table Timer

Track how long tables are occupied:

```typescript
interface TableWithTimer {
  table: Table;
  occupiedSince: Date;
  duration: number; // minutes
  warningThreshold: number; // e.g., 90 minutes
}
```

### Auto-Cleaning Status

After order completion, set to CLEANING for 10 minutes:

```typescript
async function completeOrder(orderId: string) {
  // ... complete order ...
  
  if (order.table_id) {
    // Set to cleaning
    await TableRepository.updateStatus(order.table_id, TableStatus.CLEANING);
    
    // Schedule auto-release after 10 minutes
    setTimeout(async () => {
      await TableRepository.releaseTable(order.table_id);
    }, 10 * 60 * 1000);
  }
}
```

### Reservation System

```typescript
interface TableReservation {
  table_id: string;
  customer_id: string;
  reservation_time: Date;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'seated' | 'completed';
}
```

---

## Troubleshooting

### Table Stuck in OCCUPIED

**Problem**: Table shows as occupied but order is completed

**Solution**:
```sql
-- Manually release table
UPDATE restaurant_tables 
SET status = 'available', 
    current_order_id = NULL,
    updated_at = NOW()
WHERE id = '[table-id]';
```

Or via API:
```typescript
await TableRepository.releaseTable(tableId);
```

---

### Table Shows Wrong Order

**Problem**: Table linked to wrong order

**Solution**:
```sql
-- Check current assignment
SELECT t.table_number, t.current_order_id, o.order_number, o.status
FROM restaurant_tables t
LEFT JOIN orders o ON t.current_order_id = o.id
WHERE t.id = '[table-id]';

-- Fix if needed
UPDATE restaurant_tables 
SET current_order_id = '[correct-order-id]'
WHERE id = '[table-id]';
```

---

### Multiple Tables Assigned to Same Order

**Problem**: Data integrity issue

**Prevention**:
```sql
-- Add unique constraint (if not exists)
ALTER TABLE restaurant_tables 
ADD CONSTRAINT unique_current_order 
UNIQUE (current_order_id) 
WHERE current_order_id IS NOT NULL;
```

---

## Monitoring Queries

### Active Table Summary

```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'available') as available_tables,
  COUNT(*) FILTER (WHERE status = 'occupied') as occupied_tables,
  COUNT(*) FILTER (WHERE status = 'reserved') as reserved_tables,
  COUNT(*) FILTER (WHERE status = 'cleaning') as cleaning_tables,
  COUNT(*) as total_tables
FROM restaurant_tables
WHERE is_active = true;
```

### Occupied Tables Details

```sql
SELECT 
  t.table_number,
  t.area,
  o.order_number,
  o.total_amount,
  c.full_name as customer,
  NOW() - o.created_at as occupied_duration,
  u.username as cashier
FROM restaurant_tables t
JOIN orders o ON t.current_order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN users u ON o.cashier_id = u.id
WHERE t.status = 'occupied'
ORDER BY o.created_at ASC;
```

### Long-Occupied Tables Alert

```sql
-- Tables occupied for more than 2 hours
SELECT 
  t.table_number,
  o.order_number,
  EXTRACT(EPOCH FROM (NOW() - o.created_at))/60 as minutes_occupied
FROM restaurant_tables t
JOIN orders o ON t.current_order_id = o.id
WHERE t.status = 'occupied'
  AND o.created_at < NOW() - INTERVAL '2 hours'
ORDER BY o.created_at ASC;
```

---

## Related Files

### Modified
- ✅ `src/core/use-cases/orders/CreateOrder.ts` - Table assignment logging

### Existing (No Changes)
- `src/data/repositories/TableRepository.ts` - Table operations
- `src/models/enums/TableStatus.ts` - Status enum
- `src/models/entities/Table.ts` - Table entity

### Documentation
- This file: `summary/TABLE_STATUS_MANAGEMENT.md`

---

**Status**: ✅ Table auto-marking as OCCUPIED is implemented and working  
**Next**: Implement auto-release when orders complete  
**Priority**: Medium (tables must be manually released for now)
