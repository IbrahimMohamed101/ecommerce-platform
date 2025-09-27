const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100
  },

  // Owner (Vendor)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },

  // Media
  logo: {
    url: String,
    alt: String
  },
  banner: {
    url: String,
    alt: String
  },

  // Contact Information
  contact: {
    email: String,
    phone: String,
    website: String
  },

  // Business Information
  businessInfo: {
    taxId: String,
    registrationNumber: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },

  // Settings
  settings: {
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'ar', 'zh']
    }
  },

  // Statistics
  stats: {
    totalProducts: {
      type: Number,
      default: 0
    },
    totalCategories: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    }
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

// Indexes
storeSchema.index({ owner: 1 });
storeSchema.index({ status: 1 });
storeSchema.index({ createdAt: -1 });

// Pre-save middleware
storeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Generate slug if not provided
  if (this.isModified('name') && !this.slug) {
    this.slug = this.generateSlug();
  }

  next();
});

// Instance methods
storeSchema.methods.generateSlug = function() {
  return this.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

// Static methods
storeSchema.statics.findByOwner = function(ownerId) {
  return this.findOne({ owner: ownerId });
};

storeSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

storeSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: 'active' });
};

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;