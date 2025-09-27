const CategoryService = require('./category.service');
const { catchAsync, ValidationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');
const { uploadSingle } = require('../../utils/cloudinary');

class CategoryController {

  // Create a new category
  static createCategory = catchAsync(async (req, res) => {
  const user = req.user;
  const categoryData = req.body || {};

  // Set store for vendor users
  if (user.role === 'Vendor') {
    const Store = require('../stores/store.model');
    const userStore = await Store.findOne({ owner: user.id, status: 'active' });
    if (!userStore) {
      throw new ValidationError('No active store found for vendor');
    }
    categoryData.store = userStore._id;
  }

  // Handle image upload
  if (req.file) {
    categoryData.image = {
      url: req.file.path,
      alt: req.body.alt || categoryData.name
    };
  }

  logger.info('Creating category', {
    userId: user.id,
    userRole: user.role,
    categoryName: categoryData?.name
  });

  const result = await CategoryService.createCategory(categoryData, user.id);

  res.status(201).json({
    success: true,
    message: result.message,
    data: result.data
  });
});


  // Get all categories
  static getCategories = catchAsync(async (req, res) => {
    const user = req.user;
    const {
      page,
      limit,
      sort,
      parent,
      level,
      status,
      featured,
      search,
      includeInactive,
      store
    } = req.query;

    const filters = {
      parent,
      level,
      status,
      featured,
      search
    };

    // Scope to user's store if vendor
    if (user && user.role === 'Vendor') {
      const Store = require('../stores/store.model');
      const userStore = await Store.findOne({ owner: user.id, status: 'active' });
      if (userStore) {
        filters.store = userStore._id;
      }
    } else if (store) {
      filters.store = store;
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sort,
      includeInactive: includeInactive === 'true'
    };

    const result = await CategoryService.getCategories(filters, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get single category by ID
  static getCategoryById = catchAsync(async (req, res) => {
    const user = req.user;
    const { categoryId } = req.params;
    const { includeInactive, trackViews } = req.query;

    const options = {
      includeInactive: includeInactive === 'true',
      trackViews: trackViews !== 'false'
    };

    // For vendors, check if category belongs to their store
    if (user && user.role === 'Vendor') {
      const Category = require('./category.model');
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new ValidationError('Category not found');
      }
      const Store = require('../stores/store.model');
      const store = await Store.findOne({ owner: user.id, _id: category.store });
      if (!store) {
        throw new ValidationError('Access denied: Category does not belong to your store');
      }
    }

    const result = await CategoryService.getCategoryById(categoryId, options);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Get category by slug
  static getCategoryBySlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { includeInactive } = req.query;

    const options = {
      includeInactive: includeInactive === 'true'
    };

    const result = await CategoryService.getCategoryBySlug(slug, options);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Update category
  static updateCategory = catchAsync(async (req, res) => {
    const { categoryId } = req.params;
    const user = req.user;
    const updateData = req.body;

    if (!updateData) {
      throw new ValidationError('Request body is required for category update');
    }

    logger.info('Updating category', {
      categoryId,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.role !== 'Vendor') {
      throw new ValidationError('Insufficient permissions to update categories');
    }

    // For vendors, check if category belongs to their store
    if (user.role === 'Vendor') {
      const Category = require('./category.model');
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new ValidationError('Category not found');
      }
      const Store = require('../stores/store.model');
      const store = await Store.findOne({ owner: user.id, _id: category.store });
      if (!store) {
        throw new ValidationError('Access denied: Category does not belong to your store');
      }
    }

    const result = await CategoryService.updateCategory(categoryId, updateData, user.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Delete category
  static deleteCategory = catchAsync(async (req, res) => {
    const { categoryId } = req.params;
    const user = req.user;

    logger.info('Deleting category', {
      categoryId,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.role !== 'Vendor') {
      throw new ValidationError('Insufficient permissions to delete categories');
    }

    // For vendors, check if category belongs to their store
    if (user.role === 'Vendor') {
      const Category = require('./category.model');
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new ValidationError('Category not found');
      }
      const Store = require('../stores/store.model');
      const store = await Store.findOne({ owner: user.id, _id: category.store });
      if (!store) {
        throw new ValidationError('Access denied: Category does not belong to your store');
      }
    }

    const result = await CategoryService.deleteCategory(categoryId, user.id);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  // Get category tree
  static getCategoryTree = catchAsync(async (req, res) => {
    const user = req.user;
    const { maxLevel, store } = req.query;

    const options = {
      maxLevel: maxLevel ? parseInt(maxLevel) : undefined
    };

    // Scope to user's store if vendor
    if (user && user.role === 'Vendor') {
      const Store = require('../stores/store.model');
      const userStore = await Store.findOne({ owner: user.id, status: 'active' });
      if (userStore) {
        options.store = userStore._id;
      }
    } else if (store) {
      options.store = store;
    }

    const result = await CategoryService.getCategoryTree(options);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Get root categories
  static getRootCategories = catchAsync(async (req, res) => {
    const user = req.user;
    const { includeStats, store } = req.query;

    const options = {
      includeStats: includeStats === 'true'
    };

    // Scope to user's store if vendor
    if (user && user.role === 'Vendor') {
      const Store = require('../stores/store.model');
      const userStore = await Store.findOne({ owner: user.id, status: 'active' });
      if (userStore) {
        options.store = userStore._id;
      }
    } else if (store) {
      options.store = store;
    }

    const result = await CategoryService.getRootCategories(options);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Get subcategories
  static getSubcategories = catchAsync(async (req, res) => {
    const user = req.user;
    const { parentId } = req.params;
    const { includeStats, store } = req.query;

    const options = {
      includeStats: includeStats === 'true'
    };

    // Scope to user's store if vendor
    if (user && user.role === 'Vendor') {
      const Store = require('../stores/store.model');
      const userStore = await Store.findOne({ owner: user.id, status: 'active' });
      if (userStore) {
        options.store = userStore._id;
      }
    } else if (store) {
      options.store = store;
    }

    const result = await CategoryService.getSubcategories(parentId, options);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Search categories
  static searchCategories = catchAsync(async (req, res) => {
    const user = req.user;
    const { q: searchTerm, store } = req.query;

    if (!searchTerm) {
      throw new ValidationError('Search term is required');
    }

    let storeId;
    // Scope to user's store if vendor
    if (user && user.role === 'Vendor') {
      const Store = require('../stores/store.model');
      const userStore = await Store.findOne({ owner: user.id, status: 'active' });
      if (userStore) {
        storeId = userStore._id;
      }
    } else if (store) {
      storeId = store;
    }

    const result = await CategoryService.searchCategories(searchTerm, storeId);

    res.status(200).json({
      success: true,
      data: result.data,
      searchTerm: result.searchTerm
    });
  });

  // Bulk update categories
  static bulkUpdateCategories = catchAsync(async (req, res) => {
    const user = req.user;
    const { categoryIds, updates } = req.body;

    logger.info('Bulk updating categories', {
      categoryIds: categoryIds?.length,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.role !== 'Vendor') {
      throw new ValidationError('Insufficient permissions to bulk update categories');
    }

    // Validate input
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      throw new ValidationError('Category IDs array is required');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new ValidationError('Updates object is required');
    }

    // For vendors, ensure all categories belong to their store
    if (user.role === 'Vendor') {
      const Category = require('./category.model');
      const Store = require('../stores/store.model');
      const userStore = await Store.findOne({ owner: user.id, status: 'active' });
      if (!userStore) {
        throw new ValidationError('No active store found');
      }

      const categories = await Category.find({ _id: { $in: categoryIds } });
      const invalidCategories = categories.filter(cat => cat.store.toString() !== userStore._id.toString());
      if (invalidCategories.length > 0) {
        throw new ValidationError('Some categories do not belong to your store');
      }
    }

    const result = await CategoryService.bulkUpdateCategories(categoryIds, updates, user.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Update category statistics
  static updateCategoryStats = catchAsync(async (req, res) => {
    const { categoryId } = req.params;
    const user = req.user;

    // Check permissions
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.role !== 'Vendor') {
      throw new ValidationError('Insufficient permissions to update category statistics');
    }

    // For vendors, check if category belongs to their store
    if (user.role === 'Vendor') {
      const Category = require('./category.model');
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new ValidationError('Category not found');
      }
      const Store = require('../stores/store.model');
      const store = await Store.findOne({ owner: user.id, _id: category.store });
      if (!store) {
        throw new ValidationError('Access denied: Category does not belong to your store');
      }
    }

    const result = await CategoryService.updateCategoryStats(categoryId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get featured categories
  static getFeaturedCategories = catchAsync(async (req, res) => {
    const user = req.user;
    const { includeStats, store } = req.query;

    const options = {
      includeStats: includeStats === 'true'
    };

    // Scope to user's store if vendor
    if (user && user.role === 'Vendor') {
      const Store = require('../stores/store.model');
      const userStore = await Store.findOne({ owner: user.id, status: 'active' });
      if (userStore) {
        options.store = userStore._id;
      }
    } else if (store) {
      options.store = store;
    }

    const result = await CategoryService.getFeaturedCategories(options);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Get category with products count
  static getCategoryWithStats = catchAsync(async (req, res) => {
      const user = req.user;
      const { categoryId } = req.params;

      // For vendors, check if category belongs to their store
      if (user && user.role === 'Vendor') {
          const Category = require('./category.model');
          const category = await Category.findById(categoryId);
          if (!category) {
              throw new ValidationError('Category not found');
          }
          const Store = require('../stores/store.model');
          const store = await Store.findOne({ owner: user.id, _id: category.store });
          if (!store) {
              throw new ValidationError('Access denied: Category does not belong to your store');
          }
      }

      // Get category
      const categoryResult = await CategoryService.getCategoryById(categoryId, {
          includeInactive: false,
          trackViews: true
      });

      // Update stats
      const statsResult = await CategoryService.updateCategoryStats(categoryId);

      res.status(200).json({
          success: true,
          data: {
              ...categoryResult.data.toObject(),
              stats: statsResult.data
          }
      });
  });

  // Upload category image
  static uploadCategoryImage = catchAsync(async (req, res) => {
      const { categoryId } = req.params;
      const user = req.user;
      const { alt } = req.body;

      logger.info('Uploading category image', {
          categoryId,
          userId: user.id,
          userRole: user.role
      });

      // Check permissions
      if (user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.role !== 'Vendor') {
          throw new ValidationError('Insufficient permissions to upload category images');
      }

      // For vendors, check if category belongs to their store
      if (user.role === 'Vendor') {
          const Category = require('./category.model');
          const category = await Category.findById(categoryId);
          if (!category) {
              throw new ValidationError('Category not found');
          }
          const Store = require('../stores/store.model');
          const store = await Store.findOne({ owner: user.id, _id: category.store });
          if (!store) {
              throw new ValidationError('Access denied: Category does not belong to your store');
          }
      }

      // Check if file was uploaded
      if (!req.file) {
          throw new ValidationError('No image file provided');
      }

      const result = await CategoryService.uploadCategoryImage(categoryId, req.file.path, alt, user.id);

      res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
      });
  });

  // Delete category image
  static deleteCategoryImage = catchAsync(async (req, res) => {
      const { categoryId } = req.params;
      const user = req.user;

      logger.info('Deleting category image', {
          categoryId,
          userId: user.id,
          userRole: user.role
      });

      // Check permissions
      if (user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.role !== 'Vendor') {
          throw new ValidationError('Insufficient permissions to delete category images');
      }

      // For vendors, check if category belongs to their store
      if (user.role === 'Vendor') {
          const Category = require('./category.model');
          const category = await Category.findById(categoryId);
          if (!category) {
              throw new ValidationError('Category not found');
          }
          const Store = require('../stores/store.model');
          const store = await Store.findOne({ owner: user.id, _id: category.store });
          if (!store) {
              throw new ValidationError('Access denied: Category does not belong to your store');
          }
      }

      const result = await CategoryService.deleteCategoryImage(categoryId, user.id);

      res.status(200).json({
          success: true,
          message: result.message
      });
  });
}

module.exports = CategoryController;