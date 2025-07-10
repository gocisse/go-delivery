# GOExpress-BF Backend

Production-ready Node.js backend for GOExpress-BF delivery management system.

## Features

- **Authentication**: Supabase JWT with role-based access control
- **Security**: Rate limiting, CORS protection, SQL injection prevention
- **Logging**: Winston-based structured logging
- **Database**: Supabase with Row-Level Security (RLS)
- **API**: RESTful endpoints for all delivery operations
- **Real-time**: Location tracking and order status updates

## Quick Start

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment Setup**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   \`\`\`

3. **Database Setup**
   \`\`\`bash
   # Run the SQL scripts in your Supabase SQL editor
   # 1. schemas/rls_policies.sql
   # 2. scripts/create_indexes.sql
   \`\`\`

4. **Start Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

## API Endpoints

### Authentication
All endpoints require Bearer token authentication except customer registration.

### Tracking System
- `GET /api/tracking/:id` - Get package status and location
- `POST /api/tracking/update` - Update driver location
- `POST /api/tracking/batch-update` - Batch location updates

### Driver Management
- `POST /api/drivers` - Create driver (admin only)
- `GET /api/drivers/:id` - Get driver profile
- `PUT /api/drivers/:id` - Update driver status
- `GET /api/drivers/available` - List available drivers

### Customer Portal
- `POST /api/customers` - Customer registration
- `GET /api/customers/:id` - Get customer profile and order history
- `PUT /api/customers/:id` - Update customer info

### Order Lifecycle
- `POST /api/orders` - Create delivery request
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/pending` - List pending orders
- `PUT /api/orders/:id/assign` - Assign order to driver

### Staff Management
- `POST /api/staff` - Create staff member (admin only)
- `GET /api/staff` - List staff members
- `GET /api/staff/dashboard/stats` - Dashboard statistics

## Security Features

- **Rate Limiting**: 100 requests per minute per IP
- **CORS**: Restricted to frontend domain
- **SQL Injection Protection**: Parameterized queries
- **Row-Level Security**: Database-level access control
- **JWT Validation**: Supabase authentication

## Database Schema

### Tables
- `drivers` - Driver profiles and status
- `customers` - Customer information
- `orders` - Delivery orders and lifecycle
- `tracking` - Real-time location data
- `staff` - Internal team management
- `user_profiles` - User role mapping

### Roles
- `admin` - Full system access
- `driver` - Assigned orders and location updates
- `customer` - Own orders and profile
- `staff` - Internal operations

## Deployment

1. **Environment Variables**
   \`\`\`bash
   NODE_ENV=production
   PORT=3001
   SUPABASE_URL=your_production_url
   SUPABASE_SERVICE_ROLE_KEY=your_production_key
   FRONTEND_URL=https://your-frontend-domain.com
   \`\`\`

2. **Database Setup**
   - Run SQL scripts in production Supabase
   - Configure RLS policies
   - Set up indexes for performance

3. **Start Production Server**
   \`\`\`bash
   npm start
   \`\`\`

## Testing

Import the Postman collection (`postman_collection.json`) for comprehensive API testing.

## Monitoring

- Logs: `logs/backend.log` and `logs/combined.log`
- Health Check: `GET /health`
- Dashboard Stats: `GET /api/staff/dashboard/stats`

## Performance Optimizations

- Reused Supabase client instance
- Batch location updates
- Database indexes on frequently queried columns
- Connection pooling
- Structured logging for debugging

## Support

For issues and support, check the logs and ensure all environment variables are properly configured.
