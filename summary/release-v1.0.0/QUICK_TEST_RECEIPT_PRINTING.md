# Quick Test: Sales Receipt Printing

## 🚀 Quick Start (2 Minutes)

### Step 1: Verify Logo File
```bash
# Check if logo exists
ls public/beerhive-logo.png

# If not found, copy it:
copy "docs\beerhive-logo.png" "public\"
# OR for Mac/Linux:
cp docs/beerhive-logo.png public/
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open POS
Navigate to: `http://localhost:3000/pos`

### Step 4: Create Test Order
1. Add 2-3 products to cart
2. (Optional) Click "Select Customer" → choose any customer
3. (Optional) Click "Select Table" → choose any table
4. Click **"Proceed to Payment"** button

### Step 5: Process Payment
1. Select **"Cash"** payment method
2. Enter amount: `1000`
3. Verify change calculates automatically
4. Click **"Confirm Payment"**

### Step 6: Verify Receipt ✅
**The receipt should appear automatically!**

Check for:
- ✅ BeerHive logo at top
- ✅ "BEERHIVE PUB" title
- ✅ Order number (e.g., ORD-20241006-001)
- ✅ Date and time
- ✅ All items with quantities and prices
- ✅ Customer name (if selected)
- ✅ Table number (if assigned)
- ✅ Cashier name
- ✅ Payment method: CASH
- ✅ Amount tendered and change
- ✅ Correct totals

### Step 7: Test Print
1. Click **"Print Receipt"** button
2. Browser print dialog opens
3. **Print Preview should show:**
   - 80mm width format
   - Logo visible
   - All content formatted
   - No buttons visible

### Step 8: Close Receipt
1. Click **"Close"** button
2. Receipt modal closes
3. Cart is cleared
4. Ready for next order

## ✅ Success Criteria

All of these should work:
- [x] Receipt displays after payment
- [x] Logo shows correctly
- [x] All order details correct
- [x] Print button works
- [x] Print preview formatted properly
- [x] Close button works
- [x] Cart cleared after

## 🐛 Troubleshooting Quick Fixes

### Issue: Logo not showing
```bash
# Fix: Copy logo to public folder
copy "docs\beerhive-logo.png" "public\"
```

### Issue: Receipt not appearing
- Check browser console for errors (F12)
- Verify order was created successfully
- Check network tab for API calls

### Issue: Wrong data on receipt
- Ensure API endpoint includes `?includeSummary=true`
- Check OrderRepository returns all relations

### Issue: Print preview shows buttons
- Clear browser cache
- Check print CSS in SalesReceipt.tsx
- Use Ctrl+Shift+R to hard refresh

## 📱 Test Scenarios

### Scenario A: Simple Cash Order
```
Products: Beer x2, Sisig x1
Payment: Cash ₱500
Expected: Receipt with change calculation
```

### Scenario B: Customer Order
```
Products: Beer x3
Customer: Select any customer
Payment: Card
Expected: Receipt shows customer name
```

### Scenario C: Table Order
```
Products: Beer x2, Lumpia x2
Table: Table 5
Payment: Cash ₱1000
Expected: Receipt shows "Table 5"
```

### Scenario D: VIP Order
```
Customer: VIP customer
Products: Any VIP-priced items
Payment: Any method
Expected: "VIP Price Applied" indicator
```

## 🎯 What to Report

If testing fails, report:
1. Which step failed
2. Error message (from browser console)
3. Screenshot of issue
4. Browser and version used

## 📋 Quick Reference

### Files Created
- `src/views/pos/SalesReceipt.tsx` - Receipt component
- `src/lib/utils/receiptPrinter.ts` - Utility functions
- `public/beerhive-logo.png` - Logo file
- `docs/SALES_RECEIPT_PRINTING_GUIDE.md` - Full documentation

### Files Modified
- `src/views/pos/POSInterface.tsx` - Payment flow integration
- `src/core/services/orders/OrderService.ts` - Enhanced documentation

### API Endpoints Used
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id` - Complete order
- `GET /api/orders/:id?includeSummary=true` - Fetch receipt data

## ⏱️ Expected Results

- **Receipt Display**: < 1 second after payment
- **Data Loading**: < 500ms
- **Print Dialog**: Immediate on click
- **Logo Loading**: < 100ms (cached)

## 🔄 Reset Test

To test again:
1. Close receipt modal
2. Cart auto-clears
3. Add new products
4. Repeat from Step 4

## ✨ That's It!

The receipt printing feature is ready to use. For detailed documentation, see:
- `docs/SALES_RECEIPT_PRINTING_GUIDE.md` - Complete guide
- `SALES_RECEIPT_PRINTING_SUMMARY.md` - Implementation summary

---

**Happy Testing! 🍻**
