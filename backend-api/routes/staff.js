const express = require("express")
const supabase = require("../lib/supabaseClient")
const { authenticateToken } = require("../middleware/auth")
const { requireAdmin, requireStaff } = require("../middleware/rbac")
const logger = require("../lib/logger")

const router = express.Router()

// POST /staff - Create staff member (admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, role, department } = req.body

    if (!name || !email || !role) {
      return res.status(400).json({
        code: "MISSING_FIELDS",
        message: "name, email, and role are required",
      })
    }

    // Validate role
    const validRoles = ["admin", "staff", "manager"]
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        code: "INVALID_ROLE",
        message: `Role must be one of: ${validRoles.join(", ")}`,
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        code: "INVALID_EMAIL",
        message: "Invalid email format",
      })
    }

    // Check if staff member already exists
    const { data: existingStaff } = await supabase.from("staff").select("id").eq("email", email).single()

    if (existingStaff) {
      return res.status(409).json({
        code: "STAFF_EXISTS",
        message: "Staff member with this email already exists",
      })
    }

    // Create staff record
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .insert({
        name,
        email,
        phone,
        role,
        department,
        status: "active",
        created_at: new Date().toISOString(),
        created_by: req.user.id,
      })
      .select()
      .single()

    if (staffError) {
      logger.error("Error creating staff member:", staffError)
      return res.status(500).json({
        code: "STAFF_CREATION_FAILED",
        message: "Failed to create staff member",
      })
    }

    logger.info("Staff member created:", {
      staffId: staff.id,
      email,
      role,
      createdBy: req.user.id,
    })

    res.status(201).json({
      message: "Staff member created successfully",
      staff,
    })
  } catch (error) {
    logger.error("Error in staff creation:", error)
    res.status(500).json({
      code: "STAFF_CREATION_ERROR",
      message: "Failed to create staff member",
    })
  }
})

// GET /staff - List all staff members
router.get("/", authenticateToken, requireStaff, async (req, res) => {
  try {
    const { role, department, status, page = 1, limit = 20 } = req.query

    let query = supabase.from("staff").select("*", { count: "exact" })

    // Apply filters
    if (role) {
      query = query.eq("role", role)
    }
    if (department) {
      query = query.eq("department", department)
    }
    if (status) {
      query = query.eq("status", status)
    }

    const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    query = query.order("created_at", { ascending: false }).range(offset, offset + Number.parseInt(limit) - 1)

    const { data: staff, error, count } = await query

    if (error) {
      logger.error("Error fetching staff:", error)
      return res.status(500).json({
        code: "STAFF_FETCH_FAILED",
        message: "Failed to fetch staff members",
      })
    }

    res.json({
      staff,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: count,
        pages: Math.ceil(count / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    logger.error("Error fetching staff list:", error)
    res.status(500).json({
      code: "STAFF_LIST_ERROR",
      message: "Failed to fetch staff list",
    })
  }
})

// GET /staff/:id - Get staff member details
router.get("/:id", authenticateToken, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    const { data: staff, error } = await supabase.from("staff").select("*").eq("id", id).single()

    if (error || !staff) {
      return res.status(404).json({
        code: "STAFF_NOT_FOUND",
        message: "Staff member not found",
      })
    }

    // Non-admin users can only view their own profile
    if (req.user.role !== "admin" && req.user.id !== id) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only view your own profile",
      })
    }

    res.json({ staff })
  } catch (error) {
    logger.error("Error fetching staff details:", error)
    res.status(500).json({
      code: "STAFF_FETCH_ERROR",
      message: "Failed to fetch staff details",
    })
  }
})

// PUT /staff/:id - Update staff member
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, phone, role, department, status } = req.body

    // Validate role if provided
    if (role) {
      const validRoles = ["admin", "staff", "manager"]
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          code: "INVALID_ROLE",
          message: `Role must be one of: ${validRoles.join(", ")}`,
        })
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ["active", "inactive", "suspended"]
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          code: "INVALID_STATUS",
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        })
      }
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString(),
    }

    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (role) updateData.role = role
    if (department) updateData.department = department
    if (status) updateData.status = status

    // Update staff member
    const { data: staff, error: updateError } = await supabase
      .from("staff")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      logger.error("Error updating staff member:", updateError)
      return res.status(500).json({
        code: "STAFF_UPDATE_FAILED",
        message: "Failed to update staff member",
      })
    }

    if (!staff) {
      return res.status(404).json({
        code: "STAFF_NOT_FOUND",
        message: "Staff member not found",
      })
    }

    logger.info("Staff member updated:", {
      staffId: id,
      updatedBy: req.user.id,
      changes: updateData,
    })

    res.json({
      message: "Staff member updated successfully",
      staff,
    })
  } catch (error) {
    logger.error("Error updating staff member:", error)
    res.status(500).json({
      code: "STAFF_UPDATE_ERROR",
      message: "Failed to update staff member",
    })
  }
})

// DELETE /staff/:id - Delete staff member (admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({
        code: "CANNOT_DELETE_SELF",
        message: "You cannot delete your own account",
      })
    }

    // Delete staff member
    const { error: deleteError } = await supabase.from("staff").delete().eq("id", id)

    if (deleteError) {
      logger.error("Error deleting staff member:", deleteError)
      return res.status(500).json({
        code: "STAFF_DELETE_FAILED",
        message: "Failed to delete staff member",
      })
    }

    logger.info("Staff member deleted:", {
      staffId: id,
      deletedBy: req.user.id,
    })

    res.json({
      message: "Staff member deleted successfully",
    })
  } catch (error) {
    logger.error("Error deleting staff member:", error)
    res.status(500).json({
      code: "STAFF_DELETE_ERROR",
      message: "Failed to delete staff member",
    })
  }
})

// GET /staff/dashboard/stats - Get dashboard statistics (admin/manager only)
router.get("/dashboard/stats", authenticateToken, requireStaff, async (req, res) => {
  try {
    if (!["admin", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "Only admins and managers can view dashboard statistics",
      })
    }

    // Get various statistics
    const [{ count: totalOrders }, { count: pendingOrders }, { count: activeDrivers }, { count: totalCustomers }] =
      await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("drivers").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("customers").select("*", { count: "exact", head: true }),
      ])

    // Get orders by status
    const { data: ordersByStatus } = await supabase
      .from("orders")
      .select("status")
      .then(({ data }) => {
        const statusCounts = {}
        data?.forEach((order) => {
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
        })
        return { data: statusCounts }
      })

    // Get recent activity (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { count: recentOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday.toISOString())

    res.json({
      statistics: {
        total_orders: totalOrders || 0,
        pending_orders: pendingOrders || 0,
        active_drivers: activeDrivers || 0,
        total_customers: totalCustomers || 0,
        recent_orders_24h: recentOrders || 0,
      },
      orders_by_status: ordersByStatus || {},
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.error("Error fetching dashboard stats:", error)
    res.status(500).json({
      code: "DASHBOARD_STATS_ERROR",
      message: "Failed to fetch dashboard statistics",
    })
  }
})

module.exports = router
