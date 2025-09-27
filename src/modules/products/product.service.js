const Product = require('./product.model');
const logger = require('../../utils/logger');
const { ValidationError, NotFoundError } = require('../../utils/errorHandler');
const { uploadFromBuffer, deleteImage, deleteImages, getOptimizedUrl } = require('../../utils/cloudinary');

class ProductService {

  // Create a new product
  static async createProduct(productData, vendorId) {
    try {
      logger.info('Creating new product', { vendorId, productName: productData.name });

      // Validate required fields
      const requiredFields = ['name', 'description', 'price', 'category', 'store'];
      for (const field of requiredFields) {
        if (!productData[field]) {
          throw new ValidationError(`${field} is required`);
        }
      }

      // Validate that category belongs to the store
      const Category = require('../categories/category.model');
      const category = await Category.findOne({ _id: productData.category, store: productData.store });
      if (!category) {
        throw new ValidationError('Category not found or does not belong to the specified store');
      }

      // Create product with vendor
      const product = new Product({
        ...productData,
        vendor: vendorId,
        vendorCreatedAt: new Date(),
        vendorUpdatedAt: new Date()
      });

      const savedProduct = await product.save();

      // Populate vendor and category information
      await savedProduct.populate([
        { path: 'vendor', select: 'firstName lastName businessName' },
        { path: 'category', select: 'name slug' }
      ]);

      logger.info('Product created successfully', {
        productId: savedProduct._id,
        vendorId,
        productName: savedProduct.name
      });

      return {
        success: true,
        data: savedProduct,
        message: 'Product created successfully'
      };
    } catch (error) {
      logger.error('Failed to create product', {
        vendorId,
        productName: productData.name,
        error: error.message
      });

      if (error.name === 'ValidationError') {
        throw new ValidationError('Product validation failed: ' + error.message);
      }

      throw error;
    }
  }

  // Get product by ID
  static async getProductById(productId, options = {}) {
    try {
      logger.info('Fetching product by ID', { productId });

      const query = { _id: productId };

      // If not admin/vendor, only show active products
      if (!options.includeInactive) {
        query.status = 'active';
        query.visibility = 'public';
      }

      const product = await Product.findOne(query)
        .populate('vendor', 'firstName lastName businessName email')
        .populate('category', 'name slug description')
        .populate('subcategories', 'name slug')
        .populate('relatedProducts', 'name price images')
        .populate('crossSellProducts', 'name price images')
        .populate('upSellProducts', 'name price images');

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Increment view count
      if (options.trackViews !== false) {
        product.incrementViews().catch(err =>
          logger.error('Failed to increment view count', { productId, error: err.message })
        );
      }

      logger.info('Product fetched successfully', { productId, productName: product.name });

      return {
        success: true,
        data: product
      };
    } catch (error) {
      logger.error('Failed to fetch product', { productId, error: error.message });
      throw error;
    }
  }

  // Update product
  static async updateProduct(productId, updateData, vendorId, isAdmin = false) {
    try {
      logger.info('Updating product', { productId, vendorId, isAdmin });

      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check ownership (unless admin)
      if (!isAdmin && product.vendor.toString() !== vendorId) {
        throw new ValidationError('You can only update your own products');
      }

      // Remove fields that shouldn't be updated directly
      const restrictedFields = ['_id', 'vendor', 'createdAt', 'vendorCreatedAt'];
      restrictedFields.forEach(field => delete updateData[field]);

      // Update timestamp
      updateData.updatedAt = new Date();
      updateData.vendorUpdatedAt = new Date();

      Object.assign(product, updateData);
      const updatedProduct = await product.save();

      await updatedProduct.populate([
        { path: 'vendor', select: 'firstName lastName businessName' },
        { path: 'category', select: 'name slug' }
      ]);

      logger.info('Product updated successfully', {
        productId,
        vendorId,
        productName: updatedProduct.name
      });

      return {
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update product', {
        productId,
        vendorId,
        error: error.message
      });
      throw error;
    }
  }

  // Delete product
  static async deleteProduct(productId, vendorId, isAdmin = false) {
    try {
      logger.info('Deleting product', { productId, vendorId, isAdmin });

      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check ownership (unless admin)
      if (!isAdmin && product.vendor.toString() !== vendorId) {
        throw new ValidationError('You can only delete your own products');
      }

      await Product.findByIdAndDelete(productId);

      logger.info('Product deleted successfully', {
        productId,
        vendorId,
        productName: product.name
      });

      return {
        success: true,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete product', { productId, error: error.message });
      throw error;
    }
  }

  // Get products with filtering and pagination
  static async getProducts(filters = {}, options = {}) {
    try {
      logger.info('Fetching products with filters', { filters, options });

      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        includeInactive = false
      } = options;

      const query = {};

      // Status and visibility filters
      if (!includeInactive) {
        query.status = 'active';
        query.visibility = 'public';
      } else if (filters.status) {
        query.status = filters.status;
      }

      // Category filter
      if (filters.category) {
        query.category = filters.category;
      }

      // Vendor filter
      if (filters.vendor) {
        query.vendor = filters.vendor;
      }

      // Store filter
      if (filters.store) {
        query.store = filters.store;
      }

      // Price range filter
      if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
        if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
      }

      // Brand filter
      if (filters.brand) {
        query.brand = new RegExp(filters.brand, 'i');
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      // Search filter
      if (filters.search) {
        query.$text = { $search: filters.search };
      }

      // On sale filter
      if (filters.onSale === 'true') {
        query.isOnSale = true;
      }

      // Stock filter
      if (filters.inStock === 'true') {
        query.$or = [
          { trackQuantity: false },
          { quantity: { $gt: 0 } },
          { continueSellingWhenOutOfStock: true }
        ];
      }

      const skip = (page - 1) * limit;

      // Build sort object
      let sortObj = {};
      if (sort.startsWith('-')) {
        sortObj[sort.substring(1)] = -1;
      } else {
        sortObj[sort] = 1;
      }

      // Execute query
      const products = await Product.find(query)
        .populate('vendor', 'firstName lastName businessName')
        .populate('category', 'name slug')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Product.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      logger.info('Products fetched successfully', {
        count: products.length,
        total,
        page,
        limit
      });

      return {
        success: true,
        data: products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Failed to fetch products', { filters, error: error.message });
      throw error;
    }
  }

  // Get vendor's products
  static async getVendorProducts(vendorId, filters = {}, options = {}) {
    try {
      logger.info('Fetching vendor products', { vendorId, filters });

      const products = await Product.findByVendor(vendorId, {
        status: filters.status || 'all',
        sort: options.sort || '-createdAt',
        limit: options.limit || 20,
        skip: options.skip || 0
      });

      const total = await Product.countDocuments({
        vendor: vendorId,
        ...(filters.status && filters.status !== 'all' && { status: filters.status })
      });

      return {
        success: true,
        data: products,
        pagination: {
          total,
          page: Math.floor((options.skip || 0) / (options.limit || 20)) + 1,
          limit: options.limit || 20,
          totalPages: Math.ceil(total / (options.limit || 20))
        }
      };
    } catch (error) {
      logger.error('Failed to fetch vendor products', { vendorId, error: error.message });
      throw error;
    }
  }

  // Search products
  static async searchProducts(searchTerm, filters = {}, options = {}) {
    try {
      logger.info('Searching products', { searchTerm, filters });

      const results = await Product.search(searchTerm, {
        category: filters.category,
        vendor: filters.vendor,
        store: filters.store,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        limit: options.limit || 20,
        skip: options.skip || 0
      });

      // Get total count (approximate for search)
      const totalQuery = {
        $text: { $search: searchTerm },
        status: 'active',
        visibility: 'public'
      };

      if (filters.category) totalQuery.category = filters.category;
      if (filters.vendor) totalQuery.vendor = filters.vendor;
      if (filters.store) totalQuery.store = filters.store;
      if (filters.minPrice || filters.maxPrice) {
        totalQuery.price = {};
        if (filters.minPrice) totalQuery.price.$gte = filters.minPrice;
        if (filters.maxPrice) totalQuery.price.$lte = filters.maxPrice;
      }

      const total = await Product.countDocuments(totalQuery);

      return {
        success: true,
        data: results,
        pagination: {
          total,
          page: Math.floor((options.skip || 0) / (options.limit || 20)) + 1,
          limit: options.limit || 20,
          totalPages: Math.ceil(total / (options.limit || 20))
        },
        searchTerm
      };
    } catch (error) {
      logger.error('Failed to search products', { searchTerm, error: error.message });
      throw error;
    }
  }

  // Update product inventory
  static async updateInventory(productId, inventoryData, vendorId, isAdmin = false) {
    try {
      logger.info('Updating product inventory', { productId, vendorId });

      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check ownership (unless admin)
      if (!isAdmin && product.vendor.toString() !== vendorId) {
        throw new ValidationError('You can only update your own products');
      }

      const updates = {};

      if (inventoryData.quantity !== undefined) {
        updates.quantity = Math.max(0, inventoryData.quantity);
      }

      if (inventoryData.trackQuantity !== undefined) {
        updates.trackQuantity = inventoryData.trackQuantity;
      }

      if (inventoryData.lowStockThreshold !== undefined) {
        updates.lowStockThreshold = inventoryData.lowStockThreshold;
      }

      if (inventoryData.continueSellingWhenOutOfStock !== undefined) {
        updates.continueSellingWhenOutOfStock = inventoryData.continueSellingWhenOutOfStock;
      }

      // Update variants inventory if provided
      if (inventoryData.variants) {
        inventoryData.variants.forEach(variantUpdate => {
          const variant = product.variants.id(variantUpdate.variantId);
          if (variant) {
            if (variantUpdate.quantity !== undefined) {
              variant.quantity = Math.max(0, variantUpdate.quantity);
            }
            if (variantUpdate.isActive !== undefined) {
              variant.isActive = variantUpdate.isActive;
            }
          }
        });
      }

      Object.assign(product, updates);
      product.updatedAt = new Date();
      product.vendorUpdatedAt = new Date();

      await product.save();

      logger.info('Product inventory updated successfully', {
        productId,
        newQuantity: product.quantity
      });

      return {
        success: true,
        data: product,
        message: 'Inventory updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update inventory', { productId, error: error.message });
      throw error;
    }
  }

  // Bulk update products
  static async bulkUpdateProducts(productIds, updateData, vendorId, isAdmin = false) {
    try {
      logger.info('Bulk updating products', { productIds: productIds.length, vendorId });

      const query = { _id: { $in: productIds } };

      // If not admin, only allow updating own products
      if (!isAdmin) {
        query.vendor = vendorId;
      }

      const updates = {
        ...updateData,
        updatedAt: new Date(),
        vendorUpdatedAt: new Date()
      };

      // Remove fields that shouldn't be bulk updated
      const restrictedFields = ['_id', 'vendor', 'createdAt', 'vendorCreatedAt'];
      restrictedFields.forEach(field => delete updates[field]);

      const result = await Product.updateMany(query, updates);

      logger.info('Bulk update completed', {
        matched: result.matchedCount,
        modified: result.modifiedCount
      });

      return {
        success: true,
        data: {
          matched: result.matchedCount,
          modified: result.modifiedCount
        },
        message: `Updated ${result.modifiedCount} products successfully`
      };
    } catch (error) {
      logger.error('Failed to bulk update products', { error: error.message });
      throw error;
    }
  }

  // Get product statistics
  static async getProductStats(productId) {
    try {
      const product = await Product.findById(productId).select('stats rating');
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return {
        success: true,
        data: {
          views: product.stats.views,
          purchases: product.stats.purchases,
          wishlistCount: product.stats.wishlistCount,
          cartCount: product.stats.cartCount,
          rating: product.rating
        }
      };
    } catch (error) {
      logger.error('Failed to get product stats', { productId, error: error.message });
      throw error;
    }
  }

  // Get low stock products
  static async getLowStockProducts(vendorId, threshold = 5) {
    try {
      const query = {
        vendor: vendorId,
        trackQuantity: true,
        quantity: { $lte: threshold },
        status: 'active'
      };

      const products = await Product.find(query)
        .select('name sku quantity lowStockThreshold')
        .sort({ quantity: 1 });

      return {
        success: true,
        data: products,
        count: products.length
      };
    } catch (error) {
      logger.error('Failed to get low stock products', { vendorId, error: error.message });
      throw error;
    }
  }

  // Duplicate product
  static async duplicateProduct(productId, vendorId, isAdmin = false) {
      try {
      logger.info('Duplicating product', { productId, vendorId });

      const originalProduct = await Product.findById(productId);
      if (!originalProduct) {
          throw new NotFoundError('Product not found');
      }

      // Check ownership (unless admin)
      if (!isAdmin && originalProduct.vendor.toString() !== vendorId) {
          throw new ValidationError('You can only duplicate your own products');
      }

      // Create duplicate
      const duplicateData = {
          ...originalProduct.toObject(),
          _id: undefined,
          name: `${originalProduct.name} (Copy)`,
          sku: originalProduct.sku ? `${originalProduct.sku}-COPY` : undefined,
          status: 'draft',
          stats: {
          views: 0,
          purchases: 0,
          wishlistCount: 0,
          cartCount: 0
          },
          rating: {
          average: 0,
          count: 0
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          vendorCreatedAt: new Date(),
          vendorUpdatedAt: new Date()
      };

      const duplicateProduct = new Product(duplicateData);
      const savedDuplicate = await duplicateProduct.save();

      await savedDuplicate.populate([
          { path: 'vendor', select: 'firstName lastName businessName' },
          { path: 'category', select: 'name slug' }
      ]);

      logger.info('Product duplicated successfully', {
          originalId: productId,
          duplicateId: savedDuplicate._id
      });

      return {
          success: true,
          data: savedDuplicate,
          message: 'Product duplicated successfully'
      };
      } catch (error) {
      logger.error('Failed to duplicate product', { productId, error: error.message });
      throw error;
      }
  }

  // Upload product images
  static async uploadProductImages(productId, imageUrls, altTexts = [], vendorId, isAdmin = false) {
      try {
      logger.info('Uploading product images', { productId, imageCount: imageUrls.length, vendorId });

      const product = await Product.findById(productId);
      if (!product) {
          throw new NotFoundError('Product not found');
      }

      // Check ownership (unless admin)
      if (!isAdmin && product.vendor.toString() !== vendorId) {
          throw new ValidationError('You can only upload images to your own products');
      }

      const uploadedImages = [];

      for (let i = 0; i < imageUrls.length; i++) {
          const imageUrl = imageUrls[i];
          const altText = altTexts[i] || product.name;

          // Extract public ID from Cloudinary URL
          const publicId = imageUrl.split('/').pop().split('.')[0];

          const imageData = {
          url: imageUrl,
          alt: altText,
          position: product.images.length + i,
          isPrimary: product.images.length === 0 && i === 0 // First image is primary if no images exist
          };

          product.images.push(imageData);
          uploadedImages.push({
          ...imageData,
          publicId: publicId
          });
      }

      product.updatedAt = new Date();
      product.vendorUpdatedAt = new Date();

      await product.save();

      logger.info('Product images uploaded successfully', {
          productId,
          uploadedCount: uploadedImages.length
      });

      return {
          success: true,
          data: uploadedImages,
          message: `${uploadedImages.length} image(s) uploaded successfully`
      };
      } catch (error) {
      logger.error('Failed to upload product images', { productId, error: error.message });
      throw error;
      }
  }

  // Delete product image
  static async deleteProductImage(productId, imageIndex, vendorId, isAdmin = false) {
      try {
      logger.info('Deleting product image', { productId, imageIndex, vendorId });

      const product = await Product.findById(productId);
      if (!product) {
          throw new NotFoundError('Product not found');
      }

      // Check ownership (unless admin)
      if (!isAdmin && product.vendor.toString() !== vendorId) {
          throw new ValidationError('You can only delete images from your own products');
      }

      if (!product.images[imageIndex]) {
          throw new ValidationError('Image not found at specified index');
      }

      const imageToDelete = product.images[imageIndex];
      const wasPrimary = imageToDelete.isPrimary;

      // Delete from Cloudinary
      const publicId = imageToDelete.url.split('/').pop().split('.')[0];
      await deleteImage(`ecommerce-platform/${publicId}`);

      // Remove from product
      product.images.splice(imageIndex, 1);

      // Update positions
      product.images.forEach((img, idx) => {
          img.position = idx;
      });

      // Set new primary if the deleted image was primary
      if (wasPrimary && product.images.length > 0) {
          product.images[0].isPrimary = true;
      }

      product.updatedAt = new Date();
      product.vendorUpdatedAt = new Date();

      await product.save();

      logger.info('Product image deleted successfully', { productId, imageIndex });

      return {
          success: true,
          message: 'Product image deleted successfully'
      };
      } catch (error) {
      logger.error('Failed to delete product image', { productId, imageIndex, error: error.message });
      throw error;
      }
  }

  // Set primary image
  static async setPrimaryImage(productId, imageIndex, vendorId, isAdmin = false) {
      try {
      logger.info('Setting primary product image', { productId, imageIndex, vendorId });

      const product = await Product.findById(productId);
      if (!product) {
          throw new NotFoundError('Product not found');
      }

      // Check ownership (unless admin)
      if (!isAdmin && product.vendor.toString() !== vendorId) {
          throw new ValidationError('You can only modify your own products');
      }

      if (!product.images[imageIndex]) {
          throw new ValidationError('Image not found at specified index');
      }

      // Reset all images to non-primary
      product.images.forEach(img => img.isPrimary = false);

      // Set the specified image as primary
      product.images[imageIndex].isPrimary = true;

      product.updatedAt = new Date();
      product.vendorUpdatedAt = new Date();

      await product.save();

      logger.info('Primary product image set successfully', { productId, imageIndex });

      return {
          success: true,
          data: product.images,
          message: 'Primary image set successfully'
      };
      } catch (error) {
      logger.error('Failed to set primary product image', { productId, imageIndex, error: error.message });
      throw error;
      }
  }

  // Reorder product images
  static async reorderProductImages(productId, imageOrder, vendorId, isAdmin = false) {
      try {
      logger.info('Reordering product images', { productId, vendorId });

      const product = await Product.findById(productId);
      if (!product) {
          throw new NotFoundError('Product not found');
      }

      // Check ownership (unless admin)
      if (!isAdmin && product.vendor.toString() !== vendorId) {
          throw new ValidationError('You can only modify your own products');
      }

      if (imageOrder.length !== product.images.length) {
          throw new ValidationError('Image order array must match the number of images');
      }

      // Reorder images
      const reorderedImages = imageOrder.map(index => product.images[index]);
      product.images = reorderedImages;

      // Update positions and ensure only one primary
      let hasPrimary = false;
      product.images.forEach((img, idx) => {
          img.position = idx;
          if (img.isPrimary && !hasPrimary) {
          hasPrimary = true;
          } else {
          img.isPrimary = false;
          }
      });

      // If no primary, set first as primary
      if (!hasPrimary && product.images.length > 0) {
          product.images[0].isPrimary = true;
      }

      product.updatedAt = new Date();
      product.vendorUpdatedAt = new Date();

      await product.save();

      logger.info('Product images reordered successfully', { productId });

      return {
          success: true,
          data: product.images,
          message: 'Product images reordered successfully'
      };
      } catch (error) {
      logger.error('Failed to reorder product images', { productId, error: error.message });
      throw error;
      }
  }
}

module.exports = ProductService;