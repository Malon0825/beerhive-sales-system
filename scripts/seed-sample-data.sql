-- ============================================
-- Sample Data Seeding Script (Optional)
-- Adds sample data for testing and development
-- Run this AFTER the main migration script
-- ============================================

-- Add sample product categories
INSERT INTO product_categories (id, name, description, color_code, default_destination, display_order) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Beers', 'Beer products', '#F59E0B', 'bartender', 1),
('550e8400-e29b-41d4-a716-446655440002', 'Cocktails', 'Mixed drinks', '#8B5CF6', 'bartender', 2),
('550e8400-e29b-41d4-a716-446655440003', 'Food', 'Food items', '#EF4444', 'kitchen', 3),
('550e8400-e29b-41d4-a716-446655440004', 'Appetizers', 'Starters and snacks', '#10B981', 'kitchen', 4),
('550e8400-e29b-41d4-a716-446655440005', 'Non-Alcoholic', 'Soft drinks and juices', '#3B82F6', 'bartender', 5);

-- Add sample products
INSERT INTO products (id, sku, name, description, category_id, base_price, vip_price, cost_price, current_stock, unit_of_measure, reorder_point, reorder_quantity, is_active, is_featured) VALUES
-- Beers
('650e8400-e29b-41d4-a716-446655440001', 'BEER-001', 'San Miguel Pale Pilsen', 'Classic Filipino beer', '550e8400-e29b-41d4-a716-446655440001', 80.00, 70.00, 45.00, 500, 'bottle', 100, 200, true, true),
('650e8400-e29b-41d4-a716-446655440002', 'BEER-002', 'Red Horse Beer', 'Strong beer', '550e8400-e29b-41d4-a716-446655440001', 85.00, 75.00, 50.00, 300, 'bottle', 80, 150, true, true),
('650e8400-e29b-41d4-a716-446655440003', 'BEER-003', 'Heineken', 'Premium lager', '550e8400-e29b-41d4-a716-446655440001', 120.00, 100.00, 70.00, 200, 'bottle', 50, 100, true, false),
('650e8400-e29b-41d4-a716-446655440004', 'BEER-004', 'Corona Extra', 'Mexican beer', '550e8400-e29b-41d4-a716-446655440001', 130.00, 110.00, 75.00, 150, 'bottle', 40, 80, true, false),
('650e8400-e29b-41d4-a716-446655440005', 'BEER-005', 'Beer Bucket (5 bottles)', 'Bucket of 5 beers', '550e8400-e29b-41d4-a716-446655440001', 350.00, 300.00, 200.00, 50, 'bucket', 20, 30, true, true),

-- Cocktails
('650e8400-e29b-41d4-a716-446655440006', 'COCK-001', 'Mojito', 'Classic rum cocktail', '550e8400-e29b-41d4-a716-446655440002', 180.00, 160.00, 80.00, 0, 'glass', 0, 0, true, true),
('650e8400-e29b-41d4-a716-446655440007', 'COCK-002', 'Margarita', 'Tequila cocktail', '550e8400-e29b-41d4-a716-446655440002', 200.00, 180.00, 90.00, 0, 'glass', 0, 0, true, false),
('650e8400-e29b-41d4-a716-446655440008', 'COCK-003', 'Long Island Iced Tea', 'Strong mixed drink', '550e8400-e29b-41d4-a716-446655440002', 250.00, 220.00, 100.00, 0, 'glass', 0, 0, true, true),

-- Food
('650e8400-e29b-41d4-a716-446655440009', 'FOOD-001', 'Buffalo Wings', '10 pieces spicy wings', '550e8400-e29b-41d4-a716-446655440003', 280.00, 250.00, 150.00, 0, 'serving', 0, 0, true, true),
('650e8400-e29b-41d4-a716-446655440010', 'FOOD-002', 'Nachos Supreme', 'Loaded nachos', '550e8400-e29b-41d4-a716-446655440003', 220.00, 200.00, 100.00, 0, 'serving', 0, 0, true, false),
('650e8400-e29b-41d4-a716-446655440011', 'FOOD-003', 'Burger & Fries', 'Classic burger meal', '550e8400-e29b-41d4-a716-446655440003', 250.00, 230.00, 120.00, 0, 'serving', 0, 0, true, true),

-- Appetizers
('650e8400-e29b-41d4-a716-446655440012', 'APP-001', 'Sisig', 'Crispy pork sisig', '550e8400-e29b-41d4-a716-446655440004', 180.00, 160.00, 90.00, 0, 'serving', 0, 0, true, true),
('650e8400-e29b-41d4-a716-446655440013', 'APP-002', 'Calamares', 'Fried squid rings', '550e8400-e29b-41d4-a716-446655440004', 200.00, 180.00, 100.00, 0, 'serving', 0, 0, true, false),
('650e8400-e29b-41d4-a716-446655440014', 'APP-003', 'French Fries', 'Crispy fries', '550e8400-e29b-41d4-a716-446655440004', 120.00, 100.00, 50.00, 0, 'serving', 0, 0, true, false),

-- Non-Alcoholic
('650e8400-e29b-41d4-a716-446655440015', 'NA-001', 'Coca-Cola', 'Coke in can', '550e8400-e29b-41d4-a716-446655440005', 50.00, 45.00, 25.00, 300, 'can', 100, 200, true, false),
('650e8400-e29b-41d4-a716-446655440016', 'NA-002', 'Bottled Water', 'Mineral water', '550e8400-e29b-41d4-a716-446655440005', 30.00, 25.00, 15.00, 500, 'bottle', 150, 300, true, false),
('650e8400-e29b-41d4-a716-446655440017', 'NA-003', 'Orange Juice', 'Fresh orange juice', '550e8400-e29b-41d4-a716-446655440005', 80.00, 70.00, 40.00, 0, 'glass', 0, 0, true, false);

-- Add sample restaurant tables
INSERT INTO restaurant_tables (id, table_number, area, capacity, status) VALUES
('750e8400-e29b-41d4-a716-446655440001', '1', 'indoor', 4, 'available'),
('750e8400-e29b-41d4-a716-446655440002', '2', 'indoor', 4, 'available'),
('750e8400-e29b-41d4-a716-446655440003', '3', 'indoor', 6, 'available'),
('750e8400-e29b-41d4-a716-446655440004', '4', 'indoor', 2, 'available'),
('750e8400-e29b-41d4-a716-446655440005', '5', 'outdoor', 4, 'available'),
('750e8400-e29b-41d4-a716-446655440006', '6', 'outdoor', 4, 'available'),
('750e8400-e29b-41d4-a716-446655440007', '7', 'outdoor', 6, 'available'),
('750e8400-e29b-41d4-a716-446655440008', '8', 'vip_section', 8, 'available'),
('750e8400-e29b-41d4-a716-446655440009', '9', 'vip_section', 6, 'available'),
('750e8400-e29b-41d4-a716-446655440010', '10', 'bar_area', 2, 'available');

-- Add sample customers
INSERT INTO customers (id, customer_number, full_name, phone, email, birth_date, tier, loyalty_points, total_spent, visit_count) VALUES
('850e8400-e29b-41d4-a716-446655440001', 'CUST-000001', 'Juan Dela Cruz', '09171234567', 'juan@example.com', '1990-05-15', 'vip_gold', 5000, 25000.00, 50),
('850e8400-e29b-41d4-a716-446655440002', 'CUST-000002', 'Maria Santos', '09181234567', 'maria@example.com', '1985-08-20', 'vip_silver', 2000, 10000.00, 25),
('850e8400-e29b-41d4-a716-446655440003', 'CUST-000003', 'Pedro Reyes', '09191234567', 'pedro@example.com', '1995-12-10', 'regular', 500, 2500.00, 10),
('850e8400-e29b-41d4-a716-446655440004', 'CUST-000004', 'Ana Garcia', '09201234567', 'ana@example.com', '1992-03-25', 'regular', 100, 500.00, 3),
('850e8400-e29b-41d4-a716-446655440005', 'CUST-000005', 'Jose Rizal', '09211234567', 'jose@example.com', '1988-11-30', 'vip_platinum', 10000, 50000.00, 100);

-- Add sample happy hour
INSERT INTO happy_hour_pricing (id, name, description, start_time, end_time, days_of_week, discount_type, discount_value, applies_to_all_products, is_active) VALUES
('950e8400-e29b-41d4-a716-446655440001', 'Weekday Happy Hour', 'Monday to Friday afternoon special', '15:00:00', '18:00:00', ARRAY[1,2,3,4,5], 'percentage', 20.00, false, true),
('950e8400-e29b-41d4-a716-446655440002', 'Weekend Beer Bucket Special', 'Saturday and Sunday beer bucket promo', '14:00:00', '19:00:00', ARRAY[6,7], 'fixed_amount', 50.00, false, true);

-- Link happy hour to beer products
INSERT INTO happy_hour_products (happy_hour_id, product_id) VALUES
('950e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001'),
('950e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002'),
('950e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440003'),
('950e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440005');

-- Add sample VIP package
INSERT INTO packages (id, package_code, name, description, package_type, base_price, vip_price, is_active) VALUES
('a50e8400-e29b-41d4-a716-446655440001', 'PKG-001', 'Beer Lovers Package', '5 beers + wings', 'regular', 600.00, 550.00, true),
('a50e8400-e29b-41d4-a716-446655440002', 'PKG-002', 'VIP Party Package', '10 beers + 2 appetizers', 'vip_only', 1200.00, 1000.00, true);

-- Add package items
INSERT INTO package_items (package_id, product_id, quantity) VALUES
('a50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 5),
('a50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440009', 1),
('a50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', 10),
('a50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440012', 1),
('a50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440013', 1);

-- Success message
SELECT '✅ Sample data seeded successfully!' as message;
SELECT 'You can now test the POS system with this data.' as message;
