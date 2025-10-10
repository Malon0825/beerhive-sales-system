# Sales Receipt Printing Feature - Implementation Guide

## Overview

The sales receipt printing feature automatically displays a printable receipt after payment confirmation in the POS system. The receipt includes the BeerHive logo, complete order details, customer information, and payment breakdown.

## Features

✅ **Automatic Receipt Display** - Receipt appears immediately after successful payment  
✅ **BeerHive Logo Integration** - Professional branding with company logo  
✅ **Complete Order Details** - All items, quantities, prices, and totals  
✅ **Customer & Table Info** - Customer name, table number, cashier details  
✅ **Payment Information** - Payment method, amount tendered, change  
✅ **Print-Optimized Layout** - Thermal printer-friendly 80mm width format  
✅ **Browser Print Dialog** - One-click printing functionality

## Architecture

### Component Structure

```
src/
├── views/pos/
│   ├── POSInterface.tsx          # Main POS component
│   ├── PaymentPanel.tsx          # Payment processing
│   └── SalesReceipt.tsx          # Receipt display & printing ✨ NEW
│
├── lib/utils/
│   └── receiptPrinter.ts         # Receipt utilities ✨ NEW
│
├── core/services/orders/
│   └── OrderService.ts           # Enhanced with receipt data
│
└── data/repositories/
    └── OrderRepository.ts        # Fetches complete order data
```

### Data Flow

```
1. User clicks "Confirm Payment" → PaymentPanel
2. Order created → API: POST /api/orders
3. Order completed → API: PATCH /api/orders/:id (action: complete)
4. Fetch order details → API: GET /api/orders/:id?includeSummary=true
5. Display receipt → SalesReceipt component
6. User clicks "Print" → Browser print dialog
```

## Implementation Details

### 1. SalesReceipt Component (`src/views/pos/SalesReceipt.tsx`)

**Purpose**: Display and print formatted sales receipt

**Key Features**:
- Responsive layout with print-specific CSS
- BeerHive logo from `/public/beerhive-logo.png`
- Complete order breakdown with line items
- VIP pricing and complimentary item indicators
- Payment details with change calculation
- Print and close buttons

**Props**:
```typescript
interface SalesReceiptProps {
  orderData: ReceiptOrderData;  // Complete order with relations
  onClose?: () => void;          // Optional close handler
}
```

**Print Styling**:
```css
@media print {
  - 80mm width (thermal printer standard)
  - Hides non-printable UI elements
  - Shows only receipt content
  - Adds print timestamp
}
```

### 2. Receipt Printer Utility (`src/lib/utils/receiptPrinter.ts`)

**Functions**:

```typescript
// Fetch complete order data for receipt
async fetchOrderForReceipt(orderId: string): Promise<any>

// Trigger browser print dialog
autoPrintReceipt(): void

// Check browser print support
isPrintSupported(): boolean
```

### 3. Payment Flow Integration (`src/views/pos/POSInterface.tsx`)

**Enhanced handlePaymentComplete**:
```typescript
const handlePaymentComplete = async (orderId: string) => {
  // 1. Mark order as completed
  await fetch(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'complete' })
  });

  // 2. Fetch complete order data for receipt
  const orderData = await fetchOrderForReceipt(orderId);
  
  // 3. Display receipt
  setReceiptData(orderData);
  setShowReceipt(true);
  
  // 4. Clear cart
  cart.clearCart();
};
```

### 4. Order Data Structure

The receipt requires complete order data including relations:

```typescript
{
  order: {
    id: string;
    order_number: string;
    created_at: string;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    payment_method: string;
    amount_tendered: number;
    change_amount: number;
    
    // Relations
    customer?: {
      full_name: string;
      customer_number: string;
    };
    cashier?: {
      full_name: string;
    };
    table?: {
      table_number: string;
    };
    order_items?: [
      {
        item_name: string;
        quantity: number;
        unit_price: number;
        total: number;
        notes?: string;
        is_vip_price: boolean;
        is_complimentary: boolean;
      }
    ];
  }
}
```

## API Endpoints Used

### GET `/api/orders/:orderId?includeSummary=true`

**Purpose**: Fetch complete order with all relations for receipt

**Query Parameters**:
- `includeSummary=true` - Returns order with customer, cashier, table, and items

**Response**:
```json
{
  "success": true,
  "data": {
    "order": { /* complete order with relations */ },
    "summary": {
      "itemsCount": 5,
      "totalItems": 12,
      "subtotal": 1500.00,
      "discountAmount": 150.00,
      "taxAmount": 0,
      "totalAmount": 1350.00
    }
  }
}
```

**Implementation** (`src/app/api/orders/[orderId]/route.ts`):
```typescript
export async function GET(request: NextRequest, { params }) {
  const includeSummary = request.nextUrl.searchParams.get('includeSummary') === 'true';
  
  if (includeSummary) {
    const orderSummary = await OrderService.getOrderSummary(params.orderId);
    return NextResponse.json({ success: true, data: orderSummary });
  }
  
  // ... regular order fetch
}
```

## Testing Guide

### Manual Testing Steps

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Navigate to POS**
   - Go to `http://localhost:3000/pos`
   - Login with valid credentials

3. **Create Test Order**
   - Add products to cart
   - (Optional) Select customer
   - (Optional) Assign table
   - Click "Proceed to Payment"

4. **Process Payment**
   - Select payment method (Cash recommended for testing)
   - Enter amount tendered
   - Click "Confirm Payment"

5. **Verify Receipt**
   - ✅ Receipt modal appears automatically
   - ✅ BeerHive logo displays correctly
   - ✅ Order number shows
   - ✅ Date/time displays
   - ✅ All items listed with correct quantities and prices
   - ✅ Customer info shows (if selected)
   - ✅ Table number shows (if assigned)
   - ✅ Cashier name displays
   - ✅ Payment details correct
   - ✅ Change calculated correctly (for cash)
   - ✅ Totals match order

6. **Test Printing**
   - Click "Print Receipt" button
   - Browser print dialog opens
   - Print preview shows:
     - 80mm width layout
     - Logo visible
     - All content formatted correctly
     - No screen-only elements (buttons, etc.)

7. **Test Close**
   - Click "Close" button
   - Receipt modal dismisses
   - Can create new order

### Test Scenarios

#### Scenario 1: Cash Payment with Change
- Order Total: ₱850.00
- Amount Tendered: ₱1,000.00
- Expected Change: ₱150.00
- ✅ Verify change displays on receipt

#### Scenario 2: Card Payment
- Payment Method: Card
- ✅ Verify no change amount shown
- ✅ Reference number displays (if entered)

#### Scenario 3: Customer Order
- Add customer to order
- ✅ Verify customer name on receipt
- ✅ Check customer number displays

#### Scenario 4: Table Order
- Assign table to order
- ✅ Verify table number on receipt

#### Scenario 5: VIP Pricing
- Order with VIP customer
- ✅ Verify "VIP Price Applied" indicator

#### Scenario 6: Complimentary Items
- Add complimentary item
- ✅ Verify "Complimentary Item" indicator
- ✅ Check total calculation correct

## Troubleshooting

### Issue: Logo Not Displaying

**Cause**: Logo file not in public directory

**Solution**:
```bash
# Copy logo to public folder
copy "docs\beerhive-logo.png" "public\"
# or
cp docs/beerhive-logo.png public/
```

**Verify**: Check `public/beerhive-logo.png` exists

---

### Issue: Receipt Shows Wrong Data

**Cause**: Order data not fetching with relations

**Solution**: Check API response includes all relations
```typescript
// In browser console after order creation
const response = await fetch('/api/orders/ORDER_ID?includeSummary=true');
const data = await response.json();
console.log(data); // Should include customer, cashier, table, order_items
```

---

### Issue: Print Preview Shows Screen Elements

**Cause**: Print CSS not applying

**Solution**: Verify print styles in SalesReceipt.tsx
```css
@media print {
  .no-print { display: none !important; }
}
```

Add `className="no-print"` to any elements that shouldn't print

---

### Issue: Receipt Not Auto-Opening

**Cause**: Error fetching order data

**Solution**: Check browser console for errors
```typescript
// Debug in POSInterface.tsx
const handlePaymentComplete = async (orderId: string) => {
  try {
    const orderData = await fetchOrderForReceipt(orderId);
    console.log('Receipt data:', orderData); // Debug
    setReceiptData(orderData);
    setShowReceipt(true);
  } catch (error) {
    console.error('Receipt error:', error); // Check this
  }
};
```

---

### Issue: Thermal Printer Not Working

**Cause**: Width mismatch or driver issues

**Solutions**:
1. Check printer width setting (should be 80mm)
2. Update printer drivers
3. Test with browser print to PDF first
4. Adjust CSS width if needed:
   ```css
   @media print {
     #receipt-print-area {
       width: 80mm; /* Adjust if needed */
     }
   }
   ```

## Customization

### Modify Receipt Layout

Edit `src/views/pos/SalesReceipt.tsx`:

```typescript
// Change logo size
<div className="relative w-32 h-32 mb-3"> {/* Was w-24 h-24 */}

// Customize footer message
<p className="text-xs">Your custom message here!</p>

// Add business address
<p className="text-xs text-gray-600 text-center">
  123 Main Street, City, Country
</p>
```

### Change Print Width

For 58mm thermal printers:
```css
@media print {
  #receipt-print-area {
    width: 58mm;
    padding: 5mm;
  }
}
```

### Add QR Code

Install package:
```bash
npm install qrcode.react
```

Add to receipt:
```typescript
import QRCode from 'qrcode.react';

// In receipt content
<div className="flex justify-center my-4">
  <QRCode value={order.order_number} size={100} />
</div>
```

## Files Modified/Created

### New Files ✨
- `src/views/pos/SalesReceipt.tsx` - Receipt display component
- `src/lib/utils/receiptPrinter.ts` - Receipt utility functions
- `public/beerhive-logo.png` - Company logo (copied from docs)

### Modified Files 🔧
- `src/views/pos/POSInterface.tsx` - Added receipt integration
- `src/core/services/orders/OrderService.ts` - Enhanced getOrderSummary documentation

### No Changes Required
- `src/data/repositories/OrderRepository.ts` - Already fetches complete data
- `src/app/api/orders/[orderId]/route.ts` - Already supports includeSummary parameter

## Future Enhancements

### Suggested Improvements
1. **Auto-print option** - Print automatically without dialog
2. **Email receipt** - Send PDF to customer email
3. **SMS receipt** - Send receipt link via SMS
4. **Reprint from orders list** - View and reprint any previous receipt
5. **Multiple copies** - Print multiple receipt copies
6. **Custom paper sizes** - Support different printer widths
7. **Receipt templates** - Multiple receipt designs
8. **Barcode/QR code** - Add order barcode for tracking

### Auto-Print Implementation (Optional)

```typescript
// In POSInterface.tsx
const handlePaymentComplete = async (orderId: string) => {
  // ... existing code ...
  
  setReceiptData(orderData);
  setShowReceipt(true);
  
  // Auto-print after 1 second
  setTimeout(() => {
    window.print();
  }, 1000);
};
```

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Verify all files are in correct locations
4. Test with sample data first

## Summary

✅ Receipt printing fully integrated with payment flow  
✅ Professional layout with BeerHive branding  
✅ Complete order details displayed  
✅ Print-optimized for thermal printers  
✅ Easy to customize and extend  

The sales receipt printing feature is now complete and ready for production use!
