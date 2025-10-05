-- ============================================
-- CURRENT ORDERS TABLE
-- Staging table for orders being built in POS before completion
-- Each cashier has their own isolated current orders
-- ============================================

-- Create current_orders table
CREATE TABLE IF NOT EXISTS current_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Cashier reference - isolates orders per cashier
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Order details
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    
    -- Financial totals (calculated on the fly)
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Event offer tracking
    applied_event_offer_id UUID REFERENCES customer_events(id) ON DELETE SET NULL,
    
    -- Order metadata
    order_notes TEXT,
    
    -- Status tracking
    is_on_hold BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure cashier can only have reasonable number of concurrent draft orders
    CONSTRAINT unique_cashier_active_orders UNIQUE (cashier_id, id)
);

-- Create current_order_items table
CREATE TABLE IF NOT EXISTS current_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_order_id UUID NOT NULL REFERENCES current_orders(id) ON DELETE CASCADE,
    
    -- Product or Package reference
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    package_id UUID REFERENCES packages(id) ON DELETE RESTRICT,
    
    -- Item details (snapshot at time of adding)
    item_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    
    -- Special pricing flags
    is_vip_price BOOLEAN DEFAULT false,
    is_complimentary BOOLEAN DEFAULT false,
    
    -- Item notes
    notes TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either product or package, not both
    CONSTRAINT check_product_or_package CHECK (
        (product_id IS NOT NULL AND package_id IS NULL) OR
        (product_id IS NULL AND package_id IS NOT NULL)
    )
);

-- Create current_order_item_addons table
CREATE TABLE IF NOT EXISTS current_order_item_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_order_item_id UUID NOT NULL REFERENCES current_order_items(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES product_addons(id) ON DELETE RESTRICT,
    addon_name VARCHAR(100) NOT NULL,
    addon_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_current_orders_cashier ON current_orders(cashier_id);
CREATE INDEX idx_current_orders_customer ON current_orders(customer_id);
CREATE INDEX idx_current_orders_table ON current_orders(table_id);
CREATE INDEX idx_current_orders_created ON current_orders(created_at);
CREATE INDEX idx_current_order_items_order ON current_order_items(current_order_id);
CREATE INDEX idx_current_order_items_product ON current_order_items(product_id);
CREATE INDEX idx_current_order_items_package ON current_order_items(package_id);
CREATE INDEX idx_current_order_item_addons_item ON current_order_item_addons(current_order_item_id);

-- Create trigger for updated_at
CREATE TRIGGER update_current_orders_updated_at 
    BEFORE UPDATE ON current_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE current_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_order_item_addons ENABLE ROW LEVEL SECURITY;

-- current_orders policies
-- Cashiers can only see and manage their own current orders
CREATE POLICY "Cashiers can view own current orders" ON current_orders
    FOR SELECT 
    USING (cashier_id = auth.uid()::uuid);

CREATE POLICY "Cashiers can create own current orders" ON current_orders
    FOR INSERT 
    WITH CHECK (cashier_id = auth.uid()::uuid);

CREATE POLICY "Cashiers can update own current orders" ON current_orders
    FOR UPDATE 
    USING (cashier_id = auth.uid()::uuid);

CREATE POLICY "Cashiers can delete own current orders" ON current_orders
    FOR DELETE 
    USING (cashier_id = auth.uid()::uuid);

-- Admins and managers can view all current orders (for monitoring)
CREATE POLICY "Admins can manage all current orders" ON current_orders
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('admin', 'manager')
            AND is_active = true
        )
    );

-- current_order_items policies
-- Users can manage items in their own current orders
CREATE POLICY "Users can view items in own orders" ON current_order_items
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM current_orders 
            WHERE id = current_order_items.current_order_id 
            AND (cashier_id = auth.uid()::uuid OR 
                 EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role IN ('admin', 'manager')))
        )
    );

CREATE POLICY "Users can insert items in own orders" ON current_order_items
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM current_orders 
            WHERE id = current_order_items.current_order_id 
            AND cashier_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Users can update items in own orders" ON current_order_items
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM current_orders 
            WHERE id = current_order_items.current_order_id 
            AND cashier_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Users can delete items in own orders" ON current_order_items
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM current_orders 
            WHERE id = current_order_items.current_order_id 
            AND cashier_id = auth.uid()::uuid
        )
    );

-- current_order_item_addons policies
CREATE POLICY "Users can view addons in own orders" ON current_order_item_addons
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM current_order_items coi
            JOIN current_orders co ON co.id = coi.current_order_id
            WHERE coi.id = current_order_item_addons.current_order_item_id 
            AND (co.cashier_id = auth.uid()::uuid OR 
                 EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role IN ('admin', 'manager')))
        )
    );

CREATE POLICY "Users can manage addons in own orders" ON current_order_item_addons
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM current_order_items coi
            JOIN current_orders co ON co.id = coi.current_order_id
            WHERE coi.id = current_order_item_addons.current_order_item_id 
            AND co.cashier_id = auth.uid()::uuid
        )
    );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

/**
 * Function to calculate current order totals
 * Automatically recalculates subtotal and total when items change
 */
CREATE OR REPLACE FUNCTION calculate_current_order_totals(order_id UUID)
RETURNS VOID AS $$
DECLARE
    calculated_subtotal DECIMAL(12, 2);
    calculated_discount DECIMAL(12, 2);
    calculated_total DECIMAL(12, 2);
BEGIN
    -- Calculate totals from items
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(discount_amount), 0),
        COALESCE(SUM(total), 0)
    INTO 
        calculated_subtotal,
        calculated_discount,
        calculated_total
    FROM current_order_items
    WHERE current_order_id = order_id;
    
    -- Update the order
    UPDATE current_orders
    SET 
        subtotal = calculated_subtotal,
        discount_amount = calculated_discount,
        total_amount = calculated_total,
        updated_at = NOW()
    WHERE id = order_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Trigger to auto-calculate totals when items are added/updated/deleted
 */
CREATE OR REPLACE FUNCTION trigger_calculate_current_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM calculate_current_order_totals(OLD.current_order_id);
        RETURN OLD;
    ELSE
        PERFORM calculate_current_order_totals(NEW.current_order_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to current_order_items
CREATE TRIGGER trigger_current_order_items_totals
    AFTER INSERT OR UPDATE OR DELETE ON current_order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_current_order_totals();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE current_orders IS 'Staging table for orders being built in POS before completion. Each cashier has isolated orders.';
COMMENT ON TABLE current_order_items IS 'Items in current (draft) orders being built in POS';
COMMENT ON TABLE current_order_item_addons IS 'Add-ons for items in current orders';
COMMENT ON COLUMN current_orders.cashier_id IS 'Cashier building this order - used for isolation';
COMMENT ON COLUMN current_orders.is_on_hold IS 'Temporarily hold this draft order to work on another';
COMMENT ON FUNCTION calculate_current_order_totals IS 'Recalculates order totals from items';
