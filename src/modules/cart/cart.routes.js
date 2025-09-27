const express = require('express');
const CartController = require('./cart.controller');
const AuthMiddleware = require('../../middleware/auth.middleware');

const router = express.Router();

// All cart routes require authentication
router.use(AuthMiddleware.requireAuth);

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get user's shopping cart
 *     description: Retrieve the authenticated user's shopping cart with all items
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d5ecb74b24c72b8c8b4567
 *                     user:
 *                       type: string
 *                       example: 60d5ecb74b24c72b8c8b4567
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 60d5ecb74b24c72b8c8b4567
 *                           product:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 60d5ecb74b24c72b8c8b4567
 *                               name:
 *                                 type: string
 *                                 example: Wireless Headphones
 *                               images:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     url:
 *                                       type: string
 *                                       example: https://example.com/image.jpg
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           unitPrice:
 *                             type: number
 *                             example: 99.99
 *                           totalPrice:
 *                             type: number
 *                             example: 199.98
 *                     subtotal:
 *                       type: number
 *                       example: 199.98
 *                     itemCount:
 *                       type: integer
 *                       example: 2
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', CartController.getCart);

/**
 * @swagger
 * /api/cart/summary:
 *   get:
 *     summary: Get cart summary
 *     description: Retrieve a summary of the user's cart for checkout
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: string
 *                             example: 60d5ecb74b24c72b8c8b4567
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           unitPrice:
 *                             type: number
 *                             example: 99.99
 *                           totalPrice:
 *                             type: number
 *                             example: 199.98
 *                     subtotal:
 *                       type: number
 *                       example: 199.98
 *                     itemCount:
 *                       type: integer
 *                       example: 2
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/summary', CartController.getCartSummary);

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Add item to cart
 *     description: Add a product to the user's shopping cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 example: 60d5ecb74b24c72b8c8b4567
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 example: 2
 *               variantId:
 *                 type: string
 *                 example: size-m
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Item added to cart successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d5ecb74b24c72b8c8b4567
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: string
 *                             example: 60d5ecb74b24c72b8c8b4567
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           unitPrice:
 *                             type: number
 *                             example: 99.99
 *                           totalPrice:
 *                             type: number
 *                             example: 199.98
 *                     subtotal:
 *                       type: number
 *                       example: 199.98
 *                     itemCount:
 *                       type: integer
 *                       example: 2
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.post('/items', CartController.addItem);

/**
 * @swagger
 * /api/cart/items/{itemId}:
 *   put:
 *     summary: Update cart item quantity
 *     description: Update the quantity of a specific item in the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 3
 *     responses:
 *       200:
 *         description: Item quantity updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Item quantity updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d5ecb74b24c72b8c8b4567
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           quantity:
 *                             type: integer
 *                             example: 3
 *                           unitPrice:
 *                             type: number
 *                             example: 99.99
 *                           totalPrice:
 *                             type: number
 *                             example: 299.97
 *                     subtotal:
 *                       type: number
 *                       example: 299.97
 *                     itemCount:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 *       500:
 *         description: Internal server error
 */
router.put('/items/:itemId', CartController.updateItemQuantity);

/**
 * @swagger
 * /api/cart/items/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     description: Remove a specific item from the user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart item ID
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Item removed from cart successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d5ecb74b24c72b8c8b4567
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     subtotal:
 *                       type: number
 *                       example: 99.99
 *                     itemCount:
 *                       type: integer
 *                       example: 1
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 *       500:
 *         description: Internal server error
 */
router.delete('/items/:itemId', CartController.removeItem);

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear cart
 *     description: Remove all items from the user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Cart cleared successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d5ecb74b24c72b8c8b4567
 *                     items:
 *                       type: array
 *                       example: []
 *                     subtotal:
 *                       type: number
 *                       example: 0
 *                     itemCount:
 *                       type: integer
 *                       example: 0
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/', CartController.clearCart);

module.exports = router;