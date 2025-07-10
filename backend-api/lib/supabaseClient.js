const { createClient } = require("@supabase/supabase-js")
const logger = require("./logger")

// Try multiple environment variable names
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  logger.error("Missing required Supabase environment variables")
  logger.error("Available env vars:", {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
  })
  process.exit(1)
}

// Create a single instance to reuse across the application
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Test connection on startup
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from("drivers").select("count").limit(1)
    if (error) throw error
    logger.info("Supabase connection established successfully")
  } catch (error) {
    logger.error("Failed to connect to Supabase:", error.message)
    // Don't exit in development, just warn
    if (process.env.NODE_ENV === "production") {
      process.exit(1)
    }
  }
}

testConnection()

module.exports = supabase
