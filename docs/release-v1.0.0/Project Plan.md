
## Executive Summary

**System Overview**: BeerHive is a web-based Point of Sale (POS) and inventory management system designed specifically for pub/bar operations. The system centralizes all business operations including sales transactions, inventory tracking, menu management with customizable options, VIP package handling, customer monitoring, and multi-user cashier access with comprehensive sales reporting.

**Core Objectives**:
1. Streamline pub operations through a unified web-based platform
2. Enable real-time inventory tracking and automatic stock updates
3. Support flexible menu configurations with add-ons and packages
4. Provide differentiated pricing and service levels for VIP customers
5. Enable multi-cashier operations with role-based access control
6. Generate actionable sales insights through comprehensive reporting
7. Implement table management for efficient seating and order tracking
8. Enable kitchen and bartender order routing for seamless operations
9. Support time-based pricing with happy hour promotions
10. Provide automated event-based offers for customer retention

---

## Phase 1: Foundation & Architecture Setup
### Goal
Establish the technical foundation and database architecture that will support all system functionality. This phase creates the backbone for scalability, security, and multi-user operations.

### Modules & Features

#### 1.1 Database Architecture Design
**Purpose**: Create a normalized, scalable database schema that handles complex relationships between products, orders, inventory, users, and customers.

**Key Components**:
- **Users Table**: Store cashier/admin accounts with encrypted passwords, roles, permissions, and login credentials
- **Products Table**: Master catalog of all beverages (beer, liquor, soft drinks) and pulutan items with SKUs, base prices, categories, and active/inactive status
- **Product Categories**: Hierarchical categorization (Beverages > Beer > Local/Imported, Food > Pulutan > Fried/Grilled)
- **Product Add-ons**: Separate table for modifiers like extra rice, extra egg, sauces with individual pricing
- **Inventory Table**: Current stock levels, reorder points, unit costs, supplier information, and stock movement history
- **Customers Table**: Customer profiles with loyalty tier (Regular/VIP), contact information, purchase history
- **Orders Table**: Transaction records with order number, timestamp, cashier ID, customer ID, subtotal, tax, total, payment method, status
- **Order Items**: Line items linking orders to products with quantity, unit price, add-ons applied, discounts
- **Packages Table**: VIP package definitions with package name, included items, custom pricing, validity period
- **Sales Reports**: Aggregated data tables for quick reporting (daily summaries, product performance, cashier metrics)
- **Audit Logs**: Complete activity tracking for inventory adjustments, price changes, voided transactions

**Database Relationships**:
- One-to-Many: Users → Orders, Customers → Orders, Orders → Order Items, Products → Order Items
- Many-to-Many: Products ↔ Add-ons (junction table), Packages ↔ Products (junction table)

**Testable Outcomes**:
- Database schema successfully creates all tables with proper constraints
- Sample data insertion for 50+ products, 5 users, 20 customers runs without errors
- Query performance test: Retrieve order history for a customer (<100ms)
- Relationship integrity test: Cascade deletes and foreign key constraints work correctly

#### 1.2 Web Application Framework Setup
**Purpose**: Establish the web server, application structure, and development environment that will host the system.

**Technical Stack Decisions**:
- **Backend Framework**: Node.js with Express.js OR Python with Django/Flask OR PHP with Laravel
- **Database**: PostgreSQL (for reliability and complex queries) OR MySQL
- **Frontend Framework**: React.js for dynamic UI OR Vue.js for simpler learning curve
- **Authentication**: JWT (JSON Web Tokens) for session management
- **API Architecture**: RESTful API design for frontend-backend communication

**Security Foundation**:
- HTTPS/SSL certificate implementation for encrypted data transmission
- Password hashing using bcrypt or Argon2
- SQL injection prevention through parameterized queries
- CORS (Cross-Origin Resource Sharing) configuration
- Rate limiting on API endpoints to prevent abuse
- Environment variables for sensitive configuration (database credentials, API keys)

**Testable Outcomes**:
- Web server starts successfully and serves a "Hello World" page
- Database connection established and verified through health check endpoint
- HTTPS certificate properly installed and redirects HTTP to HTTPS
- User authentication endpoint accepts credentials and returns valid JWT token
- Protected route successfully rejects requests without valid token

#### 1.3 User Authentication & Authorization System
**Purpose**: Implement secure login and role-based access control to ensure only authorized personnel can access specific features.

**User Roles**:
- **Admin**: Full system access including user management, inventory adjustments, sales reports, system settings
- **Manager**: Access to reports, inventory viewing, order management, but cannot modify users or system settings
- **Cashier**: POS interface access, order creation, customer lookup, limited inventory viewing

**Features**:
- Login page with username/password authentication
- Session management with auto-logout after 30 minutes of inactivity
- "Remember Me" option for trusted devices (30-day token)
- Permission checking middleware on every protected route
- Password change functionality (require old password verification)
- Admin ability to reset user passwords
- Activity logging: timestamp, user ID, action performed, IP address

**Testable Outcomes**:
- Successful login redirects to appropriate dashboard based on role
- Failed login shows error message and logs attempt
- Cashier account cannot access admin or manager routes (403 Forbidden)
- Session expires after inactivity period and requires re-login
- Password change updates database and invalidates old sessions
- Audit log correctly records user login, logout, and critical actions

---

## Phase 2: Core POS Functionality

### Goal
Build the primary transaction interface that cashiers will use daily. This must be fast, intuitive, and error-resistant for high-volume service environments.

### Modules & Features

#### 2.1 POS Interface Design
**Purpose**: Create an optimized user interface for rapid order entry during busy pub hours.

**Interface Layout**:
- **Left Panel**: Product grid with large, tappable buttons organized by category (beer, spirits, pulutan)
- **Center Panel**: Current order summary showing line items, quantities, item prices, subtotal
- **Right Panel**: Customer search, payment processing, order actions (void, hold, complete)
- **Top Bar**: Current cashier name, clock, logout button, active table/order number
- **Bottom Bar**: Quick access to common functions (hold order, search product, call manager)

**UX Considerations**:
- Large touch-friendly buttons (minimum 60x60px) for tablet/touchscreen use
- Color-coded categories for quick visual navigation
- Keyboard shortcuts for experienced cashiers (F1-F12 for top products)
- Search bar with autocomplete for finding products quickly
- Visual feedback on button clicks (ripple effect, color change)
- Responsive design that works on tablets, laptops, and desktop screens

**Testable Outcomes**:
- Interface loads in under 2 seconds on standard network connection
- Product buttons respond immediately to clicks (<100ms delay)
- Order summary updates in real-time as items are added
- Category filtering displays correct products without page reload
- Search functionality returns results within 500ms
- Interface remains usable on 10" tablet screen with no horizontal scrolling

#### 2.2 Product Selection & Order Building
**Purpose**: Enable quick, accurate order creation with support for product variations and add-ons.

**Core Functionality**:
- Click product button to add to order (default quantity: 1)
- Quantity adjustment: +/- buttons or direct number input
- Product variants: Size selection for beverages (bottle, pitcher, bucket)
- Add-ons modal: Pop-up when adding pulutan items to select extras
- Multiple add-ons per item: Extra rice + Extra egg on one sisig order
- Add-on price calculation: Automatically adds modifier costs to line item
- Order notes: Free-text field for special requests ("no onions", "extra spicy")
- Item removal: Tap item in order list to delete or reduce quantity
- Order modification: Edit existing line items before payment

**Add-ons System Details**:
- Each pulutan item can have associated add-ons defined in database
- Add-ons have individual prices (e.g., Extra Rice: ₱20, Extra Egg: ₱15)
- Multiple instances of same add-on allowed (Extra Egg x2)
- Add-ons display clearly in order summary: "Sisig + Extra Rice + Extra Egg"
- Receipt printing shows base item price and add-on prices separately

**Testable Outcomes**:
- Adding 10 different products to order completes in under 30 seconds
- Add-on modal displays all available options for selected pulutan item
- Multiple add-ons apply correctly with accurate price calculation
- Order subtotal updates immediately when add-ons are selected
- Removing an item with add-ons removes entire line item from order
- Order notes save correctly and display in order summary

#### 2.3 Table Management & Assignment
**Purpose**: Enable efficient table tracking and assignment to orders for better service coordination.

**Features**:
- **Table Grid View**: Visual representation of all tables with status indicators
- **Table Status Management**: Available, Occupied, Reserved, Cleaning
- **Table Assignment**: Assign table to order during order creation
- **Table Details**: Table number, area (indoor/outdoor/VIP/bar), capacity, notes
- **Multi-Table Orders**: Support for merged tables for large groups
- **Table Transfer**: Move orders between tables
- **Quick Table Status Toggle**: One-click to change table availability

**Visual Indicators**:
- Green: Available for seating
- Red: Occupied with active order
- Yellow: Reserved for upcoming customers
- Gray: Cleaning/maintenance

**Testable Outcomes**:
- Table grid displays all tables with accurate status
- Assigning table to order updates table status to "occupied"
- Completing payment automatically sets table to "available" or "cleaning"
- Table transfer moves order successfully without data loss
- Visual indicators update in real-time across all POS terminals
- Table history shows all orders served at specific table

#### 2.4 Customer Lookup & Selection
**Purpose**: Associate orders with customers to track purchase history, apply VIP pricing, and enable loyalty programs.

**Features**:
- **Quick Search**: Search by name, phone number, or customer ID
- **New Customer Registration**: Fast form to add walk-in customers (name, phone, optional email, birth date, anniversary date)
- **Customer Details Display**: Show VIP status, loyalty points, previous visit date, upcoming events
- **Anonymous Orders**: Option to proceed without customer assignment (walk-ins who decline registration)
- **Customer History**: One-click access to past orders when customer is selected
- **VIP Badge**: Visual indicator (gold star, crown icon) when VIP customer is selected
- **Event Badges**: Show birthday/anniversary badges when applicable

**VIP Integration**:
- System automatically detects VIP status from customer record
- VIP pricing applied automatically to applicable products
- Package options appear when VIP customer is selected
- Order screen shows VIP discount amount before payment
- Automatic event offer suggestions based on customer events

**Testable Outcomes**:
- Customer search returns results in under 1 second
- Selecting customer populates order header with name and status
- New customer registration adds record to database and immediately selects customer
- VIP customer selection triggers pricing adjustment on eligible products
- Anonymous order processes successfully without customer record
- Customer history displays last 5 orders with dates and totals
- Event offers display automatically when customer has active offer

#### 2.5 Payment Processing
**Purpose**: Complete transactions efficiently while supporting multiple payment methods and generating proper documentation.

**Payment Methods Supported**:
- Cash: Input amount tendered, calculate change automatically
- Credit/Debit Card: Manual entry of last 4 digits for record-keeping
- E-wallet (GCash, PayMaya): Transaction reference number input
- Bank Transfer: Reference number and bank name
- Split Payment: Combine multiple payment methods for one order (50% cash, 50% card)

**Payment Flow**:
1. Display order total prominently
2. Cashier selects payment method
3. For cash: Number pad to enter amount tendered
4. System calculates change due
5. Option to add tip amount
6. Confirm payment button
7. Generate receipt and order number
8. Print receipt to kitchen and customer
9. Inventory automatically deducted
10. Order saved to database with payment details

**Validation & Error Handling**:
- Cash payment cannot be less than order total
- Split payment total must equal order total exactly
- Confirm dialog for large transactions (over ₱5,000)
- Manager approval required for voided transactions
- Failed payment detection with retry option

**Testable Outcomes**:
- Cash payment with exact amount processes in under 5 seconds
- Cash payment correctly calculates change for any tendered amount
- Split payment interface allows multiple payment methods with running total
- Payment confirmation updates order status from "pending" to "completed"
- Inventory deduction occurs immediately after successful payment


#### 2.6 Kitchen & Bartender Order Routing
**Purpose**: Automatically route order items to kitchen or bartender stations for preparation, with real-time status tracking.

**Core Functionality**:
- **Automatic Routing**: System automatically determines destination based on product category (Food ? Kitchen, Beverages ? Bartender)
- **Order Ticket Generation**: Automatically print/display order tickets at assigned stations
- **Status Tracking**: Track order item status (Pending ? Preparing ? Ready ? Served)
- **Priority Management**: Mark urgent orders, automatic FIFO queue management

**Kitchen/Bartender Display System**:
- **Active Orders View**: List of all pending and preparing items
- **Order Details**: Table number, order time, quantity, special instructions
- **Status Update Interface**: One-tap to update item status
- **Ready Notification**: Alert cashier when items are ready for serving

**Testable Outcomes**:
- Food items automatically route to kitchen display within 1 second
- Beverage items automatically route to bartender display within 1 second
- Order tickets display correct table number, items, and special instructions
- Status updates reflect across all terminals in real-time
- Kitchen staff can update status without accessing POS terminal

---

## Phase 3: Inventory Management System

### Goal
Implement comprehensive inventory tracking that automatically updates with sales, alerts for low stock, and enables manual adjustments with audit trails.

### Modules & Features

#### 3.1 Inventory Dashboard
**Purpose**: Provide real-time visibility into stock levels across all products with actionable insights.

**Dashboard Components**:
- **Stock Level Summary**: 
  - Total products, items in stock, low stock alerts, out of stock count
- **Critical Alerts Section**: Products below reorder point highlighted in red
- **Category Overview**: Stock value by category (beverages, food, supplies)
- **Recent Stock Movements**: Last 10 inventory changes with user who made the change
- **Quick Actions**: Buttons for stock adjustment, receive shipment, generate stock report

**Visual Indicators**:
- Green: Adequate stock (above reorder point + buffer)
- Yellow: Low stock (at or below reorder point)
- Red: Out of stock or critically low
- Gray: Inactive/discontinued products

**Testable Outcomes**:
- Dashboard loads all stock data in under 3 seconds
- Low stock alerts display only products below defined reorder point
- Stock value calculations match manual calculation of quantity × unit cost
- Recent movements display correct user, timestamp, and quantity change
- Clicking product in dashboard navigates to detailed product view

#### 3.2 Real-Time Inventory Tracking
**Purpose**: Maintain accurate stock counts through automatic deduction at point of sale and manual adjustment capabilities.

**Automatic Deduction**:
- Inventory decrements immediately when order payment is completed
- Multi-ingredient products deduct all components (e.g., sisig: 200g pork, 1 egg, 50g onions)
- Package sales deduct all included items
- Failed payment or voided order returns inventory to stock
- Transaction-based updates prevent race conditions in high-volume scenarios

**Manual Adjustments**:
- **Stock In**: Receive new shipments with supplier reference, invoice number, date received
- **Stock Out**: Waste, spillage, theft, expired products with reason codes
- **Stock Transfer**: Move inventory between storage locations (bar, kitchen, storage room)
- **Physical Count**: Adjust to actual counted quantity with variance reporting
- **Adjustment Reason**: Required field with predefined options (Damaged, Expired, Theft, Count Correction)

**Audit Trail**:
- Every inventory change logged with: timestamp, user ID, product ID, previous quantity, new quantity, change type, reason, notes
- Immutable log (no deletion, only new correcting entries)
- Manager approval required for adjustments over threshold (e.g., 10% of stock)

**Testable Outcomes**:
- Completing a sale immediately reduces inventory count by correct amount
- Voiding an order returns inventory quantities to previous state
- Manual stock adjustment creates audit log entry with all required fields
- Manager-level adjustments over threshold require approval before saving
- Inventory movement report accurately reflects all deductions and additions over date range
- Concurrent sales of same product handle correctly without overselling

#### 3.3 Low Stock Alerts & Reorder Management
**Purpose**: Prevent stockouts through proactive notifications and streamlined reorder process.

**Alert System**:
- **Reorder Point**: Minimum quantity threshold before alert triggers (set per product)
- **Alert Methods**: In-app notification badge, email to manager, dashboard alert banner
- **Alert Frequency**: Daily digest of all low-stock items (prevent spam)
- **Product Grouping**: Alerts grouped by supplier for efficient ordering

**Reorder Calculation**:
- **Reorder Point Formula**: (Average Daily Sales × Lead Time Days) + Safety Stock
- **Automatic Suggestions**: System suggests reorder quantity based on sales velocity
- **Seasonal Adjustments**: Manual override for events, holidays, slow seasons
- **Supplier Lead Time**: Configurable per supplier (3 days, 1 week, 2 weeks)

**Reorder Workflow**:
1. Low stock alert appears on dashboard
2. Manager reviews suggested reorder quantity
3. Adjust quantity if needed based on upcoming events
4. Generate purchase order with supplier details
5. Export/print PO for submission to supplier
6. Mark PO as "Ordered" with expected delivery date
7. When shipment arrives, process "Stock In" against PO
8. System matches received quantity to PO and flags discrepancies

**Testable Outcomes**:
- Alert triggers when product quantity reaches or falls below reorder point
- Alert notification displays on manager dashboard within 1 minute
- Reorder suggestion calculates correctly based on sales velocity and lead time
- Purchase order generation includes all necessary details (product, quantity, supplier, date)
- Stock In process correctly references PO and updates inventory
- Discrepancy report highlights differences between ordered and received quantities

#### 3.4 Product Management
**Purpose**: Enable full lifecycle management of products including creation, pricing, categorization, and deactivation.

**Product Creation**:
- Basic Details: Product name, SKU/barcode, category, subcategory
- Pricing: Base price, VIP price, cost price, markup percentage
- Inventory: Initial stock quantity, unit of measure, reorder point, reorder quantity
- Attributes: Size, variant, alcohol percentage, supplier
- Images: Product photo for POS display
- Status: Active/Inactive toggle

**Pricing Management**:
- **Regular Price**: Standard price for all customers
- **VIP Price**: Discounted price for VIP customers (can be fixed price or percentage off)
- **Happy Hour Price**: Time-based pricing (e.g., 3-6 PM weekdays)
- **Bulk Pricing**: Volume discounts (buy 5 beers, get 10% off)
- **Price History**: Log all price changes with effective date and user who changed it

**Category Management**:
- Create hierarchical categories (Main > Sub > Item)
- Assign category colors for POS visual organization
- Reorder categories for optimal POS layout
- Set category-wide discounts for promotions

**Testable Outcomes**:
- New product creation saves all fields correctly to database
- Product appears in POS interface within 30 seconds of creation
- VIP pricing applies automatically when VIP customer is selected
- Price change logs correctly in price history table
- Inactive products do not appear in POS but remain in historical reports
- Product image upload and display works for common formats (JPG, PNG)

---

## Phase 4: Package & VIP Management

### Goal
Implement flexible package system for VIP customers with custom pricing, inclusion management, and special transaction handling.

### Modules & Features

#### 4.1 VIP Customer Management
**Purpose**: Differentiate premium customers with special privileges, pricing, and tracking.

**VIP Registration**:
- Upgrade existing customer to VIP status
- VIP membership number generation
- Membership start date and expiration date
- Membership tier (Silver, Gold, Platinum) with different benefits
- Required fields: Name, contact, ID verification (optional)
- Membership fee payment recording

**VIP Benefits Configuration**:
- **Discount Levels**: Percentage off regular prices (10%, 15%, 20%)
- **Package Access**: Only VIPs can purchase certain packages
- **Priority Service**: Flag for expedited orders
- **Loyalty Points**: Earn points at higher rate (2x, 3x)
- **Exclusive Products**: Access to premium or limited items
- **Free Items**: Complimentary items per visit (free appetizer, welcome drink)

**VIP Status Management**:
- Manual upgrade/downgrade by admin
- Automatic expiration based on membership period
- Renewal reminders (email/SMS 30 days before expiry)
- Suspension for policy violations
- Status history log

**Testable Outcomes**:
- Customer upgraded to VIP receives all applicable discounts immediately
- VIP badge displays prominently in customer lookup and order screen
- VIP-exclusive packages appear only when VIP customer is selected
- Expired VIP status reverts customer to regular pricing automatically
- VIP customer count report matches database query result
- VIP benefits apply correctly across all product categories

#### 4.2 Package Definition & Configuration
**Purpose**: Create customizable product bundles with special pricing for VIP offerings and promotions.

**Package Components**:
- **Package Name**: Display name for POS (e.g., "Ultimate Beer Bucket", "Executive Night Package")
- **Package Code**: Unique identifier for reporting
- **Description**: What's included and special terms
- **Package Type**: VIP-only, Regular, Promotional
- **Validity Period**: Start and end dates for seasonal packages
- **Included Items**: List of products with quantities (6 beers + 2 pulutan + 1 pitcher water)
- **Base Price**: Package price (typically less than sum of individual items)
- **VIP Price**: Further discounted price for VIP customers

**Package Configuration Options**:
- **Fixed Items**: Specific products that cannot be substituted
- **Choice Items**: Customer can choose from options (Choose 2 pulutan from: Sisig, Calamares, Wings)
- **Add-on Eligible**: Can customer add extra items at regular price?
- **Quantity Limits**: Maximum packages per transaction
- **Time Restrictions**: Available only during specific hours/days

**Package Pricing Strategies**:
- Fixed bundle price regardless of selections
- Percentage discount off total individual prices
- Tiered pricing (price decreases with larger package)
- Member-exclusive pricing

**Testable Outcomes**:
- New package creation saves all items and pricing correctly
- Package appears in POS under "Packages" section when criteria met
- Selecting package adds all included items to order at package price
- Choice items display selection modal with available options
- Package price correctly calculates based on fixed or percentage strategy
- Inventory deducts all package components upon sale completion
- Expired packages automatically hide from POS interface

#### 4.3 Package Transaction Processing
**Purpose**: Handle the unique workflow of package sales including item selection, pricing, and inventory impact.

**Transaction Flow**:
1. Cashier selects customer (must be VIP for VIP packages)
2. Cashier clicks package button in POS
3. If package has choice items, modal displays options
4. Customer makes selections within package rules
5. Package adds to order as single line item with expanded view of contents
6. Base package price applies; additional items outside package add separately
7. Payment processed as normal transaction
8. Inventory deducts all package components
9. Receipt clearly shows package name and included items

**Package Display in Order**:
```
Executive Night Package - ₱2,500.00
  ├─ 6x San Miguel Light (Included)
  ├─ 2x Sisig (Included)
  ├─ 1x Pitcher Water (Included)
  └─ Extra: 1x Extra Rice - ₱20.00

Package Subtotal: ₱2,520.00
```

**Inventory Handling**:
- Each component of package deducts from inventory separately
- If any component is out of stock, alert before allowing package sale
- Option to substitute out-of-stock item with manager approval
- Package sale recorded in reports as both package and individual items

**Testable Outcomes**:
- VIP package button only appears/enables when VIP customer is selected
- Choice item modal displays correct options with visual indicators
- Package price overrides sum of individual item prices
- All package components deduct from inventory correctly
- Out-of-stock component prevents package sale with clear error message
- Receipt generation formats package items hierarchically
- Package sales appear correctly in sales reports with both package name and components

#### 4.4 Custom VIP Transaction Pricing
**Purpose**: Enable on-the-fly pricing adjustments and special rates for VIP customers by manager authorization.

**Dynamic Pricing Features**:
- **Line Item Discount**: Reduce price of individual product for specific customer
- **Percentage Discount**: Apply percentage off entire order
- **Fixed Discount**: Subtract fixed amount from order total
- **Manager Override Price**: Set custom price for any item (requires manager PIN)
- **Complimentary Items**: Mark items as free/comped with reason code
- **Negotiated Rate**: Save custom pricing for specific VIP customer for future orders

**Authorization & Audit**:
- Manager-level authentication required for discounts over threshold (e.g., 20%)
- Discount reason required (Loyalty Reward, Service Recovery, Special Event, VIP Courtesy)
- Complete audit log: cashier ID, manager ID who approved, discount amount, reason, timestamp
- Daily discount report for management review
- Fraud detection: Alert if same cashier/manager combo exceeds discount frequency threshold

**Use Cases**:
- Long-time VIP customer negotiates special rate for large booking
- Service recovery: Comp drinks for table with issue
- Corporate client with pre-negotiated volume pricing
- Promotional rate for soft opening or special event
- Influencer or media guest courtesy discount

**Testable Outcomes**:
- Line item price override requires manager PIN before saving
- Discount reason selection is mandatory and saves to transaction record
- Discount amount correctly reduces order total and displays on receipt
- Audit log captures both cashier and manager IDs for oversized discounts
- Discount report accurately sums all discounts by cashier, manager, and reason
- Complimentary item still deducts inventory but shows ₱0.00 price

---

## Phase 5: Sales Reporting & Analytics

### Goal
Provide comprehensive business intelligence through detailed reports that support decision-making, identify trends, and enable performance tracking.

### Modules & Features

#### 5.1 Daily Sales Summary
**Purpose**: Give managers end-of-day snapshot of business performance with key metrics and trends.

**Report Contents**:
- **Sales Overview**: 
  - Total revenue (gross sales)
  - Number of transactions
  - Average transaction value
  - Total items sold
  - Comparison to previous day (% change)
- **Payment Breakdown**: 
  - Cash sales amount and count
  - Card sales amount and count
  - E-wallet sales amount and count
  - Split payment transactions
- **Product Performance**: 
  - Top 10 selling products by quantity
  - Top 10 selling products by revenue
  - Slow-moving items (no sales today)
- **Hourly Sales Distribution**: 
  - Bar chart showing sales by hour
  - Peak hours identification
  - Slowest periods
- **Discounts & Adjustments**: 
  - Total discounts given
  - Voided transactions
  - Complimentary items value
- **Cashier Performance**: 
  - Sales by cashier
  - Transactions per cashier
  - Average transaction time

**Report Generation**:
- Auto-generated at end of business day (configurable time, e.g., 3 AM)
- Manual generation for any date range
- Export to PDF for printing/email
- Export to Excel for further analysis
- Email delivery to management team

**Testable Outcomes**:
- Report generates all sections with accurate data matching database queries
- Report generation completes within 10 seconds for typical day (500 transactions)
- PDF export maintains proper formatting and is readable
- Excel export includes all data with proper column headers
- Email delivery sends successfully to configured recipients
- Date range filter correctly limits data to selected period

#### 5.2 Product Performance Analytics
**Purpose**: Analyze individual product and category performance to optimize inventory and pricing strategies.

**Metrics & Analysis**:
- **Sales Velocity**: 
  - Units sold per day
  - Revenue contribution percentage
  - Trend over time (increasing/decreasing/stable)
- **Profitability Analysis**: 
  - Cost per unit vs. selling price
  - Gross margin per product
  - Total profit contribution
- **Stock Turnover Rate**: 
  - Inventory turns = Sales / Average Inventory
  - Days to sell current stock
  - Comparison to category average
- **Seasonal Patterns**: 
  - Sales comparison by month
  - Weekday vs. weekend performance
  - Special event impact
- **Customer Preference**: 
  - Most added to orders
  - Highest cancellation/return rate
  - Frequently bought together (bundling opportunities)

**Report Views**:
- Individual product detail page with full metrics
- Category comparison table
- Best performers dashboard
- Worst performers alert list
- Custom product grouping for promotions analysis

**Actionable Insights**:
- "Increase stock of [product] - high velocity, frequent stockouts"
- "Consider discontinuing [product] - low sales, high stock cost"
- "Bundle [product A] with [product B] - 65% co-purchase rate"
- "Adjust [product] price - margin below target"

**Testable Outcomes**:
- Product detail page displays all metrics correctly for selected product
- Sales velocity calculation matches manual calculation (total sales / days)
- Profitability percentages calculate correctly (margin = (price - cost) / price)
- Stock turnover rate updates when inventory or sales change
- Frequently bought together analysis shows valid product pairs
- Report export includes all products with complete data

#### 5.3 Financial Reports
**Purpose**: Provide accounting and financial data for bookkeeping, tax compliance, and business analysis.

**Report Types**:

**1. Revenue Report**:
- Daily/weekly/monthly/yearly revenue totals
- Revenue by payment method
- Revenue by product category
- Tax collected (if applicable)
- Net revenue after discounts

**2. Expense Tracking** (if integrated):
- Inventory purchases
- Operating expenses
- Cost of goods sold
- Net profit calculation

**3. Cash Flow Report**:
- Opening cash balance
- Cash sales received
- Cash payouts (refunds, expenses)
- Closing cash balance
- Expected vs. actual cash (overage/shortage)

**4. Tax Reports**:
- Taxable sales
- Tax-exempt sales
- Sales tax collected by rate
- Summary for tax filing

**5. Profit & Loss Statement**:
- Total revenue
- Cost of goods sold
- Gross profit
- Operating expenses
- Net profit/loss
- Period-over-period comparison

**Compliance Features**:
- Date range selection for any period
- Detailed transaction drill-down
- Audit-ready formatting
- Secure archiving of historical reports
- Export in accounting software formats (CSV, QuickBooks)

**Testable Outcomes**:
- Revenue totals match sum of all completed transactions for period
- Payment method breakdown equals total revenue
- Cash flow report identifies discrepancies (overage/shortage) correctly
- Tax calculations apply correct rates to applicable items
- P&L statement calculates net profit correctly (revenue - COGS - expenses)
- Report export includes all transactions with complete details

#### 5.4 Customer Analytics & Insights
**Purpose**: Understand customer behavior, loyalty, and value to improve marketing and service strategies.

**Customer Metrics**:
- **Total Customers**: Active customer count
- **New Customers**: Registrations this period
- **Returning Customers**: Customers with multiple visits
- **Customer Lifetime Value (CLV)**: Total spent per customer
- **Average Order Value by Customer**: Spending per visit
- **Visit Frequency**: Average days between visits
- **Churn Rate**: Customers who haven't visited in X days

**Segmentation Analysis**:
- **VIP vs. Regular**: Compare spending, frequency, preferences
- **High-Value Customers**: Top 20% by CLV
- **At-Risk Customers**: Previously frequent, now inactive
- **Occasional Visitors**: Low frequency but high value per visit

**Behavioral Insights**:
- Most ordered products by customer segment
- Peak visit times by customer type
- Package adoption rate among VIPs
- Loyalty program effectiveness

**Marketing Use Cases**:
- Identify customers for targeted promotions
- Re-engagement campaigns for inactive customers
- VIP upgrade candidates (high-spending regulars)
- Thank you campaigns for top customers

**Testable Outcomes**:
- Customer count matches unique customer IDs in database
- CLV calculation correctly sums all transactions per customer
- Churn rate identifies customers without visits for defined period
- Segmentation groups contain non-overlapping customer sets
- Top customers report shows highest spenders accurately
- Export includes customer contact info for marketing outreach (privacy compliant)
---

**Document Version**: 1.0  
**Last Updated**: October 2025  
**Next Review**: Upon completion of Phase 1
