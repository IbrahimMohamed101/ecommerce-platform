const Store = require('./store.model');
const { ValidationError, NotFoundError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');
const { uploadFromBuffer, deleteImage, getOptimizedUrl } = require('../../utils/cloudinary');

class StoreService {

  // Create a new store
  static async createStore(storeData, userId) {
    try {
      logger.info('Creating new store', { userId, storeName: storeData.name });

      // Validate required fields
      if (!storeData.name) {
        throw new ValidationError('Store name is required');
      }

      // Check if user already has a store (should not happen in normal flow)
      const existingStore = await Store.findOne({ owner: userId });
      if (existingStore) {
        throw new ValidationError('Store already exists for this vendor');
      }

      // Generate slug if not provided
      if (!storeData.slug) {
        storeData.slug = storeData.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim();
      }

      // Check if slug already exists
      const existingSlug = await Store.findOne({ slug: storeData.slug });
      if (existingSlug) {
        // Append a number to make it unique
        let counter = 1;
        let uniqueSlug = `${storeData.slug}-${counter}`;
        while (await Store.findOne({ slug: uniqueSlug })) {
          counter++;
          uniqueSlug = `${storeData.slug}-${counter}`;
        }
        storeData.slug = uniqueSlug;
      }

      // Create store
      const store = new Store({
        ...storeData,
        owner: userId
      });

      const savedStore = await store.save();

      // Populate owner
      await savedStore.populate('owner', 'firstName lastName email');

      logger.info('Store created successfully', {
        storeId: savedStore._id,
        storeName: savedStore.name
      });

      return {
        success: true,
        data: savedStore,
        message: 'Store created successfully'
      };
    } catch (error) {
      logger.error('Failed to create store', {
        userId,
        storeName: storeData.name,
        error: error.message
      });
      throw error;
    }
  }

  // Get store by ID
  static async getStoreById(storeId, options = {}) {
    try {
      logger.info('Fetching store by ID', { storeId });

      const query = { _id: storeId };

      if (!options.includeInactive) {
        query.status = 'active';
      }

      const store = await Store.findOne(query)
        .populate('owner', 'firstName lastName email');

      if (!store) {
        throw new NotFoundError('Store not found');
      }

      logger.info('Store fetched successfully', { storeId, storeName: store.name });

      return {
        success: true,
        data: store
      };
    } catch (error) {
      logger.error('Failed to fetch store', { storeId, error: error.message });
      throw error;
    }
  }

  // Get store by owner
  static async getStoreByOwner(ownerId, options = {}) {
    try {
      logger.info('Fetching store by owner', { ownerId });

      const query = { owner: ownerId };

      if (!options.includeInactive) {
        query.status = 'active';
      }

      const store = await Store.findOne(query)
        .populate('owner', 'firstName lastName email');

      if (!store) {
        throw new NotFoundError('Store not found');
      }

      return {
        success: true,
        data: store
      };
    } catch (error) {
      logger.error('Failed to fetch store by owner', { ownerId, error: error.message });
      throw error;
    }
  }

  // Get store by slug
  static async getStoreBySlug(slug, options = {}) {
    try {
      logger.info('Fetching store by slug', { slug });

      const query = { slug };

      if (!options.includeInactive) {
        query.status = 'active';
      }

      const store = await Store.findOne(query)
        .populate('owner', 'firstName lastName email');

      if (!store) {
        throw new NotFoundError('Store not found');
      }

      return {
        success: true,
        data: store
      };
    } catch (error) {
      logger.error('Failed to fetch store by slug', { slug, error: error.message });
      throw error;
    }
  }

  // Update store
  static async updateStore(storeId, updateData, userId) {
    try {
      logger.info('Updating store', { storeId, userId });

      const store = await Store.findById(storeId);
      if (!store) {
        throw new NotFoundError('Store not found');
      }

      // Check ownership
      if (store.owner.toString() !== userId) {
        throw new ValidationError('Access denied: Store does not belong to you');
      }

      // Check if slug change conflicts
      if (updateData.slug && updateData.slug !== store.slug) {
        const existingStore = await Store.findOne({ slug: updateData.slug });
        if (existingStore && existingStore._id.toString() !== storeId) {
          throw new ValidationError('Store slug already exists');
        }
      }

      // Update store
      Object.assign(store, updateData);
      store.updatedAt = new Date();

      const updatedStore = await store.save();

      await updatedStore.populate('owner', 'firstName lastName email');

      logger.info('Store updated successfully', {
        storeId,
        storeName: updatedStore.name
      });

      return {
        success: true,
        data: updatedStore,
        message: 'Store updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update store', { storeId, error: error.message });
      throw error;
    }
  }

  // Delete store
  static async deleteStore(storeId, userId) {
    try {
      logger.info('Deleting store', { storeId, userId });

      const store = await Store.findById(storeId);
      if (!store) {
        throw new NotFoundError('Store not found');
      }

      // Check ownership
      if (store.owner.toString() !== userId) {
        throw new ValidationError('Access denied: Store does not belong to you');
      }

      // Check if store has categories or products
      const mongoose = require('mongoose');
      const categoryCount = await mongoose.model('Category').countDocuments({ store: storeId });
      const productCount = await mongoose.model('Product').countDocuments({ store: storeId });

      if (categoryCount > 0 || productCount > 0) {
        throw new ValidationError('Cannot delete store with associated categories or products');
      }

      await Store.findByIdAndDelete(storeId);

      logger.info('Store deleted successfully', {
        storeId,
        storeName: store.name
      });

      return {
        success: true,
        message: 'Store deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete store', { storeId, error: error.message });
      throw error;
    }
  }

  // Get stores with filtering and pagination
  static async getStores(filters = {}, options = {}) {
    try {
      logger.info('Fetching stores with filters', { filters, options });

      const {
        page = 1,
        limit = 20,
        sort = 'createdAt',
        includeInactive = false
      } = options;

      const query = {};

      // Status filter
      if (!includeInactive) {
        query.status = 'active';
      } else if (filters.status) {
        query.status = filters.status;
      }

      // Owner filter
      if (filters.owner) {
        query.owner = filters.owner;
      }

      // Search filter
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
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

      const stores = await Store.find(query)
        .populate('owner', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Store.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      logger.info('Stores fetched successfully', {
        count: stores.length,
        total,
        page,
        limit
      });

      return {
        success: true,
        data: stores,
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
      logger.error('Failed to fetch stores', { filters, error: error.message });
      throw error;
    }
  }

  // Update store statistics
  static async updateStoreStats(storeId) {
      try {
      const store = await Store.findById(storeId);
      if (!store) {
          throw new NotFoundError('Store not found');
      }

      // Update category count
      const mongoose = require('mongoose');
      const categoryCount = await mongoose.model('Category').countDocuments({ store: storeId });
      store.stats.totalCategories = categoryCount;

      // Update product count
      const productCount = await mongoose.model('Product').countDocuments({ store: storeId });
      store.stats.totalProducts = productCount;

      // Update order count and revenue (simplified - would need Order model)
      // store.stats.totalOrders = await mongoose.model('Order').countDocuments({ 'store': storeId });
      // const revenueResult = await mongoose.model('Order').aggregate([
      //   { $match: { 'store': storeId, status: 'completed' } },
      //   { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      // ]);
      // store.stats.totalRevenue = revenueResult[0]?.total || 0;

      await store.save();

      return {
          success: true,
          data: store.stats,
          message: 'Store statistics updated successfully'
      };
      } catch (error) {
      logger.error('Failed to update store stats', { storeId, error: error.message });
      throw error;
      }
  }

  // Upload store logo
  static async uploadStoreLogo(storeId, imageUrl, altText = '', userId) {
      try {
      logger.info('Uploading store logo', { storeId, userId });

      const store = await Store.findById(storeId);
      if (!store) {
          throw new NotFoundError('Store not found');
      }

      // Check ownership
      if (store.owner.toString() !== userId) {
          throw new ValidationError('Access denied: Store does not belong to you');
      }

      // Delete existing logo if present
      if (store.logo && store.logo.url) {
          try {
          const publicId = store.logo.url.split('/').pop().split('.')[0];
          await deleteImage(`ecommerce-platform/${publicId}`);
          } catch (deleteError) {
          logger.warn('Failed to delete old store logo', { storeId, error: deleteError.message });
          }
      }

      // Extract public ID from Cloudinary URL
      const publicId = imageUrl.split('/').pop().split('.')[0];

      // Update store with new logo
      store.logo = {
          url: imageUrl,
          alt: altText || `${store.name} logo`
      };

      store.updatedAt = new Date();

      await store.save();

      logger.info('Store logo uploaded successfully', {
          storeId,
          logoUrl: store.logo.url
      });

      return {
          success: true,
          data: {
          logo: store.logo,
          publicId: publicId
          },
          message: 'Store logo uploaded successfully'
      };
      } catch (error) {
      logger.error('Failed to upload store logo', { storeId, error: error.message });
      throw error;
      }
  }

  // Upload store banner
  static async uploadStoreBanner(storeId, imageUrl, altText = '', userId) {
      try {
      logger.info('Uploading store banner', { storeId, userId });

      const store = await Store.findById(storeId);
      if (!store) {
          throw new NotFoundError('Store not found');
      }

      // Check ownership
      if (store.owner.toString() !== userId) {
          throw new ValidationError('Access denied: Store does not belong to you');
      }

      // Delete existing banner if present
      if (store.banner && store.banner.url) {
          try {
          const publicId = store.banner.url.split('/').pop().split('.')[0];
          await deleteImage(`ecommerce-platform/${publicId}`);
          } catch (deleteError) {
          logger.warn('Failed to delete old store banner', { storeId, error: deleteError.message });
          }
      }

      // Extract public ID from Cloudinary URL
      const publicId = imageUrl.split('/').pop().split('.')[0];

      // Update store with new banner
      store.banner = {
          url: imageUrl,
          alt: altText || `${store.name} banner`
      };

      store.updatedAt = new Date();

      await store.save();

      logger.info('Store banner uploaded successfully', {
          storeId,
          bannerUrl: store.banner.url
      });

      return {
          success: true,
          data: {
          banner: store.banner,
          publicId: publicId
          },
          message: 'Store banner uploaded successfully'
      };
      } catch (error) {
      logger.error('Failed to upload store banner', { storeId, error: error.message });
      throw error;
      }
  }

  // Delete store logo
  static async deleteStoreLogo(storeId, userId) {
      try {
      logger.info('Deleting store logo', { storeId, userId });

      const store = await Store.findById(storeId);
      if (!store) {
          throw new NotFoundError('Store not found');
      }

      // Check ownership
      if (store.owner.toString() !== userId) {
          throw new ValidationError('Access denied: Store does not belong to you');
      }

      if (!store.logo || !store.logo.url) {
          throw new ValidationError('Store has no logo to delete');
      }

      // Delete from Cloudinary
      const publicId = store.logo.url.split('/').pop().split('.')[0];
      await deleteImage(`ecommerce-platform/${publicId}`);

      // Remove logo from store
      store.logo = undefined;
      store.updatedAt = new Date();

      await store.save();

      logger.info('Store logo deleted successfully', { storeId });

      return {
          success: true,
          message: 'Store logo deleted successfully'
      };
      } catch (error) {
      logger.error('Failed to delete store logo', { storeId, error: error.message });
      throw error;
      }
  }

  // Delete store banner
  static async deleteStoreBanner(storeId, userId) {
      try {
      logger.info('Deleting store banner', { storeId, userId });

      const store = await Store.findById(storeId);
      if (!store) {
          throw new NotFoundError('Store not found');
      }

      // Check ownership
      if (store.owner.toString() !== userId) {
          throw new ValidationError('Access denied: Store does not belong to you');
      }

      if (!store.banner || !store.banner.url) {
          throw new ValidationError('Store has no banner to delete');
      }

      // Delete from Cloudinary
      const publicId = store.banner.url.split('/').pop().split('.')[0];
      await deleteImage(`ecommerce-platform/${publicId}`);

      // Remove banner from store
      store.banner = undefined;
      store.updatedAt = new Date();

      await store.save();

      logger.info('Store banner deleted successfully', { storeId });

      return {
          success: true,
          message: 'Store banner deleted successfully'
      };
      } catch (error) {
      logger.error('Failed to delete store banner', { storeId, error: error.message });
      throw error;
      }
  }
}

module.exports = StoreService;