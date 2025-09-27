const CartService = require('./cart.service');
const { ValidationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

class CartController {

  // Get user's cart
  static async getCart(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await CartService.getCart(userId);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getCart controller', { error: error.message, userId: req.user?.id });
      next(error);
    }
  }

  // Add item to cart
  static async addItem(req, res, next) {
    try {
      const userId = req.user.id;
      const { productId, quantity = 1, variantId } = req.body;

      // Validate input
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      if (quantity < 1) {
        throw new ValidationError('Quantity must be at least 1');
      }

      const result = await CartService.addItem(userId, productId, quantity, variantId);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in addItem controller', {
        error: error.message,
        userId: req.user?.id,
        productId: req.body?.productId
      });
      next(error);
    }
  }

  // Update item quantity
  static async updateItemQuantity(req, res, next) {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!itemId) {
        throw new ValidationError('Item ID is required');
      }

      if (!quantity || quantity < 1) {
        throw new ValidationError('Valid quantity is required');
      }

      const result = await CartService.updateItemQuantity(userId, itemId, quantity);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in updateItemQuantity controller', {
        error: error.message,
        userId: req.user?.id,
        itemId: req.params?.itemId
      });
      next(error);
    }
  }

  // Remove item from cart
  static async removeItem(req, res, next) {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;

      if (!itemId) {
        throw new ValidationError('Item ID is required');
      }

      const result = await CartService.removeItem(userId, itemId);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in removeItem controller', {
        error: error.message,
        userId: req.user?.id,
        itemId: req.params?.itemId
      });
      next(error);
    }
  }

  // Clear cart
  static async clearCart(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await CartService.clearCart(userId);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in clearCart controller', { error: error.message, userId: req.user?.id });
      next(error);
    }
  }

  // Get cart summary
  static async getCartSummary(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await CartService.getCartSummary(userId);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getCartSummary controller', { error: error.message, userId: req.user?.id });
      next(error);
    }
  }
}

module.exports = CartController;