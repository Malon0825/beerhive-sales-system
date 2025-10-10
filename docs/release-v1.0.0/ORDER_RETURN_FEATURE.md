# Order Return/Void Feature Documentation

## Overview
The Order Return feature allows managers and admins to void completed orders when customers want to return their purchases. This includes proper authorization, inventory management, and audit tracking.

## Features

### 1. Return Completed Orders
- **Void button**: Appears on completed orders in the Order Board
- **Manager authorization**: Requires manager PIN for security
- **Return reasons**: Predefined reasons + custom option
- **Inventory return**: Automatically returns items to inventory
- **Audit trail**: Full logging of who, when, and why

### 2. Authorization
- **Manager/Admin only**: Only users with Manager or Admin role can process returns
- **PIN verification**: Manager must enter their PIN to authorize the return
- **Failed authentication handling**: Clear error messages for invalid PINs

### 3. Inventory Management
- **Automatic return**: Items are automatically returned to inventory when order is voided
- **Stock updates**: Product stock levels are incremented by returned quantities
- **Non-reversible**: Once voided, the action cannot be undone

## User Interface

### Return Button
- **Location**: Appears at the bottom of order cards for completed orders
- **Label**: "Return Order" with rotating icon
- **Color**: Red theme to indicate destructive action
- **Visibility**: Only visible for orders with status "completed"

### Return Dialog
The return dialog includes:
1. **Order information**: Order number displayed for confirmation
2. **Warning message**: Clear indication that action cannot be undone
3. **Return reason dropdown**: Selection of predefined reasons
4. **Custom reason field**: Text input when "Other" is selected
5. **Manager PIN input**: Secure password field for authorization
6. **Action buttons**: Cancel and "Void Order" buttons

### Return Reasons
Predefined options:
- Customer not satisfied
- Wrong order delivered
- Food quality issue
- Service issue
- Customer changed mind
- Billing error
- Other (requires custom text)

## Technical Implementation

### Files Created/Modified

#### 1. ReturnOrderDialog Component
**File**: `src/views/order-board/ReturnOrderDialog.tsx`

**Purpose**: Modal dialog for processing order returns

**Features**:
- Form validation (PIN and reason required)
- Error handling and display
- Loading states
- Success callback integration

**Props**:
```typescript
interface ReturnOrderDialogProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}
```

#### 2. OrderBoardCard Update
**File**: `src/views/order-board/OrderBoardCard.tsx`

**Changes**:
- Added "Return Order" button for completed orders
- Integrated ReturnOrderDialog
- Added onOrderUpdated callback prop
- State management for dialog visibility

#### 3. API Endpoint Enhancement
**File**: `src/app/api/orders/[orderId]/void/route.ts`

**Changes**:
- Added PIN-based authentication support
- Support for `isReturn` flag
- Enhanced validation (minimum 5 characters for reasons)
- Automatic inventory return for returns
- Return-specific audit trail prefix

**Request Body**:
```json
{
  "managerPin": "123456",
  "reason": "Customer not satisfied",
  "isReturn": true
}
```

**Response**:
```json
{
  "success": true,
  "data": { /* voided order object */ },
  "message": "Order returned successfully"
}
```

### Authentication Flow

```
1. User clicks "Return Order" button
   ↓
2. Dialog opens with form
   ↓
3. User selects reason and enters manager PIN
   ↓
4. Submit → API validates PIN
   ↓
5. API looks up user by PIN
   ↓
6. API verifies user has Manager/Admin role
   ↓
7. If valid → Process return
   ↓
8. Update order status to VOIDED
   ↓
9. Return inventory
   ↓
10. Log audit trail
   ↓
11. Success → Refresh order board
```

### Database Operations

#### Order Update
```sql
UPDATE orders 
SET 
  status = 'voided',
  voided_by = :manager_user_id,
  voided_reason = '[RETURN] ' || :reason,
  voided_at = NOW(),
  updated_at = NOW()
WHERE id = :order_id
```

#### Inventory Return
For each order item:
```sql
UPDATE products 
SET 
  current_stock = current_stock + :returned_quantity,
  updated_at = NOW()
WHERE id = :product_id
```

### Audit Trail
Every return creates an audit log with:
- **Manager ID**: Who authorized the return
- **Order ID**: Which order was returned
- **Reason**: Why the return was processed (prefixed with [RETURN])
- **Timestamp**: When the return occurred
- **Action**: "ORDER_VOIDED"

## Security Considerations

### PIN Authentication
**Important**: The current implementation compares PINs directly in the database. In a production environment, you should:

1. Hash PINs before storing
2. Use bcrypt or similar for comparison
3. Implement rate limiting to prevent brute force attacks
4. Add account lockout after failed attempts
5. Log failed authentication attempts

**Current Code** (Development):
```typescript
.eq('password_hash', body.managerPin)
```

**Production Recommendation**:
```typescript
const hashedPin = await bcrypt.hash(body.managerPin, 10);
// Compare hashed values
```

### Role-Based Access
- Only Manager and Admin roles can process returns
- Query filters by role to prevent unauthorized access
- Failed attempts return 403 Forbidden status

### Audit Logging
All return actions are logged with:
- Manager who authorized
- Original cashier who created order
- Reason for return
- Timestamp
- Order details

## Usage Guide

### For Staff

#### Processing a Return:
1. Navigate to Order Board
2. Locate the completed order to return
3. Click "Return Order" button at bottom of order card
4. In the dialog:
   - Select return reason from dropdown
   - If "Other", provide specific reason
   - Enter your manager PIN
5. Click "Void Order"
6. Order status updates to "voided" automatically
7. Inventory is returned automatically

#### Common Return Scenarios:

**Customer Dissatisfaction**:
- Reason: "Customer not satisfied"
- Result: Full refund, inventory returned

**Wrong Order**:
- Reason: "Wrong order delivered"
- Result: Order voided, customer can place correct order

**Quality Issue**:
- Reason: "Food quality issue"
- Result: Order voided, issue reported for kitchen review

**Billing Error**:
- Reason: "Billing error"
- Result: Order voided, corrected order can be created

### For Managers

#### Best Practices:
1. **Verify the issue**: Speak with customer/staff before processing
2. **Document clearly**: Choose most specific reason
3. **Use custom reason**: When predefined reasons don't fit
4. **Check inventory**: Verify items are returned physically
5. **Review patterns**: Monitor frequent returns for training opportunities

#### Monitoring Returns:
- Check audit logs regularly
- Review return reasons for patterns
- Monitor high-return items
- Track return rates by cashier/shift

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid manager PIN or insufficient permissions" | Wrong PIN or not Manager/Admin role | Verify PIN and role |
| "Order not found" | Invalid order ID | Check order exists |
| "Order is already voided" | Attempting to void twice | Order already processed |
| "Reason required" | Empty reason field | Provide valid reason |
| "Reason must be at least 5 characters" | Reason too short | Provide detailed reason |

### Error Display
Errors are shown in the dialog:
- Red background alert box
- Clear error message
- Form remains populated for correction
- No data loss on error

## Testing

### Test Scenarios

#### 1. Successful Return
```
Given: A completed order exists
When: Manager enters valid PIN and reason
Then: Order is voided, inventory returned, success message shown
```

#### 2. Invalid PIN
```
Given: Return dialog is open
When: User enters incorrect PIN
Then: Error message: "Invalid manager PIN or insufficient permissions"
```

#### 3. Insufficient Permissions
```
Given: Cashier tries to return order
When: Cashier enters their PIN
Then: Error message about insufficient permissions
```

#### 4. Empty Reason
```
Given: Return dialog is open
When: User submits without selecting reason
Then: Error: "Please select a return reason"
```

#### 5. Custom Reason Validation
```
Given: "Other" is selected as reason
When: Custom reason is less than 5 characters
Then: Error: "Reason must be at least 5 characters"
```

## API Reference

### POST /api/orders/[orderId]/void

#### Authentication
Requires manager PIN in request body

#### Parameters
- `orderId` (path): Order ID to void

#### Request Body
```typescript
{
  managerPin: string;        // Manager's PIN (required)
  reason: string;            // Return reason (required, min 5 chars)
  isReturn?: boolean;        // Flag as return (optional, default false)
  return_inventory?: boolean; // Return inventory (optional, default true)
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "ORD24010100001",
    "status": "voided",
    "voided_by": "manager_user_id",
    "voided_reason": "[RETURN] Customer not satisfied",
    "voided_at": "2024-01-01T10:00:00Z",
    ...
  },
  "message": "Order returned successfully"
}
```

#### Error Responses

**400 Bad Request**:
```json
{
  "success": false,
  "error": "Reason must be at least 5 characters"
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "error": "Invalid manager PIN or insufficient permissions"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Order not found"
}
```

## Reporting

### Return Analytics
To analyze returns, query:
```sql
SELECT 
  DATE(voided_at) as return_date,
  COUNT(*) as return_count,
  SUM(total_amount) as total_returned,
  voided_reason
FROM orders
WHERE status = 'voided' 
  AND voided_reason LIKE '[RETURN]%'
GROUP BY DATE(voided_at), voided_reason
ORDER BY return_date DESC;
```

### Common Return Reasons
```sql
SELECT 
  REPLACE(voided_reason, '[RETURN] ', '') as reason,
  COUNT(*) as count,
  SUM(total_amount) as total_value
FROM orders
WHERE status = 'voided' 
  AND voided_reason LIKE '[RETURN]%'
GROUP BY reason
ORDER BY count DESC;
```

## Future Enhancements

1. **Partial Returns**: Allow returning specific items, not entire order
2. **Refund Tracking**: Link returns to refund transactions
3. **Return Limits**: Set maximum return value per day/shift
4. **Photo Evidence**: Attach photos for quality issues
5. **Customer History**: Track return patterns per customer
6. **Manager Approval Queue**: Require approval for large returns
7. **Inventory Verification**: Require physical inventory check before return
8. **Print Return Receipt**: Generate return documentation

## Troubleshooting

### Returns Not Working
1. Check user role is Manager or Admin
2. Verify PIN is correct
3. Check order status is "completed"
4. Review browser console for errors
5. Verify API endpoint is accessible

### Inventory Not Returning
1. Check order items have valid product_ids
2. Verify products exist in inventory
3. Review server logs for inventory errors
4. Check ProductRepository.updateStock is working

### Authorization Issues
1. Verify user table has correct roles
2. Check PIN matches password_hash field
3. Review RLS policies on users table
4. Confirm API can access user data

## Best Practices

### For Development
- Hash PINs in production
- Implement rate limiting
- Add request logging
- Monitor failed auth attempts
- Use environment-specific configs

### For Operations
- Train staff on return policies
- Regular PIN rotation
- Monitor return patterns
- Review audit logs weekly
- Document common scenarios

## Conclusion

The Order Return feature provides a secure, auditable way to handle customer returns with proper authorization and inventory management. It integrates seamlessly with the existing Order Board and maintains data integrity throughout the process.
