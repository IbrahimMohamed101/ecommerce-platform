const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../orders/order.model');
const User = require('../users/user.model');
const { ValidationError, NotFoundError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

class PaymentService {

  // Create payment intent for order
  static async createPaymentIntent(orderId, userId) {
    try {
      logger.info('Creating payment intent', { orderId, userId });

      // Find and validate order
      const order = await Order.findById(orderId).populate('customer', 'firstName lastName email');
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check if user owns the order
      if (order.customer._id.toString() !== userId) {
        throw new ValidationError('Access denied');
      }

      // Check if payment already exists
      if (order.payment.status === 'completed') {
        throw new ValidationError('Payment already completed for this order');
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.total * 100), // Convert to cents
        currency: order.payment.currency || 'usd',
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          customerId: userId
        },
        description: `Order ${order.orderNumber}`,
        receipt_email: order.customerEmail,
        shipping: {
          name: order.shippingAddress.recipientName,
          address: {
            line1: order.shippingAddress.street,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            postal_code: order.shippingAddress.zipCode,
            country: order.shippingAddress.country
          }
        }
      });

      // Update order with payment intent ID
      order.payment.paymentIntentId = paymentIntent.id;
      order.payment.status = 'pending';
      await order.save();

      logger.info('Payment intent created successfully', {
        orderId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount
      });

      return {
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        },
        message: 'Payment intent created successfully'
      };
    } catch (error) {
      logger.error('Failed to create payment intent', { orderId, error: error.message });
      throw error;
    }
  }

  // Confirm payment
  static async confirmPayment(paymentIntentId, userId) {
    try {
      logger.info('Confirming payment', { paymentIntentId, userId });

      // Find order by payment intent ID
      const order = await Order.findOne({ 'payment.paymentIntentId': paymentIntentId });
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check if user owns the order
      if (order.customer._id.toString() !== userId) {
        throw new ValidationError('Access denied');
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Update order payment status
        order.payment.status = 'completed';
        order.payment.transactionId = paymentIntent.id;
        order.payment.paidAt = new Date();
        order.payment.paymentGateway = 'stripe';

        // Update order status
        order.status = 'confirmed';
        order.confirmedAt = new Date();

        await order.save();

        logger.info('Payment confirmed successfully', {
          orderId: order._id,
          paymentIntentId,
          amount: paymentIntent.amount
        });

        return {
          success: true,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.payment.status
          },
          message: 'Payment confirmed successfully'
        };
      } else {
        throw new ValidationError('Payment not completed');
      }
    } catch (error) {
      logger.error('Failed to confirm payment', { paymentIntentId, error: error.message });
      throw error;
    }
  }

  // Handle Stripe webhook
  static async handleWebhook(rawBody, signature) {
    try {
      logger.info('Processing Stripe webhook');

      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object);
          break;

        default:
          logger.info('Unhandled webhook event type', { eventType: event.type });
      }

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      logger.error('Webhook processing failed', { error: error.message });
      throw error;
    }
  }

  // Handle successful payment
  static async handlePaymentSucceeded(paymentIntent) {
    try {
      const order = await Order.findOne({ 'payment.paymentIntentId': paymentIntent.id });
      if (!order) {
        logger.error('Order not found for payment intent', { paymentIntentId: paymentIntent.id });
        return;
      }

      // Update order
      order.payment.status = 'completed';
      order.payment.transactionId = paymentIntent.id;
      order.payment.paidAt = new Date();
      order.status = 'confirmed';
      order.confirmedAt = new Date();

      await order.save();

      logger.info('Payment succeeded - order updated', {
        orderId: order._id,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      logger.error('Failed to handle payment succeeded', { error: error.message });
    }
  }

  // Handle failed payment
  static async handlePaymentFailed(paymentIntent) {
    try {
      const order = await Order.findOne({ 'payment.paymentIntentId': paymentIntent.id });
      if (!order) {
        logger.error('Order not found for payment intent', { paymentIntentId: paymentIntent.id });
        return;
      }

      // Update order
      order.payment.status = 'failed';
      order.payment.transactionId = paymentIntent.id;

      await order.save();

      logger.info('Payment failed - order updated', {
        orderId: order._id,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      logger.error('Failed to handle payment failed', { error: error.message });
    }
  }

  // Handle canceled payment
  static async handlePaymentCanceled(paymentIntent) {
    try {
      const order = await Order.findOne({ 'payment.paymentIntentId': paymentIntent.id });
      if (!order) {
        logger.error('Order not found for payment intent', { paymentIntentId: paymentIntent.id });
        return;
      }

      // Update order
      order.payment.status = 'cancelled';
      order.payment.transactionId = paymentIntent.id;

      await order.save();

      logger.info('Payment canceled - order updated', {
        orderId: order._id,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      logger.error('Failed to handle payment canceled', { error: error.message });
    }
  }

  // Process refund
  static async processRefund(orderId, refundAmount, reason, userId) {
    try {
      logger.info('Processing refund', { orderId, refundAmount, userId });

      const order = await Order.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check if payment was made with Stripe
      if (!order.payment.transactionId || order.payment.paymentGateway !== 'stripe') {
        throw new ValidationError('Refund not available for this payment method');
      }

      // Validate refund amount
      if (refundAmount > order.total) {
        throw new ValidationError('Refund amount cannot exceed order total');
      }

      // Create refund in Stripe
      const refund = await stripe.refunds.create({
        payment_intent: order.payment.transactionId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          reason: reason
        }
      });

      // Update order
      order.status = 'refunded';
      order.refundAmount = refundAmount;
      order.refundReason = reason;
      order.refundedAt = new Date();
      order.payment.status = 'refunded';
      order.payment.refundedAt = new Date();
      order.updatedBy = userId;

      await order.save();

      logger.info('Refund processed successfully', {
        orderId,
        refundId: refund.id,
        refundAmount
      });

      return {
        success: true,
        data: {
          refundId: refund.id,
          amount: refund.amount,
          status: refund.status
        },
        message: 'Refund processed successfully'
      };
    } catch (error) {
      logger.error('Failed to process refund', { orderId, error: error.message });
      throw error;
    }
  }

  // Get payment methods for customer
  static async getPaymentMethods(customerId) {
    try {
      logger.info('Getting payment methods', { customerId });

      // Find user
      const user = await User.findById(customerId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get customer's Stripe customer ID (you would store this when creating customers)
      // For now, return empty array as we don't have customer creation implemented
      const paymentMethods = [];

      return {
        success: true,
        data: paymentMethods,
        message: 'Payment methods retrieved successfully'
      };
    } catch (error) {
      logger.error('Failed to get payment methods', { customerId, error: error.message });
      throw error;
    }
  }

  // Create customer in Stripe
  static async createStripeCustomer(userId) {
    try {
      logger.info('Creating Stripe customer', { userId });

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if customer already exists
      if (user.stripeCustomerId) {
        return {
          success: true,
          data: { customerId: user.stripeCustomerId },
          message: 'Stripe customer already exists'
        };
      }

      // Create customer in Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString(),
          username: user.username
        }
      });

      // Save customer ID to user
      user.stripeCustomerId = customer.id;
      await user.save();

      logger.info('Stripe customer created successfully', {
        userId,
        stripeCustomerId: customer.id
      });

      return {
        success: true,
        data: { customerId: customer.id },
        message: 'Stripe customer created successfully'
      };
    } catch (error) {
      logger.error('Failed to create Stripe customer', { userId, error: error.message });
      throw error;
    }
  }

  // Get payment status
  static async getPaymentStatus(orderId, userId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check if user owns the order
      if (order.customer._id.toString() !== userId) {
        throw new ValidationError('Access denied');
      }

      return {
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.payment.status,
          paymentMethod: order.payment.method,
          amount: order.total,
          currency: order.payment.currency,
          paidAt: order.payment.paidAt,
          transactionId: order.payment.transactionId
        }
      };
    } catch (error) {
      logger.error('Failed to get payment status', { orderId, error: error.message });
      throw error;
    }
  }
}

module.exports = PaymentService;