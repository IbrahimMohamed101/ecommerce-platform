const Favorites = require('./favorites.model');
const Product = require('../products/product.model');
const { ValidationError, NotFoundError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

class FavoritesService {

  // Get user's favorites
  static async getFavorites(userId) {
    try {
      logger.info('Fetching favorites for user', { userId });

      const favorites = await Favorites.findOrCreateByUser(userId);

      await favorites.populate('products', 'name images price currentPrice status category vendor');

      logger.info('Favorites fetched successfully', { userId, productCount: favorites.products.length });

      return {
        success: true,
        data: favorites
      };
    } catch (error) {
      logger.error('Failed to fetch favorites', { userId, error: error.message });
      throw error;
    }
  }

  // Add product to favorites
  static async addToFavorites(userId, productId) {
    try {
      logger.info('Adding product to favorites', { userId, productId });

      // Validate product
      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      if (product.status !== 'active') {
        throw new ValidationError('Product is not available');
      }

      // Get or create favorites
      const favorites = await Favorites.findOrCreateByUser(userId);

      // Check if already in favorites
      if (favorites.hasProduct(productId)) {
        return {
          success: true,
          message: 'Product is already in favorites',
          data: favorites
        };
      }

      // Add product
      await favorites.addProduct(productId);

      // Populate and return
      await favorites.populate('products', 'name images price currentPrice status category vendor');

      logger.info('Product added to favorites successfully', {
        userId,
        productId
      });

      return {
        success: true,
        data: favorites,
        message: 'Product added to favorites successfully'
      };
    } catch (error) {
      logger.error('Failed to add product to favorites', { userId, productId, error: error.message });
      throw error;
    }
  }

  // Remove product from favorites
  static async removeFromFavorites(userId, productId) {
    try {
      logger.info('Removing product from favorites', { userId, productId });

      const favorites = await Favorites.findOne({ user: userId });
      if (!favorites) {
        throw new NotFoundError('Favorites not found');
      }

      // Check if product is in favorites
      if (!favorites.hasProduct(productId)) {
        throw new NotFoundError('Product not found in favorites');
      }

      // Remove product
      await favorites.removeProduct(productId);

      // Populate and return
      await favorites.populate('products', 'name images price currentPrice status category vendor');

      logger.info('Product removed from favorites successfully', { userId, productId });

      return {
        success: true,
        data: favorites,
        message: 'Product removed from favorites successfully'
      };
    } catch (error) {
      logger.error('Failed to remove product from favorites', { userId, productId, error: error.message });
      throw error;
    }
  }

  // Check if product is in favorites
  static async isFavorite(userId, productId) {
    try {
      const favorites = await Favorites.findOne({ user: userId });
      if (!favorites) {
        return {
          success: true,
          data: { isFavorite: false }
        };
      }

      return {
        success: true,
        data: { isFavorite: favorites.hasProduct(productId) }
      };
    } catch (error) {
      logger.error('Failed to check if product is favorite', { userId, productId, error: error.message });
      throw error;
    }
  }
}

module.exports = FavoritesService;