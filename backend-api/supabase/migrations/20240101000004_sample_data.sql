-- GOExpress-BF Sample Data Migration (Optional - for development/testing)

-- Insert sample staff member (admin)
INSERT INTO staff (id, name, email, role, department, status) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'System Admin', 'admin@goexpress.com', 'admin', 'Operations', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample customers
INSERT INTO customers (id, name, email, phone, address) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'John Smith', 'john.smith@example.com', '+1234567890', '123 Main St, New York, NY 10001'),
('550e8400-e29b-41d4-a716-446655440002', 'Jane Doe', 'jane.doe@example.com', '+1234567891', '456 Oak Ave, New York, NY 10002'),
('550e8400-e29b-41d4-a716-446655440003', 'Bob Johnson', 'bob.johnson@example.com', '+1234567892', '789 Pine Rd, New York, NY 10003')
ON CONFLICT (id) DO NOTHING;

-- Insert sample drivers
INSERT INTO drivers (id, name, email, phone, vehicle_type, license_number, status) VALUES 
('550e8400-e29b-41d4-a716-446655440010', 'Mike Wilson', 'mike.wilson@goexpress.com', '+1234567900', 'motorcycle', 'DL123456789', 'active'),
('550e8400-e29b-41d4-a716-446655440011', 'Sarah Davis', 'sarah.davis@goexpress.com', '+1234567901', 'van', 'DL987654321', 'active'),
('550e8400-e29b-41d4-a716-446655440012', 'Tom Brown', 'tom.brown@goexpress.com', '+1234567902', 'truck', 'DL456789123', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample orders
INSERT INTO orders (id, customer_id, pickup_address, delivery_address, package_description, priority, status) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', '123 Main St, New York, NY 10001', '789 Broadway, New York, NY 10003', 'Electronics package', 'normal', 'pending'),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', '456 Oak Ave, New York, NY 10002', '321 Park Ave, New York, NY 10010', 'Documents', 'high', 'pending'),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440003', '789 Pine Rd, New York, NY 10003', '654 5th Ave, New York, NY 10019', 'Food delivery', 'urgent', 'assigned'),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440001', '123 Main St, New York, NY 10001', '987 Wall St, New York, NY 10005', 'Medical supplies', 'urgent', 'delivered')
ON CONFLICT (id) DO NOTHING;

-- Assign some orders to drivers
UPDATE orders SET driver_id = '550e8400-e29b-41d4-a716-446655440010', status = 'assigned', assigned_at = NOW() 
WHERE id = '550e8400-e29b-41d4-a716-446655440022';

UPDATE orders SET driver_id = '550e8400-e29b-41d4-a716-446655440011', status = 'delivered', assigned_at = NOW() - INTERVAL '2 hours', delivered_at = NOW() - INTERVAL '30 minutes'
WHERE id = '550e8400-e29b-41d4-a716-446655440023';

-- Insert sample tracking data
INSERT INTO tracking (order_id, driver_id, latitude, longitude, timestamp) VALUES 
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440010', 40.7128, -74.0060, NOW() - INTERVAL '10 minutes'),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440010', 40.7589, -73.9851, NOW() - INTERVAL '5 minutes'),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440011', 40.7505, -73.9934, NOW() - INTERVAL '1 hour'),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440011', 40.7074, -74.0113, NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;
