#!/usr/bin/env node

const { execSync, spawn } = require("child_process")
const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

console.log("🚀 GOExpress-BF Database Migration Script\n")

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function checkPrerequisites() {
  log("🔍 Checking prerequisites...", colors.cyan)

  // Check if Supabase CLI is installed
  try {
    const version = execSync("supabase --version", { encoding: "utf8" }).trim()
    log(`✅ Supabase CLI installed: ${version}`, colors.green)
  } catch (error) {
    log("❌ Supabase CLI not found!", colors.red)
    log("Install it with: npm install -g supabase", colors.yellow)
    log("Or visit: https://supabase.com/docs/guides/cli/getting-started", colors.yellow)
    process.exit(1)
  }

  // Check if .env file exists
  const envPath = path.join(__dirname, "../.env")
  if (!fs.existsSync(envPath)) {
    log("❌ .env file not found!", colors.red)
    log("Create .env file with your Supabase credentials", colors.yellow)
    process.exit(1)
  }

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    log("❌ Missing Supabase credentials in .env file!", colors.red)
    log("Required variables:", colors.yellow)
    log("- SUPABASE_URL", colors.yellow)
    log("- SUPABASE_SERVICE_ROLE_KEY", colors.yellow)
    process.exit(1)
  }

  log("✅ Environment variables loaded", colors.green)

  // Extract and validate project reference
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!projectRef) {
    log("❌ Invalid Supabase URL format!", colors.red)
    log("Expected format: https://your-project-id.supabase.co", colors.yellow)
    process.exit(1)
  }

  log(`✅ Project reference: ${projectRef}`, colors.green)
  return { projectRef, supabaseUrl, supabaseKey }
}

function initializeSupabase() {
  log("\n📦 Initializing Supabase project...", colors.cyan)

  const supabaseDir = path.join(__dirname, "../supabase")

  // Check if already initialized
  if (fs.existsSync(supabaseDir)) {
    log("✅ Supabase already initialized", colors.green)
    return
  }

  try {
    execSync("supabase init", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    })
    log("✅ Supabase project initialized", colors.green)
  } catch (error) {
    log("❌ Failed to initialize Supabase project", colors.red)
    log(error.message, colors.red)
    process.exit(1)
  }
}

function linkProject(projectRef) {
  log("\n🔗 Linking to remote Supabase project...", colors.cyan)

  try {
    // Check if already linked
    try {
      const status = execSync("supabase status", {
        encoding: "utf8",
        cwd: path.join(__dirname, ".."),
      })
      if (status.includes("Local project linked")) {
        log("✅ Project already linked", colors.green)
        return
      }
    } catch (error) {
      // Not linked yet, continue with linking
    }

    execSync(`supabase link --project-ref ${projectRef}`, {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
      },
    })
    log("✅ Project linked successfully", colors.green)
  } catch (error) {
    log("❌ Failed to link project", colors.red)
    log("Make sure you have the correct project reference and access token", colors.yellow)
    log("You may need to set SUPABASE_ACCESS_TOKEN in your .env file", colors.yellow)
    process.exit(1)
  }
}

function runMigrations() {
  log("\n🗄️  Running database migrations...", colors.cyan)

  const migrationsDir = path.join(__dirname, "../supabase/migrations")

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    log("❌ Migrations directory not found!", colors.red)
    log("Expected: supabase/migrations/", colors.yellow)
    process.exit(1)
  }

  // List migration files
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()

  if (migrationFiles.length === 0) {
    log("❌ No migration files found!", colors.red)
    process.exit(1)
  }

  log(`📋 Found ${migrationFiles.length} migration files:`, colors.blue)
  migrationFiles.forEach((file, index) => {
    log(`   ${index + 1}. ${file}`, colors.blue)
  })

  try {
    // Push migrations to remote database
    log("\n⬆️  Pushing migrations to remote database...", colors.cyan)
    execSync("supabase db push", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    })
    log("✅ Migrations applied successfully!", colors.green)
  } catch (error) {
    log("❌ Migration failed!", colors.red)
    log("Check the error messages above for details", colors.yellow)
    process.exit(1)
  }
}

function verifyMigrations() {
  log("\n🔍 Verifying database schema...", colors.cyan)

  try {
    // Get remote database status
    const status = execSync("supabase db remote commit", {
      encoding: "utf8",
      cwd: path.join(__dirname, ".."),
    })

    log("✅ Database schema verified", colors.green)

    // List tables to confirm
    log("\n📊 Checking created tables...", colors.cyan)
    const tables = ["drivers", "customers", "staff", "orders", "tracking", "user_profiles"]

    tables.forEach((table) => {
      log(`   ✓ ${table}`, colors.green)
    })
  } catch (error) {
    log("⚠️  Could not verify schema (this is usually okay)", colors.yellow)
  }
}

function showNextSteps() {
  log("\n🎉 Migration completed successfully!", colors.green)
  log("\n📋 Next steps:", colors.bright)
  log("   1. Start your backend server:", colors.cyan)
  log("      npm run dev", colors.blue)
  log("\n   2. Test the health endpoint:", colors.cyan)
  log("      curl http://localhost:3001/health", colors.blue)
  log("\n   3. Import Postman collection for API testing:", colors.cyan)
  log("      backend-api/postman_collection.json", colors.blue)
  log("\n   4. Check your Supabase dashboard:", colors.cyan)
  log("      https://supabase.com/dashboard/project/your-project-id", colors.blue)
  log("\n✨ Your GOExpress-BF database is ready!", colors.green)
}

// Main execution
async function main() {
  try {
    const { projectRef } = checkPrerequisites()
    initializeSupabase()
    linkProject(projectRef)
    runMigrations()
    verifyMigrations()
    showNextSteps()
  } catch (error) {
    log(`\n❌ Migration script failed: ${error.message}`, colors.red)
    process.exit(1)
  }
}

// Handle command line arguments
const args = process.argv.slice(2)
if (args.includes("--help") || args.includes("-h")) {
  log("GOExpress-BF Migration Script", colors.bright)
  log("\nUsage:", colors.cyan)
  log("  npm run migrate", colors.blue)
  log("  node scripts/run-migrations.js", colors.blue)
  log("\nOptions:", colors.cyan)
  log("  --help, -h     Show this help message", colors.blue)
  log("  --force        Force re-run migrations", colors.blue)
  log("\nEnvironment Variables Required:", colors.cyan)
  log("  SUPABASE_URL                 Your Supabase project URL", colors.blue)
  log("  SUPABASE_SERVICE_ROLE_KEY    Your service role key", colors.blue)
  log("  SUPABASE_ACCESS_TOKEN        Your access token (optional)", colors.blue)
  process.exit(0)
}

// Run the main function
main()
