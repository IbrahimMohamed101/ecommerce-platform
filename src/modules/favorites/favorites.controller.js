const FavoritesService = require('./favorites.service');
const { ValidationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

class FavoritesController {

  // Get user's favorites
  static async getFavorites(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await FavoritesService.getFavorites(userId);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getFavorites controller', { error: error.message, userId: req.user?.id });
      next(error);
    }
  }

  // Add product to favorites
  static async addToFavorites(req, res, next) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const result = await FavoritesService.addToFavorites(userId, productId);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in addToFavorites controller', {
        error: error.message,
        userId: req.user?.id,
        productId: req.params?.productId
      });
      next(error);
    }
  }

  // Remove product from favorites
  static async removeFromFavorites(req, res, next) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const result = await FavoritesService.removeFromFavorites(userId, productId);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in removeFromFavorites controller', {
        error: error.message,
        userId: req.user?.id,
        productId: req.params?.productId
      });
      next(error);
    }
  }
}

module.exports = FavoritesController;