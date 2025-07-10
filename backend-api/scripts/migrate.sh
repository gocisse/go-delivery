#!/bin/bash

# GOExpress-BF Migration Script (Bash version)
# This script runs Supabase migrations using the CLI

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${CYAN}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    print_status "🔍 Checking Supabase CLI..."
    
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI not found!"
        echo -e "${YELLOW}Install it with: npm install -g supabase${NC}"
        echo -e "${YELLOW}Or visit: https://supabase.com/docs/guides/cli/getting-started${NC}"
        exit 1
    fi
    
    local version=$(supabase --version)
    print_success "Supabase CLI installed: $version"
}

# Check environment variables
check_environment() {
    print_status "🔧 Checking environment variables..."
    
    if [ ! -f ".env" ]; then
        print_error ".env file not found!"
        echo -e "${YELLOW}Create .env file with your Supabase credentials${NC}"
        exit 1
    fi
    
    # Load environment variables
    export $(grep -v '^#' .env | xargs)
    
    if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        print_error "SUPABASE_URL not set in .env file!"
        exit 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
        print_error "SUPABASE_SERVICE_ROLE_KEY not set in .env file!"
        exit 1
    fi
    
    print_success "Environment variables loaded"
}

# Initialize Supabase if needed
init_supabase() {
    print_status "📦 Checking Supabase initialization..."
    
    if [ ! -d "supabase" ]; then
        print_status "Initializing Supabase project..."
        supabase init
        print_success "Supabase project initialized"
    else
        print_success "Supabase already initialized"
    fi
}

# Link to remote project
link_project() {
    print_status "🔗 Linking to remote Supabase project..."
    
    # Extract project reference from URL
    local project_ref
    if [ -n "$SUPABASE_URL" ]; then
        project_ref=$(echo "$SUPABASE_URL" | sed -n 's/.*https:\/\/$$[^.]*$$\.supabase\.co.*/\1/p')
    elif [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        project_ref=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -n 's/.*https:\/\/$$[^.]*$$\.supabase\.co.*/\1/p')
    fi
    
    if [ -z "$project_ref" ]; then
        print_error "Could not extract project reference from SUPABASE_URL!"
        exit 1
    fi
    
    print_status "Project reference: $project_ref"
    
    # Check if already linked
    if supabase status &> /dev/null; then
        print_success "Project already linked"
    else
        supabase link --project-ref "$project_ref"
        print_success "Project linked successfully"
    fi
}

# Run migrations
run_migrations() {
    print_status "🗄️  Running database migrations..."
    
    if [ ! -d "supabase/migrations" ]; then
        print_error "Migrations directory not found!"
        echo -e "${YELLOW}Expected: supabase/migrations/${NC}"
        exit 1
    fi
    
    # Count migration files
    local migration_count=$(find supabase/migrations -name "*.sql" | wc -l)
    print_status "Found $migration_count migration files"
    
    if [ "$migration_count" -eq 0 ]; then
        print_error "No migration files found!"
        exit 1
    fi
    
    # List migration files
    echo -e "${BLUE}📋 Migration files:${NC}"
    find supabase/migrations -name "*.sql" | sort | nl -w2 -s'. '
    
    # Push migrations
    print_status "⬆️  Pushing migrations to remote database..."
    supabase db push
    
    print_success "Migrations applied successfully!"
}

# Verify setup
verify_setup() {
    print_status "🔍 Verifying database setup..."
    
    # Check if we can connect
    if supabase status &> /dev/null; then
        print_success "Database connection verified"
    else
        print_warning "Could not verify database connection"
    fi
    
    # List expected tables
    echo -e "${BLUE}📊 Expected tables:${NC}"
    echo "   • drivers"
    echo "   • customers"
    echo "   • staff"
    echo "   • orders"
    echo "   • tracking"
    echo "   • user_profiles"
}

# Show next steps
show_next_steps() {
    echo ""
    print_success "🎉 Migration completed successfully!"
    echo ""
    echo -e "${CYAN}📋 Next steps:${NC}"
    echo -e "   1. Start your backend server:"
    echo -e "      ${BLUE}npm run dev${NC}"
    echo ""
    echo -e "   2. Test the health endpoint:"
    echo -e "      ${BLUE}curl http://localhost:3001/health${NC}"
    echo ""
    echo -e "   3. Import Postman collection:"
    echo -e "      ${BLUE}backend-api/postman_collection.json${NC}"
    echo ""
    print_success "✨ Your GOExpress-BF database is ready!"
}

# Main execution
main() {
    echo -e "${CYAN}🚀 GOExpress-BF Database Migration Script${NC}"
    echo ""
    
    check_supabase_cli
    check_environment
    init_supabase
    link_project
    run_migrations
    verify_setup
    show_next_steps
}

# Handle command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo -e "${CYAN}GOExpress-BF Migration Script${NC}"
    echo ""
    echo -e "${CYAN}Usage:${NC}"
    echo -e "  ${BLUE}./scripts/migrate.sh${NC}"
    echo -e "  ${BLUE}npm run migrate${NC}"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo -e "  ${BLUE}--help, -h${NC}     Show this help message"
    echo ""
    echo -e "${CYAN}Environment Variables Required:${NC}"
    echo -e "  ${BLUE}SUPABASE_URL${NC}                 Your Supabase project URL"
    echo -e "  ${BLUE}SUPABASE_SERVICE_ROLE_KEY${NC}    Your service role key"
    echo -e "  ${BLUE}SUPABASE_ACCESS_TOKEN${NC}        Your access token (optional)"
    exit 0
fi

# Run main function
main "$@"
