const express = require("express")
const supabase = require("../lib/supabaseClient")
const { authenticateToken } = require("../middleware/auth")
const { requireAdmin, requireDriver } = require("../middleware/rbac")
const logger = require("../lib/logger")

const router = express.Router()

// POST /drivers - Create driver (admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, phone, vehicle_type, license_number, email } = req.body

    if (!name || !phone || !vehicle_type || !email) {
      return res.status(400).json({
        code: "MISSING_FIELDS",
        message: "name, phone, vehicle_type, and email are required",
      })
    }

    // Check if driver already exists
    const { data: existingDriver } = await supabase
      .from("drivers")
      .select("id")
      .or(`phone.eq.${phone},email.eq.${email}`)
      .single()

    if (existingDriver) {
      return res.status(409).json({
        code: "DRIVER_EXISTS",
        message: "Driver with this phone or email already exists",
      })
    }

    // Create driver record
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .insert({
        name,
        phone,
        vehicle_type,
        license_number,
        email,
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (driverError) {
      logger.error("Error creating driver:", driverError)
      return res.status(500).json({
        code: "DRIVER_CREATION_FAILED",
        message: "Failed to create driver",
      })
    }

    logger.info("Driver created:", { driverId: driver.id, name, createdBy: req.user.id })

    res.status(201).json({
      message: "Driver created successfully",
      driver,
    })
  } catch (error) {
    logger.error("Error in driver creation:", error)
    res.status(500).json({
      code: "DRIVER_CREATION_ERROR",
      message: "Failed to create driver",
    })
  }
})

// GET /drivers/:id - Get driver profile and assigned orders
router.get("/:id", authenticateToken, requireDriver, async (req, res) => {
  try {
    const { id } = req.params

    // Check if user can access this driver's info
    if (req.user.role === "driver" && req.user.id !== id) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only view your own profile",
      })
    }

    // Get driver details
    const { data: driver, error: driverError } = await supabase.from("drivers").select("*").eq("id", id).single()

    if (driverError || !driver) {
      return res.status(404).json({
        code: "DRIVER_NOT_FOUND",
        message: "Driver not found",
      })
    }

    // Get assigned orders
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        pickup_address,
        delivery_address,
        created_at,
        updated_at,
        customers (
          name,
          phone
        )
      `)
      .eq("driver_id", id)
      .order("created_at", { ascending: false })

    if (ordersError) {
      logger.error("Error fetching driver orders:", ordersError)
    }

    // Remove sensitive info for non-admin users
    if (req.user.role !== "admin") {
      delete driver.license_number
      delete driver.email
    }

    res.json({
      driver,
      assigned_orders: orders || [],
    })
  } catch (error) {
    logger.error("Error fetching driver profile:", error)
    res.status(500).json({
      code: "DRIVER_FETCH_ERROR",
      message: "Failed to fetch driver profile",
    })
  }
})

// PUT /drivers/:id - Update driver status
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { status, name, phone, vehicle_type } = req.body

    // Check permissions
    if (req.user.role === "driver" && req.user.id !== id) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only update your own profile",
      })
    }

    // Validate status if provided
    const validStatuses = ["active", "inactive", "busy", "offline"]
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        code: "INVALID_STATUS",
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      })
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString(),
    }

    if (status) updateData.status = status
    if (name && req.user.role === "admin") updateData.name = name
    if (phone && req.user.role === "admin") updateData.phone = phone
    if (vehicle_type && req.user.role === "admin") updateData.vehicle_type = vehicle_type

    // Update driver
    const { data: driver, error: updateError } = await supabase
      .from("drivers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      logger.error("Error updating driver:", updateError)
      return res.status(500).json({
        code: "DRIVER_UPDATE_FAILED",
        message: "Failed to update driver",
      })
    }

    if (!driver) {
      return res.status(404).json({
        code: "DRIVER_NOT_FOUND",
        message: "Driver not found",
      })
    }

    logger.info("Driver updated:", { driverId: id, updatedBy: req.user.id, changes: updateData })

    res.json({
      message: "Driver updated successfully",
      driver,
    })
  } catch (error) {
    logger.error("Error updating driver:", error)
    res.status(500).json({
      code: "DRIVER_UPDATE_ERROR",
      message: "Failed to update driver",
    })
  }
})

// GET /drivers/available - List available drivers for auto-dispatch
router.get("/available", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { vehicle_type } = req.query

    let query = supabase.from("drivers").select("id, name, phone, vehicle_type, status").eq("status", "active")

    if (vehicle_type) {
      query = query.eq("vehicle_type", vehicle_type)
    }

    const { data: drivers, error } = await query.order("name")

    if (error) {
      logger.error("Error fetching available drivers:", error)
      return res.status(500).json({
        code: "DRIVERS_FETCH_FAILED",
        message: "Failed to fetch available drivers",
      })
    }

    // Filter out drivers who are currently busy with active orders
    const { data: busyDrivers } = await supabase
      .from("orders")
      .select("driver_id")
      .in("status", ["picked_up", "in_transit"])
      .not("driver_id", "is", null)

    const busyDriverIds = new Set(busyDrivers?.map((order) => order.driver_id) || [])
    const availableDrivers = drivers.filter((driver) => !busyDriverIds.has(driver.id))

    res.json({
      available_drivers: availableDrivers,
      total_count: availableDrivers.length,
    })
  } catch (error) {
    logger.error("Error fetching available drivers:", error)
    res.status(500).json({
      code: "AVAILABLE_DRIVERS_ERROR",
      message: "Failed to fetch available drivers",
    })
  }
})

// GET /drivers - List all drivers (admin only)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, vehicle_type, page = 1, limit = 20 } = req.query

    let query = supabase.from("drivers").select("*", { count: "exact" })

    if (status) {
      query = query.eq("status", status)
    }

    if (vehicle_type) {
      query = query.eq("vehicle_type", vehicle_type)
    }

    const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    query = query.order("created_at", { ascending: false }).range(offset, offset + Number.parseInt(limit) - 1)

    const { data: drivers, error, count } = await query

    if (error) {
      logger.error("Error fetching drivers:", error)
      return res.status(500).json({
        code: "DRIVERS_FETCH_FAILED",
        message: "Failed to fetch drivers",
      })
    }

    res.json({
      drivers,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: count,
        pages: Math.ceil(count / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    logger.error("Error fetching drivers list:", error)
    res.status(500).json({
      code: "DRIVERS_LIST_ERROR",
      message: "Failed to fetch drivers list",
    })
  }
})

module.exports = router
