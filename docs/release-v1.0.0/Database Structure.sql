-- ============================================
-- BeerHive PUB POS System - Database Schema
-- PostgreSQL / Supabase Compatible
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS (Type Definitions)
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'kitchen', 'bartender');
CREATE TYPE customer_tier AS ENUM ('regular', 'vip_silver', 'vip_gold', 'vip_platinum');
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'voided', 'on_hold');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'gcash', 'paymaya', 'bank_transfer', 'split');
CREATE TYPE adjustment_type AS ENUM ('stock_in', 'stock_out', 'transfer', 'physical_count', 'sale', 'void_return');
CREATE TYPE adjustment_reason AS ENUM ('purchase', 'damaged', 'expired', 'theft', 'waste', 'count_correction', 'transfer_in', 'transfer_out', 'sale_deduction', 'void_return');
CREATE TYPE package_type AS ENUM ('vip_only', 'regular', 'promotional');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'complimentary');
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning');
CREATE TYPE order_destination AS ENUM ('kitchen', 'bartender', 'both');
CREATE TYPE kitchen_order_status AS ENUM ('pending', 'preparing', 'ready', 'served');
CREATE TYPE event_type AS ENUM ('birthday', 'anniversary', 'custom');

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'cashier',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================
-- CUSTOMERS
-- ============================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    birth_date DATE, -- For birthday offers
    anniversary_date DATE, -- For anniversary offers
    tier customer_tier DEFAULT 'regular',
    vip_membership_number VARCHAR(50) UNIQUE,
    vip_start_date DATE,
    vip_expiry_date DATE,
    loyalty_points INTEGER DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit_date TIMESTAMPTZ,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_tier ON customers(tier);
CREATE INDEX idx_customers_number ON customers(customer_number);
CREATE INDEX idx_customers_birth_date ON customers(birth_date);
CREATE INDEX idx_customers_anniversary_date ON customers(anniversary_date);

-- ============================================
-- RESTAURANT TABLES (Table Numbering)
-- ============================================

CREATE TABLE restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number VARCHAR(10) UNIQUE NOT NULL,
    area VARCHAR(50), -- 'indoor', 'outdoor', 'vip_section', 'bar_area'
    capacity INTEGER DEFAULT 4,
    status table_status DEFAULT 'available',
    current_order_id UUID, -- Reference to active order (will be added as FK later)
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurant_tables_status ON restaurant_tables(status);
CREATE INDEX idx_restaurant_tables_number ON restaurant_tables(table_number);
CREATE INDEX idx_restaurant_tables_area ON restaurant_tables(area);

-- ============================================
-- HAPPY HOUR PRICING RULES
-- ============================================

CREATE TABLE happy_hour_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Time rules
    start_time TIME NOT NULL, -- e.g., '15:00:00'
    end_time TIME NOT NULL, -- e.g., '18:00:00'
    days_of_week INTEGER[], -- Array: [1,2,3,4,5] for Mon-Fri (1=Monday, 7=Sunday)
    
    -- Date validity
    valid_from DATE,
    valid_until DATE,
    
    -- Discount
    discount_type discount_type DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) NOT NULL, -- Percentage (e.g., 20) or fixed amount
    
    -- Application rules
    applies_to_all_products BOOLEAN DEFAULT false,
    min_order_amount DECIMAL(10, 2), -- Minimum order to qualify
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_happy_hour_active ON happy_hour_pricing(is_active);
CREATE INDEX idx_happy_hour_time ON happy_hour_pricing(start_time, end_time);

-- Junction table for specific products eligible for happy hour
CREATE TABLE happy_hour_products (
    happy_hour_id UUID REFERENCES happy_hour_pricing(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    custom_price DECIMAL(10, 2), -- Override price for this product during happy hour
    PRIMARY KEY (happy_hour_id, product_id)
);

CREATE INDEX idx_happy_hour_products_hh ON happy_hour_products(happy_hour_id);
CREATE INDEX idx_happy_hour_products_product ON happy_hour_products(product_id);

-- ============================================
-- CUSTOMER EVENTS & OFFERS
-- ============================================

CREATE TABLE customer_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    event_type event_type NOT NULL,
    event_date DATE NOT NULL,
    event_name VARCHAR(100), -- Custom event name if event_type is 'custom'
    
    -- Offer details
    offer_description TEXT,
    discount_type discount_type,
    discount_value DECIMAL(10, 2),
    free_item_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Validity
    offer_valid_from DATE, -- When offer becomes valid (e.g., 1 week before event)
    offer_valid_until DATE, -- When offer expires (e.g., 1 week after event)
    
    -- Redemption tracking
    is_redeemed BOOLEAN DEFAULT false,
    redeemed_at TIMESTAMPTZ,
    redeemed_order_id UUID, -- Will be FK to orders
    
    -- Notification
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_events_customer ON customer_events(customer_id);
CREATE INDEX idx_customer_events_date ON customer_events(event_date);
CREATE INDEX idx_customer_events_type ON customer_events(event_type);
CREATE INDEX idx_customer_events_validity ON customer_events(offer_valid_from, offer_valid_until);
CREATE INDEX idx_customer_events_redeemed ON customer_events(is_redeemed);

-- ============================================
-- PRODUCT CATEGORIES
-- ============================================

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    parent_category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    description TEXT,
    color_code VARCHAR(7), -- Hex color for POS UI
    default_destination order_destination, -- Default routing for products in this category
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON product_categories(parent_category_id);
CREATE INDEX idx_categories_active ON product_categories(is_active);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    
    -- Pricing
    base_price DECIMAL(10, 2) NOT NULL,
    vip_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    
    -- Inventory
    current_stock DECIMAL(10, 2) DEFAULT 0,
    unit_of_measure VARCHAR(20) DEFAULT 'piece',
    reorder_point DECIMAL(10, 2) DEFAULT 0,
    reorder_quantity DECIMAL(10, 2) DEFAULT 0,
    
    -- Product attributes
    size_variant VARCHAR(50), -- bottle, pitcher, bucket
    alcohol_percentage DECIMAL(5, 2),
    
    -- Display
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_stock_level ON products(current_stock);
CREATE INDEX idx_products_name ON products(name);

-- ============================================
-- PRODUCT ADD-ONS
-- ============================================

CREATE TABLE product_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for products that can have specific add-ons
CREATE TABLE product_addon_associations (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES product_addons(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    PRIMARY KEY (product_id, addon_id)
);

CREATE INDEX idx_addon_assoc_product ON product_addon_associations(product_id);

-- ============================================
-- PACKAGES
-- ============================================

CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    package_type package_type NOT NULL DEFAULT 'regular',
    
    -- Pricing
    base_price DECIMAL(10, 2) NOT NULL,
    vip_price DECIMAL(10, 2),
    
    -- Validity
    valid_from DATE,
    valid_until DATE,
    
    -- Rules
    max_quantity_per_transaction INTEGER DEFAULT 1,
    is_addon_eligible BOOLEAN DEFAULT false,
    time_restrictions JSONB, -- {days: [1,2,3], hours: {start: "15:00", end: "18:00"}}
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packages_type ON packages(package_type);
CREATE INDEX idx_packages_active ON packages(is_active);
CREATE INDEX idx_packages_validity ON packages(valid_from, valid_until);

-- ============================================
-- PACKAGE ITEMS
-- ============================================

CREATE TABLE package_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    is_choice_item BOOLEAN DEFAULT false, -- If true, customer can choose from options
    choice_group VARCHAR(50), -- Groups choice items together
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_package_items_package ON package_items(package_id);
CREATE INDEX idx_package_items_product ON package_items(product_id);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Relationships
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL, -- Table assignment
    
    -- Financial
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Event offer tracking
    applied_event_offer_id UUID, -- References customer_events (FK added later)
    
    -- Payment
    payment_method payment_method,
    amount_tendered DECIMAL(12, 2),
    change_amount DECIMAL(12, 2),
    
    -- Status
    status order_status DEFAULT 'pending',
    
    -- Metadata
    order_notes TEXT,
    voided_by UUID REFERENCES users(id),
    voided_reason TEXT,
    voided_at TIMESTAMPTZ,
    
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_cashier ON orders(cashier_id);
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_orders_completed ON orders(completed_at);
CREATE INDEX idx_orders_event_offer ON orders(applied_event_offer_id);

-- ============================================
-- ORDER ITEMS
-- ============================================

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Product or Package
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    package_id UUID REFERENCES packages(id) ON DELETE RESTRICT,
    
    -- Details
    item_name VARCHAR(200) NOT NULL, -- Snapshot of product/package name
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    
    -- Special pricing
    is_vip_price BOOLEAN DEFAULT false,
    is_complimentary BOOLEAN DEFAULT false,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_product_or_package CHECK (
        (product_id IS NOT NULL AND package_id IS NULL) OR
        (product_id IS NULL AND package_id IS NOT NULL)
    )
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_package ON order_items(package_id);

-- ============================================
-- ORDER ITEM ADD-ONS
-- ============================================

CREATE TABLE order_item_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES product_addons(id) ON DELETE RESTRICT,
    addon_name VARCHAR(100) NOT NULL, -- Snapshot
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_item_addons_item ON order_item_addons(order_item_id);

-- ============================================
-- KITCHEN & BARTENDER ORDER ROUTING
-- ============================================

CREATE TABLE kitchen_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    
    -- Routing
    destination order_destination NOT NULL, -- 'kitchen', 'bartender', or 'both'
    
    -- Status tracking
    status kitchen_order_status DEFAULT 'pending',
    
    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ, -- When kitchen/bartender starts preparing
    ready_at TIMESTAMPTZ, -- When item is ready to serve
    served_at TIMESTAMPTZ, -- When item is delivered to customer
    
    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Kitchen or bartender staff
    
    -- Notes
    special_instructions TEXT,
    preparation_notes TEXT, -- Notes added by kitchen/bartender staff
    
    -- Priority
    is_urgent BOOLEAN DEFAULT false,
    priority_order INTEGER DEFAULT 0, -- Lower number = higher priority
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kitchen_orders_order ON kitchen_orders(order_id);
CREATE INDEX idx_kitchen_orders_item ON kitchen_orders(order_item_id);
CREATE INDEX idx_kitchen_orders_destination ON kitchen_orders(destination);
CREATE INDEX idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX idx_kitchen_orders_sent_at ON kitchen_orders(sent_at);
CREATE INDEX idx_kitchen_orders_assigned ON kitchen_orders(assigned_to);

-- ============================================
-- SPLIT PAYMENTS
-- ============================================

CREATE TABLE split_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    payment_method payment_method NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_split_payments_order ON split_payments(order_id);

-- ============================================
-- INVENTORY MOVEMENTS
-- ============================================

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Movement details
    movement_type adjustment_type NOT NULL,
    reason adjustment_reason NOT NULL,
    
    -- Quantities
    quantity_change DECIMAL(10, 2) NOT NULL, -- Positive for increases, negative for decreases
    quantity_before DECIMAL(10, 2) NOT NULL,
    quantity_after DECIMAL(10, 2) NOT NULL,
    
    -- Cost tracking
    unit_cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    
    -- References
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    reference_number VARCHAR(100), -- PO number, invoice number, etc.
    
    -- Audit
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_date ON inventory_movements(created_at);
CREATE INDEX idx_inventory_order ON inventory_movements(order_id);

-- ============================================
-- SUPPLIERS
-- ============================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    lead_time_days INTEGER DEFAULT 7,
    payment_terms TEXT,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- ============================================
-- PRODUCT SUPPLIERS (Junction)
-- ============================================

CREATE TABLE product_suppliers (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_sku VARCHAR(100),
    unit_cost DECIMAL(10, 2),
    minimum_order_quantity DECIMAL(10, 2),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (product_id, supplier_id)
);

CREATE INDEX idx_product_suppliers_product ON product_suppliers(product_id);
CREATE INDEX idx_product_suppliers_supplier ON product_suppliers(supplier_id);

-- ============================================
-- PURCHASE ORDERS
-- ============================================

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
    
    -- Financial
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, ordered, partial, received, cancelled
    
    -- Dates
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    received_by UUID REFERENCES users(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_number ON purchase_orders(po_number);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_dates ON purchase_orders(order_date, expected_delivery_date);

-- ============================================
-- PURCHASE ORDER ITEMS
-- ============================================

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    
    quantity_ordered DECIMAL(10, 2) NOT NULL,
    quantity_received DECIMAL(10, 2) DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);

-- ============================================
-- DISCOUNTS & PROMOTIONS
-- ============================================

CREATE TABLE discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL, -- Percentage or fixed amount
    discount_amount DECIMAL(10, 2) NOT NULL, -- Actual amount discounted
    
    reason VARCHAR(200) NOT NULL,
    
    -- Authorization
    cashier_id UUID REFERENCES users(id),
    manager_id UUID REFERENCES users(id), -- For approvals
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_order_or_item CHECK (
        (order_id IS NOT NULL AND order_item_id IS NULL) OR
        (order_id IS NULL AND order_item_id IS NOT NULL)
    )
);

CREATE INDEX idx_discounts_order ON discounts(order_id);
CREATE INDEX idx_discounts_item ON discounts(order_item_id);
CREATE INDEX idx_discounts_date ON discounts(created_at);

-- ============================================
-- PRICE HISTORY
-- ============================================

CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    old_base_price DECIMAL(10, 2),
    new_base_price DECIMAL(10, 2),
    old_vip_price DECIMAL(10, 2),
    new_vip_price DECIMAL(10, 2),
    old_cost_price DECIMAL(10, 2),
    new_cost_price DECIMAL(10, 2),
    
    effective_date DATE NOT NULL,
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_product ON price_history(product_id);
CREATE INDEX idx_price_history_date ON price_history(effective_date);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    
    old_values JSONB,
    new_values JSONB,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================
-- SYSTEM SETTINGS
-- ============================================

CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    data_type VARCHAR(20) NOT NULL, -- string, number, boolean, json
    description TEXT,
    category VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_tables_updated_at BEFORE UPDATE ON restaurant_tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_happy_hour_pricing_updated_at BEFORE UPDATE ON happy_hour_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_events_updated_at BEFORE UPDATE ON customer_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kitchen_orders_updated_at BEFORE UPDATE ON kitchen_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables for Supabase

-- Users table - Only authenticated users can read, admins can modify
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid()::uuid = id);

CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid AND role = 'admin'
        )
    );

-- Customers - All authenticated users can read, cashiers+ can create/update
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers" ON customers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage customers" ON customers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid AND is_active = true
        )
    );

-- Products - All authenticated can read, managers+ can modify
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products" ON products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers can manage products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('admin', 'manager')
            AND is_active = true
        )
    );

-- Orders - All authenticated can read own orders, cashiers can create
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid AND is_active = true
        )
    );

CREATE POLICY "Cashiers can create orders" ON orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid AND is_active = true
        )
    );

CREATE POLICY "Cashiers can update their own orders" ON orders
    FOR UPDATE USING (cashier_id = auth.uid()::uuid);

-- Add similar policies for other tables as needed

-- ============================================
-- INITIAL DATA / SEED DATA
-- ============================================

-- Insert default admin user (password should be changed immediately)
-- Password: 'admin123' hashed with bcrypt
INSERT INTO users (username, email, password_hash, full_name, role, is_active)
VALUES ('admin', 'admin@beerhive.com', '$2a$10$rLYRGX5EzYf8KqXXQqXQXeJ5K5KQ5K5K5K5K5K5K5K5K5K5K5K', 'System Administrator', 'admin', true);

-- Insert system settings
INSERT INTO system_settings (key, value, data_type, description, category, is_public) VALUES
('business_name', 'BeerHive PUB', 'string', 'Business name', 'general', true),
('tax_rate', '0', 'number', 'Tax rate percentage', 'financial', true),
('currency', 'PHP', 'string', 'Currency code', 'financial', true),
('low_stock_threshold_days', '7', 'number', 'Days before reorder point to alert', 'inventory', false),
('auto_logout_minutes', '30', 'number', 'Minutes of inactivity before logout', 'security', false),
('discount_approval_threshold', '20', 'number', 'Percentage discount requiring manager approval', 'financial', false);

-- ============================================
-- USEFUL VIEWS FOR REPORTING
-- ============================================

-- View for product stock status
CREATE VIEW v_product_stock_status AS
SELECT 
    p.id,
    p.sku,
    p.name,
    p.current_stock,
    p.reorder_point,
    p.unit_of_measure,
    pc.name as category_name,
    CASE 
        WHEN p.current_stock <= 0 THEN 'out_of_stock'
        WHEN p.current_stock <= p.reorder_point THEN 'low_stock'
        WHEN p.current_stock <= (p.reorder_point * 1.5) THEN 'warning'
        ELSE 'adequate'
    END as stock_status
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
WHERE p.is_active = true;

-- View for daily sales summary
CREATE VIEW v_daily_sales_summary AS
SELECT 
    DATE(o.completed_at) as sale_date,
    COUNT(DISTINCT o.id) as transaction_count,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as average_transaction,
    SUM(o.discount_amount) as total_discounts,
    COUNT(DISTINCT o.customer_id) as unique_customers
FROM orders o
WHERE o.status = 'completed'
GROUP BY DATE(o.completed_at);

-- View for top selling products
CREATE VIEW v_top_selling_products AS
SELECT 
    p.id,
    p.name,
    p.sku,
    COUNT(oi.id) as times_ordered,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.total) as total_revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.id, p.name, p.sku
ORDER BY total_revenue DESC;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE customers IS 'Customer database with VIP tier management and event tracking';
COMMENT ON TABLE restaurant_tables IS 'Table numbering and status management for table assignments';
COMMENT ON TABLE happy_hour_pricing IS 'Time-based pricing rules for happy hour promotions';
COMMENT ON TABLE customer_events IS 'Customer birthday, anniversary, and custom event offers';
COMMENT ON TABLE products IS 'Product catalog with pricing and inventory';
COMMENT ON TABLE packages IS 'VIP packages and promotional bundles';
COMMENT ON TABLE orders IS 'Sales transactions and orders with table assignments';
COMMENT ON TABLE kitchen_orders IS 'Kitchen and bartender order routing with status tracking';
COMMENT ON TABLE inventory_movements IS 'Complete audit trail of all stock changes';
COMMENT ON TABLE purchase_orders IS 'Supplier purchase orders for inventory replenishment';

-- ============================================
-- END OF SCHEMA
-- ============================================