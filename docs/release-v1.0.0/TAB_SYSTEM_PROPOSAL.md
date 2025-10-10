# Tab System Proposal - Restaurant & Bar Order Flow

**Date**: October 7, 2025  
**Status**: 🎯 Proposed  
**Purpose**: Transform pay-as-you-order system to flexible tab-based system

---

## Executive Summary

Transform the current **pay-as-you-order** POS system into a **tab-based (open bill) system** typical of bars and restaurants where:

- ✅ Orders remain open during the customer's visit
- ✅ Multiple rounds of ordering per table/customer
- ✅ Kitchen/bartender notified only when order is **confirmed**
- ✅ Bill preview available anytime without finalizing payment
- ✅ Payment collected at the end of dining experience

---

## Problem Statement

### Current System Limitations

**Current Flow:**
```
Create Order → Add Items → Process Payment → Send to Kitchen → Print Receipt
```

**Issues:**
1. ❌ Payment required immediately when ordering
2. ❌ Cannot add items after initial order without creating new order
3. ❌ Kitchen receives items only after payment (delays preparation)
4. ❌ No concept of "running tab" or "open bill"
5. ❌ Doesn't match bar/restaurant operations

---

## Proposed Solution: Tab System

### New Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│  ORDER SESSION (Tab)                                            │
│  Status: OPEN → CLOSED                                          │
└─────────────────────────────────────────────────────────────────┘
     │
     ├── Order Round 1
     │   ├── Create Order (DRAFT)
     │   ├── Add Items
     │   ├── CONFIRM ORDER → Send to Kitchen/Bartender
     │   └── Kitchen prepares & serves
     │
     ├── Order Round 2
     │   ├── Add More Items (same order or new round)
     │   ├── CONFIRM ORDER → Send to Kitchen/Bartender
     │   └── Kitchen prepares & serves
     │
     ├── Order Round N...
     │
     └── Customer Ready to Leave
         ├── Request Bill (Preview)
         ├── Process Payment
         ├── Print Final Receipt
         └── Close Session
```

---

## Key Concepts

### 1. **Order Session** (The Tab)

Represents the entire dining experience for a table/customer.

**Properties:**
- `session_number`: Unique identifier (e.g., "TAB-20251007-001")
- `table_id`: Which table
- `customer_id`: Who's dining (optional)
- `status`: `open` | `closed`
- `opened_at`: When customer sat down
- `closed_at`: When they left
- `total_amount`: Running total across all orders

**One session can have multiple orders**

### 2. **Order Statuses** (Enhanced)

| Status | Description | Kitchen Notified? | Payment Required? |
|--------|-------------|-------------------|-------------------|
| **DRAFT** | Items added but not confirmed | ❌ No | ❌ No |
| **CONFIRMED** | Order sent to kitchen/bartender | ✅ Yes | ❌ No |
| **PREPARING** | Kitchen is cooking | ✅ Yes | ❌ No |
| **READY** | Food ready for serving | ✅ Yes | ❌ No |
| **SERVED** | Delivered to customer | ✅ Yes | ❌ No |
| **COMPLETED** | Payment received | ✅ Yes | ✅ Yes |
| **VOIDED** | Cancelled | ❌ No | ❌ No |
| **ON_HOLD** | Temporarily paused | ❌ No | ❌ No |

### 3. **Kitchen Routing Trigger**

**OLD:** Kitchen routing happens on `COMPLETED` status (after payment)  
**NEW:** Kitchen routing happens on `CONFIRMED` status (before payment)

---

## Detailed Workflow

### Scenario: Customer Dining Experience

#### Step 1: Customer Arrives
```
Cashier:
1. Assign Table T-05
2. Create Order Session (TAB-20251007-001)
   - Status: OPEN
   - Table: T-05
   - Customer: John Doe (optional)
```

#### Step 2: First Order Round
```
Cashier:
1. Create Order (ORD-001)
   - Status: DRAFT
   - Session: TAB-20251007-001
2. Add Items:
   - 2x San Miguel Beer
   - 1x Sisig Platter
3. Confirm Order
   - Status: DRAFT → CONFIRMED
   - Trigger: Send to kitchen/bartender
   
Kitchen Display:
✅ NEW ORDER: ORD-001
   - 1x Sisig Platter (Table T-05)
   
Bartender Display:
✅ NEW ORDER: ORD-001
   - 2x San Miguel Beer (Table T-05)
```

**Customer has NOT paid yet** ✅

#### Step 3: Kitchen Prepares & Serves
```
Kitchen:
- Mark Sisig as PREPARING → READY
- Waiter sees in waiter display
- Waiter serves to Table T-05

Bartender:
- Prepare beers → READY
- Waiter delivers

Order ORD-001 Status: SERVED
```

#### Step 4: Customer Wants More (30 minutes later)
```
Cashier:
1. Search for Table T-05 or TAB-20251007-001
2. View current session
   - Current Total: ₱450.00
   - Previous Orders: ORD-001 (Served)
3. Add More Items to SAME SESSION:
   - 3x San Miguel Beer
   - 1x Calamares
4. Confirm Order (ORD-002)
   - Status: DRAFT → CONFIRMED
   - Trigger: Send to kitchen/bartender

Kitchen/Bartender:
✅ NEW ORDER: ORD-002 (Table T-05)
```

**Still no payment** ✅

#### Step 5: Customer Requests Bill
```
Cashier:
1. Access TAB-20251007-001
2. Click "Print Bill Preview"
   
Bill Preview Shows:
┌────────────────────────────────┐
│  BILL PREVIEW (NOT RECEIPT)    │
│  Table: T-05                   │
│  Date: Oct 7, 2025             │
├────────────────────────────────┤
│  Order ORD-001:                │
│    2x San Miguel Beer  ₱200    │
│    1x Sisig Platter    ₱250    │
│                                │
│  Order ORD-002:                │
│    3x San Miguel Beer  ₱300    │
│    1x Calamares        ₱180    │
├────────────────────────────────┤
│  Subtotal:             ₱930    │
│  Tax (0%):             ₱0      │
│  TOTAL:                ₱930    │
└────────────────────────────────┘

THIS IS NOT A RECEIPT
PLEASE PAY AT COUNTER
```

Waiter brings bill to customer. **No payment yet** ✅

#### Step 6: Customer Pays & Leaves
```
Cashier:
1. Customer returns to counter
2. Access TAB-20251007-001
3. Process Payment:
   - Amount: ₱930
   - Payment Method: Cash
   - Amount Tendered: ₱1,000
   - Change: ₱70
4. System Actions:
   - Mark all orders as COMPLETED
   - Close session (status: CLOSED)
   - Update table status: AVAILABLE
   - Print FINAL RECEIPT
   - Update customer visit count & total spent

Final Receipt Shows:
┌────────────────────────────────┐
│  OFFICIAL RECEIPT              │
│  Receipt #: REC-20251007-001   │
│  Table: T-05                   │
│  Date: Oct 7, 2025 8:45 PM    │
├────────────────────────────────┤
│  [Same items as bill preview]  │
├────────────────────────────────┤
│  TOTAL:                ₱930    │
│  Cash:                 ₱1,000  │
│  Change:               ₱70     │
├────────────────────────────────┤
│  Thank you for your visit!     │
│  BeerHive Pub                  │
└────────────────────────────────┘
```

Session TAB-20251007-001: **CLOSED** ✅

---

## Database Schema Changes

### 1. New Table: `order_sessions`

```sql
CREATE TYPE session_status AS ENUM ('open', 'closed', 'abandoned');

CREATE TABLE order_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Relationships
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Financials (running total across all orders)
    subtotal DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    
    -- Status
    status session_status DEFAULT 'open',
    
    -- Timestamps
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opened_by UUID REFERENCES users(id), -- Cashier who opened
    closed_by UUID REFERENCES users(id), -- Cashier who closed
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_table ON order_sessions(table_id);
CREATE INDEX idx_sessions_status ON order_sessions(status);
CREATE INDEX idx_sessions_number ON order_sessions(session_number);
CREATE INDEX idx_sessions_opened ON order_sessions(opened_at);
```

### 2. Update `orders` Table

**Add:**
- `session_id UUID REFERENCES order_sessions(id)`
- Update `order_status` enum

```sql
-- Add new statuses
ALTER TYPE order_status ADD VALUE 'draft';
ALTER TYPE order_status ADD VALUE 'confirmed';
ALTER TYPE order_status ADD VALUE 'preparing';
ALTER TYPE order_status ADD VALUE 'ready';
ALTER TYPE order_status ADD VALUE 'served';

-- Add session reference
ALTER TABLE orders ADD COLUMN session_id UUID REFERENCES order_sessions(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_session ON orders(session_id);
```

### 3. Update `restaurant_tables` Table

**Change:**
- `current_order_id` → `current_session_id`

```sql
ALTER TABLE restaurant_tables 
DROP COLUMN current_order_id,
ADD COLUMN current_session_id UUID REFERENCES order_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_tables_session ON restaurant_tables(current_session_id);
```

---

## API Endpoints

### Order Session Management

#### 1. Create Session (Open Tab)
```http
POST /api/order-sessions
Content-Type: application/json

{
  "table_id": "uuid",
  "customer_id": "uuid", // optional
  "notes": "Birthday celebration"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "session_number": "TAB-20251007-001",
    "status": "open",
    "table": { ... },
    "customer": { ... }
  }
}
```

#### 2. Get Active Session by Table
```http
GET /api/order-sessions/by-table/[tableId]

Response:
{
  "success": true,
  "data": {
    "session": { ... },
    "orders": [ ... ],
    "running_total": 1500.00
  }
}
```

#### 3. Add Order to Session
```http
POST /api/orders
Content-Type: application/json

{
  "session_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "unit_price": 100.00
    }
  ],
  "status": "draft" // Or "confirmed" to send to kitchen immediately
}
```

#### 4. Confirm Order (Send to Kitchen)
```http
PATCH /api/orders/[orderId]/confirm

Response:
{
  "success": true,
  "message": "Order sent to kitchen/bartender",
  "data": {
    "order": { ... },
    "kitchen_routing": {
      "kitchen_items": 2,
      "bartender_items": 3
    }
  }
}
```

#### 5. Get Session Bill Preview
```http
GET /api/order-sessions/[sessionId]/bill-preview

Response:
{
  "success": true,
  "data": {
    "session": { ... },
    "orders": [
      {
        "order_number": "ORD-001",
        "items": [ ... ],
        "subtotal": 450.00
      },
      {
        "order_number": "ORD-002",
        "items": [ ... ],
        "subtotal": 480.00
      }
    ],
    "totals": {
      "subtotal": 930.00,
      "discount": 0,
      "tax": 0,
      "total": 930.00
    }
  }
}
```

#### 6. Close Session (Process Payment)
```http
POST /api/order-sessions/[sessionId]/close
Content-Type: application/json

{
  "payment_method": "cash",
  "amount_tendered": 1000.00,
  "discount_amount": 0,
  "notes": ""
}

Response:
{
  "success": true,
  "message": "Session closed, receipt printed",
  "data": {
    "session": { ... },
    "receipt": {
      "receipt_number": "REC-20251007-001",
      "total_amount": 930.00,
      "change": 70.00
    }
  }
}
```

---

## POS UI Changes

### 1. Main POS Screen

**Before:**
```
[New Order] [View Pending Orders]
```

**After:**
```
[New Tab] [Open Tabs] [Quick Order]
```

### 2. Table Selection Screen

**New Indicator:**
- 🟢 Available (no session)
- 🔴 Occupied (session open)
- Click occupied table → View active tab

### 3. Order Building Screen

**New Buttons:**
```
[Save as Draft] [Confirm & Send to Kitchen] [Add to Existing Tab]
```

**Status Indicator:**
```
📝 DRAFT - Not sent to kitchen yet
✅ CONFIRMED - Sent to kitchen, preparing
🍽️ SERVED - Delivered to customer
💰 PAID - Session closed
```

### 4. Active Tabs Dashboard

**New Screen: `/active-tabs`**

```
┌─────────────────────────────────────────┐
│  ACTIVE TABS                            │
├─────────────────────────────────────────┤
│  Table T-01  │  2 Orders  │  ₱1,200    │
│  45 minutes  │  [View] [Bill] [Pay]    │
├─────────────────────────────────────────┤
│  Table T-05  │  1 Order   │  ₱450      │
│  15 minutes  │  [View] [Bill] [Pay]    │
├─────────────────────────────────────────┤
│  Walk-in     │  1 Order   │  ₱230      │
│  5 minutes   │  [View] [Bill] [Pay]    │
└─────────────────────────────────────────┘
```

### 5. Bill Preview Modal

**Component:** `BillPreviewModal.tsx`

```
┌──────────────────────────────────────────┐
│  BILL PREVIEW - NOT RECEIPT              │
│  Table: T-05                             │
│  Customer: John Doe                      │
│  Duration: 1 hour 23 minutes             │
├──────────────────────────────────────────┤
│  Order ORD-001 (8:15 PM)                 │
│    2x San Miguel Beer           ₱200     │
│    1x Sisig Platter             ₱250     │
│                                          │
│  Order ORD-002 (8:45 PM)                 │
│    3x San Miguel Beer           ₱300     │
│    1x Calamares                 ₱180     │
├──────────────────────────────────────────┤
│  Subtotal:                      ₱930     │
│  Discount:                      ₱0       │
│  Tax:                           ₱0       │
│  TOTAL:                         ₱930     │
├──────────────────────────────────────────┤
│  [Print Bill] [Add Discount] [Process    │
│   Payment]                               │
└──────────────────────────────────────────┘
```

---

## Implementation Strategy

### Phase 1: Database & Core Services
1. ✅ Create migration for `order_sessions` table
2. ✅ Update `orders` table with new statuses
3. ✅ Create `OrderSessionService` class
4. ✅ Update `OrderService` with confirm/fire logic
5. ✅ Update `KitchenRouting` to trigger on CONFIRMED status

### Phase 2: API Layer
1. ✅ Create order session endpoints
2. ✅ Update order endpoints
3. ✅ Create bill preview endpoint
4. ✅ Create session close/payment endpoint

### Phase 3: UI Components
1. ✅ Create `ActiveTabsDashboard` component
2. ✅ Create `BillPreviewModal` component
3. ✅ Update POS order flow
4. ✅ Update table selection screen
5. ✅ Add session indicators

### Phase 4: Testing & Refinement
1. ✅ End-to-end testing
2. ✅ Performance optimization
3. ✅ Staff training materials
4. ✅ Deployment

---

## Benefits

### For Operations
- ✅ **Faster Service**: Kitchen starts preparing before payment
- ✅ **Flexible Ordering**: Add items anytime during visit
- ✅ **Better Flow**: Matches restaurant industry standards
- ✅ **Customer Satisfaction**: No pressure to pay immediately

### For Kitchen/Bartender
- ✅ Orders arrive when confirmed (not when paid)
- ✅ Better preparation timing
- ✅ Reduced wait times

### For Cashiers
- ✅ One session per table (easy to track)
- ✅ View running totals anytime
- ✅ Bill preview before payment
- ✅ Handle split payments easily

### For Customers
- ✅ Natural dining experience
- ✅ See bill anytime
- ✅ Pay when leaving
- ✅ Add orders throughout visit

---

## Migration Strategy

### Option A: Big Bang (Recommended for Small Operations)
- Deploy all changes at once
- Train staff beforehand
- Set "go-live" date
- Monitor closely for first week

### Option B: Gradual Rollout
- Phase 1: Keep old system, add session tracking
- Phase 2: Enable tab system for specific tables
- Phase 3: Migrate all tables
- Phase 4: Deprecate old flow

---

## Backward Compatibility

### Quick Orders (Takeout/Counter Sales)
For fast transactions, support **express mode**:

```
Create Session → Add Items → Confirm → Pay → Close
(All in one flow, session auto-closes)
```

**UI:**
```
[Quick Order Button]
→ Creates session
→ Auto-confirms items
→ Goes straight to payment
→ Auto-closes session
```

Essentially same as current flow, but uses new architecture.

---

## Alternative: Simplified Approach

If full sessions are too complex initially:

### Minimal Changes
1. Add **CONFIRMED** status to orders
2. Change kitchen routing trigger:
   - OLD: `COMPLETED` status
   - NEW: `CONFIRMED` status
3. Allow **multiple pending orders per table**
4. Add **"Confirm & Send to Kitchen"** button

**Pros:**
- ✅ Minimal code changes
- ✅ Keeps existing flow mostly intact
- ✅ Solves immediate problem

**Cons:**
- ❌ No unified tab/session concept
- ❌ Multiple separate orders per table (harder to track)
- ❌ Bill preview shows one order at a time

---

## Recommendation

**Implement Full Tab System** for long-term benefits:
- Better matches restaurant operations
- More scalable
- Better customer experience
- Industry standard

**Timeline:** 2-3 weeks for full implementation

---

## Next Steps

1. **Review Proposal**: Get stakeholder approval
2. **Finalize Requirements**: Confirm any additional features
3. **Create Migration Plan**: Prepare database migrations
4. **Implement Backend**: Services and APIs
5. **Build Frontend**: UI components
6. **Test Thoroughly**: All workflows
7. **Train Staff**: Hands-on training
8. **Deploy**: Go live with monitoring

---

**Prepared By:** Expert Software Developer  
**Date:** October 7, 2025  
**Status:** Awaiting Approval
