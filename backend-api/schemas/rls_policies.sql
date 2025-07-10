-- GOExpress-BF Database Schema and RLS Policies
-- This file contains table creation and Row-Level Security policies

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Create tables
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL,
    license_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'busy', 'offline')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff', 'manager')),
    department VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES staff(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    package_description TEXT,
    delivery_instructions TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'driver', 'customer', 'staff')),
    profile_id UUID, -- References the specific profile table (drivers, customers, staff)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_order_id ON tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_timestamp ON tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable RLS on all tables
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drivers table
CREATE POLICY "Drivers can view their own profile" ON drivers
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Drivers can update their own profile" ON drivers
    FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin')
        )
    );

CREATE POLICY "Only admins can insert drivers" ON drivers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete drivers" ON drivers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for customers table
CREATE POLICY "Customers can view their own profile" ON customers
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Customers can update their own profile" ON customers
    FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin')
        )
    );

CREATE POLICY "Anyone can register as customer" ON customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can delete customers" ON customers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for staff table
CREATE POLICY "Staff can view based on role" ON staff
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff', 'manager')
        )
    );

CREATE POLICY "Only admins can manage staff" ON staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for orders table
CREATE POLICY "Users can view orders based on role" ON orders
    FOR SELECT USING (
        -- Customers can only see their own orders
        (EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'customer'
        ) AND customer_id = auth.uid()) OR
        -- Drivers can only see their assigned orders
        (EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'driver'
        ) AND driver_id = auth.uid()) OR
        -- Admin and staff can see all orders
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Users can create orders based on role" ON orders
    FOR INSERT WITH CHECK (
        -- Customers can create orders for themselves
        (EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'customer'
        ) AND customer_id = auth.uid()) OR
        -- Admin and staff can create orders for any customer
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Users can update orders based on role" ON orders
    FOR UPDATE USING (
        -- Customers can only cancel their own pending orders
        (EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'customer'
        ) AND customer_id = auth.uid()) OR
        -- Drivers can update their assigned orders
        (EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'driver'
        ) AND driver_id = auth.uid()) OR
        -- Admin and staff can update any order
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Only admins can delete orders" ON orders
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for tracking table
CREATE POLICY "Users can view tracking based on order access" ON tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN user_profiles up ON up.id = auth.uid()
            WHERE o.id = tracking.order_id AND (
                -- Customer can see tracking for their orders
                (up.role = 'customer' AND o.customer_id = auth.uid()) OR
                -- Driver can see tracking for their assigned orders
                (up.role = 'driver' AND o.driver_id = auth.uid()) OR
                -- Admin and staff can see all tracking
                up.role IN ('admin', 'staff')
            )
        )
    );

CREATE POLICY "Drivers can insert tracking for assigned orders" ON tracking
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN user_profiles up ON up.id = auth.uid()
            WHERE o.id = tracking.order_id 
            AND up.role = 'driver' 
            AND o.driver_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Only drivers and admins can update tracking" ON tracking
    FOR UPDATE USING (
        driver_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "Only admins can delete tracking" ON tracking
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for user_profiles table
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Anyone can create their profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional - for testing)
-- Note: In production, remove this section

-- Sample admin user profile (replace with actual auth.users ID)
-- INSERT INTO user_profiles (id, role) VALUES 
-- ('00000000-0000-0000-0000-000000000001', 'admin');

-- Sample staff member
-- INSERT INTO staff (id, name, email, role, department) VALUES 
-- ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@goexpress.com', 'admin', 'Operations');
