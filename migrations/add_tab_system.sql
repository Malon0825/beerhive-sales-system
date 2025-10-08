-- ============================================
-- TAB SYSTEM MIGRATION
-- Add order sessions and enhanced order statuses
-- Date: October 7, 2025
-- ============================================

-- Step 1: Add new order statuses
-- Note: In PostgreSQL, you can't directly add values to enum in a transaction
-- This needs to be done one at a time
DO $$ 
BEGIN
    -- Add new statuses if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'draft') THEN
        ALTER TYPE order_status ADD VALUE 'draft';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'confirmed') THEN
        ALTER TYPE order_status ADD VALUE 'confirmed';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'preparing') THEN
        ALTER TYPE order_status ADD VALUE 'preparing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'ready') THEN
        ALTER TYPE order_status ADD VALUE 'ready';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'served') THEN
        ALTER TYPE order_status ADD VALUE 'served';
    END IF;
END $$;

-- Step 2: Create session_status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
        CREATE TYPE session_status AS ENUM ('open', 'closed', 'abandoned');
    END IF;
END $$;

-- Step 3: Create order_sessions table
CREATE TABLE IF NOT EXISTS order_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Relationships
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Financials (running total across all orders in this session)
    subtotal DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    
    -- Status
    status session_status DEFAULT 'open',
    
    -- Timestamps
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    
    -- Audit
    opened_by UUID REFERENCES users(id) ON DELETE SET NULL,
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for order_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_table ON order_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON order_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON order_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_number ON order_sessions(session_number);
CREATE INDEX IF NOT EXISTS idx_sessions_opened ON order_sessions(opened_at);
CREATE INDEX IF NOT EXISTS idx_sessions_closed ON order_sessions(closed_at);

-- Step 4: Add session_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES order_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);

-- Step 5: Update restaurant_tables to track current session instead of current order
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS current_session_id UUID REFERENCES order_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tables_session ON restaurant_tables(current_session_id);

-- Step 6: Create function to auto-generate session numbers
CREATE OR REPLACE FUNCTION generate_session_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    new_number VARCHAR(50);
    counter INTEGER;
BEGIN
    -- Format: TAB-YYYYMMDD-XXX
    SELECT COALESCE(MAX(CAST(SUBSTRING(session_number FROM 14) AS INTEGER)), 0) + 1
    INTO counter
    FROM order_sessions
    WHERE session_number LIKE 'TAB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';
    
    new_number := 'TAB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 3, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to auto-generate session number
CREATE OR REPLACE FUNCTION set_session_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_number IS NULL OR NEW.session_number = '' THEN
        NEW.session_number := generate_session_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_session_number ON order_sessions;
CREATE TRIGGER trigger_set_session_number
    BEFORE INSERT ON order_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_session_number();

-- Step 8: Create function to update session totals when orders change
CREATE OR REPLACE FUNCTION update_session_totals()
RETURNS TRIGGER AS $$
DECLARE
    session_record RECORD;
BEGIN
    -- Get the session_id from the order
    IF TG_OP = 'DELETE' THEN
        IF OLD.session_id IS NOT NULL THEN
            -- Recalculate totals for the session
            SELECT 
                COALESCE(SUM(subtotal), 0) as subtotal,
                COALESCE(SUM(discount_amount), 0) as discount_amount,
                COALESCE(SUM(tax_amount), 0) as tax_amount,
                COALESCE(SUM(total_amount), 0) as total_amount
            INTO session_record
            FROM orders
            WHERE session_id = OLD.session_id
                AND status NOT IN ('voided');
            
            -- Update session
            UPDATE order_sessions
            SET 
                subtotal = session_record.subtotal,
                discount_amount = session_record.discount_amount,
                tax_amount = session_record.tax_amount,
                total_amount = session_record.total_amount,
                updated_at = NOW()
            WHERE id = OLD.session_id;
        END IF;
    ELSE
        IF NEW.session_id IS NOT NULL THEN
            -- Recalculate totals for the session
            SELECT 
                COALESCE(SUM(subtotal), 0) as subtotal,
                COALESCE(SUM(discount_amount), 0) as discount_amount,
                COALESCE(SUM(tax_amount), 0) as tax_amount,
                COALESCE(SUM(total_amount), 0) as total_amount
            INTO session_record
            FROM orders
            WHERE session_id = NEW.session_id
                AND status NOT IN ('voided');
            
            -- Update session
            UPDATE order_sessions
            SET 
                subtotal = session_record.subtotal,
                discount_amount = session_record.discount_amount,
                tax_amount = session_record.tax_amount,
                total_amount = session_record.total_amount,
                updated_at = NOW()
            WHERE id = NEW.session_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table to update session totals
DROP TRIGGER IF EXISTS trigger_update_session_totals ON orders;
CREATE TRIGGER trigger_update_session_totals
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_session_totals();

-- Step 9: Enable realtime for order_sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE order_sessions;

-- Step 10: Add RLS policies for order_sessions
ALTER TABLE order_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all sessions
CREATE POLICY "Allow authenticated users to view sessions"
    ON order_sessions FOR SELECT
    TO authenticated
    USING (true);

-- Allow cashiers, managers, and admins to create sessions
CREATE POLICY "Allow staff to create sessions"
    ON order_sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('cashier', 'manager', 'admin')
        )
    );

-- Allow staff to update sessions
CREATE POLICY "Allow staff to update sessions"
    ON order_sessions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('cashier', 'manager', 'admin')
        )
    );

-- Step 11: Create view for active sessions with details
CREATE OR REPLACE VIEW active_sessions_view AS
SELECT 
    os.id,
    os.session_number,
    os.status,
    os.subtotal,
    os.discount_amount,
    os.tax_amount,
    os.total_amount,
    os.opened_at,
    os.closed_at,
    os.notes,
    
    -- Table info
    rt.table_number,
    rt.area as table_area,
    
    -- Customer info
    c.full_name as customer_name,
    c.tier as customer_tier,
    
    -- Staff info
    u_open.full_name as opened_by_name,
    u_close.full_name as closed_by_name,
    
    -- Calculated fields
    EXTRACT(EPOCH FROM (COALESCE(os.closed_at, NOW()) - os.opened_at))/60 as duration_minutes,
    
    -- Order counts
    (SELECT COUNT(*) FROM orders WHERE orders.session_id = os.id) as order_count,
    (SELECT COUNT(*) FROM orders WHERE orders.session_id = os.id AND orders.status = 'draft') as draft_orders,
    (SELECT COUNT(*) FROM orders WHERE orders.session_id = os.id AND orders.status = 'confirmed') as confirmed_orders,
    (SELECT COUNT(*) FROM orders WHERE orders.session_id = os.id AND orders.status = 'served') as served_orders
    
FROM order_sessions os
LEFT JOIN restaurant_tables rt ON os.table_id = rt.id
LEFT JOIN customers c ON os.customer_id = c.id
LEFT JOIN users u_open ON os.opened_by = u_open.id
LEFT JOIN users u_close ON os.closed_by = u_close.id
WHERE os.status = 'open'
ORDER BY os.opened_at DESC;

-- Step 12: Add comment documentation
COMMENT ON TABLE order_sessions IS 'Order sessions represent a complete dining experience (tab) for a table or customer. Multiple orders can belong to one session.';
COMMENT ON COLUMN order_sessions.session_number IS 'Unique session identifier in format TAB-YYYYMMDD-XXX';
COMMENT ON COLUMN order_sessions.status IS 'Session status: open (active), closed (paid), abandoned (left without paying)';
COMMENT ON COLUMN order_sessions.subtotal IS 'Running subtotal of all orders in this session';
COMMENT ON COLUMN order_sessions.total_amount IS 'Running total of all orders in this session';

-- Step 13: Create helper function to get active session for table
CREATE OR REPLACE FUNCTION get_active_session_for_table(p_table_id UUID)
RETURNS TABLE (
    session_id UUID,
    session_number VARCHAR(50),
    total_amount DECIMAL(12, 2),
    order_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        os.id,
        os.session_number,
        os.total_amount,
        COUNT(o.id) as order_count
    FROM order_sessions os
    LEFT JOIN orders o ON o.session_id = os.id
    WHERE os.table_id = p_table_id
        AND os.status = 'open'
    GROUP BY os.id, os.session_number, os.total_amount
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Migration complete
-- New order statuses: draft, confirmed, preparing, ready, served (in addition to existing: pending, completed, voided, on_hold)
-- New table: order_sessions
-- New column: orders.session_id
-- New column: restaurant_tables.current_session_id
-- Auto-generated session numbers: TAB-YYYYMMDD-XXX
-- Auto-updated session totals when orders change
-- Real-time enabled for order_sessions
-- RLS policies configured
-- Helper views and functions created
