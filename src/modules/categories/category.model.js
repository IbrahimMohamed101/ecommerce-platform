const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Store association
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },

  // Hierarchy
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  ancestors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 5 // Maximum 5 levels deep
  },

  // Media
  image: {
    url: String,
    alt: {
      type: String,
      trim: true
    }
  },
  icon: {
    type: String,
    trim: true
  },

  // SEO
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

  // Display Settings
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },

  // Statistics
  stats: {
    productCount: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    subcategoriesCount: {
      type: Number,
      default: 0
    }
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
categorySchema.index({ store: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ ancestors: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ isFeatured: 1 });
categorySchema.index({ displayOrder: 1 });
categorySchema.index({ 'stats.productCount': -1 });
categorySchema.index({ createdAt: -1 });

// Pre-save middleware
categorySchema.pre('save', async function(next) {
  this.updatedAt = Date.now();

  // Generate slug if not provided
  if (this.isModified('name') && !this.slug) {
    this.slug = this.generateSlug();
  }

  // Update ancestors and level for hierarchical structure
  if (this.isModified('parent') || this.isNew) {
    await this.updateHierarchy();
  }

  next();
});

// Pre-remove middleware to clean up references
categorySchema.pre('remove', async function(next) {
  // Move child categories to parent or root (within same store)
  await mongoose.model('Category').updateMany(
    { parent: this._id, store: this.store },
    {
      $set: { parent: this.parent },
      $pull: { ancestors: this._id }
    }
  );

  // Update product categories (within same store)
  await mongoose.model('Product').updateMany(
    { category: this._id, store: this.store },
    { $unset: { category: 1 } }
  );

  next();
});

// Instance methods
categorySchema.methods.generateSlug = function() {
  return this.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

categorySchema.methods.updateHierarchy = async function() {
  if (!this.parent) {
    // Root category
    this.ancestors = [];
    this.level = 1;
    return;
  }

  // Get parent category and ensure it's in the same store
  const parentCategory = await mongoose.model('Category').findOne({
    _id: this.parent,
    store: this.store
  });
  if (!parentCategory) {
    throw new Error('Parent category not found or not in the same store');
  }

  // Update ancestors and level
  this.ancestors = [...parentCategory.ancestors, parentCategory._id];
  this.level = parentCategory.level + 1;

  // Prevent deep nesting
  if (this.level > 5) {
    throw new Error('Maximum category depth (5 levels) exceeded');
  }
};

categorySchema.methods.getFullPath = function() {
  // This would return the full category path (e.g., "Electronics > Smartphones > iPhone")
  // Implementation would require populating ancestors
  return this.name; // Placeholder
};

categorySchema.methods.incrementViewCount = function() {
  this.stats.totalViews += 1;
  return this.save();
};

categorySchema.methods.updateProductCount = async function() {
  const productCount = await mongoose.model('Product').countDocuments({
    category: this._id,
    store: this.store,
    status: 'active'
  });

  this.stats.productCount = productCount;
  return this.save();
};

categorySchema.methods.updateSubcategoriesCount = async function() {
  const subcategoriesCount = await mongoose.model('Category').countDocuments({
    parent: this._id,
    store: this.store,
    isActive: true
  });

  this.stats.subcategoriesCount = subcategoriesCount;
  return this.save();
};

// Static methods
categorySchema.statics.findActive = function(storeId) {
  const query = { isActive: true };
  if (storeId) query.store = storeId;
  return this.find(query).sort({ displayOrder: 1, name: 1 });
};

categorySchema.statics.findBySlug = function(slug, storeId) {
  const query = { slug, isActive: true };
  if (storeId) query.store = storeId;
  return this.findOne(query);
};

categorySchema.statics.findRootCategories = function(storeId) {
  const query = { parent: null, isActive: true };
  if (storeId) query.store = storeId;
  return this.find(query).sort({ displayOrder: 1, name: 1 });
};

categorySchema.statics.findSubcategories = function(parentId, storeId) {
  const query = { parent: parentId, isActive: true };
  if (storeId) query.store = storeId;
  return this.find(query).sort({ displayOrder: 1, name: 1 });
};

categorySchema.statics.findFeatured = function(storeId) {
  const query = { isFeatured: true, isActive: true };
  if (storeId) query.store = storeId;
  return this.find(query).sort({ displayOrder: 1, name: 1 });
};

categorySchema.statics.getCategoryTree = async function(storeId) {
  const query = { isActive: true };
  if (storeId) query.store = storeId;

  const categories = await this.find(query)
    .sort({ level: 1, displayOrder: 1, name: 1 })
    .lean();

  // Build tree structure
  const categoryMap = new Map();
  const rootCategories = [];

  // First pass: create category map
  categories.forEach(category => {
    category.children = [];
    categoryMap.set(category._id.toString(), category);
  });

  // Second pass: build tree
  categories.forEach(category => {
    if (category.parent) {
      const parent = categoryMap.get(category.parent.toString());
      if (parent) {
        parent.children.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  return rootCategories;
};

categorySchema.statics.search = function(searchTerm, storeId) {
  const query = {
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { 'seo.keywords': { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  };
  if (storeId) query.store = storeId;

  return this.find(query).sort({ name: 1 });
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;