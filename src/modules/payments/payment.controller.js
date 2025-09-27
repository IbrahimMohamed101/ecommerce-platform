const PaymentService = require('./payment.service');
const { catchAsync, ValidationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

class PaymentController {

  // Create payment intent for order (Customer only)
  static createPaymentIntent = catchAsync(async (req, res) => {
    const user = req.user;
    const { orderId } = req.params;

    logger.info('Creating payment intent', {
      userId: user.id,
      userRole: user.role,
      orderId
    });

    // Validate user role
    if (user.role !== 'Customer') {
      throw new ValidationError('Only customers can create payment intents');
    }

    // Validate required fields
    if (!orderId) {
      throw new ValidationError('Order ID is required');
    }

    const result = await PaymentService.createPaymentIntent(orderId, user.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Confirm payment (Customer only)
  static confirmPayment = catchAsync(async (req, res) => {
    const user = req.user;
    const { paymentIntentId } = req.body;

    logger.info('Confirming payment', {
      userId: user.id,
      userRole: user.role,
      paymentIntentId
    });

    // Validate user role
    if (user.role !== 'Customer') {
      throw new ValidationError('Only customers can confirm payments');
    }

    // Validate required fields
    if (!paymentIntentId) {
      throw new ValidationError('Payment intent ID is required');
    }

    const result = await PaymentService.confirmPayment(paymentIntentId, user.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get payment status (Customer only)
  static getPaymentStatus = catchAsync(async (req, res) => {
    const user = req.user;
    const { orderId } = req.params;

    logger.info('Getting payment status', {
      userId: user.id,
      userRole: user.role,
      orderId
    });

    // Validate user role
    if (user.role !== 'Customer') {
      throw new ValidationError('Only customers can check payment status');
    }

    // Validate required fields
    if (!orderId) {
      throw new ValidationError('Order ID is required');
    }

    const result = await PaymentService.getPaymentStatus(orderId, user.id);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Process refund (Admin only)
  static processRefund = catchAsync(async (req, res) => {
    const user = req.user;
    const { orderId } = req.params;
    const { refundAmount, reason } = req.body;

    logger.info('Processing refund', {
      userId: user.id,
      userRole: user.role,
      orderId,
      refundAmount
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin') {
      throw new ValidationError('Only administrators can process refunds');
    }

    // Validate required fields
    if (!orderId) {
      throw new ValidationError('Order ID is required');
    }

    if (!refundAmount || refundAmount <= 0) {
      throw new ValidationError('Valid refund amount is required');
    }

    if (!reason) {
      throw new ValidationError('Refund reason is required');
    }

    const result = await PaymentService.processRefund(orderId, refundAmount, reason, user.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get payment methods for customer (Customer only)
  static getPaymentMethods = catchAsync(async (req, res) => {
    const user = req.user;

    logger.info('Getting payment methods', {
      userId: user.id,
      userRole: user.role
    });

    // Validate user role
    if (user.role !== 'Customer') {
      throw new ValidationError('Only customers can access payment methods');
    }

    const result = await PaymentService.getPaymentMethods(user.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Create Stripe customer (Customer only)
  static createStripeCustomer = catchAsync(async (req, res) => {
    const user = req.user;

    logger.info('Creating Stripe customer', {
      userId: user.id,
      userRole: user.role
    });

    // Validate user role
    if (user.role !== 'Customer') {
      throw new ValidationError('Only customers can create Stripe customers');
    }

    const result = await PaymentService.createStripeCustomer(user.id);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Handle Stripe webhook (Public endpoint)
  static handleWebhook = catchAsync(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.rawBody || req.body;

    logger.info('Received Stripe webhook', {
      signature: !!sig,
      bodyLength: rawBody ? rawBody.length : 0
    });

    if (!sig) {
      throw new ValidationError('Stripe signature missing');
    }

    const result = await PaymentService.handleWebhook(rawBody, sig);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  // Get payment statistics (Admin only)
  static getPaymentStats = catchAsync(async (req, res) => {
    const user = req.user;
    const { dateFrom, dateTo } = req.query;

    logger.info('Getting payment statistics', {
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin') {
      throw new ValidationError('Only administrators can access payment statistics');
    }

    // This would require additional implementation for payment analytics
    // For now, return a placeholder response
    const stats = {
      totalPayments: 0,
      totalRevenue: 0,
      successfulPayments: 0,
      failedPayments: 0,
      refundedAmount: 0,
      period: {
        from: dateFrom,
        to: dateTo
      }
    };

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Payment statistics retrieved successfully'
    });
  });
}

module.exports = PaymentController;