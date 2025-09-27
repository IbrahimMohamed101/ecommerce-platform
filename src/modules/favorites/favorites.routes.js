const express = require('express');
const FavoritesController = require('./favorites.controller');
const AuthMiddleware = require('../../middleware/auth.middleware');

const router = express.Router();

// All favorites routes require authentication
router.use(AuthMiddleware.requireAuth);

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Get user's favorites
 *     description: Retrieve the authenticated user's favorite products
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorites retrieved successfully
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
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 60d5ecb74b24c72b8c8b4567
 *                           name:
 *                             type: string
 *                             example: Wireless Headphones
 *                           images:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 url:
 *                                   type: string
 *                                   example: https://example.com/image.jpg
 *                           price:
 *                             type: number
 *                             example: 99.99
 *                           currentPrice:
 *                             type: number
 *                             example: 89.99
 *                           status:
 *                             type: string
 *                             example: active
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', FavoritesController.getFavorites);

/**
 * @swagger
 * /api/favorites/{productId}:
 *   post:
 *     summary: Add product to favorites
 *     description: Add a product to the user's favorites list
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to add to favorites
 *     responses:
 *       200:
 *         description: Product added to favorites successfully
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
 *                   example: Product added to favorites successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d5ecb74b24c72b8c8b4567
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 60d5ecb74b24c72b8c8b4567
 *                           name:
 *                             type: string
 *                             example: Wireless Headphones
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.post('/:productId', FavoritesController.addToFavorites);

/**
 * @swagger
 * /api/favorites/{productId}:
 *   delete:
 *     summary: Remove product from favorites
 *     description: Remove a product from the user's favorites list
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to remove from favorites
 *     responses:
 *       200:
 *         description: Product removed from favorites successfully
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
 *                   example: Product removed from favorites successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d5ecb74b24c72b8c8b4567
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 60d5ecb74b24c72b8c8b4567
 *                           name:
 *                             type: string
 *                             example: Wireless Headphones
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found in favorites
 *       500:
 *         description: Internal server error
 */
router.delete('/:productId', FavoritesController.removeFromFavorites);

module.exports = router;