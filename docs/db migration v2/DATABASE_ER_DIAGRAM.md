# BeerHive Database - Entity Relationship Diagram

## Visual Overview

This document provides visual representations of the database schema using Mermaid diagrams.

---

## Core System Architecture

```mermaid
graph TB
    subgraph "User Management"
        Users[👥 users<br/>5 rows]
    end
    
    subgraph "Product Catalog"
        Products[🍺 products]
        Categories[📁 product_categories]
        Addons[➕ product_addons]
        Packages[📦 packages]
        
        Categories -->|parent_category_id| Categories
        Products -->|category_id| Categories
        Products -.->|associations| Addons
        Packages -.->|package_items| Products
    end
    
    subgraph "Customer Management"
        Customers[👤 customers]
        Events[🎂 customer_events]
        
        Events -->|customer_id| Customers
    end
    
    subgraph "Table & Sessions"
        Tables[🪑 restaurant_tables]
        Sessions[📋 order_sessions<br/>2 active]
        
        Tables -->|current_session_id| Sessions
        Sessions -->|table_id| Tables
    end
    
    subgraph "Order Processing"
        CurrentOrders[🛒 current_orders<br/>Active]
        Orders[✅ orders<br/>Completed]
        Kitchen[👨‍🍳 kitchen_orders]
        
        CurrentOrders -.->|complete| Orders
        Orders -->|generates| Kitchen
    end
    
    subgraph "Notifications"
        Notifs[🔔 notifications]
    end
    
    Users -->|cashier_id| CurrentOrders
    Users -->|cashier_id| Orders
    Users -->|assigned_to| Kitchen
    Customers -->|customer_id| Orders
    Customers -->|customer_id| Sessions
    Products -->|product_id| Orders
    Tables -->|table_id| Orders
    Sessions -->|session_id| Orders
    Orders -.->|triggers| Notifs
    Kitchen -.->|triggers| Notifs
    Products -.->|triggers| Notifs
```

---

## Complete Entity Relationship Diagram

### Legend
- **Solid lines** → Direct foreign key relationships
- **Dashed lines** → Indirect or trigger-based relationships
- **Numbers in parentheses** → Current row count

---

## 1. User & Authentication Module

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar full_name
        user_role role
        user_role_array roles
        varchar manager_pin
        boolean is_active
        timestamptz last_login
        timestamptz created_at
        timestamptz updated_at
    }
    
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar table_name
        uuid record_id
        jsonb old_values
        jsonb new_values
        inet ip_address
        text user_agent
        timestamptz created_at
    }
    
    USERS ||--o{ AUDIT_LOGS : "performs"
```

---

## 2. Product Management Module

```mermaid
erDiagram
    PRODUCT_CATEGORIES {
        uuid id PK
        varchar name
        text description
        uuid parent_category_id FK
        boolean is_active
        integer display_order
        timestamptz created_at
        timestamptz updated_at
    }
    
    PRODUCTS {
        uuid id PK
        varchar sku UK
        varchar name
        text description
        uuid category_id FK
        decimal regular_price
        decimal vip_price
        varchar unit_of_measure
        decimal current_stock
        decimal reorder_point
        boolean is_active
        boolean is_featured
        text image_url
        timestamptz created_at
        timestamptz updated_at
    }
    
    PRODUCT_ADDONS {
        uuid id PK
        varchar name
        text description
        decimal price
        boolean is_active
        timestamptz created_at
    }
    
    PRODUCT_ADDON_ASSOCIATIONS {
        uuid product_id FK
        uuid addon_id FK
        boolean is_default
        timestamptz created_at
    }
    
    PACKAGES {
        uuid id PK
        varchar package_code UK
        varchar name
        text description
        package_type type
        decimal regular_price
        decimal vip_price
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    
    PACKAGE_ITEMS {
        uuid id PK
        uuid package_id FK
        uuid product_id FK
        decimal quantity
        timestamptz created_at
    }
    
    PRICE_HISTORY {
        uuid id PK
        uuid product_id FK
        decimal old_regular_price
        decimal new_regular_price
        decimal old_vip_price
        decimal new_vip_price
        date effective_date
        uuid changed_by FK
        text reason
        timestamptz created_at
    }
    
    PRODUCT_CATEGORIES ||--o{ PRODUCT_CATEGORIES : "parent_category"
    PRODUCT_CATEGORIES ||--o{ PRODUCTS : "contains"
    PRODUCTS ||--o{ PRODUCT_ADDON_ASSOCIATIONS : "has"
    PRODUCT_ADDONS ||--o{ PRODUCT_ADDON_ASSOCIATIONS : "available_for"
    PRODUCTS ||--o{ PACKAGE_ITEMS : "included_in"
    PACKAGES ||--o{ PACKAGE_ITEMS : "contains"
    PRODUCTS ||--o{ PRICE_HISTORY : "price_changes"
```

---

## 3. Customer Management Module

```mermaid
erDiagram
    CUSTOMERS {
        uuid id PK
        varchar customer_number UK
        varchar vip_membership_number UK
        varchar full_name
        varchar email
        varchar phone
        customer_tier tier
        date birth_date
        date anniversary_date
        text address
        text notes
        integer total_visits
        decimal total_spent
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    
    CUSTOMER_EVENTS {
        uuid id PK
        uuid customer_id FK
        event_type type
        date event_date
        varchar event_name
        text notes
        boolean is_redeemed
        timestamptz redeemed_at
        text offer_details
        decimal offer_discount_percentage
        date offer_valid_from
        date offer_valid_until
        timestamptz created_at
        timestamptz updated_at
    }
    
    CUSTOMERS ||--o{ CUSTOMER_EVENTS : "has"
```

---

## 4. Table & Session Management Module

```mermaid
erDiagram
    RESTAURANT_TABLES {
        uuid id PK
        varchar table_number UK
        varchar area
        integer capacity
        table_status status
        uuid current_session_id FK
        boolean is_active
        text notes
        timestamptz created_at
        timestamptz updated_at
    }
    
    ORDER_SESSIONS {
        uuid id PK
        varchar session_number UK
        uuid table_id FK
        uuid customer_id FK
        decimal subtotal
        decimal discount_amount
        decimal tax_amount
        decimal total_amount
        session_status status
        timestamptz opened_at
        timestamptz closed_at
        uuid opened_by FK
        uuid closed_by FK
        text notes
        timestamptz created_at
        timestamptz updated_at
    }
    
    RESTAURANT_TABLES ||--o| ORDER_SESSIONS : "current_session"
    ORDER_SESSIONS }o--|| RESTAURANT_TABLES : "at_table"
    ORDER_SESSIONS }o--|| CUSTOMERS : "for_customer"
    ORDER_SESSIONS }o--|| USERS : "opened_by"
    ORDER_SESSIONS }o--|| USERS : "closed_by"
```

---

## 5. Order Processing Module (Current Orders)

```mermaid
erDiagram
    CURRENT_ORDERS {
        uuid id PK
        uuid cashier_id FK
        uuid customer_id FK
        uuid table_id FK
        decimal subtotal
        decimal discount_amount
        decimal tax_amount
        decimal total_amount
        uuid applied_event_offer_id FK
        text order_notes
        boolean is_on_hold
        timestamptz created_at
        timestamptz updated_at
    }
    
    CURRENT_ORDER_ITEMS {
        uuid id PK
        uuid current_order_id FK
        uuid product_id FK
        uuid package_id FK
        varchar item_name
        decimal quantity
        decimal unit_price
        decimal subtotal
        decimal discount_amount
        decimal total
        boolean is_vip_price
        boolean is_complimentary
        text notes
        timestamptz created_at
    }
    
    CURRENT_ORDER_ITEM_ADDONS {
        uuid id PK
        uuid current_order_item_id FK
        uuid addon_id FK
        varchar addon_name
        decimal addon_price
        integer quantity
        timestamptz created_at
    }
    
    CURRENT_ORDERS ||--o{ CURRENT_ORDER_ITEMS : "contains"
    CURRENT_ORDER_ITEMS ||--o{ CURRENT_ORDER_ITEM_ADDONS : "has"
    CURRENT_ORDERS }o--|| USERS : "created_by"
    CURRENT_ORDERS }o--o| CUSTOMERS : "for"
    CURRENT_ORDERS }o--o| RESTAURANT_TABLES : "at"
    CURRENT_ORDER_ITEMS }o--o| PRODUCTS : "references"
    CURRENT_ORDER_ITEMS }o--o| PACKAGES : "references"
    CURRENT_ORDER_ITEM_ADDONS }o--o| PRODUCT_ADDONS : "references"
```

---

## 6. Order Processing Module (Completed Orders)

```mermaid
erDiagram
    ORDERS {
        uuid id PK
        varchar order_number UK
        uuid session_id FK
        uuid cashier_id FK
        uuid customer_id FK
        uuid table_id FK
        decimal subtotal
        decimal discount_amount
        decimal tax_amount
        decimal total_amount
        payment_method payment_method
        decimal amount_tendered
        decimal change_amount
        order_status status
        uuid applied_event_offer_id FK
        text order_notes
        text void_reason
        timestamptz voided_at
        uuid voided_by FK
        timestamptz completed_at
        timestamptz created_at
        timestamptz updated_at
    }
    
    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        uuid package_id FK
        varchar item_name
        decimal quantity
        decimal unit_price
        decimal subtotal
        decimal discount_amount
        decimal total
        boolean is_vip_price
        boolean is_complimentary
        text notes
        timestamptz created_at
    }
    
    ORDER_ITEM_ADDONS {
        uuid id PK
        uuid order_item_id FK
        uuid addon_id FK
        varchar addon_name
        decimal addon_price
        integer quantity
        timestamptz created_at
    }
    
    KITCHEN_ORDERS {
        uuid id PK
        uuid order_id FK
        uuid order_item_id FK
        order_destination destination
        varchar item_name
        decimal quantity
        text special_instructions
        kitchen_order_status status
        uuid assigned_to FK
        integer priority
        timestamptz started_at
        timestamptz completed_at
        timestamptz created_at
        timestamptz updated_at
    }
    
    SPLIT_PAYMENTS {
        uuid id PK
        uuid order_id FK
        payment_method method
        decimal amount
        varchar reference_number
        timestamptz created_at
    }
    
    DISCOUNTS {
        uuid id PK
        uuid order_id FK
        uuid order_item_id FK
        discount_type type
        decimal discount_value
        decimal discount_amount
        text reason
        uuid authorized_by FK
        timestamptz created_at
    }
    
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDER_ITEMS ||--o{ ORDER_ITEM_ADDONS : "has"
    ORDERS ||--o{ KITCHEN_ORDERS : "generates"
    ORDERS ||--o{ SPLIT_PAYMENTS : "paid_with"
    ORDERS ||--o{ DISCOUNTS : "has"
    ORDERS }o--|| ORDER_SESSIONS : "belongs_to"
    ORDERS }o--|| USERS : "created_by"
    ORDERS }o--o| USERS : "voided_by"
    ORDERS }o--o| CUSTOMERS : "for"
    ORDERS }o--o| RESTAURANT_TABLES : "at"
    ORDER_ITEMS }o--o| PRODUCTS : "references"
    ORDER_ITEMS }o--o| PACKAGES : "references"
    KITCHEN_ORDERS }o--o| USERS : "assigned_to"
```

---

## 7. Inventory Management Module

```mermaid
erDiagram
    INVENTORY_MOVEMENTS {
        uuid id PK
        uuid product_id FK
        adjustment_type movement_type
        decimal quantity
        adjustment_reason reason
        uuid reference_id
        varchar reference_type
        uuid order_id FK
        uuid performed_by FK
        text notes
        timestamptz created_at
    }
    
    SUPPLIERS {
        uuid id PK
        varchar supplier_code UK
        varchar name
        varchar contact_person
        varchar email
        varchar phone
        text address
        varchar payment_terms
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    
    PRODUCT_SUPPLIERS {
        uuid product_id FK
        uuid supplier_id FK
        varchar supplier_sku
        decimal unit_cost
        integer lead_time_days
        decimal minimum_order_quantity
        boolean is_preferred
        timestamptz created_at
    }
    
    PURCHASE_ORDERS {
        uuid id PK
        varchar po_number UK
        uuid supplier_id FK
        date order_date
        date expected_delivery_date
        date actual_delivery_date
        varchar status
        decimal subtotal
        decimal tax_amount
        decimal total_amount
        text notes
        uuid created_by FK
        uuid approved_by FK
        uuid received_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    PURCHASE_ORDER_ITEMS {
        uuid id PK
        uuid po_id FK
        uuid product_id FK
        decimal quantity
        decimal unit_cost
        decimal total_cost
        decimal quantity_received
        timestamptz created_at
    }
    
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : "tracked"
    PRODUCTS ||--o{ PRODUCT_SUPPLIERS : "supplied_by"
    SUPPLIERS ||--o{ PRODUCT_SUPPLIERS : "supplies"
    SUPPLIERS ||--o{ PURCHASE_ORDERS : "receives"
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : "contains"
    PURCHASE_ORDER_ITEMS }o--|| PRODUCTS : "for"
    INVENTORY_MOVEMENTS }o--o| ORDERS : "from_order"
    INVENTORY_MOVEMENTS }o--|| USERS : "performed_by"
```

---

## 8. Notification System

```mermaid
erDiagram
    NOTIFICATIONS {
        uuid id PK
        notification_type type
        varchar title
        text message
        notification_priority priority
        uuid reference_id
        varchar reference_table
        uuid user_id FK
        user_role role
        boolean is_read
        timestamptz read_at
        jsonb data
        timestamptz created_at
        timestamptz expires_at
    }
    
    NOTIFICATIONS }o--o| USERS : "for_user"
```

---

## 9. System Configuration

```mermaid
erDiagram
    SYSTEM_SETTINGS {
        varchar key PK
        text value
        text description
        varchar data_type
        boolean is_public
        timestamptz updated_at
        uuid updated_by FK
    }
    
    HAPPY_HOUR_PRICING {
        uuid id PK
        varchar name
        text description
        time start_time
        time end_time
        integer_array days_of_week
        decimal discount_percentage
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    
    HAPPY_HOUR_PRODUCTS {
        uuid happy_hour_id FK
        uuid product_id FK
        decimal special_price
        timestamptz created_at
    }
    
    HAPPY_HOUR_PRICING ||--o{ HAPPY_HOUR_PRODUCTS : "includes"
    HAPPY_HOUR_PRODUCTS }o--|| PRODUCTS : "references"
    SYSTEM_SETTINGS }o--o| USERS : "updated_by"
```

---

## Data Flow Diagrams

### Order Flow

```mermaid
flowchart LR
    A[Customer Arrives] --> B[Assign Table]
    B --> C[Open Tab Session]
    C --> D[Create Current Order]
    D --> E[Add Items]
    E --> F{More Orders?}
    F -->|Yes| D
    F -->|No| G[Complete Order]
    G --> H[Generate Kitchen Orders]
    G --> I[Process Payment]
    I --> J[Close Tab]
    J --> K[Table Available]
    
    H --> L[Kitchen Prepares]
    L --> M[Waiter Delivers]
```

### Notification Flow

```mermaid
flowchart TD
    A[Event Occurs] --> B{Event Type?}
    
    B -->|New Order| C[Create Order Notification]
    B -->|Order Complete| D[Create Completion Notification]
    B -->|Kitchen Ready| E[Create Ready Notification]
    B -->|Low Stock| F[Create Stock Alert]
    
    C --> G[Target: Cashiers]
    D --> H[Target: Cashiers]
    E --> I[Target: Waiters]
    F --> J[Target: Managers]
    
    G --> K[Realtime Broadcast]
    H --> K
    I --> K
    J --> K
    
    K --> L[User Receives]
    L --> M[Mark as Read]
```

### Kitchen Flow

```mermaid
flowchart LR
    A[Order Created] --> B{Has Food?}
    B -->|Yes| C[Create Kitchen Order]
    B -->|No| D{Has Beverage?}
    D -->|Yes| E[Create Bar Order]
    D -->|No| F[Skip Kitchen]
    
    C --> G[Kitchen Staff Views]
    E --> H[Bartender Views]
    
    G --> I[Start Preparing]
    H --> J[Start Mixing]
    
    I --> K[Mark as Ready]
    J --> K
    
    K --> L[Notify Waiter]
    L --> M[Deliver to Table]
    M --> N[Mark as Served]
```

---

## Security Model

```mermaid
flowchart TB
    subgraph "Row Level Security"
        A[User Request] --> B{Authenticated?}
        B -->|No| C[❌ Access Denied]
        B -->|Yes| D{Check RLS Policy}
        
        D --> E{Policy Type}
        E -->|SELECT| F[Can View?]
        E -->|INSERT| G[Can Create?]
        E -->|UPDATE| H[Can Modify?]
        E -->|DELETE| I[Can Delete?]
        
        F --> J{Owns Record OR Has Role?}
        G --> J
        H --> J
        I --> J
        
        J -->|Yes| K[✅ Access Granted]
        J -->|No| C
    end
```

---

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp[🌐 Web App]
        Mobile[📱 Mobile App]
    end
    
    subgraph "API Layer"
        Supabase[Supabase API]
        Auth[Supabase Auth]
        Realtime[Supabase Realtime]
    end
    
    subgraph "Database Layer"
        PostgreSQL[(PostgreSQL 14+)]
        RLS[Row Level Security]
        Triggers[Triggers & Functions]
    end
    
    subgraph "Data Storage"
        Tables[35 Tables]
        Indexes[100+ Indexes]
        Types[16 Custom Types]
    end
    
    WebApp --> Supabase
    Mobile --> Supabase
    Supabase --> Auth
    Supabase --> Realtime
    Supabase --> PostgreSQL
    PostgreSQL --> RLS
    PostgreSQL --> Triggers
    PostgreSQL --> Tables
    Tables --> Indexes
    Tables --> Types
```

---

## Performance Optimization Strategy

```mermaid
mindmap
  root((Performance))
    Indexing
      Primary Keys
      Foreign Keys
      Frequently Queried Columns
      Composite Indexes
    Connection Pooling
      Min: 10
      Max: 100
      Timeout: 30s
    Query Optimization
      Use Prepared Statements
      Limit SELECT *
      Use Pagination
      Filter at Database
    Maintenance
      VACUUM ANALYZE
      Update Statistics
      Monitor Slow Queries
      Archive Old Data
    Caching
      Application Layer
      CDN for Static Assets
      Query Result Cache
```

---

**Generated:** 2025-10-09  
**Version:** 2.0  
**Format:** Mermaid Diagrams
