# BeerHive POS - Folder Structure

**Architecture Pattern**: Clean Architecture with Feature-Based Organization  
**Framework**: Next.js 14+ (App Router)  
**Philosophy**: Clear separation of concerns, junior-developer friendly, easy maintenance

---

## Root Directory Structure

```
beerhive-pos/
├── src/
│   ├── app/                      # Next.js App Router (Frontend Routes)
│   ├── views/                    # UI Components (Feature-based)
│   ├── models/                   # TypeScript Types & Interfaces
│   ├── core/                     # Business Logic Layer
│   ├── data/                     # Data Access Layer
│   ├── lib/                      # Shared Utilities & Configurations
│   └── middleware/               # Next.js Middleware
├── public/                       # Static Assets
├── supabase/                     # Supabase Migrations & Config
├── tests/                        # Test Files
└── docs/                         # Documentation
```

---

## Detailed Structure

### 1. `/src/app` - Next.js App Router (Frontend & API Routes)

```
src/app/
├── (auth)/                       # Auth route group
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── layout.tsx                # Auth layout (centered, no sidebar)
│   └── error.tsx
│
├── (dashboard)/                  # Main app route group
│   ├── layout.tsx                # Dashboard layout (sidebar, header)
│   ├── page.tsx                  # Dashboard home
│   │
│   ├── pos/                      # Point of Sale Module
│   │   ├── page.tsx              # POS main interface
│   │   ├── loading.tsx
│   │   └── error.tsx
│   │
│   ├── kitchen/                  # Kitchen Display Module
│   │   ├── page.tsx              # Kitchen orders display
│   │   └── [orderId]/
│   │       └── page.tsx          # Order detail view
│   │
│   ├── bartender/                # Bartender Display Module
│   │   ├── page.tsx
│   │   └── [orderId]/
│   │       └── page.tsx
│   │
│   ├── tables/                   # Table Management Module
│   │   ├── page.tsx              # Table grid view
│   │   ├── [tableId]/
│   │   │   └── page.tsx          # Table details
│   │   └── new/
│   │       └── page.tsx          # Add new table
│   │
│   ├── inventory/                # Inventory Management Module
│   │   ├── page.tsx              # Inventory list
│   │   ├── products/
│   │   │   ├── page.tsx          # Products list
│   │   │   ├── [productId]/
│   │   │   │   ├── page.tsx      # Product details
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx  # Edit product
│   │   │   └── new/
│   │   │       └── page.tsx      # Add new product
│   │   ├── categories/
│   │   │   └── page.tsx
│   │   ├── stock-movements/
│   │   │   └── page.tsx
│   │   └── suppliers/
│   │       └── page.tsx
│   │
│   ├── customers/                # Customer Management Module
│   │   ├── page.tsx              # Customers list
│   │   ├── [customerId]/
│   │   │   ├── page.tsx          # Customer details
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   │
│   ├── packages/                 # VIP Packages Module
│   │   ├── page.tsx
│   │   ├── [packageId]/
│   │   │   └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   │
│   ├── happy-hours/              # Happy Hour Management Module
│   │   ├── page.tsx
│   │   ├── [happyHourId]/
│   │   │   └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   │
│   ├── events/                   # Customer Events Module
│   │   ├── page.tsx              # Events list
│   │   ├── [eventId]/
│   │   │   └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   │
│   ├── reports/                  # Reports & Analytics Module
│   │   ├── page.tsx              # Reports dashboard
│   │   ├── sales/
│   │   │   └── page.tsx
│   │   ├── inventory/
│   │   │   └── page.tsx
│   │   ├── customers/
│   │   │   └── page.tsx
│   │   └── performance/
│   │       └── page.tsx
│   │
│   └── settings/                 # System Settings Module
│       ├── page.tsx
│       ├── users/
│       │   └── page.tsx
│       ├── general/
│       │   └── page.tsx
│       └── tax/
│           └── page.tsx
│
├── api/                          # API Routes (Backend)
│   ├── auth/
│   │   ├── login/
│   │   │   └── route.ts
│   │   ├── logout/
│   │   │   └── route.ts
│   │   └── session/
│   │       └── route.ts
│   │
│   ├── orders/
│   │   ├── route.ts              # GET all, POST new
│   │   ├── [orderId]/
│   │   │   ├── route.ts          # GET, PATCH, DELETE
│   │   │   └── void/
│   │   │       └── route.ts      # POST void order
│   │   └── active/
│   │       └── route.ts          # GET active orders
│   │
│   ├── kitchen/
│   │   ├── orders/
│   │   │   ├── route.ts          # GET kitchen orders
│   │   │   └── [orderId]/
│   │   │       └── status/
│   │   │           └── route.ts  # PATCH update status
│   │   └── stats/
│   │       └── route.ts
│   │
│   ├── tables/
│   │   ├── route.ts
│   │   ├── [tableId]/
│   │   │   └── route.ts
│   │   └── status/
│   │       └── route.ts          # PATCH bulk status update
│   │
│   ├── products/
│   │   ├── route.ts
│   │   ├── [productId]/
│   │   │   └── route.ts
│   │   └── search/
│   │       └── route.ts
│   │
│   ├── customers/
│   │   ├── route.ts
│   │   ├── [customerId]/
│   │   │   └── route.ts
│   │   └── search/
│   │       └── route.ts
│   │
│   ├── inventory/
│   │   ├── movements/
│   │   │   └── route.ts
│   │   ├── adjust/
│   │   │   └── route.ts
│   │   └── low-stock/
│   │       └── route.ts
│   │
│   ├── happy-hours/
│   │   ├── route.ts
│   │   ├── [happyHourId]/
│   │   │   └── route.ts
│   │   └── active/
│   │       └── route.ts          # GET currently active happy hours
│   │
│   ├── events/
│   │   ├── route.ts
│   │   ├── [eventId]/
│   │   │   ├── route.ts
│   │   │   └── redeem/
│   │   │       └── route.ts
│   │   └── upcoming/
│   │       └── route.ts
│   │
│   ├── reports/
│   │   ├── sales/
│   │   │   └── route.ts
│   │   ├── inventory/
│   │   │   └── route.ts
│   │   └── customers/
│   │       └── route.ts
│   │
│   └── webhooks/
│       └── supabase/
│           └── route.ts
│
├── layout.tsx                    # Root layout
├── globals.css                   # Global styles
├── error.tsx                     # Global error handler
└── not-found.tsx                 # 404 page
```

---

### 2. `/src/views` - UI Components (Feature-Based)

```
src/views/
├── shared/                       # Shared/Common Components
│   ├── layouts/
│   │   ├── DashboardLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   │
│   ├── ui/                       # Reusable UI Components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Toast.tsx
│   │   ├── Loader.tsx
│   │   ├── Dropdown.tsx
│   │   └── Tabs.tsx
│   │
│   ├── forms/                    # Form Components
│   │   ├── FormField.tsx
│   │   ├── FormError.tsx
│   │   ├── SearchBar.tsx
│   │   └── DatePicker.tsx
│   │
│   └── feedback/                 # User Feedback Components
│       ├── ErrorBoundary.tsx
│       ├── LoadingSpinner.tsx
│       └── EmptyState.tsx
│
├── pos/                          # POS Module Views
│   ├── POSInterface.tsx          # Main POS container
│   ├── ProductGrid.tsx           # Product selection grid
│   ├── OrderSummary.tsx          # Current order display
│   ├── CustomerSearch.tsx        # Customer lookup
│   ├── PaymentPanel.tsx          # Payment processing
│   ├── TableSelector.tsx         # Table assignment
│   ├── AddOnModal.tsx            # Add-ons selection
│   ├── VIPBadge.tsx              # VIP indicator
│   ├── EventOfferBadge.tsx       # Birthday/anniversary badge
│   └── HappyHourIndicator.tsx    # Happy hour status
│
├── kitchen/                      # Kitchen Module Views
│   ├── KitchenDisplay.tsx        # Main kitchen display
│   ├── OrderCard.tsx             # Individual order card
│   ├── OrderQueue.tsx            # Orders queue list
│   ├── StatusButtons.tsx         # Status update controls
│   └── OrderTimer.tsx            # Order timing display
│
├── bartender/                    # Bartender Module Views
│   ├── BartenderDisplay.tsx
│   ├── DrinkOrderCard.tsx
│   ├── OrderQueue.tsx
│   └── StatusControls.tsx
│
├── tables/                       # Table Management Views
│   ├── TableGrid.tsx             # Visual table layout
│   ├── TableCard.tsx             # Individual table card
│   ├── TableStatusBadge.tsx      # Status indicator
│   ├── TableForm.tsx             # Add/edit table form
│   └── TableHistory.tsx          # Table order history
│
├── inventory/                    # Inventory Module Views
│   ├── InventoryList.tsx         # Products list
│   ├── ProductCard.tsx           # Product card
│   ├── StockLevelIndicator.tsx   # Stock status badge
│   ├── ProductForm.tsx           # Add/edit product
│   ├── CategorySelector.tsx      # Category picker
│   ├── StockAdjustmentForm.tsx   # Stock adjustment
│   ├── LowStockAlert.tsx         # Low stock warning
│   └── SupplierList.tsx          # Suppliers management
│
├── customers/                    # Customer Module Views
│   ├── CustomerList.tsx          # Customers table
│   ├── CustomerCard.tsx          # Customer card
│   ├── CustomerForm.tsx          # Add/edit customer
│   ├── TierBadge.tsx             # VIP tier indicator
│   ├── CustomerHistory.tsx       # Purchase history
│   └── QuickRegistration.tsx     # Fast customer add
│
├── packages/                     # Packages Module Views
│   ├── PackageList.tsx
│   ├── PackageCard.tsx
│   ├── PackageForm.tsx
│   └── PackageItemSelector.tsx
│
├── happy-hours/                  # Happy Hours Module Views
│   ├── HappyHourList.tsx
│   ├── HappyHourCard.tsx
│   ├── HappyHourForm.tsx
│   ├── TimeSelector.tsx
│   ├── DaySelector.tsx
│   └── ProductSelector.tsx
│
├── events/                       # Customer Events Module Views
│   ├── EventList.tsx
│   ├── EventCard.tsx
│   ├── EventForm.tsx
│   ├── OfferPreview.tsx
│   └── RedemptionStatus.tsx
│
├── reports/                      # Reports Module Views
│   ├── ReportsDashboard.tsx
│   ├── SalesChart.tsx
│   ├── InventoryChart.tsx
│   ├── TopProductsTable.tsx
│   ├── RevenueCard.tsx
│   ├── DateRangeFilter.tsx
│   └── ExportButton.tsx
│
├── settings/                     # Settings Module Views
│   ├── SettingsNav.tsx
│   ├── GeneralSettings.tsx
│   ├── UserManagement.tsx
│   ├── UserForm.tsx
│   └── TaxSettings.tsx
│
└── auth/                         # Auth Module Views
    ├── LoginForm.tsx
    └── LogoutButton.tsx
```

---

### 3. `/src/models` - TypeScript Types & Interfaces

```
src/models/
├── index.ts                      # Barrel export
│
├── database.types.ts             # Supabase generated types
│
├── entities/                     # Domain Entities
│   ├── User.ts
│   ├── Customer.ts
│   ├── Product.ts
│   ├── Category.ts
│   ├── Order.ts
│   ├── OrderItem.ts
│   ├── Table.ts
│   ├── Package.ts
│   ├── HappyHour.ts
│   ├── CustomerEvent.ts
│   ├── KitchenOrder.ts
│   └── InventoryMovement.ts
│
├── dtos/                         # Data Transfer Objects
│   ├── CreateOrderDTO.ts
│   ├── UpdateOrderDTO.ts
│   ├── CreateProductDTO.ts
│   ├── CreateCustomerDTO.ts
│   └── PaymentDTO.ts
│
├── enums/                        # Enumerations
│   ├── UserRole.ts
│   ├── CustomerTier.ts
│   ├── OrderStatus.ts
│   ├── PaymentMethod.ts
│   ├── TableStatus.ts
│   ├── KitchenOrderStatus.ts
│   └── EventType.ts
│
└── responses/                    # API Response Types
    ├── ApiResponse.ts
    ├── OrderResponse.ts
    └── ErrorResponse.ts
```

---

### 4. `/src/core` - Business Logic Layer

```
src/core/
├── services/                     # Business Logic Services
│   ├── auth/
│   │   ├── AuthService.ts        # Authentication logic
│   │   └── SessionService.ts     # Session management
│   │
│   ├── orders/
│   │   ├── OrderService.ts       # Order creation, updates
│   │   ├── OrderCalculation.ts   # Price calculations
│   │   ├── OrderValidation.ts    # Order validation rules
│   │   └── VoidOrderService.ts   # Void/cancel logic
│   │
│   ├── kitchen/
│   │   ├── KitchenRouting.ts     # Route orders to stations
│   │   └── KitchenStatus.ts      # Status management
│   │
│   ├── tables/
│   │   └── TableService.ts       # Table assignment/status
│   │
│   ├── inventory/
│   │   ├── InventoryService.ts   # Stock management
│   │   ├── StockDeduction.ts     # Auto-deduct on sale
│   │   └── LowStockAlert.ts      # Alert generation
│   │
│   ├── customers/
│   │   ├── CustomerService.ts
│   │   └── LoyaltyService.ts     # Points calculation
│   │
│   ├── pricing/
│   │   ├── PricingService.ts     # Price determination
│   │   ├── VIPPricing.ts         # VIP price logic
│   │   ├── HappyHourPricing.ts   # Happy hour logic
│   │   └── DiscountService.ts    # Discount application
│   │
│   ├── events/
│   │   ├── EventService.ts
│   │   ├── OfferGeneration.ts    # Auto-generate offers
│   │   └── RedemptionService.ts  # Redeem offers
│   │
│   └── reports/
│       ├── SalesReport.ts
│       ├── InventoryReport.ts
│       └── CustomerReport.ts
│
├── use-cases/                    # Application Use Cases
│   ├── orders/
│   │   ├── CreateOrder.ts
│   │   ├── CompleteOrder.ts
│   │   ├── VoidOrder.ts
│   │   └── GetActiveOrders.ts
│   │
│   ├── kitchen/
│   │   ├── GetKitchenOrders.ts
│   │   └── UpdateOrderStatus.ts
│   │
│   ├── inventory/
│   │   ├── AdjustStock.ts
│   │   └── GetLowStockItems.ts
│   │
│   └── customers/
│       ├── SearchCustomers.ts
│       └── RegisterCustomer.ts
│
├── validators/                   # Validation Logic
│   ├── OrderValidator.ts
│   ├── ProductValidator.ts
│   ├── CustomerValidator.ts
│   └── PaymentValidator.ts
│
└── utils/                        # Core Utilities
    ├── calculations/
    │   ├── priceCalculator.ts
    │   ├── taxCalculator.ts
    │   └── changeCalculator.ts
    │
    ├── formatters/
    │   ├── currency.ts
    │   ├── date.ts
    │   └── number.ts
    │
    └── generators/
        ├── orderNumber.ts
        ├── customerNumber.ts
        └── receiptGenerator.ts
```

---

### 5. `/src/data` - Data Access Layer

```
src/data/
├── supabase/
│   ├── client.ts                 # Supabase client config
│   ├── server-client.ts          # Server-side client
│   └── middleware-client.ts      # Middleware client
│
├── repositories/                 # Data Access Repositories
│   ├── OrderRepository.ts
│   ├── ProductRepository.ts
│   ├── CustomerRepository.ts
│   ├── TableRepository.ts
│   ├── InventoryRepository.ts
│   ├── KitchenOrderRepository.ts
│   ├── HappyHourRepository.ts
│   ├── EventRepository.ts
│   └── UserRepository.ts
│
├── queries/                      # Reusable Queries
│   ├── orders.queries.ts
│   ├── products.queries.ts
│   ├── customers.queries.ts
│   └── reports.queries.ts
│
└── mutations/                    # Data Mutations
    ├── orders.mutations.ts
    ├── products.mutations.ts
    ├── inventory.mutations.ts
    └── customers.mutations.ts
```

---

### 6. `/src/lib` - Shared Utilities & Configurations

```
src/lib/
├── config/
│   ├── app.config.ts             # App configuration
│   ├── auth.config.ts            # Auth settings
│   └── constants.ts              # App constants
│
├── hooks/                        # Custom React Hooks
│   ├── useAuth.ts
│   ├── useOrders.ts
│   ├── useProducts.ts
│   ├── useCustomers.ts
│   ├── useRealtime.ts            # Supabase realtime
│   ├── useTables.ts
│   └── useDebounce.ts
│
├── contexts/                     # React Contexts
│   ├── AuthContext.tsx
│   ├── CartContext.tsx           # Current order state
│   ├── ThemeContext.tsx
│   └── ToastContext.tsx
│
├── utils/                        # General Utilities
│   ├── cn.ts                     # Class name merger
│   ├── fetch.ts                  # Fetch wrapper
│   ├── storage.ts                # LocalStorage helper
│   └── logger.ts                 # Logging utility
│
└── errors/                       # Error Handling
    ├── AppError.ts               # Custom error class
    ├── ErrorHandler.ts           # Error handler
    └── ErrorMessages.ts          # Error message constants
```

---

## Architecture Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│              (src/app + src/views)                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ User Actions
                      ↓
┌─────────────────────────────────────────────────────────┐
│                  API ROUTES LAYER                        │
│                  (src/app/api)                           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Route Handlers
                      ↓
┌─────────────────────────────────────────────────────────┐
│               BUSINESS LOGIC LAYER                       │
│        (src/core/services + use-cases)                   │
│  • OrderService      • PricingService                    │
│  • InventoryService  • CustomerService                   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Data Operations
                      ↓
┌─────────────────────────────────────────────────────────┐
│                DATA ACCESS LAYER                         │
│           (src/data/repositories)                        │
│  • OrderRepository   • ProductRepository                 │
│  • CustomerRepository                                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Database Queries
                      ↓
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE                              │
│              (PostgreSQL Database)                       │
└─────────────────────────────────────────────────────────┘
```

---

## Naming Conventions

### Files
- **Components**: PascalCase - `ProductGrid.tsx`
- **Utilities**: camelCase - `priceCalculator.ts`
- **Types/Models**: PascalCase - `Order.ts`
- **API Routes**: kebab-case folders - `api/happy-hours/route.ts`

### Code
- **Components**: PascalCase - `function OrderSummary()`
- **Functions**: camelCase - `calculateTotal()`
- **Constants**: UPPER_SNAKE_CASE - `MAX_ORDER_ITEMS`
- **Interfaces**: PascalCase with `I` prefix - `IOrder`
- **Types**: PascalCase - `OrderStatus`

---

## Key Design Principles

### 1. **Separation of Concerns**
- Views only handle UI rendering
- Services contain business logic
- Repositories handle data access
- API routes orchestrate the flow

### 2. **Feature-Based Organization**
- Related components grouped by feature
- Easy to locate all POS-related files
- Simplifies feature additions/removals

### 3. **Junior-Developer Friendly**
- Clear folder names explain purpose
- Consistent naming patterns
- Logical file locations
- Comments in key files

### 4. **Maintainability**
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Reusable components in `shared/`
- Centralized configuration

### 5. **Scalability**
- Easy to add new modules
- Shared components prevent duplication
- Services can be unit tested independently
- Clear dependency flow

---

## Example Implementation Flow

### Creating a New Order (Full Flow)

1. **User Interface** (`src/views/pos/POSInterface.tsx`)
   - User adds items, selects customer, assigns table

2. **API Route** (`src/app/api/orders/route.ts`)
   ```typescript
   export async function POST(request: Request) {
     const data = await request.json();
     const result = await CreateOrder.execute(data);
     return Response.json(result);
   }
   ```

3. **Use Case** (`src/core/use-cases/orders/CreateOrder.ts`)
   ```typescript
   export class CreateOrder {
     static async execute(dto: CreateOrderDTO) {
       // Validate order
       OrderValidator.validate(dto);
       
       // Apply pricing logic
       const pricing = await PricingService.calculate(dto);
       
       // Save to database
       const order = await OrderRepository.create(pricing);
       
       // Route to kitchen/bartender
       await KitchenRouting.routeOrder(order);
       
       return order;
     }
   }
   ```

4. **Service** (`src/core/services/pricing/PricingService.ts`)
   ```typescript
   export class PricingService {
     static async calculate(order: Order) {
       let price = order.basePrice;
       
       // Check VIP pricing
       if (order.customer?.tier !== 'regular') {
         price = VIPPricing.apply(price, order.customer);
       }
       
       // Check happy hour
       if (HappyHourPricing.isActive()) {
         price = HappyHourPricing.apply(price, order.items);
       }
       
       return price;
     }
   }
   ```

5. **Repository** (`src/data/repositories/OrderRepository.ts`)
   ```typescript
   export class OrderRepository {
     static async create(orderData: CreateOrderDTO) {
       const { data, error } = await supabase
         .from('orders')
         .insert(orderData)
         .select()
         .single();
       
       if (error) throw new AppError(error.message);
       return data;
     }
   }
   ```

---

## Getting Started Checklist

- [ ] Set up Next.js 14 project with App Router
- [ ] Create folder structure as outlined
- [ ] Install Supabase client
- [ ] Generate TypeScript types from database
- [ ] Create shared UI components
- [ ] Implement authentication flow
- [ ] Build POS module first (highest priority)
- [ ] Add kitchen/bartender displays
- [ ] Implement remaining modules progressively

---

**This structure provides a solid foundation that is easy to understand, maintain, and scale as the project grows.**
