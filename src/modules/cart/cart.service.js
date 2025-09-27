const Cart = require('./cart.model');
const Product = require('../products/product.model');
const User = require('../users/user.model');
const { ValidationError, NotFoundError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

class CartService {

  // Get user's cart
  static async getCart(userId) {
    try {
      logger.info('Fetching cart for user', { userId });

      const cart = await Cart.findOrCreateByUser(userId);

      await cart.populate([
        { path: 'items.product', select: 'name images price currentPrice sku status' },
        { path: 'items.vendor', select: 'firstName lastName businessName' }
      ]);

      logger.info('Cart fetched successfully', { userId, itemCount: cart.itemCount });

      return {
        success: true,
        data: cart
      };
    } catch (error) {
      logger.error('Failed to fetch cart', { userId, error: error.message });
      throw error;
    }
  }

  // Add item to cart
  static async addItem(userId, productId, quantity = 1, variantId = null) {
    try {
      logger.info('Adding item to cart', { userId, productId, quantity, variantId });

      // Validate product
      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      if (product.status !== 'active') {
        throw new ValidationError('Product is not available');
      }

      // Check inventory
      if (product.trackQuantity) {
        const availableQuantity = product.totalVariantQuantity || product.quantity;
        if (availableQuantity < quantity) {
          throw new ValidationError(`Insufficient stock. Available: ${availableQuantity}`);
        }
      }

      // Get or create cart
      const cart = await Cart.findOrCreateByUser(userId);

      // Add item
      await cart.addItem(product, quantity, variantId);

      // Populate and return
      await cart.populate([
        { path: 'items.product', select: 'name images price currentPrice sku status' },
        { path: 'items.vendor', select: 'firstName lastName businessName' }
      ]);

      logger.info('Item added to cart successfully', {
        userId,
        productId,
        quantity,
        cartItemCount: cart.itemCount
      });

      return {
        success: true,
        data: cart,
        message: 'Item added to cart successfully'
      };
    } catch (error) {
      logger.error('Failed to add item to cart', { userId, productId, error: error.message });
      throw error;
    }
  }

  // Update item quantity
  static async updateItemQuantity(userId, itemId, quantity) {
    try {
      logger.info('Updating cart item quantity', { userId, itemId, quantity });

      if (quantity < 1) {
        throw new ValidationError('Quantity must be at least 1');
      }

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        throw new NotFoundError('Cart not found');
      }

      const item = cart.items.id(itemId);
      if (!item) {
        throw new NotFoundError('Cart item not found');
      }

      // Check product availability
      const product = await Product.findById(item.product);
      if (product && product.trackQuantity) {
        const availableQuantity = product.totalVariantQuantity || product.quantity;
        if (availableQuantity < quantity) {
          throw new ValidationError(`Insufficient stock. Available: ${availableQuantity}`);
        }
      }

      await cart.updateItemQuantity(itemId, quantity);

      await cart.populate([
        { path: 'items.product', select: 'name images price currentPrice sku status' },
        { path: 'items.vendor', select: 'firstName lastName businessName' }
      ]);

      logger.info('Cart item quantity updated successfully', { userId, itemId, quantity });

      return {
        success: true,
        data: cart,
        message: 'Item quantity updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update cart item quantity', { userId, itemId, error: error.message });
      throw error;
    }
  }

  // Remove item from cart
  static async removeItem(userId, itemId) {
    try {
      logger.info('Removing item from cart', { userId, itemId });

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        throw new NotFoundError('Cart not found');
      }

      const item = cart.items.id(itemId);
      if (!item) {
        throw new NotFoundError('Cart item not found');
      }

      await cart.removeItem(itemId);

      await cart.populate([
        { path: 'items.product', select: 'name images price currentPrice sku status' },
        { path: 'items.vendor', select: 'firstName lastName businessName' }
      ]);

      logger.info('Item removed from cart successfully', { userId, itemId });

      return {
        success: true,
        data: cart,
        message: 'Item removed from cart successfully'
      };
    } catch (error) {
      logger.error('Failed to remove item from cart', { userId, itemId, error: error.message });
      throw error;
    }
  }

  // Clear cart
  static async clearCart(userId) {
    try {
      logger.info('Clearing cart for user', { userId });

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        throw new NotFoundError('Cart not found');
      }

      await cart.clear();

      logger.info('Cart cleared successfully', { userId });

      return {
        success: true,
        data: cart,
        message: 'Cart cleared successfully'
      };
    } catch (error) {
      logger.error('Failed to clear cart', { userId, error: error.message });
      throw error;
    }
  }

  // Get cart summary (for checkout)
  static async getCartSummary(userId) {
    try {
      logger.info('Fetching cart summary for user', { userId });

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return {
          success: true,
          data: {
            items: [],
            subtotal: 0,
            itemCount: 0
          }
        };
      }

      await cart.populate([
        { path: 'items.product', select: 'name images price currentPrice sku status' },
        { path: 'items.vendor', select: 'firstName lastName businessName' }
      ]);

      const summary = cart.getSummary();

      logger.info('Cart summary fetched successfully', { userId, itemCount: summary.itemCount });

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      logger.error('Failed to fetch cart summary', { userId, error: error.message });
      throw error;
    }
  }

  // Validate cart for checkout
  static async validateCartForCheckout(userId) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart || cart.items.length === 0) {
        throw new ValidationError('Cart is empty');
      }

      const invalidItems = [];

      for (const item of cart.items) {
        const product = item.product;

        if (!product || product.status !== 'active') {
          invalidItems.push({
            itemId: item._id,
            productId: item.product,
            reason: 'Product not available'
          });
          continue;
        }

        if (product.trackQuantity) {
          const availableQuantity = product.totalVariantQuantity || product.quantity;
          if (availableQuantity < item.quantity) {
            invalidItems.push({
              itemId: item._id,
              productId: item.product,
              reason: `Insufficient stock. Available: ${availableQuantity}, requested: ${item.quantity}`
            });
          }
        }

        // Check if price has changed
        const currentPrice = product.currentPrice || product.price;
        if (currentPrice !== item.unitPrice) {
          // Could update price or warn
          logger.warn('Product price changed', {
            productId: product._id,
            oldPrice: item.unitPrice,
            newPrice: currentPrice
          });
        }
      }

      return {
        isValid: invalidItems.length === 0,
        invalidItems,
        cart
      };
    } catch (error) {
      logger.error('Failed to validate cart for checkout', { userId, error: error.message });
      throw error;
    }
  }
}

module.exports = CartService;