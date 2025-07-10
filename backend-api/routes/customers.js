const express = require("express")
const supabase = require("../lib/supabaseClient")
const { authenticateToken } = require("../middleware/auth")
const { requireAdmin, requireCustomer } = require("../middleware/rbac")
const logger = require("../lib/logger")

const router = express.Router()

// POST /customers - Customer registration
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, address } = req.body

    if (!name || !email || !phone || !address) {
      return res.status(400).json({
        code: "MISSING_FIELDS",
        message: "name, email, phone, and address are required",
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

    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .or(`email.eq.${email},phone.eq.${phone}`)
      .single()

    if (existingCustomer) {
      return res.status(409).json({
        code: "CUSTOMER_EXISTS",
        message: "Customer with this email or phone already exists",
      })
    }

    // Create customer record
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name,
        email,
        phone,
        address,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (customerError) {
      logger.error("Error creating customer:", customerError)
      return res.status(500).json({
        code: "CUSTOMER_CREATION_FAILED",
        message: "Failed to create customer",
      })
    }

    logger.info("Customer created:", { customerId: customer.id, email })

    // Remove sensitive info from response
    const { id, name: customerName, email: customerEmail, created_at } = customer

    res.status(201).json({
      message: "Customer registered successfully",
      customer: {
        id,
        name: customerName,
        email: customerEmail,
        created_at,
      },
    })
  } catch (error) {
    logger.error("Error in customer registration:", error)
    res.status(500).json({
      code: "CUSTOMER_REGISTRATION_ERROR",
      message: "Failed to register customer",
    })
  }
})

// GET /customers/:id - Get customer profile and order history
router.get("/:id", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const { id } = req.params

    // Check if user can access this customer's info
    if (req.user.role === "customer" && req.user.id !== id) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only view your own profile",
      })
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase.from("customers").select("*").eq("id", id).single()

    if (customerError || !customer) {
      return res.status(404).json({
        code: "CUSTOMER_NOT_FOUND",
        message: "Customer not found",
      })
    }

    // Get order history
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        pickup_address,
        delivery_address,
        created_at,
        updated_at,
        drivers (
          name,
          phone,
          vehicle_type
        )
      `)
      .eq("customer_id", id)
      .order("created_at", { ascending: false })

    if (ordersError) {
      logger.error("Error fetching customer orders:", ordersError)
    }

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        created_at: customer.created_at,
      },
      order_history: orders || [],
    })
  } catch (error) {
    logger.error("Error fetching customer profile:", error)
    res.status(500).json({
      code: "CUSTOMER_FETCH_ERROR",
      message: "Failed to fetch customer profile",
    })
  }
})

// PUT /customers/:id - Update customer contact info
router.put("/:id", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const { id } = req.params
    const { name, phone, address, email } = req.body

    // Check permissions
    if (req.user.role === "customer" && req.user.id !== id) {
      return res.status(403).json({
        code: "ACCESS_DENIED",
        message: "You can only update your own profile",
      })
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          code: "INVALID_EMAIL",
          message: "Invalid email format",
        })
      }

      // Check if email is already taken by another customer
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", email)
        .neq("id", id)
        .single()

      if (existingCustomer) {
        return res.status(409).json({
          code: "EMAIL_TAKEN",
          message: "Email is already taken by another customer",
        })
      }
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString(),
    }

    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (address) updateData.address = address
    if (email) updateData.email = email

    // Update customer
    const { data: customer, error: updateError } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      logger.error("Error updating customer:", updateError)
      return res.status(500).json({
        code: "CUSTOMER_UPDATE_FAILED",
        message: "Failed to update customer",
      })
    }

    if (!customer) {
      return res.status(404).json({
        code: "CUSTOMER_NOT_FOUND",
        message: "Customer not found",
      })
    }

    logger.info("Customer updated:", { customerId: id, updatedBy: req.user.id })

    res.json({
      message: "Customer updated successfully",
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        updated_at: customer.updated_at,
      },
    })
  } catch (error) {
    logger.error("Error updating customer:", error)
    res.status(500).json({
      code: "CUSTOMER_UPDATE_ERROR",
      message: "Failed to update customer",
    })
  }
})

// GET /customers - List all customers (admin only)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query

    let query = supabase.from("customers").select("id, name, email, phone, address, created_at", { count: "exact" })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    query = query.order("created_at", { ascending: false }).range(offset, offset + Number.parseInt(limit) - 1)

    const { data: customers, error, count } = await query

    if (error) {
      logger.error("Error fetching customers:", error)
      return res.status(500).json({
        code: "CUSTOMERS_FETCH_FAILED",
        message: "Failed to fetch customers",
      })
    }

    res.json({
      customers,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: count,
        pages: Math.ceil(count / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    logger.error("Error fetching customers list:", error)
    res.status(500).json({
      code: "CUSTOMERS_LIST_ERROR",
      message: "Failed to fetch customers list",
    })
  }
})

// DELETE /customers/:id - Delete customer (admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // Check if customer has active orders
    const { data: activeOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", id)
      .in("status", ["pending", "assigned", "picked_up", "in_transit"])

    if (activeOrders && activeOrders.length > 0) {
      return res.status(400).json({
        code: "CUSTOMER_HAS_ACTIVE_ORDERS",
        message: "Cannot delete customer with active orders",
      })
    }

    // Delete customer
    const { error: deleteError } = await supabase.from("customers").delete().eq("id", id)

    if (deleteError) {
      logger.error("Error deleting customer:", deleteError)
      return res.status(500).json({
        code: "CUSTOMER_DELETE_FAILED",
        message: "Failed to delete customer",
      })
    }

    logger.info("Customer deleted:", { customerId: id, deletedBy: req.user.id })

    res.json({
      message: "Customer deleted successfully",
    })
  } catch (error) {
    logger.error("Error deleting customer:", error)
    res.status(500).json({
      code: "CUSTOMER_DELETE_ERROR",
      message: "Failed to delete customer",
    })
  }
})

module.exports = router
