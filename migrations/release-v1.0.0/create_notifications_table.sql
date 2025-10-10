-- ============================================
-- Notifications System Migration
-- Creates notifications table for real-time alerts
-- ============================================

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
    'order_created',
    'order_completed', 
    'order_voided',
    'food_ready',
    'food_delivered',
    'beverage_ready',
    'beverage_delivered',
    'low_stock',
    'out_of_stock',
    'reorder_point',
    'system_alert'
);

-- Create notification priority enum
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority notification_priority DEFAULT 'normal',
    
    -- Reference data
    reference_id UUID, -- Reference to order, product, etc.
    reference_table VARCHAR(100), -- Table name being referenced
    
    -- User targeting
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Specific user (optional)
    role user_role, -- Target specific role
    
    -- Status tracking
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Metadata
    data JSONB, -- Additional context data
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optional expiration
    
    -- Indexes for performance
    CONSTRAINT check_targeting CHECK (
        user_id IS NOT NULL OR role IS NOT NULL
    )
);

-- Create indexes for efficient queries
CREATE INDEX idx_notifications_user ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_role ON notifications(role) WHERE role IS NOT NULL;
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_reference ON notifications(reference_table, reference_id);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (
        auth.uid()::uuid = user_id OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND users.role = notifications.role
        )
    );

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (
        auth.uid()::uuid = user_id OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND users.role = notifications.role
        )
    );

-- Policy: System can insert notifications (service role)
CREATE POLICY "Service role can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Function to auto-delete expired notifications
CREATE OR REPLACE FUNCTION delete_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old read notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications
    WHERE is_read = true 
    AND read_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Notification Creation Helper Functions
-- ============================================

-- Function to create order notification
CREATE OR REPLACE FUNCTION create_order_notification(
    p_order_id UUID,
    p_type notification_type,
    p_title VARCHAR,
    p_message TEXT
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        type,
        title,
        message,
        priority,
        reference_id,
        reference_table,
        role
    ) VALUES (
        p_type,
        p_title,
        p_message,
        'normal',
        p_order_id,
        'orders',
        'cashier' -- Notify all cashiers
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create inventory notification
CREATE OR REPLACE FUNCTION create_inventory_notification(
    p_product_id UUID,
    p_product_name VARCHAR,
    p_current_stock DECIMAL,
    p_reorder_point DECIMAL,
    p_type notification_type
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_priority notification_priority;
    v_title VARCHAR;
    v_message TEXT;
BEGIN
    -- Determine priority based on stock level
    IF p_current_stock <= 0 THEN
        v_priority := 'urgent';
        v_title := 'OUT OF STOCK';
        v_message := p_product_name || ' is out of stock!';
    ELSIF p_current_stock <= p_reorder_point THEN
        v_priority := 'high';
        v_title := 'Low Stock Alert';
        v_message := p_product_name || ' is running low (' || ROUND(p_current_stock::numeric, 2)::text || ' remaining)';
    ELSE
        v_priority := 'normal';
        v_title := 'Reorder Point Reached';
        v_message := p_product_name || ' has reached reorder point';
    END IF;
    
    INSERT INTO notifications (
        type,
        title,
        message,
        priority,
        reference_id,
        reference_table,
        role,
        data
    ) VALUES (
        p_type,
        v_title,
        v_message,
        v_priority,
        p_product_id,
        'products',
        'manager', -- Notify managers about inventory
        jsonb_build_object(
            'product_name', p_product_name,
            'current_stock', p_current_stock,
            'reorder_point', p_reorder_point
        )
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers for Automatic Notifications
-- ============================================

-- Trigger: Notify on new order
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_order_notification(
        NEW.id,
        'order_created',
        'New Order',
        'Order #' || NEW.order_number || ' created - Total: ₱' || ROUND(NEW.total_amount::numeric, 2)::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_order
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_order();

-- Trigger: Notify on order completion
CREATE OR REPLACE FUNCTION notify_order_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM create_order_notification(
            NEW.id,
            'order_completed',
            'Order Completed',
            'Order #' || NEW.order_number || ' completed - ₱' || ROUND(NEW.total_amount::numeric, 2)::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_order_completed
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_completed();

-- Trigger: Notify on kitchen order ready
CREATE OR REPLACE FUNCTION notify_kitchen_order_ready()
RETURNS TRIGGER AS $$
DECLARE
    v_order_number VARCHAR;
    v_title VARCHAR;
BEGIN
    IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
        -- Get order number
        SELECT order_number INTO v_order_number
        FROM orders WHERE id = NEW.order_id;
        
        -- Set title based on destination
        IF NEW.destination = 'kitchen' THEN
            v_title := 'Food Ready';
        ELSIF NEW.destination = 'bartender' THEN
            v_title := 'Beverage Ready';
        ELSE
            v_title := 'Order Ready';
        END IF;
        
        -- Create notification for waiters
        INSERT INTO notifications (
            type,
            title,
            message,
            priority,
            reference_id,
            reference_table,
            role
        ) VALUES (
            CASE 
                WHEN NEW.destination = 'kitchen' THEN 'food_ready'::notification_type
                WHEN NEW.destination = 'bartender' THEN 'beverage_ready'::notification_type
                ELSE 'food_ready'::notification_type
            END,
            v_title,
            'Order #' || v_order_number || ' is ready for delivery',
            'normal',
            NEW.order_id,
            'kitchen_orders',
            'waiter' -- Notify waiters to deliver
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_kitchen_order_ready
    AFTER UPDATE ON kitchen_orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_kitchen_order_ready();

-- Trigger: Notify on low stock
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if stock went below reorder point
    IF NEW.current_stock <= NEW.reorder_point AND 
       (OLD.current_stock IS NULL OR OLD.current_stock > NEW.reorder_point) THEN
        
        PERFORM create_inventory_notification(
            NEW.id,
            NEW.name,
            NEW.current_stock,
            NEW.reorder_point,
            CASE 
                WHEN NEW.current_stock <= 0 THEN 'out_of_stock'::notification_type
                ELSE 'low_stock'::notification_type
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_low_stock
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION notify_low_stock();

-- ============================================
-- Utility: Mark all notifications as read
-- ============================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = true,
        read_at = NOW()
    WHERE user_id = p_user_id 
    AND is_read = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE notifications IS 'System notifications for real-time alerts on orders, inventory, and kitchen status';
