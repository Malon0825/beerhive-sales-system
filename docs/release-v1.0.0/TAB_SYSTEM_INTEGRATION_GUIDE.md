# Tab System Integration Guide

**Date**: October 7, 2025  
**Purpose**: Guide for integrating tab system with existing POS components

---

## Files Modified

### ✅ 1. Sidebar Navigation
**File**: `src/views/shared/layouts/Sidebar.tsx`

**Changes**:
- Added "Active Tabs" menu item with Receipt icon
- Positioned between "Tables" and "Current Orders"
- Accessible by: Admin, Manager, Cashier

**Result**: Users can now navigate to Active Tabs dashboard from sidebar

---

### ✅ 2. TableCard Component
**File**: `src/views/tables/TableCard.tsx`

**Changes**:
- Added session indicator for tables with active sessions
- Shows "🔓 Tab Open" badge when `current_session_id` exists
- Distinguishes between session orders and legacy orders

**Visual**:
```
┌─────────────────────┐
│ T-05       [OCCUPIED]│
│ Capacity: 4 seats    │
│ ┌─────────────────┐ │
│ │ 🔓 Tab Open     │ │ ← NEW
│ │ Session active  │ │
│ └─────────────────┘ │
│ [To Cleaning]       │
└─────────────────────┘
```

---

## New Helper Components

### ✅ 3. OpenTabButton
**File**: `src/views/pos/OpenTabButton.tsx`

**Purpose**: Quick button to open a new tab

**Usage**:
```tsx
import OpenTabButton from '@/views/pos/OpenTabButton';

<OpenTabButton
  tableId={selectedTableId}
  customerId={selectedCustomerId}
  onTabOpened={(sessionId) => {
    console.log('Tab opened:', sessionId);
    // Navigate or update UI
  }}
/>
```

---

### ✅ 4. SessionSelector
**File**: `src/views/pos/SessionSelector.tsx`

**Purpose**: Show active session or create new one for a table

**Usage**:
```tsx
import SessionSelector from '@/views/pos/SessionSelector';

<SessionSelector
  tableId={selectedTableId}
  onSessionSelected={(sessionId) => {
    console.log('Session selected:', sessionId);
    // Navigate to session order flow
  }}
/>
```

**Features**:
- Auto-detects active session for table
- Shows session info (number, duration, total)
- "Resume Tab" button for existing sessions
- "Open New Tab" button when no session exists

---

## Integration Steps

### Step 1: Update Existing POS Component

**Option A**: Add to existing POS (e.g., `POSInterface.tsx`)

```tsx
import SessionSelector from './SessionSelector';

// Inside your POS component:
<div className="session-section">
  <SessionSelector
    tableId={selectedTable?.id}
    onSessionSelected={(sessionId) => {
      // Store session ID for order creation
      setCurrentSessionId(sessionId);
    }}
  />
</div>
```

**Option B**: Create new "Tab POS" view

Create `src/app/(dashboard)/tab-pos/page.tsx`:
```tsx
'use client';

import SessionSelector from '@/views/pos/SessionSelector';
import SessionOrderFlow from '@/views/pos/SessionOrderFlow';

export default function TabPOSPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  return (
    <div className="container mx-auto py-6">
      {!sessionId ? (
        <SessionSelector onSessionSelected={setSessionId} />
      ) : (
        <SessionOrderFlow sessionId={sessionId} />
      )}
    </div>
  );
}
```

---

### Step 2: Update Order Creation Flow

**When creating orders, include `session_id`**:

```tsx
// OLD: Direct order creation
const response = await fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    table_id: tableId,
    items: cartItems,
    // ... other fields
  })
});

// NEW: Order with session
const response = await fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    session_id: currentSessionId,  // ← Add this
    table_id: tableId,
    items: cartItems,
    status: OrderStatus.DRAFT,     // ← Start as draft
    // ... other fields
  })
});

// Then confirm order to send to kitchen
await fetch(`/api/orders/${orderId}/confirm`, {
  method: 'PATCH'
});
```

---

### Step 3: Update Table Selection

**In `TableSelector.tsx` or similar components**:

```tsx
import SessionSelector from '@/views/pos/SessionSelector';

// When table is selected:
const handleTableSelect = async (table: Table) => {
  setSelectedTable(table);
  
  // Check for active session
  const response = await fetch(`/api/order-sessions/by-table/${table.id}`);
  const data = await response.json();
  
  if (data.success && data.data) {
    // Table has active session
    const confirmResume = confirm(`Table has active tab (${data.data.session_number}). Resume?`);
    if (confirmResume) {
      router.push(`/order-sessions/${data.data.id}`);
    }
  } else {
    // No session, show option to open new tab
    setShowSessionSelector(true);
  }
};
```

---

### Step 4: Add Quick Actions to Dashboard

**In your dashboard home or POS main view**:

```tsx
import { Button } from '@/components/ui/button';
import { Receipt, Plus } from 'lucide-react';

// Quick action cards
<div className="grid grid-cols-2 gap-4">
  <Card>
    <CardHeader>
      <CardTitle>Active Tabs</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">{activeTabsCount}</p>
      <Button 
        onClick={() => router.push('/active-tabs')}
        className="mt-4 w-full"
      >
        View All Tabs
      </Button>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Quick Tab</CardTitle>
    </CardHeader>
    <CardContent>
      <Button 
        onClick={() => router.push('/tab-pos')}
        className="w-full bg-green-600"
      >
        <Plus className="w-4 h-4 mr-2" />
        Open New Tab
      </Button>
    </CardContent>
  </Card>
</div>
```

---

## Workflow Integration

### Scenario 1: New Customer Arrives

```
1. Cashier: Navigate to Tables or POS
2. Cashier: Select available table (T-05)
3. System: Shows SessionSelector
4. Cashier: Click "Open New Tab"
5. System: Creates session (TAB-20251007-001)
6. System: Navigates to SessionOrderFlow
7. Cashier: Add items and confirm
8. Kitchen: Receives order
```

### Scenario 2: Existing Tab (Add More Orders)

```
1. Cashier: Navigate to Active Tabs
2. Cashier: Find table's tab (T-05)
3. Cashier: Click "Resume Tab"
4. System: Opens SessionOrderFlow
5. Cashier: Add new items
6. Cashier: Click "Confirm & Send to Kitchen"
7. Kitchen: Receives new items
8. Session total: Auto-updates
```

### Scenario 3: Close Tab & Payment

```
1. Cashier: Click "View Bill" on active tab
2. System: Shows BillPreviewModal
3. Cashier: Print bill preview (optional)
4. Cashier: Click "Proceed to Payment"
5. System: Opens CloseTabModal
6. Cashier: Select payment method
7. Cashier: Enter amount tendered
8. System: Calculates change
9. Cashier: Click "Process Payment"
10. System: Closes session, prints receipt
11. Table: Released (available)
```

---

## Database Integration Notes

### Check for Session Before Creating Order

```typescript
// Function to get or create session
async function getOrCreateSession(tableId: string): Promise<string> {
  // Check for existing session
  const response = await fetch(`/api/order-sessions/by-table/${tableId}`);
  const data = await response.json();

  if (data.success && data.data) {
    // Return existing session
    return data.data.id;
  }

  // Create new session
  const createResponse = await fetch('/api/order-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table_id: tableId,
      opened_by: getCurrentUserId(),
    }),
  });

  const createData = await createResponse.json();
  return createData.data.id;
}

// Use in order creation
const sessionId = await getOrCreateSession(tableId);
```

---

## Testing Integration

### Test Checklist

#### 1. Navigation
- [ ] "Active Tabs" appears in sidebar
- [ ] Clicking navigates to `/active-tabs`
- [ ] Active Tabs dashboard loads
- [ ] Real-time updates work

#### 2. Table Cards
- [ ] Tables with sessions show "Tab Open" badge
- [ ] Badge color is green
- [ ] Clicking occupied table shows session info

#### 3. Session Selector
- [ ] Shows "No Active Tab" when table has no session
- [ ] "Open New Tab" button works
- [ ] Shows existing session info when present
- [ ] "Resume Tab" button navigates correctly

#### 4. Order Flow
- [ ] Can create draft orders in session
- [ ] Confirm order sends to kitchen
- [ ] Session total updates automatically
- [ ] Can add multiple orders to same session

#### 5. Bill Preview
- [ ] Shows all orders in session
- [ ] Running total is correct
- [ ] Can print bill preview
- [ ] "Proceed to Payment" works

#### 6. Payment
- [ ] Payment methods selectable
- [ ] Amount tendered validation works
- [ ] Change calculation correct
- [ ] Payment processing works
- [ ] Receipt prints
- [ ] Table released after payment

---

## Troubleshooting

### Issue: "Table already has an active session"
**Solution**: Close the existing session first or use "Resume Tab"

### Issue: Orders not appearing in session
**Solution**: Ensure `session_id` is included when creating orders

### Issue: Kitchen not receiving orders
**Solution**: Make sure to call `/api/orders/[id]/confirm` after creating order

### Issue: Session totals not updating
**Solution**: Database triggers should handle this automatically. Check migration ran successfully.

### Issue: Cannot navigate to session
**Solution**: Check session ID is valid and session status is "open"

---

## Migration Path

### Phase 1: Parallel Running (Recommended)
- Keep existing POS flow unchanged
- Add new "Tab POS" menu item
- Run both systems in parallel
- Train staff on new system
- Gradually migrate tables to tab system

### Phase 2: Full Migration
- Default all tables to tab system
- Update existing POS to use sessions
- Keep legacy flow for quick orders/takeout
- Monitor for issues

---

## Code Examples

### Example 1: Complete POS Page with Tabs

```tsx
'use client';

import { useState } from 'react';
import SessionSelector from '@/views/pos/SessionSelector';
import SessionOrderFlow from '@/views/pos/SessionOrderFlow';
import TableSelector from '@/views/pos/TableSelector';

export default function TabPOSPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Tab POS</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Column 1: Table Selection */}
        <div>
          <TableSelector
            onTableSelected={(table) => {
              setSelectedTable(table.id);
              setSessionId(null); // Reset session
            }}
          />
        </div>

        {/* Column 2: Session Management */}
        <div>
          {selectedTable && !sessionId && (
            <SessionSelector
              tableId={selectedTable}
              onSessionSelected={setSessionId}
            />
          )}
        </div>

        {/* Column 3: Order Entry */}
        <div>
          {sessionId && (
            <SessionOrderFlow sessionId={sessionId} />
          )}
        </div>
      </div>
    </div>
  );
}
```

### Example 2: Dashboard Widget for Active Tabs

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';

export function ActiveTabsWidget() {
  const [stats, setStats] = useState({ count: 0, total: 0 });

  useEffect(() => {
    async function fetchStats() {
      const response = await fetch('/api/order-sessions');
      const data = await response.json();

      if (data.success) {
        const count = data.data.length;
        const total = data.data.reduce((sum: number, s: any) => 
          sum + (s.total_amount || 0), 0
        );
        setStats({ count, total });
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <Receipt className="w-12 h-12 text-green-600" />
        <div>
          <p className="text-sm text-gray-600">Active Tabs</p>
          <p className="text-3xl font-bold">{stats.count}</p>
          <p className="text-sm text-gray-500">
            {formatCurrency(stats.total)} pending
          </p>
        </div>
      </div>
    </Card>
  );
}
```

---

## Best Practices

### 1. Always Check for Existing Sessions
Before opening a new tab, always check if the table already has an active session.

### 2. Use Draft Status Initially
Create orders with `DRAFT` status, then confirm them to send to kitchen.

### 3. Real-time Updates
Use Supabase real-time to keep session data synchronized across all clients.

### 4. Error Handling
Always handle API errors gracefully and show user-friendly messages.

### 5. Loading States
Show loading indicators during API calls for better UX.

### 6. Confirmation Dialogs
Ask for confirmation before closing tabs or voiding orders.

---

## Summary

**Files Modified**: 2
- `Sidebar.tsx` - Added navigation
- `TableCard.tsx` - Added session indicator

**Files Created**: 6
- `OpenTabButton.tsx` - Quick tab button
- `SessionSelector.tsx` - Session management
- `SessionOrderFlow.tsx` - Order entry (already created)
- `ActiveTabsDashboard.tsx` - Main dashboard (already created)
- `BillPreviewModal.tsx` - Bill preview (already created)
- `CloseTabModal.tsx` - Payment (already created)

**Integration Status**: ✅ Ready for Integration

---

**Next Steps**:
1. Test navigation to Active Tabs
2. Test opening new tab from table
3. Test adding orders to session
4. Test bill preview
5. Test closing tab with payment
6. Train staff on new workflow

**Questions?** Refer to other documentation:
- `TAB_SYSTEM_PROPOSAL.md` - System design
- `TAB_SYSTEM_IMPLEMENTATION.md` - Technical details
- `TAB_SYSTEM_COMPLETE.md` - Complete summary
