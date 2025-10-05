# BeerHive POS - AI Implementation Guide

**Purpose**: Step-by-step implementation checklist for AI coding assistants  
**Usage**: Check off each task as completed, follow document references for details  
**Token Optimization**: Line numbers provided to read only relevant sections

---

## Phase 1: Project Setup & Foundation

### 1.1 Initialize Project
- [ ] Create Next.js 14+ project with TypeScript and App Router
  - **Reference**: `Tech Stack.md` lines 14-27
  - **Command**: `npx create-next-app@latest beerhive-pos --typescript --tailwind --app`

- [ ] Install core dependencies (Supabase client, shadcn/ui, React Hook Form, Zod)
  - **Reference**: `Tech Stack.md` lines 42-61

- [ ] Set up project folder structure
  - **Reference**: `Folder Structure.md` lines 9-31 (root structure)
  - **Create folders**: `src/app`, `src/views`, `src/models`, `src/core`, `src/data`, `src/lib`

- [ ] Configure environment variables (.env.local)
  - **Reference**: `Tech Stack.md` lines 109-119
  - **Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 1.2 Supabase Configuration
- [ ] Create Supabase project
  - **Reference**: `Tech Stack.md` lines 94-108

- [ ] Enable Row Level Security (RLS) on all tables
  - **Reference**: `Database Structure.sql` lines 755-825

- [ ] Configure Supabase Realtime
  - **Reference**: `Tech Stack.md` lines 140-161

---

## Phase 2: Database Schema & Types

### 2.1 Database Deployment
- [ ] Run database migration script on Supabase
  - **Reference**: `Database Structure.sql` lines 1-916 (entire file)
  - **Action**: Execute SQL in Supabase SQL Editor
  - **Note**: Creates all tables, enums, indexes, triggers, RLS policies

- [ ] Verify all tables created successfully
  - **Tables to verify**: users, customers, restaurant_tables, products, orders, kitchen_orders, happy_hour_pricing, customer_events
  - **Reference**: `Database Structure.sql` lines 902-912 (table comments)

### 2.2 TypeScript Types Generation
- [ ] Generate TypeScript types from Supabase schema
  - **Reference**: `Tech Stack.md` lines 120-138
  - **Command**: `npx supabase gen types typescript --project-id <project-id> > src/models/database.types.ts`

- [ ] Create entity models
  - **Reference**: `Folder Structure.md` lines 313-328
  - **Files to create**: `User.ts`, `Customer.ts`, `Product.ts`, `Order.ts`, `Table.ts`, `KitchenOrder.ts`, `HappyHour.ts`, `CustomerEvent.ts`
  - **Location**: `src/models/entities/`

- [ ] Create enum types
  - **Reference**: `Database Structure.sql` lines 14-25 (enum definitions)
  - **Files to create**: `UserRole.ts`, `OrderStatus.ts`, `TableStatus.ts`, `KitchenOrderStatus.ts`, `EventType.ts`
  - **Location**: `src/models/enums/`

- [ ] Create DTO (Data Transfer Objects)
  - **Reference**: `Folder Structure.md` lines 330-336
  - **Files to create**: `CreateOrderDTO.ts`, `CreateProductDTO.ts`, `CreateCustomerDTO.ts`, `PaymentDTO.ts`
  - **Location**: `src/models/dtos/`

---

## Phase 3: Authentication & Infrastructure

### 3.1 Supabase Client Setup
- [ ] Create Supabase client configurations
  - **Reference**: `Folder Structure.md` lines 402-406
  - **Files**: `src/data/supabase/client.ts` (browser), `src/data/supabase/server-client.ts` (server)
  - **Reference**: `Tech Stack.md` lines 94-119

- [ ] Create authentication service
  - **Reference**: `Folder Structure.md` lines 352-354
  - **Files**: `src/core/services/auth/AuthService.ts`, `src/core/services/auth/SessionService.ts`
  - **Features**: login, logout, session management

### 3.2 Shared UI Components
- [ ] Set up shadcn/ui components
  - **Reference**: `Tech Stack.md` lines 42-58
  - **Command**: `npx shadcn-ui@latest init`
  - **Install**: Button, Input, Modal, Table, Card, Badge, Toast, Dropdown, Tabs

- [ ] Create shared layout components
  - **Reference**: `Folder Structure.md` lines 237-243
  - **Files**: `DashboardLayout.tsx`, `Sidebar.tsx`, `Header.tsx`
  - **Location**: `src/views/shared/layouts/`

- [ ] Create reusable UI components
  - **Reference**: `Folder Structure.md` lines 245-256
  - **Files**: `LoadingSpinner.tsx`, `ErrorBoundary.tsx`, `EmptyState.tsx`
  - **Location**: `src/views/shared/ui/` and `src/views/shared/feedback/`

### 3.3 Authentication Pages
- [ ] Create login page
  - **Reference**: `Folder Structure.md` lines 34-37
  - **File**: `src/app/(auth)/login/page.tsx`
  - **View component**: `src/views/auth/LoginForm.tsx`
  - **Reference**: `Project Plan.md` lines 77-100

- [ ] Create authentication context
  - **Reference**: `Folder Structure.md` lines 478-482
  - **File**: `src/lib/contexts/AuthContext.tsx`

- [ ] Create useAuth hook
  - **Reference**: `Folder Structure.md` lines 470-477
  - **File**: `src/lib/hooks/useAuth.ts`

---

## Phase 4: Core POS Functionality

### 4.1 Product Management Backend

- [ ] Create ProductRepository
  - **Reference**: `Folder Structure.md` lines 408-419
  - **File**: `src/data/repositories/ProductRepository.ts`
  - **Methods**: `getAll()`, `getById()`, `getByCategory()`, `search()`, `create()`, `update()`

- [ ] Create product queries
  - **Reference**: `Folder Structure.md` lines 421-426
  - **File**: `src/data/queries/products.queries.ts`

- [ ] Create product API routes
  - **Reference**: `Folder Structure.md` lines 140-147
  - **Files**: `src/app/api/products/route.ts`, `src/app/api/products/[productId]/route.ts`, `src/app/api/products/search/route.ts`

### 4.2 Customer Management Backend

- [ ] Create CustomerRepository
  - **Reference**: `Folder Structure.md` lines 408-419
  - **File**: `src/data/repositories/CustomerRepository.ts`
  - **Methods**: `search()`, `getById()`, `create()`, `update()`, `checkEventOffers()`

- [ ] Create CustomerService
  - **Reference**: `Folder Structure.md` lines 373-375
  - **File**: `src/core/services/customers/CustomerService.ts`

- [ ] Create customer API routes
  - **Reference**: `Folder Structure.md` lines 149-154
  - **Files**: `src/app/api/customers/route.ts`, `src/app/api/customers/[customerId]/route.ts`, `src/app/api/customers/search/route.ts`

### 4.3 Table Management Backend

- [ ] Create restaurant_tables table seed data
  - **Reference**: `Database Structure.sql` lines 85-100
  - **Action**: Insert sample tables (Table 1-20, different areas)

- [ ] Create TableRepository
  - **Reference**: `Folder Structure.md` lines 408-419
  - **File**: `src/data/repositories/TableRepository.ts`
  - **Methods**: `getAll()`, `getById()`, `updateStatus()`, `assignOrder()`, `releaseTable()`

- [ ] Create TableService
  - **Reference**: `Folder Structure.md` lines 378-379
  - **File**: `src/core/services/tables/TableService.ts`

- [ ] Create table API routes
  - **Reference**: `Folder Structure.md` lines 134-139
  - **Files**: `src/app/api/tables/route.ts`, `src/app/api/tables/[tableId]/route.ts`, `src/app/api/tables/status/route.ts`

### 4.4 Order Management Backend

- [ ] Create OrderRepository
  - **Reference**: `Folder Structure.md` lines 408-419
  - **File**: `src/data/repositories/OrderRepository.ts`
  - **Methods**: `create()`, `getById()`, `getActive()`, `update()`, `void()`

- [ ] Create PricingService
  - **Reference**: `Folder Structure.md` lines 376-380
  - **File**: `src/core/services/pricing/PricingService.ts`
  - **Reference**: `Folder Structure.md` lines 596-619 (example implementation)

- [ ] Create OrderCalculation service
  - **Reference**: `Folder Structure.md` lines 355-358
  - **File**: `src/core/services/orders/OrderCalculation.ts`
  - **Methods**: `calculateSubtotal()`, `applyDiscount()`, `calculateTax()`, `calculateTotal()`

- [ ] Create OrderService
  - **Reference**: `Folder Structure.md` lines 355-358
  - **File**: `src/core/services/orders/OrderService.ts`

- [ ] Create CreateOrder use case
  - **Reference**: `Folder Structure.md` lines 382-389
  - **File**: `src/core/use-cases/orders/CreateOrder.ts`
  - **Reference**: `Folder Structure.md` lines 596-635 (example implementation flow)

- [ ] Create order API routes
  - **Reference**: `Folder Structure.md` lines 119-133
  - **Files**: `src/app/api/orders/route.ts`, `src/app/api/orders/[orderId]/route.ts`, `src/app/api/orders/active/route.ts`

### 4.5 POS Frontend Interface

- [ ] Create POS page route
  - **Reference**: `Folder Structure.md` lines 46-49
  - **File**: `src/app/(dashboard)/pos/page.tsx`

- [ ] Create POSInterface main component
  - **Reference**: `Folder Structure.md` lines 269-278
  - **File**: `src/views/pos/POSInterface.tsx`
  - **Reference**: `Project Plan.md` lines 111-135

- [ ] Create ProductGrid component
  - **Reference**: `Folder Structure.md` lines 269-278
  - **File**: `src/views/pos/ProductGrid.tsx`
  - **Reference**: `Project Plan.md` lines 137-164

- [ ] Create OrderSummary component
  - **Reference**: `Folder Structure.md` lines 269-278
  - **File**: `src/views/pos/OrderSummary.tsx`

- [ ] Create TableSelector component
  - **Reference**: `Folder Structure.md` lines 269-278
  - **File**: `src/views/pos/TableSelector.tsx`
  - **Reference**: `Project Plan.md` lines 166-190
  - **Reference**: `System Flowchart.md` lines 59-63

- [ ] Create CustomerSearch component
  - **Reference**: `Folder Structure.md` lines 269-278
  - **File**: `src/views/pos/CustomerSearch.tsx`
  - **Reference**: `Project Plan.md` lines 192-218
  - **Reference**: `System Flowchart.md` lines 64-82

- [ ] Create PaymentPanel component
  - **Reference**: `Folder Structure.md` lines 269-278
  - **File**: `src/views/pos/PaymentPanel.tsx`
  - **Reference**: `Project Plan.md` lines 220-255
  - **Reference**: `System Flowchart.md` lines 142-178

- [ ] Create Cart context for order state management
  - **Reference**: `Folder Structure.md` lines 478-482
  - **File**: `src/lib/contexts/CartContext.tsx`

- [ ] Create useOrders hook
  - **Reference**: `Folder Structure.md` lines 470-477
  - **File**: `src/lib/hooks/useOrders.ts`

### 4.6 Void Transaction Flow

- [ ] Create VoidOrderService
  - **Reference**: `Folder Structure.md` lines 409-414
  - **File**: `src/core/services/orders/VoidOrderService.ts`
  - **Reference**: `System Flowchart.md` lines 214-220
  - **Methods**: `voidOrder()`, `requireManagerAuth()`, `returnInventory()`

- [ ] Create void order API route
  - **Reference**: `Folder Structure.md` lines 119-133
  - **File**: `src/app/api/orders/[orderId]/void/route.ts`
  - **Logic**: Require manager PIN, capture void reason, update order status to 'voided'

- [ ] Create VoidOrderDialog component
  - **File**: `src/views/pos/VoidOrderDialog.tsx`
  - **Fields**: Manager PIN input, void reason selection, confirmation
  - **Reasons**: Customer request, order error, kitchen error, duplicate order

- [ ] Implement inventory return logic
  - **Reference**: `System Flowchart.md` lines 217-218
  - **Action**: Reverse inventory deduction when order is voided
  - **Create**: Inventory movement record with type 'void_return'

- [ ] Add void authorization workflow
  - **Reference**: `System Flowchart.md` lines 215-216
  - **Logic**: Validate manager credentials before allowing void
  - **Audit**: Log both cashier and manager IDs in audit trail

- [ ] Create VoidedOrdersList component for reports
  - **File**: `src/views/reports/VoidedOrdersList.tsx`
  - **Display**: All voided orders with reason, cashier, manager, timestamp

---

## Phase 5: Kitchen & Bartender Order Routing

### 5.1 Kitchen Routing Backend

- [ ] Create KitchenOrderRepository
  - **Reference**: `Folder Structure.md` lines 408-419
  - **File**: `src/data/repositories/KitchenOrderRepository.ts`
  - **Methods**: `create()`, `getByDestination()`, `updateStatus()`, `getActive()`

- [ ] Create KitchenRouting service
  - **Reference**: `Folder Structure.md` lines 361-364
  - **File**: `src/core/services/kitchen/KitchenRouting.ts`
  - **Reference**: `Project Plan.md` lines 257-291
  - **Logic**: Analyze order items, determine destination (kitchen/bartender/both), create kitchen_orders records

- [ ] Create KitchenStatus service
  - **Reference**: `Folder Structure.md` lines 361-364
  - **File**: `src/core/services/kitchen/KitchenStatus.ts`
  - **Methods**: `updateStatus()`, `markPreparing()`, `markReady()`, `markServed()`

- [ ] Create kitchen API routes
  - **Reference**: `Folder Structure.md` lines 125-133
  - **Files**: `src/app/api/kitchen/orders/route.ts`, `src/app/api/kitchen/orders/[orderId]/status/route.ts`

- [ ] Integrate kitchen routing into CreateOrder use case
  - **Reference**: `Folder Structure.md` lines 596-635
  - **Action**: Add kitchen routing call after order creation
  - **Reference**: `System Flowchart.md` lines 195-204

### 5.2 Kitchen Display Frontend

- [ ] Create kitchen page route
  - **Reference**: `Folder Structure.md` lines 51-55
  - **File**: `src/app/(dashboard)/kitchen/page.tsx`

- [ ] Create KitchenDisplay component
  - **Reference**: `Folder Structure.md` lines 280-285
  - **File**: `src/views/kitchen/KitchenDisplay.tsx`
  - **Reference**: `Project Plan.md` lines 257-291

- [ ] Create OrderCard component
  - **Reference**: `Folder Structure.md` lines 280-285
  - **File**: `src/views/kitchen/OrderCard.tsx`
  - **Display**: Table number, order time, items, special instructions

- [ ] Create StatusButtons component
  - **Reference**: `Folder Structure.md` lines 280-285
  - **File**: `src/views/kitchen/StatusButtons.tsx`
  - **Buttons**: Start Preparing, Mark Ready, Mark Served

- [ ] Set up Realtime subscription for kitchen_orders
  - **Reference**: `Tech Stack.md` lines 140-161
  - **File**: `src/lib/hooks/useRealtime.ts`
  - **Subscribe to**: `kitchen_orders` table changes

### 5.3 Bartender Display Frontend

- [ ] Create bartender page route
  - **Reference**: `Folder Structure.md` lines 57-61
  - **File**: `src/app/(dashboard)/bartender/page.tsx`

- [ ] Create BartenderDisplay component
  - **Reference**: `Folder Structure.md` lines 287-291
  - **File**: `src/views/bartender/BartenderDisplay.tsx`
  - **Note**: Similar to KitchenDisplay but filtered for beverages

---

## Phase 5A: Audit Logging System

### 5A.1 Audit Logging Backend

- [ ] Create AuditLogService
  - **Reference**: `Database Structure.sql` lines 690-714
  - **File**: `src/core/services/audit/AuditLogService.ts`
  - **Methods**: `log()`, `logUserAction()`, `logDataChange()`, `logSecurityEvent()`

- [ ] Create AuditLogRepository
  - **Reference**: `Database Structure.sql` lines 693-708
  - **File**: `src/data/repositories/AuditLogRepository.ts`
  - **Methods**: `create()`, `getByUser()`, `getByTable()`, `getByDateRange()`

- [ ] Create audit logging middleware
  - **File**: `src/middleware/auditLogger.ts`
  - **Logic**: Automatically log critical API route calls
  - **Track**: User ID, action, table name, old/new values, IP address, timestamp

- [ ] Integrate audit logging into critical operations
  - **Actions to log**:
    - Order creation, completion, void
    - Inventory adjustments (manual stock changes)
    - Price changes
    - Discount applications >20%
    - User login/logout
    - Manager overrides
    - Customer data changes (VIP status, personal info)

- [ ] Create audit log API routes
  - **File**: `src/app/api/audit-logs/route.ts`
  - **Endpoints**: GET logs with filters (user, date range, action type)

### 5A.2 Audit Log Viewer Frontend

- [ ] Create audit logs page route (Admin only)
  - **File**: `src/app/(dashboard)/audit-logs/page.tsx`
  - **Access**: Admin role required

- [ ] Create AuditLogViewer component
  - **File**: `src/views/audit/AuditLogViewer.tsx`
  - **Features**: Filterable table, search, export to CSV
  - **Filters**: User, action type, date range, table name

- [ ] Create AuditLogDetail component
  - **File**: `src/views/audit/AuditLogDetail.tsx`
  - **Display**: Full details including old/new values diff viewer

- [ ] Create UserActivityTimeline component
  - **File**: `src/views/audit/UserActivityTimeline.tsx`
  - **Display**: Chronological view of specific user's actions

---

## Phase 6: Table Management

### 6.1 Table Management Frontend

- [ ] Create tables page route
  - **Reference**: `Folder Structure.md` lines 63-70
  - **File**: `src/app/(dashboard)/tables/page.tsx`

- [ ] Create TableGrid component
  - **Reference**: `Folder Structure.md` lines 293-298
  - **File**: `src/views/tables/TableGrid.tsx`
  - **Reference**: `Project Plan.md` lines 166-190
  - **Display**: Visual grid of all tables with color-coded status

- [ ] Create TableCard component
  - **Reference**: `Folder Structure.md` lines 293-298
  - **File**: `src/views/tables/TableCard.tsx`
  - **Display**: Table number, status, capacity, current order

- [ ] Create TableStatusBadge component
  - **Reference**: `Folder Structure.md` lines 293-298
  - **File**: `src/views/tables/TableStatusBadge.tsx`
  - **Colors**: Green (available), Red (occupied), Yellow (reserved), Gray (cleaning)

- [ ] Set up Realtime subscription for restaurant_tables
  - **Reference**: `Tech Stack.md` lines 142-147
  - **Action**: Subscribe to table status changes for live updates

---

## Phase 7: Advanced Pricing Features

### 7.1 Happy Hour Pricing Backend

- [ ] Create HappyHourRepository
  - **Reference**: `Folder Structure.md` lines 408-419
  - **File**: `src/data/repositories/HappyHourRepository.ts`
  - **Methods**: `getActive()`, `getById()`, `create()`, `update()`, `checkEligibility()`

- [ ] Create HappyHourPricing service
  - **Reference**: `Folder Structure.md` lines 376-380
  - **File**: `src/core/services/pricing/HappyHourPricing.ts`
  - **Reference**: `Project Plan.md` lines 560-585
  - **Methods**: `isActive()`, `apply()`, `checkTimeWindow()`, `checkDayOfWeek()`

- [ ] Create VIPPricing service
  - **Reference**: `Folder Structure.md` lines 376-380
  - **File**: `src/core/services/pricing/VIPPricing.ts`
  - **Methods**: `apply()`, `getVIPPrice()`

- [ ] Integrate happy hour logic into PricingService
  - **Reference**: `Folder Structure.md` lines 596-619
  - **Action**: Check happy hour before calculating final price
  - **Reference**: `System Flowchart.md` lines 110-113

- [ ] Create happy hours API routes
  - **Reference**: `Folder Structure.md` lines 162-167
  - **Files**: `src/app/api/happy-hours/route.ts`, `src/app/api/happy-hours/active/route.ts`

### 7.2 Happy Hour Management Frontend

- [ ] Create happy-hours page route
  - **Reference**: `Folder Structure.md` lines 90-96
  - **File**: `src/app/(dashboard)/happy-hours/page.tsx`

- [ ] Create HappyHourList component
  - **Reference**: `Folder Structure.md` lines 318-324
  - **File**: `src/views/happy-hours/HappyHourList.tsx`

- [ ] Create HappyHourForm component
  - **Reference**: `Folder Structure.md` lines 318-324
  - **File**: `src/views/happy-hours/HappyHourForm.tsx`
  - **Reference**: `Project Plan.md` lines 560-585
  - **Fields**: Name, time range, days of week, discount type, discount value

- [ ] Create HappyHourIndicator for POS
  - **Reference**: `Folder Structure.md` lines 269-278
  - **File**: `src/views/pos/HappyHourIndicator.tsx`
  - **Display**: Visual indicator when happy hour is active

### 7.3 Customer Events & Offers Backend

- [ ] Create CustomerEventRepository
  - **Reference**: `Folder Structure.md` lines 408-419
  - **File**: `src/data/repositories/EventRepository.ts`
  - **Methods**: `getActiveForCustomer()`, `create()`, `redeem()`, `checkExpired()`

- [ ] Create EventService
  - **Reference**: `Folder Structure.md` lines 385-387
  - **File**: `src/core/services/events/EventService.ts`

- [ ] Create OfferGeneration service
  - **Reference**: `Folder Structure.md` lines 385-387
  - **File**: `src/core/services/events/OfferGeneration.ts`
  - **Reference**: `Project Plan.md` lines 587-650
  - **Logic**: Auto-generate birthday/anniversary offers, set validity windows

- [ ] Create RedemptionService
  - **Reference**: `Folder Structure.md` lines 385-387
  - **File**: `src/core/services/events/RedemptionService.ts`
  - **Methods**: `redeem()`, `validateOffer()`, `markRedeemed()`

- [ ] Create events API routes
  - **Reference**: `Folder Structure.md` lines 169-176
  - **Files**: `src/app/api/events/route.ts`, `src/app/api/events/[eventId]/redeem/route.ts`

### 7.4 Customer Events Frontend

- [ ] Create events page route
  - **Reference**: `Folder Structure.md` lines 98-104
  - **File**: `src/app/(dashboard)/events/page.tsx`

- [ ] Create EventList component
  - **Reference**: `Folder Structure.md` lines 326-332
  - **File**: `src/views/events/EventList.tsx`

- [ ] Create EventForm component
  - **Reference**: `Folder Structure.md` lines 326-332
  - **File**: `src/views/events/EventForm.tsx`
  - **Reference**: `Project Plan.md` lines 587-650

- [ ] Create EventOfferBadge for POS
  - **Reference**: `Folder Structure.md` lines 269-278
  - **File**: `src/views/pos/EventOfferBadge.tsx`
  - **Reference**: `System Flowchart.md` lines 73-78
  - **Display**: Birthday/anniversary badge when customer has active offer

---

## Phase 8: Inventory Management

### 8.1 Inventory Backend

- [ ] Create InventoryRepository
  - **Reference**: `Folder Structure.md` lines 408-419
  - **File**: `src/data/repositories/InventoryRepository.ts`
  - **Methods**: `getAll()`, `getLowStock()`, `adjust()`, `logMovement()`

- [ ] Create InventoryService
  - **Reference**: `Folder Structure.md` lines 366-369
  - **File**: `src/core/services/inventory/InventoryService.ts`

- [ ] Create StockDeduction service
  - **Reference**: `Folder Structure.md` lines 366-369
  - **File**: `src/core/services/inventory/StockDeduction.ts`
  - **Reference**: `Project Plan.md` lines 321-340
  - **Logic**: Automatically deduct inventory on order completion

- [ ] Create LowStockAlert service
  - **Reference**: `Folder Structure.md` lines 366-369
  - **File**: `src/core/services/inventory/LowStockAlert.ts`
  - **Reference**: `Project Plan.md` lines 342-373

- [ ] Integrate stock deduction into order completion flow
  - **Action**: Call StockDeduction after payment confirmation
  - **Reference**: `System Flowchart.md` lines 185-188

- [ ] Create inventory API routes
  - **Reference**: `Folder Structure.md` lines 156-161
  - **Files**: `src/app/api/inventory/movements/route.ts`, `src/app/api/inventory/adjust/route.ts`, `src/app/api/inventory/low-stock/route.ts`

### 8.2 Inventory Frontend

- [ ] Create inventory page route
  - **Reference**: `Folder Structure.md` lines 72-88
  - **File**: `src/app/(dashboard)/inventory/page.tsx`

- [ ] Create InventoryList component
  - **Reference**: `Folder Structure.md` lines 300-308
  - **File**: `src/views/inventory/InventoryList.tsx`

- [ ] Create ProductForm component
  - **Reference**: `Folder Structure.md` lines 300-308
  - **File**: `src/views/inventory/ProductForm.tsx`
  - **Reference**: `Project Plan.md` lines 375-405

- [ ] Create StockAdjustmentForm component
  - **Reference**: `Folder Structure.md` lines 300-308
  - **File**: `src/views/inventory/StockAdjustmentForm.tsx`

- [ ] Create LowStockAlert component
  - **Reference**: `Folder Structure.md` lines 300-308
  - **File**: `src/views/inventory/LowStockAlert.tsx`

### 8.3 Supplier Management

- [ ] Create SupplierRepository
  - **Reference**: `Database Structure.sql` lines 537-555
  - **File**: `src/data/repositories/SupplierRepository.ts`
  - **Methods**: `getAll()`, `getById()`, `create()`, `update()`, `deactivate()`

- [ ] Create PurchaseOrderRepository
  - **Reference**: `Database Structure.sql` lines 578-631
  - **File**: `src/data/repositories/PurchaseOrderRepository.ts`
  - **Methods**: `create()`, `getById()`, `getBySupplier()`, `updateStatus()`, `recordReceipt()`

- [ ] Create supplier API routes
  - **Files**: `src/app/api/suppliers/route.ts`, `src/app/api/suppliers/[supplierId]/route.ts`

- [ ] Create purchase order API routes
  - **Files**: `src/app/api/purchase-orders/route.ts`, `src/app/api/purchase-orders/[poId]/route.ts`

- [ ] Create SupplierList component
  - **File**: `src/views/inventory/suppliers/SupplierList.tsx`

- [ ] Create SupplierForm component
  - **File**: `src/views/inventory/suppliers/SupplierForm.tsx`
  - **Fields**: Name, contact person, phone, email, address, lead time days, payment terms

- [ ] Create PurchaseOrderForm component
  - **File**: `src/views/inventory/purchase-orders/PurchaseOrderForm.tsx`
  - **Features**: Select supplier, add products with quantities, calculate totals

- [ ] Create PurchaseOrderList component
  - **File**: `src/views/inventory/purchase-orders/PurchaseOrderList.tsx`
  - **Display**: PO number, supplier, date, status, total amount

- [ ] Create ReceiveShipmentForm component
  - **File**: `src/views/inventory/purchase-orders/ReceiveShipmentForm.tsx`
  - **Reference**: `System Flowchart.md` lines 226-244
  - **Logic**: Match received quantities to PO, flag discrepancies, update inventory

### 8.4 Inventory Movement Tracking

- [ ] Create inventory movement queries
  - **Reference**: `Database Structure.sql` lines 499-532
  - **File**: `src/data/queries/inventory.queries.ts`
  - **Queries**: Get movements by product, by date range, by type, by user

- [ ] Create StockAdjustmentService
  - **File**: `src/core/services/inventory/StockAdjustmentService.ts`
  - **Reference**: `System Flowchart.md` lines 236-244
  - **Methods**: `adjust()`, `requireManagerApproval()`, `logMovement()`
  - **Logic**: Adjustments >10% of stock require manager approval

- [ ] Create inventory adjustment API routes
  - **File**: `src/app/api/inventory/adjust/route.ts`
  - **Actions**: Stock in, stock out, transfer, physical count

- [ ] Create InventoryMovementList component
  - **File**: `src/views/inventory/InventoryMovementList.tsx`
  - **Display**: Date, product, type, quantity change, user, reason, notes
  - **Filters**: Date range, product, movement type, user

- [ ] Create StockAdjustmentModal component
  - **File**: `src/views/inventory/StockAdjustmentModal.tsx`
  - **Fields**: Adjustment type, quantity, reason (dropdown + notes), manager PIN (if required)

- [ ] Create PhysicalCountForm component
  - **File**: `src/views/inventory/PhysicalCountForm.tsx`
  - **Features**: Input actual counted quantity, auto-calculate variance, require approval for large discrepancies

---

## Phase 8A: User Management

### 8A.1 User Management Backend

- [ ] Create UserRepository CRUD methods
  - **Reference**: `Database Structure.sql` lines 31-47
  - **File**: `src/data/repositories/UserRepository.ts`
  - **Methods**: `getAll()`, `getById()`, `create()`, `update()`, `deactivate()`, `changePassword()`

- [ ] Create UserService
  - **File**: `src/core/services/users/UserService.ts`
  - **Methods**: `createUser()`, `updateUser()`, `resetPassword()`, `validateRole()`

- [ ] Create user management API routes
  - **Files**: `src/app/api/users/route.ts`, `src/app/api/users/[userId]/route.ts`
  - **Security**: Admin-only access via middleware

- [ ] Create password reset API route
  - **File**: `src/app/api/users/[userId]/reset-password/route.ts`
  - **Logic**: Generate temporary password, send via email (or display to admin)

### 8A.2 User Management Frontend

- [ ] Create users management page route
  - **File**: `src/app/(dashboard)/settings/users/page.tsx`
  - **Access**: Admin role only

- [ ] Create UserList component
  - **File**: `src/views/settings/users/UserList.tsx`
  - **Display**: Username, full name, role, status (active/inactive), last login
  - **Actions**: Edit, deactivate, reset password

- [ ] Create UserForm component
  - **File**: `src/views/settings/users/UserForm.tsx`
  - **Fields**: Username, email, full name, role (dropdown), initial password
  - **Validation**: Username uniqueness, email format, strong password requirements

- [ ] Create PasswordResetDialog component
  - **File**: `src/views/settings/users/PasswordResetDialog.tsx`
  - **Features**: Confirm reset, generate temporary password, display to admin

- [ ] Create RoleBadge component
  - **File**: `src/views/settings/users/RoleBadge.tsx`
  - **Colors**: Admin (red), Manager (blue), Cashier (green), Kitchen/Bartender (gray)

---

## Phase 8B: System Settings

### 8B.1 Settings Backend

- [ ] Create SettingsRepository
  - **Reference**: `Database Structure.sql` lines 719-728
  - **File**: `src/data/repositories/SettingsRepository.ts`
  - **Methods**: `get()`, `update()`, `getByCategory()`

- [ ] Create SettingsService
  - **File**: `src/core/services/settings/SettingsService.ts`
  - **Methods**: `getSetting()`, `updateSetting()`, `validateValue()`

- [ ] Create settings API routes
  - **Files**: `src/app/api/settings/route.ts`, `src/app/api/settings/[key]/route.ts`

### 8B.2 Settings Frontend

- [ ] Create general settings page
  - **File**: `src/app/(dashboard)/settings/general/page.tsx`

- [ ] Create GeneralSettingsForm component
  - **File**: `src/views/settings/GeneralSettingsForm.tsx`
  - **Fields**: Business name, currency, auto-logout minutes
  - **Reference**: `Database Structure.sql` lines 837-843

- [ ] Create TaxSettingsForm component
  - **File**: `src/views/settings/TaxSettingsForm.tsx`
  - **Fields**: Tax rate percentage, tax display (inclusive/exclusive)

- [ ] Create DiscountSettingsForm component
  - **File**: `src/views/settings/DiscountSettingsForm.tsx`
  - **Fields**: Manager approval threshold (%), max discount allowed

- [ ] Create InventorySettingsForm component
  - **File**: `src/views/settings/InventorySettingsForm.tsx`
  - **Fields**: Low stock threshold days, reorder alert frequency

---

## Phase 9: Reports & Analytics

### 9.1 Reports Backend

- [ ] Create SalesReport service
  - **Reference**: `Folder Structure.md` lines 389-392
  - **File**: `src/core/services/reports/SalesReport.ts`
  - **Methods**: `getDailySales()`, `getSalesByDateRange()`, `getTopProducts()`

- [ ] Create InventoryReport service
  - **Reference**: `Folder Structure.md` lines 389-392
  - **File**: `src/core/services/reports/InventoryReport.ts`

- [ ] Create CustomerReport service
  - **Reference**: `Folder Structure.md` lines 389-392
  - **File**: `src/core/services/reports/CustomerReport.ts`

- [ ] Create reports API routes
  - **Reference**: `Folder Structure.md` lines 178-183
  - **Files**: `src/app/api/reports/sales/route.ts`, `src/app/api/reports/inventory/route.ts`, `src/app/api/reports/customers/route.ts`

### 9.2 Reports Frontend

- [ ] Create reports page route
  - **Reference**: `Folder Structure.md` lines 106-115
  - **File**: `src/app/(dashboard)/reports/page.tsx`

- [ ] Create ReportsDashboard component
  - **Reference**: `Folder Structure.md` lines 334-342
  - **File**: `src/views/reports/ReportsDashboard.tsx`

- [ ] Create SalesChart component
  - **Reference**: `Folder Structure.md` lines 334-342
  - **File**: `src/views/reports/SalesChart.tsx`
  - **Library**: Use Recharts or Chart.js

- [ ] Create TopProductsTable component
  - **Reference**: `Folder Structure.md` lines 334-342
  - **File**: `src/views/reports/TopProductsTable.tsx`

### 9.3 Advanced Reports

- [ ] Create detailed sales queries
  - **File**: `src/data/queries/reports.queries.ts`
  - **Queries**: Sales by hour, sales by cashier, sales by payment method, sales by category

- [ ] Create InventoryTurnoverReport service
  - **File**: `src/core/services/reports/InventoryTurnoverReport.ts`
  - **Metrics**: Turnover rate, days to sell, slow-moving items

- [ ] Create VoidedTransactionsReport
  - **File**: `src/views/reports/VoidedTransactionsReport.tsx`
  - **Display**: All voided orders with reasons, cashier, manager, value
  - **Metrics**: Total voided amount, void rate, common reasons

- [ ] Create DiscountAnalysisReport
  - **File**: `src/views/reports/DiscountAnalysisReport.tsx`
  - **Display**: Total discounts given, by cashier, by reason, by discount type
  - **Reference**: `Database Structure.sql` lines 636-663

- [ ] Create CashierPerformanceReport
  - **File**: `src/views/reports/CashierPerformanceReport.tsx`
  - **Metrics**: Total sales, transaction count, average transaction value, average transaction time

- [ ] Create LowStockReport
  - **File**: `src/views/reports/LowStockReport.tsx`
  - **Display**: Products below reorder point, days until stockout, suggested reorder quantity

- [ ] Create ExportReportButton component
  - **File**: `src/views/reports/ExportReportButton.tsx`
  - **Formats**: CSV export (use csv-export library)
  - **Note**: PDF export can be added in future phase

---

## Phase 9A: Receipt Generation

### 9A.1 Receipt Generation Backend

- [ ] Install receipt dependencies
  - **Command**: `npm install @react-pdf/renderer`
  - **Purpose**: Generate PDF receipts

- [ ] Create ReceiptGenerator service
  - **Reference**: `Folder Structure.md` lines 483-486
  - **File**: `src/core/utils/generators/receiptGenerator.ts`
  - **Methods**: `generateReceipt()`, `formatReceiptData()`, `calculateTotals()`

- [ ] Create receipt template component
  - **File**: `src/views/receipts/ReceiptTemplate.tsx`
  - **Reference**: `Tech Stack.md` lines 337-344
  - **Sections**: Business header, order number, date/time, table, cashier, items list, totals, payment details, footer

- [ ] Create receipt API route
  - **File**: `src/app/api/orders/[orderId]/receipt/route.ts`
  - **Response**: PDF buffer or HTML for printing

### 9A.2 Receipt Printing Frontend

- [ ] Create PrintReceiptButton component
  - **File**: `src/views/pos/PrintReceiptButton.tsx`
  - **Features**: Trigger browser print dialog, format for thermal printer (80mm width)

- [ ] Create receipt print CSS
  - **File**: `src/app/globals.css` (add @media print section)
  - **Reference**: `Tech Stack.md` lines 346-348
  - **Styles**: Optimize for 80mm thermal paper, remove margins, adjust font sizes

- [ ] Integrate receipt printing into payment flow
  - **Action**: Auto-print receipt after successful payment
  - **Reference**: `System Flowchart.md` lines 194-195
  - **Location**: Update `PaymentPanel.tsx` to trigger print

- [ ] Create receipt preview modal
  - **File**: `src/views/pos/ReceiptPreviewModal.tsx`
  - **Features**: Preview receipt before printing, reprint option

- [ ] Add receipt to order history
  - **Feature**: View/reprint past receipts from order details
  - **Location**: Order history page

---

## Phase 10: Testing & Optimization

### 10.1 Testing
- [ ] Create test suite for core services
  - **Reference**: `Folder Structure.md` lines 394-401
  - **Files**: Unit tests for OrderService, PricingService, InventoryService
  - **Tool**: Jest or Vitest

- [ ] Test POS order creation flow end-to-end
  - **Reference**: `System Flowchart.md` lines 49-220
  - **Test**: Create order → Add items → Assign table → Process payment → Verify kitchen routing

- [ ] Test happy hour pricing application
  - **Reference**: `Project Plan.md` lines 560-585
  - **Test**: Create order during happy hour window, verify discount applied

- [ ] Test event offer redemption
  - **Reference**: `Project Plan.md` lines 587-650
  - **Test**: Customer with active offer, apply to order, verify redemption marked

### 10.2 Performance Optimization
- [ ] Implement caching for frequently accessed data
  - **Cache**: Products list, active happy hours, table statuses

- [ ] Optimize database queries with proper indexes
  - **Reference**: `Database Structure.sql` (all CREATE INDEX statements)

- [ ] Set up Supabase Edge Functions if needed
  - **Reference**: `Tech Stack.md` lines 172-188

### 10.3 Deployment
- [ ] Deploy to Vercel
  - **Reference**: `Tech Stack.md` lines 190-205

- [ ] Set up production environment variables

- [ ] Configure custom domain (optional)

- [ ] Set up monitoring and error tracking (Sentry)

---

## Implementation Notes

### Token Optimization Tips
- **Read only referenced line numbers** when implementing each task
- **Use grep/search** to find specific sections instead of reading entire files
- **Reference the example implementations** in Folder Structure.md (lines 596-635) as templates

### Priority Order
1. **Phase 1-3**: Foundation (required for everything)
2. **Phase 4**: Core POS (highest business value)
3. **Phase 5**: Kitchen routing (operations efficiency)
4. **Phase 6**: Table management (customer experience)
5. **Phase 7**: Advanced pricing (revenue optimization)
6. **Phase 8**: Inventory (business operations)
7. **Phase 9**: Reports (business intelligence)
8. **Phase 10**: Testing & deployment

### Checkpoint Validation
After each phase, validate:
- [ ] All files created and placed in correct folders
- [ ] TypeScript types properly imported
- [ ] API routes return expected data structure
- [ ] UI components render without errors
- [ ] Database queries execute successfully

---

**Total Tasks**: 200+ actionable items
**Estimated Timeline**: 8-10 weeks for solo developer, 4-6 weeks for team
**AI Model Usage**: Reference line numbers to minimize token usage per task

---

## Payment Method Note

**Cash Payment Only (Current Scope)**:
For initial implementation, only cash payment method is supported:
- PaymentPanel: Show cash payment interface only
- Amount tendered input with change calculation
- No card/e-wallet/split payment UI needed
- Database still supports multiple payment methods for future expansion

**Future Expansion**:
Other payment methods (card, GCash, split payment) can be added later by:
1. Updating PaymentPanel component to show payment method selector
2. Adding conditional UI based on selected payment method
3. No backend changes needed (already supported in database schema)
