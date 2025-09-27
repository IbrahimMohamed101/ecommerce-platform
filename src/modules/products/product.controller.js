const ProductService = require('./product.service');
const { catchAsync, ValidationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');
const { uploadMultiple } = require('../../utils/cloudinary');

class ProductController {

  // Create a new product (Vendor only)
  static createProduct = catchAsync(async (req, res) => {
    const user = req.user;
    const productData = req.body;

    logger.info('Creating product', {
      userId: user.id,
      userRole: user.role,
      productName: productData.name
    });

    // Validate user role
    if (user.role !== 'Vendor') {
      throw new ValidationError('Only vendors can create products');
    }

    // Get vendor's store
    const Store = require('../stores/store.model');
    const store = await Store.findOne({ owner: user.id, status: 'active' });
    if (!store) {
      throw new ValidationError('No active store found for this vendor');
    }
    productData.store = store._id;

    const result = await ProductService.createProduct(productData, user.id);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get all products (Customer/Admin view)
  static getProducts = catchAsync(async (req, res) => {
    const user = req.user;
    const {
      sort,
      category,
      vendor,
      brand,
      tags,
      search,
      onSale,
      inStock,
      store
    } = req.query;

    // Validate pagination and price range
    const { page, limit } = ValidationUtils.validatePagination(req);
    const { minPrice, maxPrice } = ValidationUtils.validatePriceRange(req);

    // Validate optional ObjectIds
    const validatedCategory = category ? ValidationUtils.validateObjectId(category, 'category') : undefined;
    const validatedVendor = vendor ? ValidationUtils.validateObjectId(vendor, 'vendor') : undefined;
    const validatedStore = store ? ValidationUtils.validateObjectId(store, 'store') : undefined;

    const filters = {
      category: validatedCategory,
      vendor: validatedVendor,
      minPrice,
      maxPrice,
      brand,
      tags: tags ? tags.split(',') : undefined,
      search,
      onSale,
      inStock
    };

    // Scope to user's store if vendor
    if (user && user.role === 'Vendor') {
      const Store = require('../stores/store.model');
      const userStore = await Store.findOne({ owner: user.id, status: 'active' });
      if (userStore) {
        filters.store = userStore._id;
      }
    } else if (validatedStore) {
      filters.store = validatedStore;
    }

    const options = {
      page,
      limit,
      sort,
      includeInactive: user.role === 'Admin' || user.role === 'Vendor'
    };

    const result = await ProductService.getProducts(filters, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get single product by ID
  static getProductById = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const user = req.user;

    // Validate productId
    ValidationUtils.validateObjectId(productId, 'productId');

    logger.info('getProductById called', { productId, url: req.url, query: req.query });

    const options = {
      includeInactive: user.role === 'Admin' || user.role === 'Vendor',
      trackViews: true
    };

    // For vendors, check if product belongs to their store
    if (user && user.role === 'Vendor') {
      const Product = require('./product.model');
      const product = await Product.findById(productId);
      if (!product) {
        throw new ValidationError('Product not found');
      }
      const Store = require('../stores/store.model');
      const store = await Store.findOne({ owner: user.id, _id: product.store });
      if (!store) {
        throw new ValidationError('Access denied: Product does not belong to your store');
      }
    }

    const result = await ProductService.getProductById(productId, options);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Update product (Vendor/Admin only)
  static updateProduct = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const user = req.user;
    const updateData = req.body;

    // Validate productId
    ValidationUtils.validateObjectId(productId, 'productId');

    logger.info('Updating product', {
      productId,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Vendor' && user.role !== 'Admin') {
      throw new ValidationError('Only vendors and admins can update products');
    }

    // For vendors, check if product belongs to their store
    if (user.role === 'Vendor') {
      const Product = require('./product.model');
      const product = await Product.findById(productId);
      if (!product) {
        throw new ValidationError('Product not found');
      }
      const Store = require('../stores/store.model');
      const store = await Store.findOne({ owner: user.id, _id: product.store });
      if (!store) {
        throw new ValidationError('Access denied: Product does not belong to your store');
      }
    }

    const isAdmin = user.role === 'Admin';
    const result = await ProductService.updateProduct(productId, updateData, user.id, isAdmin);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Delete product (Vendor/Admin only)
  static deleteProduct = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const user = req.user;

    logger.info('Deleting product', {
      productId,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Vendor' && user.role !== 'Admin') {
      throw new ValidationError('Only vendors and admins can delete products');
    }

    // For vendors, check if product belongs to their store
    if (user.role === 'Vendor') {
      const Product = require('./product.model');
      const product = await Product.findById(productId);
      if (!product) {
        throw new ValidationError('Product not found');
      }
      const Store = require('../stores/store.model');
      const store = await Store.findOne({ owner: user.id, _id: product.store });
      if (!store) {
        throw new ValidationError('Access denied: Product does not belong to your store');
      }
    }

    const isAdmin = user.role === 'Admin';
    const result = await ProductService.deleteProduct(productId, user.id, isAdmin);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  // Get vendor's products (Vendor only)
static getVendorProducts = catchAsync(async (req, res) => {
  const user = req.user;
  const { page, limit, sort, status } = req.query;

  if (user.role !== 'Vendor') {
    throw new ValidationError('Only vendors can access this endpoint');
  }

  const filters = { vendor: user.id };
  if (status) {
    filters.status = status;    
  }

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    sort,
    skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20)
  };

  const result = await ProductService.getVendorProducts(user.id, filters, options);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination
  });
});


  // Search products
  static searchProducts = catchAsync(async (req, res) => {
    const user = req.user;
    const { searchTerm, category, vendor, minPrice, maxPrice, page, limit, store } = req.query;

    logger.info('searchProducts called', { searchTerm, query: req.query, url: req.url });

    if (!searchTerm) {
      throw new ValidationError('Search term is required');
    }

    const filters = { category, vendor, minPrice, maxPrice };

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
      skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20)
    };

    const result = await ProductService.searchProducts(searchTerm, filters, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      searchTerm: result.searchTerm
    });
  });

  // Update product inventory (Vendor/Admin only)
  static updateInventory = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const user = req.user;
    const inventoryData = req.body;

    // Validate productId
    ValidationUtils.validateObjectId(productId, 'productId');

    // Validate inventory data
    if (!inventoryData || typeof inventoryData !== 'object') {
      throw new ValidationError('Inventory data is required');
    }

    logger.info('Updating product inventory', {
      productId,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Vendor' && user.role !== 'Admin') {
      throw new ValidationError('Only vendors and admins can update inventory');
    }

    // For vendors, check if product belongs to their store
    if (user.role === 'Vendor') {
      const Product = require('./product.model');
      const product = await Product.findById(productId);
      if (!product) {
        throw new ValidationError('Product not found');
      }
      const Store = require('../stores/store.model');
      const store = await Store.findOne({ owner: user.id, _id: product.store });
      if (!store) {
        throw new ValidationError('Access denied: Product does not belong to your store');
      }
    }

    const isAdmin = user.role === 'Admin';
    const result = await ProductService.updateInventory(productId, inventoryData, user.id, isAdmin);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Bulk update products (Vendor/Admin only)
  static bulkUpdateProducts = catchAsync(async (req, res) => {
    const user = req.user;
    const { productIds, updates } = req.body;

    logger.info('Bulk updating products', {
      productIds: productIds?.length,
      userId: user.id,
      userRole: user.role
    });

    // Validate input
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      throw new ValidationError('Product IDs array is required');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new ValidationError('Updates object is required');
    }

    // Check permissions
    if (user.role !== 'Vendor' && user.role !== 'Admin') {
      throw new ValidationError('Only vendors and admins can bulk update products');
    }

    // For vendors, ensure all products belong to their store
    if (user.role === 'Vendor') {
      const Product = require('./product.model');
      const Store = require('../stores/store.model');
      const userStore = await Store.findOne({ owner: user.id, status: 'active' });
      if (!userStore) {
        throw new ValidationError('No active store found');
      }

      const products = await Product.find({ _id: { $in: productIds } });
      const invalidProducts = products.filter(prod => prod.store.toString() !== userStore._id.toString());
      if (invalidProducts.length > 0) {
        throw new ValidationError('Some products do not belong to your store');
      }
    }

    const isAdmin = user.role === 'Admin';
    const result = await ProductService.bulkUpdateProducts(productIds, updates, user.id, isAdmin);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get product statistics
  static getProductStats = catchAsync(async (req, res) => {
    const { productId } = req.params;

    const result = await ProductService.getProductStats(productId);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Get low stock products (Vendor only)
  static getLowStockProducts = catchAsync(async (req, res) => {
    const user = req.user;
    const { threshold } = req.query;

    // Only vendors can access their low stock products
    if (user.role !== 'Vendor') {
      throw new ValidationError('Only vendors can access this endpoint');
    }

    const result = await ProductService.getLowStockProducts(user.id, parseInt(threshold) || 5);

    res.status(200).json({
      success: true,
      data: result.data,
      count: result.count
    });
  });

  // Duplicate product (Vendor/Admin only)
  static duplicateProduct = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const user = req.user;

    logger.info('Duplicating product', {
      productId,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Vendor' && user.role !== 'Admin') {
      throw new ValidationError('Only vendors and admins can duplicate products');
    }

    // For vendors, check if product belongs to their store
    if (user.role === 'Vendor') {
      const Product = require('./product.model');
      const product = await Product.findById(productId);
      if (!product) {
        throw new ValidationError('Product not found');
      }
      const Store = require('../stores/store.model');
      const store = await Store.findOne({ owner: user.id, _id: product.store });
      if (!store) {
        throw new ValidationError('Access denied: Product does not belong to your store');
      }
    }

    const isAdmin = user.role === 'Admin';
    const result = await ProductService.duplicateProduct(productId, user.id, isAdmin);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get products by category
  static getProductsByCategory = catchAsync(async (req, res) => {
    const { categoryId } = req.params;
    const { page, limit, sort, store } = req.query;
    const user = req.user;

    const filters = { category: categoryId };

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
      includeInactive: user.role === 'Admin' || user.role === 'Vendor'
    };

    const result = await ProductService.getProducts(filters, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get featured products
  static getFeaturedProducts = catchAsync(async (req, res) => {
    const { limit, store } = req.query;
    const user = req.user;

    // Featured products could be based on rating, views, or a featured flag
    const filters = {};

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
      page: 1,
      limit: parseInt(limit) || 10,
      sort: '-rating.average',
      includeInactive: user.role === 'Admin' || user.role === 'Vendor'
    };

    const result = await ProductService.getProducts(filters, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get products on sale
  static getSaleProducts = catchAsync(async (req, res) => {
    const { page, limit, sort, store } = req.query;
    const user = req.user;

    const filters = { onSale: 'true' };

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
      includeInactive: user.role === 'Admin' || user.role === 'Vendor'
    };

    const result = await ProductService.getProducts(filters, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get related products
  static getRelatedProducts = catchAsync(async (req, res) => {
      const { productId } = req.params;
      const { limit, store } = req.query;
      const user = req.user;

      // First get the product to find its category
      const productResult = await ProductService.getProductById(productId);
      const product = productResult.data;

      if (!product.category) {
          return res.status(200).json({
              success: true,
              data: [],
              message: 'No related products found'
          });
      }

      // Get products from same category (excluding current product)
      const filters = {
          category: product.category._id,
          excludeId: productId
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
          page: 1,
          limit: parseInt(limit) || 6,
          sort: '-rating.average'
      };

      const result = await ProductService.getProducts(filters, options);

      res.status(200).json({
          success: true,
          data: result.data,
          pagination: result.pagination
      });
  });

  // Upload product images
  static uploadProductImages = catchAsync(async (req, res) => {
      const { productId } = req.params;
      const user = req.user;
      const { alts } = req.body; // Array of alt texts

      logger.info('Uploading product images', {
          productId,
          userId: user.id,
          userRole: user.role,
          fileCount: req.files ? req.files.length : 0
      });

      // Validate user role
      if (user.role !== 'Vendor' && user.role !== 'Admin') {
          throw new ValidationError('Only vendors and admins can upload product images');
      }

      // For vendors, check if product belongs to their store
      if (user.role === 'Vendor') {
          const Product = require('./product.model');
          const product = await Product.findById(productId);
          if (!product) {
              throw new ValidationError('Product not found');
          }
          const Store = require('../stores/store.model');
          const store = await Store.findOne({ owner: user.id, _id: product.store });
          if (!store) {
              throw new ValidationError('Access denied: Product does not belong to your store');
          }
      }

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
          throw new ValidationError('No image files provided');
      }

      const imageUrls = req.files.map(file => file.path);
      const altTexts = alts ? (Array.isArray(alts) ? alts : [alts]) : [];

      const isAdmin = user.role === 'Admin';
      const result = await ProductService.uploadProductImages(productId, imageUrls, altTexts, user.id, isAdmin);

      res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
      });
  });

  // Delete product image
  static deleteProductImage = catchAsync(async (req, res) => {
      const { productId, imageIndex } = req.params;
      const user = req.user;

      logger.info('Deleting product image', {
          productId,
          imageIndex,
          userId: user.id,
          userRole: user.role
      });

      // Check permissions
      if (user.role !== 'Vendor' && user.role !== 'Admin') {
          throw new ValidationError('Only vendors and admins can delete product images');
      }

      // For vendors, check if product belongs to their store
      if (user.role === 'Vendor') {
          const Product = require('./product.model');
          const product = await Product.findById(productId);
          if (!product) {
              throw new ValidationError('Product not found');
          }
          const Store = require('../stores/store.model');
          const store = await Store.findOne({ owner: user.id, _id: product.store });
          if (!store) {
              throw new ValidationError('Access denied: Product does not belong to your store');
          }
      }

      const isAdmin = user.role === 'Admin';
      const result = await ProductService.deleteProductImage(productId, parseInt(imageIndex), user.id, isAdmin);

      res.status(200).json({
          success: true,
          message: result.message
      });
  });

  // Set primary image
  static setPrimaryImage = catchAsync(async (req, res) => {
      const { productId, imageIndex } = req.params;
      const user = req.user;

      logger.info('Setting primary product image', {
          productId,
          imageIndex,
          userId: user.id,
          userRole: user.role
      });

      // Check permissions
      if (user.role !== 'Vendor' && user.role !== 'Admin') {
          throw new ValidationError('Only vendors and admins can modify product images');
      }

      // For vendors, check if product belongs to their store
      if (user.role === 'Vendor') {
          const Product = require('./product.model');
          const product = await Product.findById(productId);
          if (!product) {
              throw new ValidationError('Product not found');
          }
          const Store = require('../stores/store.model');
          const store = await Store.findOne({ owner: user.id, _id: product.store });
          if (!store) {
              throw new ValidationError('Access denied: Product does not belong to your store');
          }
      }

      const isAdmin = user.role === 'Admin';
      const result = await ProductService.setPrimaryImage(productId, parseInt(imageIndex), user.id, isAdmin);

      res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
      });
  });

  // Reorder product images
  static reorderProductImages = catchAsync(async (req, res) => {
      const { productId } = req.params;
      const user = req.user;
      const { imageOrder } = req.body;

      logger.info('Reordering product images', {
          productId,
          userId: user.id,
          userRole: user.role
      });

      // Check permissions
      if (user.role !== 'Vendor' && user.role !== 'Admin') {
          throw new ValidationError('Only vendors and admins can reorder product images');
      }

      // Validate input
      if (!imageOrder || !Array.isArray(imageOrder)) {
          throw new ValidationError('imageOrder must be an array of indices');
      }

      // For vendors, check if product belongs to their store
      if (user.role === 'Vendor') {
          const Product = require('./product.model');
          const product = await Product.findById(productId);
          if (!product) {
              throw new ValidationError('Product not found');
          }
          const Store = require('../stores/store.model');
          const store = await Store.findOne({ owner: user.id, _id: product.store });
          if (!store) {
              throw new ValidationError('Access denied: Product does not belong to your store');
          }
      }

      const isAdmin = user.role === 'Admin';
      const result = await ProductService.reorderProductImages(productId, imageOrder, user.id, isAdmin);

      res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
      });
  });
}

module.exports = ProductController;