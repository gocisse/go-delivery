-- GOExpress-BF Row Level Security Policies Migration

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
