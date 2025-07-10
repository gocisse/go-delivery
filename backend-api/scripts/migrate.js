#!/usr/bin/env node

const { execSync } = require("child_process")
const path = require("path")

console.log("🔄 Running Supabase migrations...\n")

try {
  // Run migrations
  execSync("supabase db push", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  })

  console.log("\n✅ Migrations completed successfully!")
} catch (error) {
  console.error("\n❌ Migration failed:", error.message)
  process.exit(1)
}
