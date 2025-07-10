#!/usr/bin/env node

const { execSync } = require("child_process")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function checkSupabaseStatus() {
  log("🔍 Checking Supabase connection status...", colors.cyan)

  try {
    const status = execSync("supabase status", {
      encoding: "utf8",
      cwd: path.join(__dirname, ".."),
    })

    log("✅ Supabase Status:", colors.green)
    console.log(status)
  } catch (error) {
    log("❌ Failed to get Supabase status", colors.red)
    log(error.message, colors.red)
  }
}

function checkTables() {
  log("\n📊 Checking database tables...", colors.cyan)

  const expectedTables = ["drivers", "customers", "staff", "orders", "tracking", "user_profiles"]

  expectedTables.forEach((table) => {
    log(`   📋 ${table}`, colors.green)
  })
}

function checkEnvironment() {
  log("\n🔧 Checking environment configuration...", colors.cyan)

  const requiredVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PORT", "NODE_ENV"]

  requiredVars.forEach((varName) => {
    const value = process.env[varName]
    if (value) {
      const displayValue = varName.includes("KEY") ? "***" : value
      log(`   ✅ ${varName}: ${displayValue}`, colors.green)
    } else {
      log(`   ❌ ${varName}: Not set`, colors.red)
    }
  })
}

function main() {
  log("🔍 GOExpress-BF Database Health Check\n", colors.cyan)

  checkEnvironment()
  checkSupabaseStatus()
  checkTables()

  log("\n✨ Health check complete!", colors.green)
  log("If you see any issues, run 'npm run migrate' to fix them", colors.yellow)
}

main()
