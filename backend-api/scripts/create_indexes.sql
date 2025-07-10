-- Additional performance indexes for GOExpress-BF
-- Run this after the main schema setup

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at 
ON orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_driver_status 
ON orders(driver_id, status) WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_status 
ON orders(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_tracking_order_timestamp 
ON tracking(order_id, timestamp DESC);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_drivers_active 
ON drivers(id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_orders_pending 
ON orders(id, created_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_in_progress 
ON orders(id, driver_id, updated_at) 
WHERE status IN ('assigned', 'picked_up', 'in_transit');

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_customers_name_search 
ON customers USING gin(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_drivers_name_search 
ON drivers USING gin(to_tsvector('english', name));

-- Geographic indexes for tracking (if using PostGIS)
-- Uncomment if PostGIS is available
-- CREATE INDEX IF NOT EXISTS idx_tracking_location 
-- ON tracking USING gist(ST_Point(longitude, latitude));

-- Analyze tables for better query planning
ANALYZE drivers;
ANALYZE customers;
ANALYZE staff;
ANALYZE orders;
ANALYZE tracking;
ANALYZE user_profiles;
