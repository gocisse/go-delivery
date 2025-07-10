const express = require("express")
const supabase = require("../lib/supabaseClient")
const { authenticateToken } = require("../middleware/auth")
const { requireAdmin, requireDriver, requireCustomer } = require("../middleware/rbac")
const logger = require("../lib/logger")

const router = express.Router()

// POST /orders - Create delivery request
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      customer_id,
      pickup_address,
      delivery_address,
      package_description,
      delivery_instructions,
      priority = "normal",
    } = req.body

    if (!customer_id || !pickup_address || !delivery_address) {
      return res.status(400).json({
        code: "MISSING_FIELDS",
        message: "customer_id, pickup_address, and delivery_address are required",
      })
    }

    // Validate priority
    const validPriorities = ["low", "normal", "high", "urgent"]
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        code: "INVALID_PRIORITY",
        message: `Priority must be one of: ${validPriorities.join(", ")}`,
      })
    }

    // Check if customer exists
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name")
      .eq("id", customer_id)
      .single()

    if (customerError || !customer) {
      return res.status(404).json({
        code: "CUSTOMER_NOT_FOUND",
        message: "Customer not found",
      })
    }

    // Check permissions - customers can only create orders for themselves
    if (req.user.role === "customer" && req.user.id !== customer_id) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only create orders for yourself",
      })
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id,
        pickup_address,
        delivery_address,
        package_description,
        delivery_instructions,
        priority,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderError) {
      logger.error("Error creating order:", orderError)
      return res.status(500).json({
        code: "ORDER_CREATION_FAILED",
        message: "Failed to create order",
      })
    }

    logger.info("Order created:", {
      orderId: order.id,
      customerId: customer_id,
      createdBy: req.user.id,
    })

    res.status(201).json({
      message: "Order created successfully",
      order,
    })
  } catch (error) {
    logger.error("Error in order creation:", error)
    res.status(500).json({
      code: "ORDER_CREATION_ERROR",
      message: "Failed to create order",
    })
  }
})

// PUT /orders/:id/status - Update order status
router.put("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes } = req.body

    if (!status) {
      return res.status(400).json({
        code: "MISSING_STATUS",
        message: "Status is required",
      })
    }

    // Validate status
    const validStatuses = ["pending", "assigned", "picked_up", "in_transit", "delivered", "cancelled"]
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        code: "INVALID_STATUS",
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      })
    }

    // Get current order
    const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", id).single()

    if (orderError || !order) {
      return res.status(404).json({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      })
    }

    // Check permissions
    if (req.user.role === "driver" && order.driver_id !== req.user.id) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only update status for your assigned orders",
      })
    }

    if (req.user.role === "customer") {
      // Customers can only cancel their own pending orders
      if (order.customer_id !== req.user.id || status !== "cancelled" || order.status !== "pending") {
        return res.status(403).json({
          code: "ACCESS_DENIED",
          message: "You can only cancel your own pending orders",
        })
      }
    }

    // Validate status transitions
    const currentStatus = order.status
    const validTransitions = {
      pending: ["assigned", "cancelled"],
      assigned: ["picked_up", "cancelled"],
      picked_up: ["in_transit", "cancelled"],
      in_transit: ["delivered"],
      delivered: [],
      cancelled: [],
    }

    if (!validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        code: "INVALID_STATUS_TRANSITION",
        message: `Cannot change status from ${currentStatus} to ${status}`,
      })
    }

    // Update order status
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (notes) {
      updateData.notes = notes
    }

    if (status === "delivered") {
      updateData.delivered_at = new Date().toISOString()
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      logger.error("Error updating order status:", updateError)
      return res.status(500).json({
        code: "ORDER_UPDATE_FAILED",
        message: "Failed to update order status",
      })
    }

    logger.info("Order status updated:", {
      orderId: id,
      oldStatus: currentStatus,
      newStatus: status,
      updatedBy: req.user.id,
    })

    res.json({
      message: "Order status updated successfully",
      order: updatedOrder,
    })
  } catch (error) {
    logger.error("Error updating order status:", error)
    res.status(500).json({
      code: "ORDER_STATUS_UPDATE_ERROR",
      message: "Failed to update order status",
    })
  }
})

// GET /orders/pending - List undelivered orders (driver view)
router.get("/pending", authenticateToken, requireDriver, async (req, res) => {
  try {
    const { driver_id } = req.query

    let query = supabase
      .from("orders")
      .select(`
        id,
        pickup_address,
        delivery_address,
        package_description,
        delivery_instructions,
        priority,
        status,
        created_at,
        customers (
          name,
          phone
        )
      `)
      .in("status", ["assigned", "picked_up", "in_transit"])

    // If driver role, only show their assigned orders
    if (req.user.role === "driver") {
      query = query.eq("driver_id", req.user.id)
    } else if (driver_id) {
      // Admin can filter by specific driver
      query = query.eq("driver_id", driver_id)
    }

    const { data: orders, error } = await query
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })

    if (error) {
      logger.error("Error fetching pending orders:", error)
      return res.status(500).json({
        code: "ORDERS_FETCH_FAILED",
        message: "Failed to fetch pending orders",
      })
    }

    res.json({
      pending_orders: orders,
      total_count: orders.length,
    })
  } catch (error) {
    logger.error("Error fetching pending orders:", error)
    res.status(500).json({
      code: "PENDING_ORDERS_ERROR",
      message: "Failed to fetch pending orders",
    })
  }
})

// PUT /orders/:id/assign - Assign order to driver (admin only)
router.put("/:id/assign", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { driver_id } = req.body

    if (!driver_id) {
      return res.status(400).json({
        code: "MISSING_DRIVER_ID",
        message: "driver_id is required",
      })
    }

    // Check if order exists and is pending
    const { data: order, error: orderError } = await supabase.from("orders").select("status").eq("id", id).single()

    if (orderError || !order) {
      return res.status(404).json({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      })
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        code: "ORDER_NOT_PENDING",
        message: "Order must be pending to assign a driver",
      })
    }

    // Check if driver exists and is active
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("status")
      .eq("id", driver_id)
      .single()

    if (driverError || !driver) {
      return res.status(404).json({
        code: "DRIVER_NOT_FOUND",
        message: "Driver not found",
      })
    }

    if (driver.status !== "active") {
      return res.status(400).json({
        code: "DRIVER_NOT_ACTIVE",
        message: "Driver must be active to receive assignments",
      })
    }

    // Assign driver to order
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        driver_id,
        status: "assigned",
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      logger.error("Error assigning order:", updateError)
      return res.status(500).json({
        code: "ORDER_ASSIGNMENT_FAILED",
        message: "Failed to assign order to driver",
      })
    }

    logger.info("Order assigned:", {
      orderId: id,
      driverId: driver_id,
      assignedBy: req.user.id,
    })

    res.json({
      message: "Order assigned successfully",
      order: updatedOrder,
    })
  } catch (error) {
    logger.error("Error assigning order:", error)
    res.status(500).json({
      code: "ORDER_ASSIGNMENT_ERROR",
      message: "Failed to assign order",
    })
  }
})

// GET /orders - List orders with filtering
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status, customer_id, driver_id, priority, page = 1, limit = 20 } = req.query

    let query = supabase.from("orders").select(
      `
        id,
        customer_id,
        driver_id,
        pickup_address,
        delivery_address,
        package_description,
        priority,
        status,
        created_at,
        updated_at,
        delivered_at,
        customers (
          name,
          phone
        ),
        drivers (
          name,
          phone,
          vehicle_type
        )
      `,
      { count: "exact" },
    )

    // Apply role-based filtering
    if (req.user.role === "customer") {
      query = query.eq("customer_id", req.user.id)
    } else if (req.user.role === "driver") {
      query = query.eq("driver_id", req.user.id)
    }

    // Apply filters
    if (status) {
      query = query.eq("status", status)
    }
    if (customer_id && req.user.role === "admin") {
      query = query.eq("customer_id", customer_id)
    }
    if (driver_id && req.user.role === "admin") {
      query = query.eq("driver_id", driver_id)
    }
    if (priority) {
      query = query.eq("priority", priority)
    }

    const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    query = query.order("created_at", { ascending: false }).range(offset, offset + Number.parseInt(limit) - 1)

    const { data: orders, error, count } = await query

    if (error) {
      logger.error("Error fetching orders:", error)
      return res.status(500).json({
        code: "ORDERS_FETCH_FAILED",
        message: "Failed to fetch orders",
      })
    }

    res.json({
      orders,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: count,
        pages: Math.ceil(count / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    logger.error("Error fetching orders:", error)
    res.status(500).json({
      code: "ORDERS_FETCH_ERROR",
      message: "Failed to fetch orders",
    })
  }
})

// GET /orders/:id - Get specific order details
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        customers (
          name,
          phone,
          address
        ),
        drivers (
          name,
          phone,
          vehicle_type
        )
      `)
      .eq("id", id)
      .single()

    if (error || !order) {
      return res.status(404).json({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      })
    }

    // Check permissions
    if (req.user.role === "customer" && order.customer_id !== req.user.id) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only view your own orders",
      })
    }

    if (req.user.role === "driver" && order.driver_id !== req.user.id) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only view your assigned orders",
      })
    }

    res.json({ order })
  } catch (error) {
    logger.error("Error fetching order details:", error)
    res.status(500).json({
      code: "ORDER_FETCH_ERROR",
      message: "Failed to fetch order details",
    })
  }
})

module.exports = router
