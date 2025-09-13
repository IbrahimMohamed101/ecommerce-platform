const UserService = require('./user.service');
const { catchAsync, ValidationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

class UserController {
  // Get user profile with ecommerce data
  static getProfile = catchAsync(async (req, res) => {
    const user = req.user;

    logger.auth('Getting user profile', { userId: user.id });

    const userData = await UserService.getUserById(user.id);

    if (!userData.success) {
      logger.authError('Failed to retrieve user profile', { userId: user.id });
      throw new ValidationError('Failed to retrieve user profile');
    }

    // Get additional stats
    const statsResult = await UserService.getUserStats(user.id);

    const profileData = {
      ...userData.data,
      stats: statsResult.success ? statsResult.data : null
    };

    return res.status(200).json({
      success: true,
      data: profileData
    });
  });

  // Update user profile
  static updateProfile = catchAsync(async (req, res) => {
    const user = req.user;
    const updates = req.body;

    logger.auth('Updating user profile', { userId: user.id });

    const result = await UserService.updateUser(user.id, updates);

    if (!result.success) {
      logger.authError('Failed to update user profile', { userId: user.id });
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result.data
    });
  });

  // Update user preferences
  static updatePreferences = catchAsync(async (req, res) => {
    const user = req.user;
    const preferences = req.body;

    logger.auth('Updating user preferences', { userId: user.id });

    const result = await UserService.updateUserPreferences(user.id, preferences);

    if (!result.success) {
      logger.authError('Failed to update user preferences', { userId: user.id });
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: result.data
    });
  });

  // Cart Management
  static addToCart = catchAsync(async (req, res) => {
    const user = req.user;
    const { productId, variantId, quantity, price } = req.body;

    logger.auth('Adding to cart', { userId: user.id, productId });

    const result = await UserService.addToCart(user.id, productId, variantId, quantity, price);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  static removeFromCart = catchAsync(async (req, res) => {
    const user = req.user;
    const { productId, variantId } = req.body;

    logger.auth('Removing from cart', { userId: user.id, productId });

    const result = await UserService.removeFromCart(user.id, productId, variantId);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  static getCart = catchAsync(async (req, res) => {
    const user = req.user;

    const result = await UserService.getCart(user.id);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  });

  static clearCart = catchAsync(async (req, res) => {
    const user = req.user;

    logger.auth('Clearing cart', { userId: user.id });

    const result = await UserService.clearCart(user.id);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      message: result.message
    });
  });

  // Wishlist Management
  static addToWishlist = catchAsync(async (req, res) => {
    const user = req.user;
    const { productId } = req.body;

    logger.auth('Adding to wishlist', { userId: user.id, productId });

    const result = await UserService.addToWishlist(user.id, productId);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      message: result.message
    });
  });

  static removeFromWishlist = catchAsync(async (req, res) => {
    const user = req.user;
    const { productId } = req.body;

    logger.auth('Removing from wishlist', { userId: user.id, productId });

    const result = await UserService.removeFromWishlist(user.id, productId);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      message: result.message
    });
  });

  static getWishlist = catchAsync(async (req, res) => {
    const user = req.user;

    const result = await UserService.getWishlist(user.id);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Shipping Addresses
  static addShippingAddress = catchAsync(async (req, res) => {
    const user = req.user;
    const addressData = req.body;

    logger.auth('Adding shipping address', { userId: user.id });

    const result = await UserService.addShippingAddress(user.id, addressData);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Loyalty Points
  static getLoyaltyPoints = catchAsync(async (req, res) => {
    const user = req.user;

    const userData = await UserService.getUserById(user.id);

    if (!userData.success) {
      throw new ValidationError('User not found');
    }

    return res.status(200).json({
      success: true,
      data: userData.data.loyaltyPoints || {
        current: 0,
        totalEarned: 0,
        totalSpent: 0,
        tier: 'Bronze'
      }
    });
  });

  // User Statistics
  static getStats = catchAsync(async (req, res) => {
    const user = req.user;

    const result = await UserService.getUserStats(user.id);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  });

  // Delete user account
  static deleteUser = catchAsync(async (req, res) => {
    const user = req.user;

    logger.auth('User requesting account deletion', { userId: user.id });

    const result = await UserService.deleteUser(user.id);

    if (!result.success) {
      logger.authError('Failed to delete user account', { userId: user.id });
      throw new ValidationError(result.message);
    }

    logger.auth('User account deleted successfully', { userId: user.id });

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  });
}

module.exports = UserController;