const OrderService = require('./order.service');
const { catchAsync, ValidationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

class OrderController {


  // Create order from cart (Customer only)
  static createOrderFromCart = catchAsync(async (req, res) => {
    const user = req.user;
    const orderData = req.body;

    logger.info('Creating order from cart', {
      userId: user.id,
      userRole: user.role
    });

    // Validate user role
    if (user.role !== 'Customer') {
      throw new ValidationError('Only customers can create orders from cart');
    }

    const result = await OrderService.createOrderFromCart(orderData, user.id);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get order by ID
  static getOrderById = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const user = req.user;

    const result = await OrderService.getOrderById(orderId, user.id, user.role);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Get order by order number
  static getOrderByNumber = catchAsync(async (req, res) => {
    const { orderNumber } = req.params;
    const user = req.user;

    const result = await OrderService.getOrderByNumber(orderNumber, user.id, user.role);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Get customer orders (Customer only)
  static getCustomerOrders = catchAsync(async (req, res) => {
    const user = req.user;
    const {
      page,
      limit,
      sort,
      status,
      dateFrom,
      dateTo
    } = req.query;

    // Only customers can access their own orders
    if (user.role !== 'Customer') {
      throw new ValidationError('Only customers can access this endpoint');
    }

    const filters = { dateFrom, dateTo };
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sort,
      status
    };

    const result = await OrderService.getCustomerOrders(user.id, filters, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get vendor orders (Vendor only)
  static getVendorOrders = catchAsync(async (req, res) => {
    const user = req.user;
    const {
      page,
      limit,
      sort,
      status,
      dateFrom,
      dateTo
    } = req.query;

    // Only vendors can access their orders
    if (user.role !== 'Vendor') {
      throw new ValidationError('Only vendors can access this endpoint');
    }

    const filters = { dateFrom, dateTo };
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sort,
      status
    };

    const result = await OrderService.getVendorOrders(user.id, filters, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Update order status (Admin/Vendor)
  static updateOrderStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const user = req.user;
    const { status, notes } = req.body;

    logger.info('Updating order status', {
      orderId,
      userId: user.id,
      userRole: user.role,
      newStatus: status
    });

    // Validate required fields
    if (!status) {
      throw new ValidationError('Order status is required');
    }

    const result = await OrderService.updateOrderStatus(orderId, status, user.id, user.role, notes);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Update payment status (Admin only)
  static updatePaymentStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const user = req.user;
    const { paymentStatus, transactionId } = req.body;

    logger.info('Updating payment status', {
      orderId,
      userId: user.id,
      userRole: user.role,
      paymentStatus
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin') {
      throw new ValidationError('Only administrators can update payment status');
    }

    // Validate required fields
    if (!paymentStatus) {
      throw new ValidationError('Payment status is required');
    }

    const result = await OrderService.updatePaymentStatus(orderId, paymentStatus, transactionId, user.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Cancel order (Customer/Admin)
  static cancelOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const user = req.user;
    const { reason } = req.body;

    logger.info('Cancelling order', {
      orderId,
      userId: user.id,
      userRole: user.role
    });

    const result = await OrderService.cancelOrder(orderId, reason, user.id, user.role);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Process refund (Admin only)
  static processRefund = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const user = req.user;
    const { refundAmount, reason } = req.body;

    logger.info('Processing refund', {
      orderId,
      userId: user.id,
      userRole: user.role,
      refundAmount
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin') {
      throw new ValidationError('Only administrators can process refunds');
    }

    // Validate required fields
    if (!refundAmount || refundAmount <= 0) {
      throw new ValidationError('Valid refund amount is required');
    }

    if (!reason) {
      throw new ValidationError('Refund reason is required');
    }

    const result = await OrderService.processRefund(orderId, refundAmount, reason, user.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get order statistics (Admin only)
  static getOrderStats = catchAsync(async (req, res) => {
    const user = req.user;
    const { dateFrom, dateTo, status } = req.query;

    logger.info('Getting order statistics', {
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin') {
      throw new ValidationError('Only administrators can access order statistics');
    }

    const filters = { dateFrom, dateTo, status };
    const result = await OrderService.getOrderStats(filters);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Bulk update orders (Admin only)
  static bulkUpdateOrders = catchAsync(async (req, res) => {
    const user = req.user;
    const { orderIds, updates } = req.body;

    logger.info('Bulk updating orders', {
      orderIds: orderIds?.length,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin') {
      throw new ValidationError('Only administrators can bulk update orders');
    }

    // Validate input
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new ValidationError('Order IDs array is required');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new ValidationError('Updates object is required');
    }

    const result = await OrderService.bulkUpdateOrders(orderIds, updates, user.id, user.role);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get orders list (Admin only)
  static getAllOrders = catchAsync(async (req, res) => {
    const user = req.user;
    const {
      page,
      limit,
      sort,
      status,
      customer,
      vendor,
      dateFrom,
      dateTo,
      minTotal,
      maxTotal
    } = req.query;

    logger.info('Getting all orders', {
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin') {
      throw new ValidationError('Only administrators can access all orders');
    }

    // Build query
    const query = {};

    if (status) query.status = status;
    if (customer) query.customer = customer;
    if (vendor) query['items.vendor'] = vendor;
    if (minTotal || maxTotal) {
      query.total = {};
      if (minTotal) query.total.$gte = parseFloat(minTotal);
      if (maxTotal) query.total.$lte = parseFloat(maxTotal);
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20);

    const orders = await require('./order.model').find(query)
      .populate('customer', 'firstName lastName email')
      .populate('items.vendor', 'firstName lastName businessName')
      .sort(sort || '-createdAt')
      .skip(skip)
      .limit(parseInt(limit) || 20)
      .lean();

    const total = await require('./order.model').countDocuments(query);
    const totalPages = Math.ceil(total / (parseInt(limit) || 20));

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        total,
        totalPages,
        hasNext: (parseInt(page) || 1) < totalPages,
        hasPrev: (parseInt(page) || 1) > 1
      }
    });
  });

  // Get order summary
  static getOrderSummary = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const user = req.user;

    const result = await OrderService.getOrderById(orderId, user.id, user.role);
    const order = result.data;

    const summary = {
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      itemCount: order.items.length,
      orderedAt: order.orderedAt,
      customerName: order.customerName,
      progressPercentage: order.progressPercentage
    };

    res.status(200).json({
      success: true,
      data: summary
    });
  });

  // Update shipping information
  static updateShippingInfo = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const user = req.user;
    const { trackingNumber, carrier, shippingMethod } = req.body;

    logger.info('Updating shipping info', {
      orderId,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.role !== 'Vendor') {
      throw new ValidationError('Access denied');
    }

    const Order = require('./order.model');
    const order = await Order.findById(orderId);

    if (!order) {
      throw new ValidationError('Order not found');
    }

    // Vendors can only update their items
    if (user.role === 'Vendor') {
      const hasVendorItems = order.items.some(item => item.vendor.toString() === user.id);
      if (!hasVendorItems) {
        throw new ValidationError('Access denied');
      }
    }

    // Update shipping info
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.shippingCarrier = carrier;
    if (shippingMethod) order.shippingMethod = shippingMethod;

    order.updatedBy = user.id;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Shipping information updated successfully',
      data: order
    });
  });
}

module.exports = OrderController;