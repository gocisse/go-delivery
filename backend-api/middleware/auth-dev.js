// Development-only auth bypass for testing
// DO NOT USE IN PRODUCTION

const authenticateToken = async (req, res, next) => {
  // Mock user for development testing
  req.user = {
    id: "dev-user-123",
    email: "dev@goexpress.com",
    role: "admin", // Change to test different roles: admin, driver, customer, staff
    metadata: {},
  }
  next()
}

module.exports = { authenticateToken }
