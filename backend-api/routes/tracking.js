const express = require("express")
const supabase = require("../lib/supabaseClient")
const { authenticateToken } = require("../middleware/auth")
const { requireDriver } = require("../middleware/rbac")
const logger = require("../lib/logger")

const router = express.Router()

// GET /tracking/:id - Get package status and location
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Get order details with latest tracking info
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        pickup_address,
        delivery_address,
        created_at,
        updated_at,
        customer_id,
        driver_id,
        drivers (
          id,
          name,
          phone,
          vehicle_type
        ),
        customers (
          id,
          name,
          phone
        )
      `)
      .eq("id", id)
      .single()

    if (orderError || !order) {
      return res.status(404).json({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      })
    }

    // Check if user has permission to view this order
    const userRole = req.user.role
    const userId = req.user.id

    if (userRole === "customer" && order.customer_id !== userId) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only view your own orders",
      })
    }

    if (userRole === "driver" && order.driver_id !== userId) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only view your assigned orders",
      })
    }

    // Get latest tracking information
    const { data: tracking, error: trackingError } = await supabase
      .from("tracking")
      .select("*")
      .eq("order_id", id)
      .order("timestamp", { ascending: false })
      .limit(10)

    if (trackingError) {
      logger.error("Error fetching tracking data:", trackingError)
    }

    const response = {
      order: {
        id: order.id,
        status: order.status,
        pickup_address: order.pickup_address,
        delivery_address: order.delivery_address,
        created_at: order.created_at,
        updated_at: order.updated_at,
        driver: order.drivers,
        customer: userRole === "admin" ? order.customers : null,
      },
      tracking: tracking || [],
      last_location:
        tracking && tracking.length > 0
          ? {
              latitude: tracking[0].latitude,
              longitude: tracking[0].longitude,
              timestamp: tracking[0].timestamp,
            }
          : null,
    }

    res.json(response)
  } catch (error) {
    logger.error("Error in tracking route:", error)
    res.status(500).json({
      code: "TRACKING_ERROR",
      message: "Failed to retrieve tracking information",
    })
  }
})

// POST /tracking/update - Driver location ping
router.post("/update", authenticateToken, requireDriver, async (req, res) => {
  try {
    const { order_id, latitude, longitude } = req.body

    if (!order_id || !latitude || !longitude) {
      return res.status(400).json({
        code: "MISSING_FIELDS",
        message: "order_id, latitude, and longitude are required",
      })
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        code: "INVALID_COORDINATES",
        message: "Invalid latitude or longitude values",
      })
    }

    // Verify driver is assigned to this order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("driver_id, status")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      return res.status(404).json({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      })
    }

    if (req.user.role === "driver" && order.driver_id !== req.user.id) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only update tracking for your assigned orders",
      })
    }

    // Insert tracking record
    const { data: tracking, error: trackingError } = await supabase
      .from("tracking")
      .insert({
        order_id,
        latitude: Number.parseFloat(latitude),
        longitude: Number.parseFloat(longitude),
        timestamp: new Date().toISOString(),
        driver_id: req.user.id,
      })
      .select()
      .single()

    if (trackingError) {
      logger.error("Error inserting tracking data:", trackingError)
      return res.status(500).json({
        code: "TRACKING_UPDATE_FAILED",
        message: "Failed to update tracking information",
      })
    }

    logger.info("Location updated:", {
      orderId: order_id,
      driverId: req.user.id,
      latitude,
      longitude,
    })

    res.json({
      message: "Location updated successfully",
      tracking,
    })
  } catch (error) {
    logger.error("Error updating tracking:", error)
    res.status(500).json({
      code: "TRACKING_UPDATE_ERROR",
      message: "Failed to update tracking information",
    })
  }
})

// POST /tracking/batch-update - Batch location updates for optimization
router.post("/batch-update", authenticateToken, requireDriver, async (req, res) => {
  try {
    const { updates } = req.body

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        code: "INVALID_BATCH_DATA",
        message: "Updates must be a non-empty array",
      })
    }

    // Validate each update
    const validUpdates = []
    for (const update of updates) {
      const { order_id, latitude, longitude, timestamp } = update

      if (!order_id || !latitude || !longitude) {
        continue // Skip invalid updates
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        continue // Skip invalid coordinates
      }

      validUpdates.push({
        order_id,
        latitude: Number.parseFloat(latitude),
        longitude: Number.parseFloat(longitude),
        timestamp: timestamp || new Date().toISOString(),
        driver_id: req.user.id,
      })
    }

    if (validUpdates.length === 0) {
      return res.status(400).json({
        code: "NO_VALID_UPDATES",
        message: "No valid updates found in batch",
      })
    }

    // Insert batch tracking records
    const { data: tracking, error: trackingError } = await supabase.from("tracking").insert(validUpdates).select()

    if (trackingError) {
      logger.error("Error inserting batch tracking data:", trackingError)
      return res.status(500).json({
        code: "BATCH_UPDATE_FAILED",
        message: "Failed to update batch tracking information",
      })
    }

    logger.info("Batch location updated:", {
      driverId: req.user.id,
      updateCount: validUpdates.length,
    })

    res.json({
      message: "Batch location updated successfully",
      processed: validUpdates.length,
      tracking,
    })
  } catch (error) {
    logger.error("Error in batch tracking update:", error)
    res.status(500).json({
      code: "BATCH_UPDATE_ERROR",
      message: "Failed to process batch tracking update",
    })
  }
})

module.exports = router
