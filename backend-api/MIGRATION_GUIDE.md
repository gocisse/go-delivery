# Database Migration Guide

This guide explains how to run database migrations for the GOExpress-BF project using Supabase CLI.

## Quick Start

### Option 1: Node.js Script (Recommended)
\`\`\`bash
npm run migrate
\`\`\`

### Option 2: Bash Script
\`\`\`bash
npm run migrate:bash
\`\`\`

### Option 3: Manual Supabase CLI
\`\`\`bash
supabase db push
\`\`\`

## Available Scripts

| Command | Description |
|---------|-------------|
| \`npm run migrate\` | Run complete migration process (Node.js) |
| \`npm run migrate:bash\` | Run complete migration process (Bash) |
| \`npm run db:check\` | Check database health and status |
| \`npm run db:reset\` | Reset database (⚠️ DELETES ALL DATA) |
| \`npm run supabase:status\` | Show Supabase connection status |
| \`npm run supabase:push\` | Push migrations only |
| \`npm run supabase:pull\` | Pull remote schema changes |

## Migration Process

The migration script performs these steps:

1. **Prerequisites Check**
   - ✅ Supabase CLI installed
   - ✅ Environment variables configured
   - ✅ Project reference extracted

2. **Project Setup**
   - 📦 Initialize Supabase (if needed)
   - 🔗 Link to remote project
   - 📋 Verify migration files

3. **Database Migration**
   - ⬆️ Push migrations to remote database
   - 🔍 Verify schema creation
   - ✅ Confirm successful deployment

## Migration Files

The following migrations will be applied in order:

1. **`20240101000001_initial_schema.sql`**
   - Creates all core tables
   - Sets up relationships and constraints
   - Adds basic indexes and triggers

2. **`20240101000002_rls_policies.sql`**
   - Enables Row Level Security
   - Creates role-based access policies
   - Configures user permissions

3. **`20240101000003_performance_indexes.sql`**
   - Adds composite indexes
   - Creates partial indexes for performance
   - Sets up text search indexes

4. **`20240101000004_sample_data.sql`** (Optional)
   - Inserts sample data for testing
   - Creates test users and orders
   - Provides development data

## Environment Setup

Ensure your \`.env\` file contains:

\`\`\`env
# Required
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional (for CLI authentication)
SUPABASE_ACCESS_TOKEN=your-access-token

# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
\`\`\`

## Troubleshooting

### Common Issues

**1. "Supabase CLI not found"**
\`\`\`bash
npm install -g supabase
\`\`\`

**2. "Project linking failed"**
- Check your \`SUPABASE_URL\` format
- Verify project permissions
- Set \`SUPABASE_ACCESS_TOKEN\` if needed

**3. "Migration failed"**
- Check if tables already exist
- Review error messages in output
- Consider using \`npm run db:reset\` (⚠️ deletes data)

**4. "Permission denied"**
- Verify \`SUPABASE_SERVICE_ROLE_KEY\`
- Check project access in Supabase dashboard
- Ensure you're the project owner/admin

### Getting Help

1. **Check status**: \`npm run db:check\`
2. **View logs**: Check console output for detailed errors
3. **Reset database**: \`npm run db:reset\` (⚠️ destructive)
4. **Manual verification**: Check Supabase dashboard

## Database Schema

After migration, you'll have these tables:

### Core Tables
- **drivers** - Driver profiles and vehicle info
- **customers** - Customer accounts and addresses  
- **staff** - Internal team management
- **orders** - Delivery requests and status
- **tracking** - Real-time location data
- **user_profiles** - Auth user role mapping

### Key Features
- 🔐 **Row Level Security** on all tables
- 🚀 **Performance indexes** for fast queries
- 🔄 **Automatic timestamps** with triggers
- 👥 **Role-based access control**
- 📊 **Referential integrity** with foreign keys

## Next Steps

After successful migration:

1. **Start backend server**:
   \`\`\`bash
   npm run dev
   \`\`\`

2. **Test health endpoint**:
   \`\`\`bash
   curl http://localhost:3001/health
   \`\`\`

3. **Import Postman collection** for API testing

4. **Verify in Supabase dashboard** that all tables exist

5. **Test authentication flow** with your frontend

## Production Deployment

For production environments:

1. Use production Supabase project credentials
2. Set \`NODE_ENV=production\`
3. Configure proper CORS origins
4. Set up monitoring and alerting
5. Plan for backup and disaster recovery

---

✨ **Your GOExpress-BF database is ready for action!** 🚚📦
\`\`\`
