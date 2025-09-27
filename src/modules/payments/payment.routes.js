const express = require("express");
const router = express.Router();
const AuthMiddleware = require("../../middleware/auth.middleware");
const RoleMiddleware = require("../../middleware/role.middleware");
const PaymentController = require("./payment.controller");

/**
 * @swagger
 * /api/payments/create-intent/{orderId}:
 *   post:
 *     summary: Create payment intent
 *     description: Create a Stripe payment intent for an order (Customer only)
 *     tags: [Payments]
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
 *         description: Payment intent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Payment intent created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientSecret:
 *                       type: string
 *                       example: pi_123456789_secret_abc123
 *                     paymentIntentId:
 *                       type: string
 *                       example: pi_123456789
 *                     amount:
 *                       type: integer
 *                       example: 2999
 *                     currency:
 *                       type: string
 *                       example: usd
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Customer access required
 *       404:
 *         description: Order not found
 */
router.post("/create-intent/:orderId", AuthMiddleware.requireAuth, RoleMiddleware.requireCustomer, PaymentController.createPaymentIntent);

/**
 * @swagger
 * /api/payments/confirm:
 *   post:
 *     summary: Confirm payment
 *     description: Confirm a payment after successful processing (Customer only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 example: pi_123456789
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Customer access required
 */
router.post("/confirm", AuthMiddleware.requireAuth, RoleMiddleware.requireCustomer, PaymentController.confirmPayment);

/**
 * @swagger
 * /api/payments/status/{orderId}:
 *   get:
 *     summary: Get payment status
 *     description: Get the payment status for an order (Customer only)
 *     tags: [Payments]
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
 *         description: Payment status retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Customer access required
 *       404:
 *         description: Order not found
 */
router.get("/status/:orderId", AuthMiddleware.requireAuth, RoleMiddleware.requireCustomer, PaymentController.getPaymentStatus);

/**
 * @swagger
 * /api/payments/refund/{orderId}:
 *   post:
 *     summary: Process refund
 *     description: Process a refund for an order (Admin only)
 *     tags: [Payments]
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
 *                 example: Customer requested cancellation
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
router.post("/refund/:orderId", AuthMiddleware.requireAuth, RoleMiddleware.requireAdminOrSuperAdmin, PaymentController.processRefund);

/**
 * @swagger
 * /api/payments/methods:
 *   get:
 *     summary: Get payment methods
 *     description: Get saved payment methods for the customer (Customer only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Customer access required
 */
router.get("/methods", AuthMiddleware.requireAuth, RoleMiddleware.requireCustomer, PaymentController.getPaymentMethods);

/**
 * @swagger
 * /api/payments/create-customer:
 *   post:
 *     summary: Create Stripe customer
 *     description: Create a customer record in Stripe (Customer only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Stripe customer created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Customer access required
 */
router.post("/create-customer", AuthMiddleware.requireAuth, RoleMiddleware.requireCustomer, PaymentController.createStripeCustomer);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Stripe webhook
 *     description: Handle Stripe webhook events (Public endpoint)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 */
router.post("/webhook", PaymentController.handleWebhook);

/**
 * @swagger
 * /api/payments/admin/stats:
 *   get:
 *     summary: Get payment statistics
 *     description: Get payment statistics and analytics (Admin only)
 *     tags: [Payments]
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
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/admin/stats", AuthMiddleware.requireAuth, RoleMiddleware.requireAdminOrSuperAdmin, PaymentController.getPaymentStats);

module.exports = router;