const Order = require('./order.model');
const Product = require('../products/product.model');
const User = require('../users/user.model');
const Cart = require('../cart/cart.model');
const CartService = require('../cart/cart.service');
const { ValidationError, NotFoundError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

class OrderService {

  // Create order from cart
  static async createOrderFromCart(orderData, customerId) {
    try {
      logger.info('Creating order from cart', { customerId });

      // Validate customer
      const customer = await User.findById(customerId);
      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      // Validate and get cart
      const cartValidation = await CartService.validateCartForCheckout(customerId);
      if (!cartValidation.isValid) {
        throw new ValidationError(`Cart validation failed: ${cartValidation.invalidItems.map(item => item.reason).join(', ')}`);
      }

      const cart = cartValidation.cart;
      if (cart.items.length === 0) {
        throw new ValidationError('Cart is empty');
      }

      // Process cart items for order
      const processedItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product = await Product.findById(cartItem.product);
        if (!product) {
          throw new ValidationError(`Product ${cartItem.product} not found`);
        }

        if (product.status !== 'active') {
          throw new ValidationError(`Product ${product.name} is not available`);
        }

        // Check inventory (double-check)
        if (product.trackQuantity) {
          const availableQuantity = product.totalVariantQuantity || product.quantity;
          if (availableQuantity < cartItem.quantity) {
            throw new ValidationError(`Insufficient stock for ${product.name}. Available: ${availableQuantity}`);
          }
        }

        processedItems.push({
          product: product._id,
          variantId: cartItem.variantId,
          productName: cartItem.productName,
          productImage: cartItem.productImage,
          sku: cartItem.sku,
          quantity: cartItem.quantity,
          unitPrice: cartItem.unitPrice,
          totalPrice: cartItem.totalPrice,
          vendor: cartItem.vendor
        });

        subtotal += cartItem.totalPrice;
      }

      // Calculate totals
      const tax = (subtotal * (orderData.taxRate || 0.08)); // Default 8% tax
      const shipping = orderData.shipping || 10; // Default shipping
      const discount = orderData.discount || 0;
      const total = subtotal + tax + shipping - discount;

      // Generate order number
      const order = new Order();
      const orderNumber = order.generateOrderNumber();

      // Create order object
      const orderObj = {
        orderNumber,
        customer: customerId,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        items: processedItems,
        subtotal,
        discount,
        discountCode: orderData.discountCode,
        tax,
        taxRate: orderData.taxRate || 0.08,
        shipping,
        total,
        shippingAddress: orderData.shippingAddress,
        shippingMethod: orderData.shippingMethod || 'standard',
        payment: {
          method: orderData.paymentMethod,
          amount: total,
          currency: orderData.currency || 'USD'
        },
        customerNotes: orderData.customerNotes,
        isGift: orderData.isGift || false,
        giftMessage: orderData.giftMessage,
        referralCode: orderData.referralCode,
        ipAddress: orderData.ipAddress,
        userAgent: orderData.userAgent
      };

      const newOrder = new Order(orderObj);
      const savedOrder = await newOrder.save();

      // Update product inventory
      for (const item of processedItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: -item.quantity }
        });
      }

      // Update customer's order stats
      await User.findByIdAndUpdate(customerId, {
        $inc: {
          'purchaseStats.totalOrders': 1,
          'purchaseStats.totalSpent': total
        },
        $set: { 'purchaseStats.lastOrderDate': new Date() }
      });

      // Clear the cart after successful order
      await CartService.clearCart(customerId);

      // Populate order with product details
      await savedOrder.populate([
        { path: 'customer', select: 'firstName lastName email' },
        { path: 'items.product', select: 'name images category' },
        { path: 'items.vendor', select: 'firstName lastName businessName' }
      ]);

      logger.info('Order created from cart successfully', {
        orderId: savedOrder._id,
        orderNumber: savedOrder.orderNumber,
        customerId,
        total: savedOrder.total
      });

      return {
        success: true,
        data: savedOrder,
        message: 'Order created successfully from cart'
      };
    } catch (error) {
      logger.error('Failed to create order from cart', {
        customerId,
        error: error.message
      });
      throw error;
    }
  }

  // Get order by ID
  static async getOrderById(orderId, userId, userRole = 'Customer') {
    try {
      logger.info('Fetching order by ID', { orderId, userId, userRole });

      const order = await Order.findById(orderId)
        .populate('customer', 'firstName lastName email')
        .populate('items.product', 'name images category')
        .populate('items.vendor', 'firstName lastName businessName')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName');

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check permissions
      if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
        const isCustomer = order.customer._id.toString() === userId;
        const isVendor = order.items.some(item => item.vendor._id.toString() === userId);

        if (!isCustomer && !isVendor) {
          throw new ValidationError('Access denied');
        }
      }

      logger.info('Order fetched successfully', { orderId, orderNumber: order.orderNumber });

      return {
        success: true,
        data: order
      };
    } catch (error) {
      logger.error('Failed to fetch order', { orderId, error: error.message });
      throw error;
    }
  }

  // Get order by order number
  static async getOrderByNumber(orderNumber, userId, userRole = 'Customer') {
    try {
      logger.info('Fetching order by number', { orderNumber, userId });

      const order = await Order.findOne({ orderNumber })
        .populate('customer', 'firstName lastName email')
        .populate('items.product', 'name images category')
        .populate('items.vendor', 'firstName lastName businessName');

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check permissions
      if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
        const isCustomer = order.customer._id.toString() === userId;
        const isVendor = order.items.some(item => item.vendor._id.toString() === userId);

        if (!isCustomer && !isVendor) {
          throw new ValidationError('Access denied');
        }
      }

      return {
        success: true,
        data: order
      };
    } catch (error) {
      logger.error('Failed to fetch order by number', { orderNumber, error: error.message });
      throw error;
    }
  }

  // Update order status
  static async updateOrderStatus(orderId, newStatus, userId, userRole, notes = null) {
    try {
      logger.info('Updating order status', { orderId, newStatus, userId, userRole });

      const order = await Order.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Validate status transition
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
      if (!validStatuses.includes(newStatus)) {
        throw new ValidationError('Invalid order status');
      }

      // Check permissions
      if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
        // Vendors can only update their items
        if (userRole === 'Vendor') {
          const hasVendorItems = order.items.some(item => item.vendor.toString() === userId);
          if (!hasVendorItems) {
            throw new ValidationError('Access denied');
          }
        } else {
          throw new ValidationError('Access denied');
        }
      }

      // Update order status
      order.status = newStatus;
      order.updatedBy = userId;

      if (notes) {
        order.adminNotes = notes;
      }

      // Handle special status changes
      if (newStatus === 'cancelled') {
        order.cancelledAt = new Date();
        // Restore inventory
        await this.restoreInventory(order);
      }

      await order.save();

      logger.info('Order status updated successfully', {
        orderId,
        orderNumber: order.orderNumber,
        oldStatus: order.status,
        newStatus
      });

      return {
        success: true,
        data: order,
        message: `Order status updated to ${newStatus}`
      };
    } catch (error) {
      logger.error('Failed to update order status', { orderId, newStatus, error: error.message });
      throw error;
    }
  }

  // Update payment status
  static async updatePaymentStatus(orderId, paymentStatus, transactionId = null, userId) {
    try {
      logger.info('Updating payment status', { orderId, paymentStatus, userId });

      const order = await Order.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      order.payment.status = paymentStatus;
      order.updatedBy = userId;

      if (transactionId) {
        order.payment.transactionId = transactionId;
      }

      if (paymentStatus === 'completed') {
        order.payment.paidAt = new Date();
      } else if (paymentStatus === 'refunded') {
        order.payment.refundedAt = new Date();
      }

      await order.save();

      logger.info('Payment status updated successfully', {
        orderId,
        orderNumber: order.orderNumber,
        paymentStatus
      });

      return {
        success: true,
        data: order,
        message: `Payment status updated to ${paymentStatus}`
      };
    } catch (error) {
      logger.error('Failed to update payment status', { orderId, error: error.message });
      throw error;
    }
  }

  // Get customer orders
  static async getCustomerOrders(customerId, filters = {}, options = {}) {
    try {
      logger.info('Fetching customer orders', { customerId, filters });

      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        status
      } = options;

      const query = { customer: customerId };

      if (status) {
        query.status = status;
      }

      if (filters.dateFrom) {
        query.createdAt = { $gte: new Date(filters.dateFrom) };
      }

      if (filters.dateTo) {
        query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
      }

      const skip = (page - 1) * limit;

      const orders = await Order.find(query)
        .populate('items.product', 'name images')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Order.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Failed to fetch customer orders', { customerId, error: error.message });
      throw error;
    }
  }

  // Get vendor orders
  static async getVendorOrders(vendorId, filters = {}, options = {}) {
    try {
      logger.info('Fetching vendor orders', { vendorId, filters });

      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        status
      } = options;

      const query = { 'items.vendor': vendorId };

      if (status) {
        query.status = status;
      }

      if (filters.dateFrom) {
        query.createdAt = { $gte: new Date(filters.dateFrom) };
      }

      if (filters.dateTo) {
        query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
      }

      const skip = (page - 1) * limit;

      const orders = await Order.find(query)
        .populate('customer', 'firstName lastName email')
        .populate('items.product', 'name images')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Order.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Failed to fetch vendor orders', { vendorId, error: error.message });
      throw error;
    }
  }

  // Cancel order
  static async cancelOrder(orderId, reason, userId, userRole) {
    try {
      logger.info('Cancelling order', { orderId, userId, userRole });

      const order = await Order.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check permissions
      if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
        if (order.customer.toString() !== userId) {
          throw new ValidationError('You can only cancel your own orders');
        }
      }

      // Check if order can be cancelled
      if (!order.canBeCancelled()) {
        throw new ValidationError('Order cannot be cancelled at this stage');
      }

      // Update order
      order.status = 'cancelled';
      order.cancellationReason = reason;
      order.cancelledAt = new Date();
      order.updatedBy = userId;

      await order.save();

      // Restore inventory
      await this.restoreInventory(order);

      logger.info('Order cancelled successfully', {
        orderId,
        orderNumber: order.orderNumber,
        reason
      });

      return {
        success: true,
        data: order,
        message: 'Order cancelled successfully'
      };
    } catch (error) {
      logger.error('Failed to cancel order', { orderId, error: error.message });
      throw error;
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

      // Check if order can be refunded
      if (!order.canBeRefunded()) {
        throw new ValidationError('Order cannot be refunded');
      }

      // Validate refund amount
      if (refundAmount > order.total) {
        throw new ValidationError('Refund amount cannot exceed order total');
      }

      // Update order
      order.status = 'refunded';
      order.refundReason = reason;
      order.refundAmount = refundAmount;
      order.refundedAt = new Date();
      order.payment.status = 'refunded';
      order.payment.refundedAt = new Date();
      order.updatedBy = userId;

      await order.save();

      logger.info('Refund processed successfully', {
        orderId,
        orderNumber: order.orderNumber,
        refundAmount
      });

      return {
        success: true,
        data: order,
        message: 'Refund processed successfully'
      };
    } catch (error) {
      logger.error('Failed to process refund', { orderId, error: error.message });
      throw error;
    }
  }

  // Get order statistics
  static async getOrderStats(filters = {}) {
    try {
      logger.info('Fetching order statistics', { filters });

      const stats = await Order.getOrderStats(filters);

      // Get additional stats
      const statusStats = await Order.aggregate([
        { $match: filters.dateFrom || filters.dateTo ? {
          createdAt: {
            ...(filters.dateFrom && { $gte: new Date(filters.dateFrom) }),
            ...(filters.dateTo && { $lte: new Date(filters.dateTo) })
          }
        } : {} },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$total' }
          }
        }
      ]);

      const paymentStats = await Order.aggregate([
        { $match: filters.dateFrom || filters.dateTo ? {
          createdAt: {
            ...(filters.dateFrom && { $gte: new Date(filters.dateFrom) }),
            ...(filters.dateTo && { $lte: new Date(filters.dateTo) })
          }
        } : {} },
        {
          $group: {
            _id: '$payment.status',
            count: { $sum: 1 },
            total: { $sum: '$total' }
          }
        }
      ]);

      return {
        success: true,
        data: {
          ...stats,
          statusBreakdown: statusStats,
          paymentBreakdown: paymentStats
        }
      };
    } catch (error) {
      logger.error('Failed to get order stats', { error: error.message });
      throw error;
    }
  }

  // Helper method to restore inventory
  static async restoreInventory(order) {
    try {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: item.quantity }
        });
      }
      logger.info('Inventory restored for cancelled order', { orderId: order._id });
    } catch (error) {
      logger.error('Failed to restore inventory', { orderId: order._id, error: error.message });
    }
  }

  // Bulk update orders
  static async bulkUpdateOrders(orderIds, updates, userId, userRole) {
    try {
      logger.info('Bulk updating orders', { orderIds: orderIds.length, userId, userRole });

      // Check permissions
      if (userRole !== 'Admin' && userRole !== 'SuperAdmin') {
        throw new ValidationError('Only administrators can bulk update orders');
      }

      const query = { _id: { $in: orderIds } };
      const updateData = {
        ...updates,
        updatedBy: userId,
        updatedAt: new Date()
      };

      // Remove fields that shouldn't be bulk updated
      const restrictedFields = ['_id', 'orderNumber', 'customer', 'items', 'total', 'createdAt'];
      restrictedFields.forEach(field => delete updateData[field]);

      const result = await Order.updateMany(query, updateData);

      logger.info('Bulk update completed', {
        matched: result.matchedCount,
        modified: result.modifiedCount
      });

      return {
        success: true,
        data: {
          matched: result.matchedCount,
          modified: result.modifiedCount
        },
        message: `Updated ${result.modifiedCount} orders successfully`
      };
    } catch (error) {
      logger.error('Failed to bulk update orders', { error: error.message });
      throw error;
    }
  }
}

module.exports = OrderService;