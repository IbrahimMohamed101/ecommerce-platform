const StoreService = require('./store.service');
const { catchAsync, ValidationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');
const { uploadSingle } = require('../../utils/cloudinary');

class StoreController {

  // Create a new store (Vendor only - for existing vendors who don't have stores)
  static createStore = catchAsync(async (req, res) => {
    const user = req.user;
    let storeData = req.body;

    logger.info('Creating store', {
      userId: user.id,
      userRole: user.role,
      storeName: storeData.name
    });

    // Check permissions (Only vendors can create stores)
    if (user.role !== 'Vendor') {
      throw new ValidationError('Only vendors can create stores');
    }

    // If vendor has a profile, auto-populate store data
    const { VendorProfile } = require('../vendor/vendor.model');
    const vendorProfile = await VendorProfile.findOne({ userId: user.id });

    if (vendorProfile && !storeData.name) {
      // Parse address string into address object
      let addressObj = storeData.businessInfo?.address || {};
      if (vendorProfile.businessAddress && typeof vendorProfile.businessAddress === 'string') {
        // Simple parsing: assume format "street, city, state/country"
        const addressParts = vendorProfile.businessAddress.split(',').map(part => part.trim());
        if (addressParts.length >= 2) {
          addressObj = {
            street: addressParts[0],
            city: addressParts[1],
            state: addressParts[2] || '',
            country: addressParts[3] || 'Egypt' // Default to Egypt if not specified
          };
        } else {
          // If parsing fails, put the whole string in street
          addressObj = {
            street: vendorProfile.businessAddress,
            city: '',
            state: '',
            country: 'Egypt'
          };
        }
      }

      // Auto-populate from vendor profile if name not provided
      storeData = {
        name: vendorProfile.businessName || `${user.firstName} ${user.lastName}'s Store`,
        description: storeData.description || vendorProfile.businessDescription || 'Welcome to my store',
        contact: {
          email: storeData.contact?.email || vendorProfile.businessEmail || user.email,
          phone: storeData.contact?.phone || vendorProfile.businessPhone,
          website: storeData.contact?.website || vendorProfile.website
        },
        businessInfo: {
          taxId: storeData.businessInfo?.taxId || vendorProfile.taxNumber,
          registrationNumber: storeData.businessInfo?.registrationNumber || vendorProfile.businessLicense,
          address: addressObj
        },
        ...storeData // Override with any provided data
      };
    }

    const result = await StoreService.createStore(storeData, user.id);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get store by ID
  static getStoreById = catchAsync(async (req, res) => {
    const user = req.user;
    const { storeId } = req.params;
    const { includeInactive } = req.query;

    logger.info('getStoreById called', { storeId, url: req.originalUrl });

    const options = {
      includeInactive: includeInactive === 'true'
    };

    // For vendors, check if store belongs to them
    if (user && user.role === 'Vendor') {
      const store = await StoreService.getStoreById(storeId, options);
      if (store.data.owner._id.toString() !== user.id) {
        throw new ValidationError('Access denied: Store does not belong to you');
      }
    }

    const result = await StoreService.getStoreById(storeId, options);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Get store by slug
  static getStoreBySlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { includeInactive } = req.query;

    const options = {
      includeInactive: includeInactive === 'true'
    };

    const result = await StoreService.getStoreBySlug(slug, options);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Get current user's store (Vendor only)
  static getMyStore = catchAsync(async (req, res) => {
    const user = req.user;
    const { includeInactive } = req.query;

    if (user.role !== 'Vendor') {
      throw new ValidationError('Only vendors have stores');
    }

    const options = {
      includeInactive: includeInactive === 'true'
    };

    const result = await StoreService.getStoreByOwner(user.id, options);

    res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Update store (Vendor only)
  static updateStore = catchAsync(async (req, res) => {
    const { storeId } = req.params;
    const user = req.user;
    const updateData = req.body;

    logger.info('Updating store', {
      storeId,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Vendor') {
      throw new ValidationError('Only vendors can update stores');
    }

    const result = await StoreService.updateStore(storeId, updateData, user.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Delete store (Vendor only)
  static deleteStore = catchAsync(async (req, res) => {
    const { storeId } = req.params;
    const user = req.user;

    logger.info('Deleting store', {
      storeId,
      userId: user.id,
      userRole: user.role
    });

    // Check permissions
    if (user.role !== 'Vendor') {
      throw new ValidationError('Only vendors can delete stores');
    }

    const result = await StoreService.deleteStore(storeId, user.id);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  // Get stores (Admin only)
  static getStores = catchAsync(async (req, res) => {
    const user = req.user;
    const {
      page,
      limit,
      sort,
      status,
      owner,
      search,
      includeInactive
    } = req.query;

    // Check permissions (Admin, SuperAdmin only)
    if (user.role !== 'Admin' && user.role !== 'SuperAdmin') {
      throw new ValidationError('Insufficient permissions to view all stores');
    }

    const filters = {
      status,
      owner,
      search
    };

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sort,
      includeInactive: includeInactive === 'true'
    };

    const result = await StoreService.getStores(filters, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Update store statistics
  static updateStoreStats = catchAsync(async (req, res) => {
      const { storeId } = req.params;
      const user = req.user;

      // Check permissions
      if (user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.role !== 'Vendor') {
          throw new ValidationError('Insufficient permissions to update store statistics');
      }

      // For vendors, check if store belongs to them
      if (user.role === 'Vendor') {
          const store = await StoreService.getStoreById(storeId);
          if (store.data.owner._id.toString() !== user.id) {
              throw new ValidationError('Access denied: Store does not belong to you');
          }
      }

      const result = await StoreService.updateStoreStats(storeId);

      res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
      });
  });

  // Upload store logo
  static uploadStoreLogo = catchAsync(async (req, res) => {
      const { storeId } = req.params;
      const user = req.user;
      const { alt } = req.body;

      logger.info('Uploading store logo', {
          storeId,
          userId: user.id,
          userRole: user.role
      });

      // Check permissions
      if (user.role !== 'Vendor') {
          throw new ValidationError('Only vendors can upload store logos');
      }

      // Check if file was uploaded
      if (!req.file) {
          throw new ValidationError('No logo file provided');
      }

      const result = await StoreService.uploadStoreLogo(storeId, req.file.path, alt, user.id);

      res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
      });
  });

  // Upload store banner
  static uploadStoreBanner = catchAsync(async (req, res) => {
      const { storeId } = req.params;
      const user = req.user;
      const { alt } = req.body;

      logger.info('Uploading store banner', {
          storeId,
          userId: user.id,
          userRole: user.role
      });

      // Check permissions
      if (user.role !== 'Vendor') {
          throw new ValidationError('Only vendors can upload store banners');
      }

      // Check if file was uploaded
      if (!req.file) {
          throw new ValidationError('No banner file provided');
      }

      const result = await StoreService.uploadStoreBanner(storeId, req.file.path, alt, user.id);

      res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
      });
  });

  // Delete store logo
  static deleteStoreLogo = catchAsync(async (req, res) => {
      const { storeId } = req.params;
      const user = req.user;

      logger.info('Deleting store logo', {
          storeId,
          userId: user.id,
          userRole: user.role
      });

      // Check permissions
      if (user.role !== 'Vendor') {
          throw new ValidationError('Only vendors can delete store logos');
      }

      const result = await StoreService.deleteStoreLogo(storeId, user.id);

      res.status(200).json({
          success: true,
          message: result.message
      });
  });

  // Delete store banner
  static deleteStoreBanner = catchAsync(async (req, res) => {
      const { storeId } = req.params;
      const user = req.user;

      logger.info('Deleting store banner', {
          storeId,
          userId: user.id,
          userRole: user.role
      });

      // Check permissions
      if (user.role !== 'Vendor') {
          throw new ValidationError('Only vendors can delete store banners');
      }

      const result = await StoreService.deleteStoreBanner(storeId, user.id);

      res.status(200).json({
          success: true,
          message: result.message
      });
  });
}

module.exports = StoreController;