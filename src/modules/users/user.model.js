const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['Customer', 'Vendor', 'Admin', 'SuperAdmin'],
    default: 'Customer'
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  keycloakId: {
    type: String,
    required: true,
    unique: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phone: {
    type: String,
    trim: true
  },
  // Contact Information
  phone: {
    type: String,
    trim: true
  },
  secondaryEmail: {
    type: String,
    lowercase: true,
    trim: true
  },

  // Primary Address (for quick checkout)
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },

  // Multiple Shipping Addresses
  shippingAddresses: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    label: { type: String, default: 'Home' }, // Home, Work, etc.
    recipientName: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],

  // Profile & Preferences
  profileImage: String,
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },

  // Shopping Preferences
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'es', 'fr', 'de', 'ar', 'zh']
  },
  timezone: {
    type: String,
    default: 'UTC'
  },

  // Marketing & Notifications
  marketingPreferences: {
    emailOffers: { type: Boolean, default: true },
    smsOffers: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    abandonedCart: { type: Boolean, default: true }
  },

  // Shopping Cart (embedded for quick access)
  cart: {
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      variantId: String, // For products with variants (size, color, etc.)
      quantity: { type: Number, default: 1, min: 1 },
      price: { type: Number, required: true }, // Price at time of adding
      addedAt: { type: Date, default: Date.now }
    }],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
  },

  // Wishlist
  wishlist: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    addedAt: { type: Date, default: Date.now }
  }],

  // Loyalty & Rewards
  loyaltyPoints: {
    current: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    tier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze'
    },
    joinedAt: { type: Date, default: Date.now }
  },

  // Purchase History Summary (for quick access)
  purchaseStats: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastOrderDate: Date,
    favoriteCategory: String,
    favoriteBrands: [String]
  },

  // Referral System
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referralEarnings: {
    type: Number,
    default: 0
  },

  // Security & Authentication
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  trustedDevices: [{
    deviceId: String,
    deviceName: String,
    browser: String,
    os: String,
    lastUsed: { type: Date, default: Date.now },
    isTrusted: { type: Boolean, default: false }
  }],

  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  // Account Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,

  // GDPR Compliance
  dataConsent: {
    marketing: { type: Boolean, default: false },
    analytics: { type: Boolean, default: true },
    thirdParty: { type: Boolean, default: false },
    consentDate: Date,
    consentVersion: { type: String, default: '1.0' }
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

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
// Note: email, username, keycloakId, and referralCode indexes are automatically created by unique: true
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'loyaltyPoints.tier': 1 });
userSchema.index({ 'purchaseStats.totalSpent': -1 });
userSchema.index({ 'cart.items.productId': 1 });
userSchema.index({ 'wishlist.productId': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for cart item count
userSchema.virtual('cartItemCount').get(function() {
  return this.cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
});

// Virtual for default shipping address
userSchema.virtual('defaultShippingAddress').get(function() {
  return this.shippingAddresses?.find(addr => addr.isDefault) || this.shippingAddresses?.[0];
});

// Virtual for account age in days
userSchema.virtual('accountAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to get user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Method to get user by username
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username });
};

// Method to get user by Keycloak ID
userSchema.statics.findByKeycloakId = function(keycloakId) {
  return this.findOne({ keycloakId });
};

// Method to get user by referral code
userSchema.statics.findByReferralCode = function(referralCode) {
  return this.findOne({ referralCode });
};

// Instance method to add item to cart
userSchema.methods.addToCart = function(productId, variantId, quantity, price) {
  if (!this.cart) {
    this.cart = { items: [], subtotal: 0, discount: 0, tax: 0, total: 0 };
  }

  const existingItem = this.cart.items.find(item =>
    item.productId.toString() === productId.toString() &&
    item.variantId === variantId
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.cart.items.push({
      productId,
      variantId,
      quantity,
      price,
      addedAt: new Date()
    });
  }

  this.updateCartTotals();
  this.cart.updatedAt = new Date();
  return this.save();
};

// Instance method to remove item from cart
userSchema.methods.removeFromCart = function(productId, variantId) {
  if (!this.cart?.items) return this.save();

  this.cart.items = this.cart.items.filter(item =>
    !(item.productId.toString() === productId.toString() &&
      item.variantId === variantId)
  );

  this.updateCartTotals();
  this.cart.updatedAt = new Date();
  return this.save();
};

// Instance method to update cart totals
userSchema.methods.updateCartTotals = function() {
  if (!this.cart?.items) return;

  this.cart.subtotal = this.cart.items.reduce((total, item) =>
    total + (item.price * item.quantity), 0
  );

  // Simple tax calculation (8% tax rate - can be customized)
  this.cart.tax = Math.round(this.cart.subtotal * 0.08 * 100) / 100;

  this.cart.total = this.cart.subtotal + this.cart.tax - this.cart.discount;
};

// Instance method to clear cart
userSchema.methods.clearCart = function() {
  this.cart = {
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    updatedAt: new Date()
  };
  return this.save();
};

// Instance method to add to wishlist
userSchema.methods.addToWishlist = function(productId) {
  if (!this.wishlist) {
    this.wishlist = [];
  }

  const exists = this.wishlist.some(item =>
    item.productId.toString() === productId.toString()
  );

  if (!exists) {
    this.wishlist.push({
      productId,
      addedAt: new Date()
    });
  }

  return this.save();
};

// Instance method to remove from wishlist
userSchema.methods.removeFromWishlist = function(productId) {
  if (!this.wishlist) return this.save();

  this.wishlist = this.wishlist.filter(item =>
    item.productId.toString() !== productId.toString()
  );

  return this.save();
};

// Instance method to add loyalty points
userSchema.methods.addLoyaltyPoints = function(points) {
  if (!this.loyaltyPoints) {
    this.loyaltyPoints = {
      current: 0,
      totalEarned: 0,
      totalSpent: 0,
      tier: 'Bronze',
      joinedAt: new Date()
    };
  }

  this.loyaltyPoints.current += points;
  this.loyaltyPoints.totalEarned += points;

  // Update tier based on total earned points
  this.updateLoyaltyTier();

  return this.save();
};

// Instance method to spend loyalty points
userSchema.methods.spendLoyaltyPoints = function(points) {
  if (!this.loyaltyPoints || this.loyaltyPoints.current < points) {
    throw new Error('Insufficient loyalty points');
  }

  this.loyaltyPoints.current -= points;
  this.loyaltyPoints.totalSpent += points;

  return this.save();
};

// Instance method to update loyalty tier
userSchema.methods.updateLoyaltyTier = function() {
  const totalEarned = this.loyaltyPoints?.totalEarned || 0;

  if (totalEarned >= 10000) {
    this.loyaltyPoints.tier = 'Platinum';
  } else if (totalEarned >= 5000) {
    this.loyaltyPoints.tier = 'Gold';
  } else if (totalEarned >= 1000) {
    this.loyaltyPoints.tier = 'Silver';
  } else {
    this.loyaltyPoints.tier = 'Bronze';
  }
};

// Instance method to update purchase stats
userSchema.methods.updatePurchaseStats = function(orderTotal) {
  if (!this.purchaseStats) {
    this.purchaseStats = {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      lastOrderDate: new Date()
    };
  }

  this.purchaseStats.totalOrders += 1;
  this.purchaseStats.totalSpent += orderTotal;
  this.purchaseStats.lastOrderDate = new Date();
  this.purchaseStats.averageOrderValue =
    this.purchaseStats.totalSpent / this.purchaseStats.totalOrders;

  return this.save();
};

// Instance method to generate referral code
userSchema.methods.generateReferralCode = function() {
  if (!this.referralCode) {
    // Generate a unique referral code based on user ID
    this.referralCode = `REF${this._id.toString().slice(-6).toUpperCase()}`;
  }
  return this.referralCode;
};

const User = mongoose.model('User', userSchema);

module.exports = User;