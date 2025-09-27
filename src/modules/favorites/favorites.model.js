const mongoose = require('mongoose');

const favoritesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
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
favoritesSchema.index({ user: 1 });
favoritesSchema.index({ 'products': 1 });

// Pre-save middleware
favoritesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
favoritesSchema.methods.addProduct = function(productId) {
  if (!this.products.includes(productId)) {
    this.products.push(productId);
    return this.save();
  }
  return this;
};

favoritesSchema.methods.removeProduct = function(productId) {
  this.products = this.products.filter(id => !id.equals(productId));
  return this.save();
};

favoritesSchema.methods.hasProduct = function(productId) {
  return this.products.some(id => id.equals(productId));
};

// Static methods
favoritesSchema.statics.findByUser = function(userId) {
  return this.findOne({ user: userId }).populate('products', 'name images price currentPrice status');
};

favoritesSchema.statics.findOrCreateByUser = async function(userId) {
  let favorites = await this.findOne({ user: userId });
  if (!favorites) {
    favorites = new this({ user: userId });
    await favorites.save();
  }
  return favorites;
};

const Favorites = mongoose.model('Favorites', favoritesSchema);

module.exports = Favorites;