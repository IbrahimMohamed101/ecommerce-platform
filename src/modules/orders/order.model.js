const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: {
    type: String,
    default: null
  },
  productName: {
    type: String,
    required: true
  },
  productImage: {
    type: String,
    default: null
  },
  sku: {
    type: String,
    default: null
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  trackingNumber: {
    type: String,
    default: null
  },
  shippedAt: Date,
  deliveredAt: Date
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  recipientName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zipCode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  instructions: {
    type: String,
    default: null
  }
}, { _id: false });

const paymentInfoSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    default: null
  },
  paymentGateway: {
    type: String,
    enum: ['stripe', 'paypal', 'bank', 'cod'],
    default: null
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  paidAt: Date,
  refundedAt: Date,
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentIntentId: {
    type: String,
    default: null
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // Order identification
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },

  // Customer information
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },

  // Order items
  items: [orderItemSchema],

  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountCode: {
    type: String,
    default: null
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  shipping: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },

  // Shipping information
  shippingAddress: shippingAddressSchema,
  shippingMethod: {
    type: String,
    enum: ['standard', 'express', 'overnight', 'pickup'],
    default: 'standard'
  },
  shippingCarrier: {
    type: String,
    default: null
  },
  trackingNumber: {
    type: String,
    default: null
  },

  // Payment information
  payment: paymentInfoSchema,

  // Order status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },

  // Order lifecycle timestamps
  orderedAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  processingAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  refundedAt: Date,

  // Cancellation and refund
  cancellationReason: {
    type: String,
    default: null
  },
  refundReason: {
    type: String,
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Notes and comments
  customerNotes: {
    type: String,
    default: null
  },
  adminNotes: {
    type: String,
    default: null
  },

  // Gift options
  isGift: {
    type: Boolean,
    default: false
  },
  giftMessage: {
    type: String,
    default: null
  },

  // Referral and affiliate
  referralCode: {
    type: String,
    default: null
  },
  affiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // IP and device tracking
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
orderSchema.index({ orderNumber: 1 }); // For order number lookups
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.vendor': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderedAt: -1 });
orderSchema.index({ total: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ trackingNumber: 1 }); // For tracking lookups
orderSchema.index({ 'items.product': 1 }); // For product-based queries

// Pre-save middleware
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Set lifecycle timestamps based on status
  const now = new Date();
  switch (this.status) {
    case 'confirmed':
      if (!this.confirmedAt) this.confirmedAt = now;
      break;
    case 'processing':
      if (!this.processingAt) this.processingAt = now;
      break;
    case 'shipped':
      if (!this.shippedAt) this.shippedAt = now;
      break;
    case 'delivered':
      if (!this.deliveredAt) this.deliveredAt = now;
      break;
    case 'cancelled':
      if (!this.cancelledAt) this.cancelledAt = now;
      break;
    case 'refunded':
      if (!this.refundedAt) this.refundedAt = now;
      break;
  }

  next();
});

// Virtual for order age in days
orderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.orderedAt) / (1000 * 60 * 60 * 24));
});

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for order progress percentage
orderSchema.virtual('progressPercentage').get(function() {
  const statusProgress = {
    'pending': 10,
    'confirmed': 25,
    'processing': 50,
    'shipped': 75,
    'delivered': 100,
    'cancelled': 0,
    'refunded': 0
  };
  return statusProgress[this.status] || 0;
});

// Instance methods
orderSchema.methods.generateOrderNumber = function() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

orderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
  this.total = this.subtotal + this.shipping + this.tax - this.discount;
  return this.total;
};

orderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

orderSchema.methods.canBeRefunded = function() {
  return ['delivered', 'shipped'].includes(this.status) && this.payment.status === 'completed';
};

orderSchema.methods.updateItemStatus = function(itemId, status, trackingNumber = null) {
  const item = this.items.id(itemId);
  if (item) {
    item.status = status;
    if (trackingNumber) {
      item.trackingNumber = trackingNumber;
    }

    const now = new Date();
    if (status === 'shipped' && !item.shippedAt) {
      item.shippedAt = now;
    } else if (status === 'delivered' && !item.deliveredAt) {
      item.deliveredAt = now;
    }

    return true;
  }
  return false;
};

orderSchema.methods.getVendorItems = function(vendorId) {
  return this.items.filter(item => item.vendor.toString() === vendorId.toString());
};

orderSchema.methods.getOrderSummary = function() {
  return {
    orderNumber: this.orderNumber,
    status: this.status,
    total: this.total,
    itemCount: this.totalItems,
    orderedAt: this.orderedAt,
    customerName: this.customerName,
    progressPercentage: this.progressPercentage
  };
};

// Static methods
orderSchema.statics.findByOrderNumber = function(orderNumber) {
  return this.findOne({ orderNumber });
};

orderSchema.statics.findByCustomer = function(customerId, options = {}) {
  const query = { customer: customerId };

  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

orderSchema.statics.findByVendor = function(vendorId, options = {}) {
  const query = { 'items.vendor': vendorId };

  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .populate('customer', 'firstName lastName email')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

orderSchema.statics.getOrderStats = async function(options = {}) {
  const matchConditions = {};

  if (options.dateFrom) {
    matchConditions.createdAt = { $gte: new Date(options.dateFrom) };
  }
  if (options.dateTo) {
    matchConditions.createdAt = { ...matchConditions.createdAt, $lte: new Date(options.dateTo) };
  }
  if (options.status) {
    matchConditions.status = options.status;
  }

  const stats = await this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        averageOrderValue: { $avg: '$total' },
        totalItems: { $sum: { $size: '$items' } }
      }
    }
  ]);

  return stats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalItems: 0
  };
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;