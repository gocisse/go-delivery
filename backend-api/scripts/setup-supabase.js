#!/usr/bin/env node

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("🚀 Setting up GOExpress-BF with Supabase...\n")

// Check if Supabase CLI is installed
try {
  execSync("supabase --version", { stdio: "pipe" })
  console.log("✅ Supabase CLI is installed")
} catch (error) {
  console.log("❌ Supabase CLI not found. Installing...")
  console.log("Please install Supabase CLI first:")
  console.log("npm install -g supabase")
  console.log("or visit: https://supabase.com/docs/guides/cli")
  process.exit(1)
}

// Check if .env file exists
const envPath = path.join(__dirname, "../.env")
if (!fs.existsSync(envPath)) {
  console.log("❌ .env file not found. Please create one with your Supabase credentials.")
  console.log("Copy .env.example to .env and fill in your Supabase details.")
  process.exit(1)
}

// Read environment variables
require("dotenv").config({ path: envPath })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log("❌ Missing Supabase credentials in .env file")
  console.log("Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

console.log("✅ Environment variables loaded")

// Extract project reference from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.log("❌ Invalid Supabase URL format")
  process.exit(1)
}

console.log(`✅ Project reference: ${projectRef}`)

try {
  // Initialize Supabase project
  console.log("\n📦 Initializing Supabase project...")
  execSync("supabase init", { stdio: "inherit", cwd: path.join(__dirname, "..") })

  // Link to remote project
  console.log("\n🔗 Linking to remote Supabase project...")
  execSync(`supabase link --project-ref ${projectRef}`, {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN },
  })

  // Run migrations
  console.log("\n🗄️  Running database migrations...")
  execSync("supabase db push", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  })

  console.log("\n✅ Supabase setup complete!")
  console.log("\n🎉 Your GOExpress-BF database is ready!")
  console.log("\nNext steps:")
  console.log("1. Start your backend: npm run dev")
  console.log("2. Test the API endpoints")
  console.log("3. Import the Postman collection for testing")
} catch (error) {
  console.error("\n❌ Setup failed:", error.message)
  console.log("\nTroubleshooting:")
  console.log("1. Make sure you have the correct Supabase credentials")
  console.log("2. Ensure you have access to the Supabase project")
  console.log("3. Check your internet connection")
  process.exit(1)
}
