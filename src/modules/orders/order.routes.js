const express = require("express");
const router = express.Router();
const AuthMiddleware = require("../../middleware/auth.middleware");
const RoleMiddleware = require("../../middleware/role.middleware");
const OrderController = require("./order.controller");


/**
 * @swagger
 * /api/orders/from-cart:
 *   post:
 *     summary: Create order from cart
 *     description: Create a new order using items from the user's shopping cart (Customer only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               shippingAddress:
 *                 type: object
 *                 required:
 *                   - recipientName
 *                   - phone
 *                   - email
 *                   - street
 *                   - city
 *                   - state
 *                   - zipCode
 *                   - country
 *                 properties:
 *                   recipientName:
 *                     type: string
 *                     example: John Doe
 *                   phone:
 *                     type: string
 *                     example: +1234567890
 *                   email:
 *                     type: string
 *                     example: john@example.com
 *                   street:
 *                     type: string
 *                     example: 123 Main St
 *                   city:
 *                     type: string
 *                     example: New York
 *                   state:
 *                     type: string
 *                     example: NY
 *                   zipCode:
 *                     type: string
 *                     example: 10001
 *                   country:
 *                     type: string
 *                     example: USA
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, paypal, bank_transfer, cash_on_delivery]
 *                 example: credit_card
 *               shippingMethod:
 *                 type: string
 *                 enum: [standard, express, overnight, pickup]
 *                 example: standard
 *               discountCode:
 *                 type: string
 *                 example: SAVE10
 *               customerNotes:
 *                 type: string
 *                 example: Please handle with care
 *     responses:
 *       201:
 *         description: Order created successfully from cart
 *       400:
 *         description: Validation error or cart issues
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Customer access required
 */
router.post("/from-cart", AuthMiddleware.requireAuth, RoleMiddleware.requireCustomer, OrderController.createOrderFromCart);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get order by ID
 *     description: Retrieve a single order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Order not found
 */
router.get("/:orderId", AuthMiddleware.requireAuth, OrderController.getOrderById);

/**
 * @swagger
 * /api/orders/number/{orderNumber}:
 *   get:
 *     summary: Get order by order number
 *     description: Retrieve a single order by order number
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Order number
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Order not found
 */
router.get("/number/:orderNumber", AuthMiddleware.requireAuth, OrderController.getOrderByNumber);

/**
 * @swagger
 * /api/orders/customer/my-orders:
 *   get:
 *     summary: Get customer orders
 *     description: Retrieve orders for the authenticated customer
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of orders per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field (e.g., -createdAt, total)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *         description: Filter by order status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders to date
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Customer access required
 */
router.get("/customer/my-orders", AuthMiddleware.requireAuth, RoleMiddleware.requireCustomer, OrderController.getCustomerOrders);

/**
 * @swagger
 * /api/orders/vendor/my-orders:
 *   get:
 *     summary: Get vendor orders
 *     description: Retrieve orders containing vendor's products
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of orders per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field (e.g., -createdAt, total)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *         description: Filter by order status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders to date
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor access required
 */
router.get("/vendor/my-orders", AuthMiddleware.requireAuth, RoleMiddleware.requireVendor, OrderController.getVendorOrders);

/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   put:
 *     summary: Update order status
 *     description: Update the status of an order (Admin/Vendor)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *                 example: shipped
 *               notes:
 *                 type: string
 *                 example: Order has been shipped via UPS
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Order not found
 */
router.put("/:orderId/status", AuthMiddleware.requireAuth, OrderController.updateOrderStatus);

/**
 * @swagger
 * /api/orders/{orderId}/payment:
 *   put:
 *     summary: Update payment status
 *     description: Update the payment status of an order (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, processing, completed, failed, refunded, cancelled]
 *                 example: completed
 *               transactionId:
 *                 type: string
 *                 example: txn_123456789
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Order not found
 */
router.put("/:orderId/payment", AuthMiddleware.requireAuth, RoleMiddleware.requireAdminOrSuperAdmin, OrderController.updatePaymentStatus);

/**
 * @swagger
 * /api/orders/{orderId}/cancel:
 *   put:
 *     summary: Cancel order
 *     description: Cancel an order (Customer/Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Customer requested cancellation
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Order not found
 */
router.put("/:orderId/cancel", AuthMiddleware.requireAuth, OrderController.cancelOrder);

/**
 * @swagger
 * /api/orders/{orderId}/refund:
 *   put:
 *     summary: Process refund
 *     description: Process a refund for an order (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refundAmount
 *               - reason
 *             properties:
 *               refundAmount:
 *                 type: number
 *                 minimum: 0
 *                 example: 29.99
 *               reason:
 *                 type: string
 *                 example: Product was damaged during shipping
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Order not found
 */
router.put("/:orderId/refund", AuthMiddleware.requireAuth, RoleMiddleware.requireAdminOrSuperAdmin, OrderController.processRefund);

/**
 * @swagger
 * /api/orders/{orderId}/shipping:
 *   put:
 *     summary: Update shipping information
 *     description: Update shipping details for an order (Admin/Vendor)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 example: 1Z999AA1234567890
 *               carrier:
 *                 type: string
 *                 example: UPS
 *               shippingMethod:
 *                 type: string
 *                 enum: [standard, express, overnight, pickup]
 *                 example: express
 *     responses:
 *       200:
 *         description: Shipping information updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Order not found
 */
router.put("/:orderId/shipping", AuthMiddleware.requireAuth, OrderController.updateShippingInfo);

/**
 * @swagger
 * /api/orders/{orderId}/summary:
 *   get:
 *     summary: Get order summary
 *     description: Retrieve a summary of an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order summary retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Order not found
 */
router.get("/:orderId/summary", AuthMiddleware.requireAuth, OrderController.getOrderSummary);

/**
 * @swagger
 * /api/orders/admin/all:
 *   get:
 *     summary: Get all orders
 *     description: Retrieve all orders with filtering (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of orders per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field (e.g., -createdAt, total)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *         description: Filter by order status
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: vendor
 *         schema:
 *           type: string
 *         description: Filter by vendor ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders to date
 *       - in: query
 *         name: minTotal
 *         schema:
 *           type: number
 *         description: Filter by minimum order total
 *       - in: query
 *         name: maxTotal
 *         schema:
 *           type: number
 *         description: Filter by maximum order total
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/admin/all", AuthMiddleware.requireAuth, RoleMiddleware.requireAdminOrSuperAdmin, OrderController.getAllOrders);

/**
 * @swagger
 * /api/orders/admin/stats:
 *   get:
 *     summary: Get order statistics
 *     description: Retrieve order statistics and analytics (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: Order statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/admin/stats", AuthMiddleware.requireAuth, RoleMiddleware.requireAdminOrSuperAdmin, OrderController.getOrderStats);

/**
 * @swagger
 * /api/orders/admin/bulk-update:
 *   put:
 *     summary: Bulk update orders
 *     description: Update multiple orders at once (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *               - updates
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["60d5ecb74b24c72b8c8b4567", "60d5ecb74b24c72b8c8b4568"]
 *               updates:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *                   adminNotes:
 *                     type: string
 *     responses:
 *       200:
 *         description: Orders updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put("/admin/bulk-update", AuthMiddleware.requireAuth, RoleMiddleware.requireAdminOrSuperAdmin, OrderController.bulkUpdateOrders);

module.exports = router;