# Tab System - Quick Start Guide

## What Was Built

Your POS system now supports **flexible tab-based ordering** like professional restaurants and bars:

✅ **Open tabs** - Customer orders stay open during their entire visit  
✅ **Multiple order rounds** - Add items anytime without closing the bill  
✅ **Kitchen notified immediately** - Food preparation starts when order is confirmed (NOT when paid)  
✅ **Bill preview anytime** - Show customers their running total  
✅ **Pay at the end** - Collect payment when customer leaves  

---

## How to Use (Quick Guide)

### 1. Customer Arrives
```
Cashier → Assign Table T-05 → Open Tab
System creates: TAB-20251007-001
Table status: OCCUPIED
```

### 2. First Order
```
Cashier → Add items (2x Beer, 1x Sisig)
Cashier → Click "CONFIRM ORDER"
System → Sends to Kitchen/Bartender
Status: Kitchen receives items BEFORE payment ✅
```

### 3. Customer Wants More (Later)
```
Cashier → Find Table T-05 or TAB-20251007-001
Cashier → Add more items (3x Beer, 1x Calamares)
Cashier → Click "CONFIRM ORDER"
System → Sends new items to Kitchen/Bartender
Running total updates automatically
```

### 4. Customer Requests Bill
```
Cashier → Click "View Bill"
System → Shows all orders + running total
Cashier → Prints bill preview (NOT final receipt)
```

### 5. Customer Pays & Leaves
```
Cashier → Click "Close Tab"
Cashier → Enter payment (Cash ₱1,000)
System → Calculates change (₱70)
System → Prints FINAL RECEIPT
System → Releases table (Available)
```

---

## Installation Steps

### Step 1: Run Database Migration
```bash
# Option A: Via Supabase CLI
supabase db push migrations/add_tab_system.sql

# Option B: Via Supabase Dashboard
# Go to SQL Editor → Paste migration → Run
```

**Migration file**: `migrations/add_tab_system.sql`

### Step 2: Verify Installation
```sql
-- Check new table exists
SELECT * FROM order_sessions LIMIT 1;

-- Check new order statuses
SELECT unnest(enum_range(NULL::order_status));
-- Should show: draft, confirmed, preparing, ready, served, pending, completed, voided, on_hold
```

### Step 3: Test API (Optional)
```bash
# Test opening a tab
curl -X POST http://localhost:3000/api/order-sessions \
  -H "Content-Type: application/json" \
  -d '{"table_id": "uuid", "opened_by": "uuid"}'
```

---

## Key Differences from Old System

| Action | OLD System | NEW System |
|--------|-----------|------------|
| **Order Flow** | Order → Pay → Kitchen | Order → Confirm → Kitchen → Pay later |
| **Kitchen Sees Order** | After payment | After confirmation |
| **Adding Items** | New separate order | Add to existing tab |
| **Customer Bill** | Only after payment | Anytime (preview) |
| **Payment** | Immediate | End of visit |

---

## API Endpoints

### Open Tab
```http
POST /api/order-sessions
Body: { table_id, customer_id, opened_by }
```

### Create Order (Draft)
```http
POST /api/orders
Body: { session_id, items: [...], status: "draft" }
```

### Confirm Order (Send to Kitchen)
```http
PATCH /api/orders/[orderId]/confirm
```

### View Bill Preview
```http
GET /api/order-sessions/[sessionId]/bill-preview
```

### Close Tab (Payment)
```http
POST /api/order-sessions/[sessionId]/close
Body: { payment_method, amount_tendered, closed_by }
```

### Get Active Tabs
```http
GET /api/order-sessions
```

### Get Session by Table
```http
GET /api/order-sessions/by-table/[tableId]
```

---

## Files Created

**Documentation** (3 files):
- `docs/TAB_SYSTEM_PROPOSAL.md` - Detailed proposal
- `docs/TAB_SYSTEM_IMPLEMENTATION.md` - Full implementation guide
- `TAB_SYSTEM_QUICK_START.md` - This file

**Database** (1 file):
- `migrations/add_tab_system.sql` - Database schema

**Backend** (10 files):
- Models: 2 files (SessionStatus, OrderSession)
- Repositories: 1 file (OrderSessionRepository)
- Services: 1 file (OrderSessionService)
- API Endpoints: 6 files (session & order APIs)

**Updated** (3 files):
- OrderStatus enum (added new statuses)
- Order entity (added session_id)
- OrderService (added confirmOrder method)

---

## Next Steps

### For Developers
1. **UI Components**: Build frontend for tab management
   - ActiveTabsDashboard component
   - BillPreviewModal component
   - CloseTabModal component
   - Update POS flow

2. **Testing**: Test complete workflow end-to-end

### For Managers
1. **Staff Training**: Train cashiers on new flow
2. **Go-Live Plan**: Choose deployment date
3. **Monitor**: Watch for issues in first week

---

## Support

**Documentation**:
- Full proposal: `docs/TAB_SYSTEM_PROPOSAL.md`
- Implementation guide: `docs/TAB_SYSTEM_IMPLEMENTATION.md`
- This quick start: `TAB_SYSTEM_QUICK_START.md`

**Questions?** Review the detailed documentation or contact the development team.

---

**Status**: ✅ Backend Complete - Ready for UI Development  
**Date**: October 7, 2025
