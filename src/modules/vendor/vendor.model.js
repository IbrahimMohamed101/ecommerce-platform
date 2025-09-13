const mongoose = require('mongoose');

const vendorRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  businessDescription: {
    type: String,
    required: true,
    trim: true
  },
  businessAddress: {
    type: String,
    required: true,
    trim: true
  },
  businessPhone: {
    type: String,
    required: true,
    trim: true
  },
  businessEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  businessLicense: {
    type: String,
    required: true,
    trim: true
  },
  taxNumber: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String,
  rejectionReason: String
});

// Vendor profile schema for approved vendors
const vendorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  businessDescription: {
    type: String,
    trim: true
  },
  businessAddress: {
    type: String,
    trim: true
  },
  businessPhone: {
    type: String,
    trim: true
  },
  businessEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  businessLicense: {
    type: String,
    trim: true
  },
  taxNumber: {
    type: String,
    trim: true
  },
  // Business details
  businessType: {
    type: String,
    enum: ['individual', 'company', 'partnership'],
    default: 'individual'
  },
  website: String,
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String
  },
  // Business hours
  businessHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  // Categories and tags
  categories: [String],
  tags: [String],
  // Rating and reviews
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  // Business stats
  stats: {
    totalProducts: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 }
  },
  // Bank account details (for payments)
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    bankName: String,
    routingNumber: String,
    swiftCode: String
  },
  // Verification status
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  approvedAt: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Indexes for better performance
// Note: userId indexes are automatically created by unique: true
vendorRequestSchema.index({ status: 1 });
vendorRequestSchema.index({ requestedAt: -1 });

vendorProfileSchema.index({ status: 1 });
vendorProfileSchema.index({ 'rating.average': -1 });
vendorProfileSchema.index({ categories: 1 });
vendorProfileSchema.index({ createdAt: -1 });

// Pre-save middleware to update timestamps
vendorProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static methods for VendorRequest
vendorRequestSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

vendorRequestSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ requestedAt: 1 });
};

vendorRequestSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ requestedAt: -1 });
};

// Static methods for VendorProfile
vendorProfileSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

vendorProfileSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

vendorProfileSchema.statics.findByCategory = function(category) {
  return this.find({
    status: 'active',
    categories: { $in: [category] }
  });
};

vendorProfileSchema.statics.search = function(searchTerm, options = {}) {
  const query = {
    status: 'active',
    $or: [
      { businessName: { $regex: searchTerm, $options: 'i' } },
      { businessDescription: { $regex: searchTerm, $options: 'i' } },
      { categories: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  };

  if (options.category) {
    query.categories = { $in: [options.category] };
  }

  return this.find(query).limit(options.limit || 20).skip(options.skip || 0);
};

// Instance methods
vendorProfileSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  return this.save();
};

vendorProfileSchema.methods.updateStats = function(orderData) {
  this.stats.totalOrders += 1;
  this.stats.totalRevenue += orderData.amount;
  this.stats.totalCustomers += orderData.newCustomer ? 1 : 0;
  return this.save();
};

const VendorRequest = mongoose.model('VendorRequest', vendorRequestSchema);
const VendorProfile = mongoose.model('VendorProfile', vendorProfileSchema);

module.exports = {
  VendorRequest,
  VendorProfile
};