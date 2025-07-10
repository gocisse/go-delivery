const logger = require("../lib/logger")

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      })
    }

    const userRole = req.user.role
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

    if (!roles.includes(userRole)) {
      logger.warn("Access denied:", {
        userId: req.user.id,
        userRole,
        requiredRoles: roles,
        endpoint: req.originalUrl,
        method: req.method,
      })

      return res.status(403).json({
        code: "INSUFFICIENT_PERMISSIONS",
        message: `Access denied. Required role(s): ${roles.join(", ")}`,
      })
    }

    next()
  }
}

// Specific role middleware
const requireAdmin = requireRole("admin")
const requireDriver = requireRole(["admin", "driver"])
const requireCustomer = requireRole(["admin", "customer"])
const requireStaff = requireRole(["admin", "staff"])

module.exports = {
  requireRole,
  requireAdmin,
  requireDriver,
  requireCustomer,
  requireStaff,
}
