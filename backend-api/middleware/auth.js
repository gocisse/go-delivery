const jwt = require("jsonwebtoken")
const supabase = require("../lib/supabaseClient")
const logger = require("../lib/logger")

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        code: "MISSING_TOKEN",
        message: "Access token is required",
      })
    }

    // Verify JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      logger.warn("Invalid token attempt:", { error: error?.message, ip: req.ip })
      return res.status(401).json({
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      })
    }

    // Get user role from user metadata or database
    let userRole = user.user_metadata?.role

    if (!userRole) {
      // Fallback: check user role in database
      const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

      userRole = profile?.role || "customer"
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: userRole,
      metadata: user.user_metadata,
    }

    next()
  } catch (error) {
    logger.error("Authentication error:", error)
    res.status(500).json({
      code: "AUTH_ERROR",
      message: "Authentication service error",
    })
  }
}

module.exports = { authenticateToken }
