# Supabase Setup Guide for GOExpress-BF

This guide will help you connect your GOExpress-BF backend to your existing Supabase instance using proper migrations.

## Prerequisites

1. **Supabase CLI** - Install globally:
   \`\`\`bash
   npm install -g supabase
   \`\`\`

2. **Existing Supabase Project** - You should have:
   - Project URL (e.g., `https://your-project.supabase.co`)
   - Service Role Key (from Project Settings > API)
   - Anon Key (from Project Settings > API)

## Quick Setup

### 1. Configure Environment Variables

Create or update your `.env` file:

\`\`\`env
# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Optional: For Supabase CLI authentication
SUPABASE_ACCESS_TOKEN=your-access-token

# Logging Configuration
LOG_LEVEL=info
\`\`\`

### 2. Run Automated Setup

\`\`\`bash
cd backend-api
npm install
npm run supabase:setup
\`\`\`

This will:
- Initialize Supabase in your project
- Link to your remote Supabase instance
- Run all migrations to create tables and policies
- Set up the complete database schema

### 3. Verify Setup

\`\`\`bash
npm run supabase:status
\`\`\`

## Manual Setup (Alternative)

If the automated setup doesn't work, you can set up manually:

### 1. Initialize Supabase

\`\`\`bash
cd backend-api
supabase init
\`\`\`

### 2. Link to Your Project

\`\`\`bash
supabase link --project-ref your-project-id
\`\`\`

### 3. Run Migrations

\`\`\`bash
supabase db push
\`\`\`

## Database Schema

The migrations will create the following tables:

### Core Tables
- **`drivers`** - Driver profiles and status
- **`customers`** - Customer information
- **`staff`** - Internal team management
- **`orders`** - Delivery orders and lifecycle
- **`tracking`** - Real-time location data
- **`user_profiles`** - User role mapping (links to auth.users)

### Relationships
- `orders.customer_id` → `customers.id`
- `orders.driver_id` → `drivers.id`
- `tracking.order_id` → `orders.id`
- `tracking.driver_id` → `drivers.id`
- `user_profiles.id` → `auth.users.id`

### Security
- **Row Level Security (RLS)** enabled on all tables
- **Role-based access control** (admin, driver, customer, staff)
- **Secure policies** for data access and modification

## Available Scripts

\`\`\`bash
# Setup Supabase connection and run migrations
npm run supabase:setup

# Run migrations only
npm run supabase:migrate

# Reset database (WARNING: Deletes all data)
npm run supabase:reset

# Check Supabase status
npm run supabase:status

# Start development server
npm run dev
\`\`\`

## Migration Files

The setup includes these migration files:

1. **`20240101000001_initial_schema.sql`** - Creates all tables and relationships
2. **`20240101000002_rls_policies.sql`** - Sets up Row Level Security policies
3. **`20240101000003_performance_indexes.sql`** - Adds performance indexes
4. **`20240101000004_sample_data.sql`** - Inserts sample data (optional)

## Testing the Setup

1. **Start the backend**:
   \`\`\`bash
   npm run dev
   \`\`\`

2. **Test health endpoint**:
   \`\`\`bash
   curl http://localhost:3001/health
   \`\`\`

3. **Import Postman collection** from `postman_collection.json`

4. **Test API endpoints** with proper authentication

## Troubleshooting

### Common Issues

1. **"Supabase CLI not found"**
   \`\`\`bash
   npm install -g supabase
   \`\`\`

2. **"Invalid project reference"**
   - Check your `SUPABASE_URL` format
   - Ensure it matches: `https://your-project-id.supabase.co`

3. **"Permission denied"**
   - Verify your `SUPABASE_SERVICE_ROLE_KEY`
   - Check project permissions in Supabase dashboard

4. **"Migration failed"**
   - Check if tables already exist
   - Use `supabase db reset` to start fresh (WARNING: Deletes data)

### Getting Help

1. Check Supabase logs in your dashboard
2. Review the migration files for any conflicts
3. Ensure your Supabase project has the required permissions
4. Verify your environment variables are correct

## Production Deployment

For production:

1. Update environment variables with production values
2. Use production Supabase project credentials
3. Set `NODE_ENV=production`
4. Configure proper CORS origins
5. Set up monitoring and logging

## Next Steps

After successful setup:

1. ✅ Database schema created
2. ✅ RLS policies configured
3. ✅ Performance indexes added
4. 🔄 Start building your frontend
5. 🔄 Implement authentication flow
6. 🔄 Test all API endpoints
7. 🔄 Deploy to production
