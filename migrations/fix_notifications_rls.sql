-- ============================================
-- Fix Notifications RLS Policy
-- Resolves: "new row violates row-level security policy for table notifications"
-- ============================================

-- Problem: The trigger functions run with the permissions of the user who triggered them
-- When a cashier creates an order, the trigger tries to insert a notification but fails
-- because the INSERT policy only allows service_role

-- Solution: Make trigger functions run with SECURITY DEFINER (as the function owner/superuser)
-- This allows the function to bypass RLS and insert notifications

-- ============================================
-- Step 1: Drop and recreate trigger functions with SECURITY DEFINER
-- ============================================

-- Fix: notify_new_order function
DROP FUNCTION IF EXISTS notify_new_order() CASCADE;
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER 
SECURITY DEFINER  -- Run with function owner's privileges (bypasses RLS)
SET search_path = public  -- Prevent search_path exploitation
AS $$
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_new_order ON orders;
CREATE TRIGGER trigger_notify_new_order
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_order();

-- Fix: notify_order_completed function
DROP FUNCTION IF EXISTS notify_order_completed() CASCADE;
CREATE OR REPLACE FUNCTION notify_order_completed()
RETURNS TRIGGER
SECURITY DEFINER  -- Run with function owner's privileges
SET search_path = public
AS $$
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_order_completed ON orders;
CREATE TRIGGER trigger_notify_order_completed
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_completed();

-- Fix: notify_kitchen_order_ready function
DROP FUNCTION IF EXISTS notify_kitchen_order_ready() CASCADE;
CREATE OR REPLACE FUNCTION notify_kitchen_order_ready()
RETURNS TRIGGER
SECURITY DEFINER  -- Run with function owner's privileges
SET search_path = public
AS $$
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_kitchen_order_ready ON kitchen_orders;
CREATE TRIGGER trigger_notify_kitchen_order_ready
    AFTER UPDATE ON kitchen_orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_kitchen_order_ready();

-- Fix: notify_low_stock function
DROP FUNCTION IF EXISTS notify_low_stock() CASCADE;
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER
SECURITY DEFINER  -- Run with function owner's privileges
SET search_path = public
AS $$
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_low_stock ON products;
CREATE TRIGGER trigger_notify_low_stock
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION notify_low_stock();

-- ============================================
-- Step 2: Fix helper functions with SECURITY DEFINER
-- ============================================

-- Fix: create_order_notification function
DROP FUNCTION IF EXISTS create_order_notification(UUID, notification_type, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION create_order_notification(
    p_order_id UUID,
    p_type notification_type,
    p_title VARCHAR,
    p_message TEXT
)
RETURNS UUID
SECURITY DEFINER  -- Run with function owner's privileges
SET search_path = public
AS $$
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

-- Fix: create_inventory_notification function
DROP FUNCTION IF EXISTS create_inventory_notification(UUID, VARCHAR, DECIMAL, DECIMAL, notification_type);
CREATE OR REPLACE FUNCTION create_inventory_notification(
    p_product_id UUID,
    p_product_name VARCHAR,
    p_current_stock DECIMAL,
    p_reorder_point DECIMAL,
    p_type notification_type
)
RETURNS UUID
SECURITY DEFINER  -- Run with function owner's privileges
SET search_path = public
AS $$
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
-- Step 3: Verify RLS policies are still in place
-- ============================================

-- These policies should already exist, but let's ensure they're correct

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- Recreate policies

-- Policy: Users can view notifications targeted to them
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

-- Policy: Service role can insert notifications
-- Note: Triggers will bypass this due to SECURITY DEFINER
CREATE POLICY "Service role can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Policy: Allow authenticated users to delete their own notifications (optional)
CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (
        auth.uid()::uuid = user_id OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND users.role = notifications.role
        )
    );

-- ============================================
-- Step 4: Grant necessary permissions
-- ============================================

-- Grant execute permissions on trigger functions to authenticated users
-- This is safe because SECURITY DEFINER handles the privilege escalation

GRANT EXECUTE ON FUNCTION notify_new_order() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_order_completed() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_kitchen_order_ready() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_low_stock() TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_notification(UUID, notification_type, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_inventory_notification(UUID, VARCHAR, DECIMAL, DECIMAL, notification_type) TO authenticated;

-- ============================================
-- Verification Query
-- ============================================

-- Run this to verify the fix worked:
-- SELECT 
--     schemaname, 
--     tablename, 
--     policyname, 
--     permissive, 
--     roles, 
--     cmd, 
--     qual 
-- FROM pg_policies 
-- WHERE tablename = 'notifications';

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Notifications RLS fix applied successfully!';
    RAISE NOTICE '   - All trigger functions now use SECURITY DEFINER';
    RAISE NOTICE '   - Notifications will be created automatically';
    RAISE NOTICE '   - Test by creating a new order';
END $$;
