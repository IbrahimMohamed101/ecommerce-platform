const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
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
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  itemCount: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
cartSchema.index({ user: 1 });
cartSchema.index({ createdAt: -1 });
cartSchema.index({ updatedAt: -1 }); // For finding recently updated carts
cartSchema.index({ 'items.product': 1 });
cartSchema.index({ 'items.vendor': 1 }); // For vendor-based cart queries

// Pre-save middleware
cartSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Calculate totals
  this.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
  this.itemCount = this.items.reduce((total, item) => total + item.quantity, 0);

  next();
});

// Instance methods
cartSchema.methods.addItem = function(product, quantity = 1, variantId = null) {
  const existingItemIndex = this.items.findIndex(item =>
    item.product.toString() === product._id.toString() &&
    item.variantId === variantId
  );

  if (existingItemIndex > -1) {
    // Update existing item
    const existingItem = this.items[existingItemIndex];
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
  } else {
    // Add new item
    const unitPrice = product.currentPrice || product.price;
    const totalPrice = unitPrice * quantity;

    this.items.push({
      product: product._id,
      variantId,
      productName: product.name,
      productImage: product.primaryImage?.url || product.images[0]?.url || null,
      sku: product.sku,
      quantity,
      unitPrice,
      totalPrice,
      vendor: product.vendor
    });
  }

  return this.save();
};

cartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (item) {
    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
    return this.save();
  }
  return null;
};

cartSchema.methods.removeItem = function(itemId) {
  this.items.pull(itemId);
  return this.save();
};

cartSchema.methods.clear = function() {
  this.items = [];
  this.subtotal = 0;
  this.itemCount = 0;
  return this.save();
};

cartSchema.methods.getSummary = function() {
  return {
    itemCount: this.itemCount,
    subtotal: this.subtotal,
    items: this.items
  };
};

// Static methods
cartSchema.statics.findByUser = function(userId) {
  return this.findOne({ user: userId }).populate('items.product', 'name images price currentPrice');
};

cartSchema.statics.findOrCreateByUser = async function(userId) {
  let cart = await this.findOne({ user: userId });
  if (!cart) {
    cart = new this({ user: userId });
    await cart.save();
  }
  return cart;
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;