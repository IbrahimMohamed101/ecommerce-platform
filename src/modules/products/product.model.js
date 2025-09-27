const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Basic Product Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 300
  },

  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  compareAtPrice: {
    type: Number,
    min: 0
  },
  costPrice: {
    type: Number,
    min: 0
  },

  // Inventory
  sku: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  trackQuantity: {
    type: Boolean,
    default: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: 0
  },
  continueSellingWhenOutOfStock: {
    type: Boolean,
    default: false
  },

  // Categories and Tags
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  brand: {
    type: String,
    trim: true
  },

  // Vendor Information
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Store association
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },

  // Product Variants (Size, Color, etc.)
  variants: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: String,
      required: true,
      trim: true
    },
    priceModifier: {
      type: Number,
      default: 0
    },
    sku: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Images
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      trim: true
    },
    position: {
      type: Number,
      default: 0
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // SEO and Visibility
  seo: {
    title: {
      type: String,
      trim: true,
      maxlength: 60
    },
    description: {
      type: String,
      trim: true,
      maxlength: 160
    },
    keywords: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  },

  // Shipping
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg', 'g', 'lb', 'oz'],
      default: 'kg'
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'm', 'in', 'ft'],
      default: 'cm'
    }
  },
  requiresShipping: {
    type: Boolean,
    default: true
  },

  // Product Status
  status: {
    type: String,
    enum: ['active', 'draft', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'hidden', 'password_protected'],
    default: 'public'
  },
  password: {
    type: String,
    trim: true
  },

  // Sales and Promotions
  isOnSale: {
    type: Boolean,
    default: false
  },
  saleStartDate: Date,
  saleEndDate: Date,
  salePrice: {
    type: Number,
    min: 0
  },

  // Product Type
  productType: {
    type: String,
    enum: ['physical', 'digital', 'service'],
    default: 'physical'
  },

  // Digital Product Specific
  digitalProduct: {
    downloadUrl: String,
    fileSize: Number,
    downloadLimit: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    expirationDays: {
      type: Number,
      default: 30
    }
  },

  // Gift Card Specific
  isGiftCard: {
    type: Boolean,
    default: false
  },

  // Reviews and Ratings
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Statistics
  stats: {
    views: {
      type: Number,
      default: 0
    },
    purchases: {
      type: Number,
      default: 0
    },
    wishlistCount: {
      type: Number,
      default: 0
    },
    cartCount: {
      type: Number,
      default: 0
    }
  },

  // Collections/Series
  collections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection'
  }],

  // Related Products
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  crossSellProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  upSellProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],

  // Custom Fields
  customFields: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ['text', 'number', 'boolean', 'date', 'select'],
      default: 'text'
    },
    required: {
      type: Boolean,
      default: false
    },
    options: [String] // For select type
  }],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: Date,

  // Vendor-specific timestamps
  vendorCreatedAt: {
    type: Date,
    default: Date.now
  },
  vendorUpdatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ store: 1 });
productSchema.index({ vendor: 1 });
productSchema.index({ status: 1 });
productSchema.index({ 'rating.average': -1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ tags: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ 'stats.views': -1 });
productSchema.index({ 'stats.purchases': -1 });

// Pre-save middleware
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Set publishedAt when status changes to active
  if (this.isModified('status') && this.status === 'active' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Calculate sale price if on sale
  if (this.isOnSale && this.compareAtPrice && this.compareAtPrice > this.price) {
    this.salePrice = this.price;
  }

  next();
});

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
  return this.images.find(img => img.isPrimary) || this.images[0];
});

// Virtual for current price (considering sale)
productSchema.virtual('currentPrice').get(function() {
  if (this.isOnSale && this.salePrice) {
    return this.salePrice;
  }
  return this.price;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.isOnSale && this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Virtual for availability status
productSchema.virtual('availabilityStatus').get(function() {
  if (!this.trackQuantity) {
    return 'available';
  }

  if (this.quantity === 0) {
    return this.continueSellingWhenOutOfStock ? 'available' : 'out_of_stock';
  }

  if (this.quantity <= this.lowStockThreshold) {
    return 'low_stock';
  }

  return 'available';
});

// Virtual for total variant quantity
productSchema.virtual('totalVariantQuantity').get(function() {
  if (!this.variants || this.variants.length === 0) {
    return this.quantity;
  }

  return this.variants.reduce((total, variant) => {
    return variant.isActive ? total + variant.quantity : total;
  }, 0);
});

// Instance methods
productSchema.methods.isAvailable = function() {
  if (!this.trackQuantity) {
    return true;
  }

  if (this.quantity > 0) {
    return true;
  }

  return this.continueSellingWhenOutOfStock;
};

productSchema.methods.hasVariants = function() {
  return this.variants && this.variants.length > 0;
};

productSchema.methods.getVariant = function(variantId) {
  return this.variants.id(variantId);
};

productSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  return this.save();
};

productSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

productSchema.methods.incrementPurchases = function(quantity = 1) {
  this.stats.purchases += quantity;
  return this.save();
};

// Static methods
productSchema.statics.findByCategory = function(categoryId, options = {}) {
  const query = { category: categoryId, status: 'active' };

  if (options.store) {
    query.store = options.store;
  }
  if (options.vendor) {
    query.vendor = options.vendor;
  }

  return this.find(query)
    .populate('vendor', 'firstName lastName businessName')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

productSchema.statics.findByVendor = function(vendorId, options = {}) {
  const query = { vendor: vendorId };

  if (options.store) {
    query.store = options.store;
  }
  if (options.status && options.status !== 'all') {
    query.status = options.status;
  }

  return this.find(query)
    .populate('category', 'name slug')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

productSchema.statics.findByStore = function(storeId, options = {}) {
  const query = { store: storeId };

  if (options.status) {
    query.status = options.status;
  }
  if (options.category) {
    query.category = options.category;
  }

  return this.find(query)
    .populate('category', 'name slug')
    .populate('vendor', 'firstName lastName')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

productSchema.statics.search = function(searchTerm, options = {}) {
  const searchQuery = {
    $text: { $search: searchTerm },
    status: 'active'
  };

  if (options.store) {
    searchQuery.store = options.store;
  }
  if (options.category) {
    searchQuery.category = options.category;
  }
  if (options.vendor) {
    searchQuery.vendor = options.vendor;
  }
  if (options.minPrice || options.maxPrice) {
    searchQuery.price = {};
    if (options.minPrice) searchQuery.price.$gte = options.minPrice;
    if (options.maxPrice) searchQuery.price.$lte = options.maxPrice;
  }

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .populate('vendor', 'firstName lastName businessName')
    .populate('category', 'name slug')
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;