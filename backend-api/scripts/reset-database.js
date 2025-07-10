#!/usr/bin/env node

const { execSync } = require("child_process")
const path = require("path")
const readline = require("readline")

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function main() {
  log("⚠️  Database Reset Script", colors.yellow)
  log("This will DELETE ALL DATA in your database!", colors.red)

  const confirm = await askQuestion("Are you sure you want to continue? (yes/no): ")

  if (confirm.toLowerCase() !== "yes") {
    log("❌ Reset cancelled", colors.green)
    process.exit(0)
  }

  const doubleConfirm = await askQuestion("Type 'DELETE ALL DATA' to confirm: ")

  if (doubleConfirm !== "DELETE ALL DATA") {
    log("❌ Reset cancelled - confirmation text didn't match", colors.green)
    process.exit(0)
  }

  try {
    log("\n🗑️  Resetting database...", colors.cyan)
    execSync("supabase db reset", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    })

    log("✅ Database reset complete!", colors.green)
    log("Run 'npm run migrate' to recreate the schema", colors.cyan)
  } catch (error) {
    log("❌ Reset failed!", colors.red)
    log(error.message, colors.red)
    process.exit(1)
  }
}

main()
