const express = require("express");
const router = express.Router();
const UserController = require("./user.controller");
const AuthMiddleware = require("../../middleware/auth.middleware");
const {
  authLimiter,
  apiLimiter
} = require("../../utils/rateLimiter");

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register new user (Deprecated)
 *     description: This endpoint is deprecated. Please use /api/auth/register
 *     tags: [Users]
 *     deprecated: true
 *     responses:
 *       400:
 *         description: Deprecated endpoint
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/register", authLimiter, (req, res) => {
  res.status(400).json({ success: false, message: 'Please use /api/auth/register' });
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: User login (Deprecated)
 *     description: This endpoint is deprecated. Please use /api/auth/login
 *     tags: [Users]
 *     deprecated: true
 *     responses:
 *       400:
 *         description: Deprecated endpoint
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", authLimiter, (req, res) => {
  res.status(400).json({ success: false, message: 'Please use /api/auth/login' });
});

/**
 * @swagger
 * /api/users/refresh:
 *   post:
 *     summary: Refresh access token (Deprecated)
 *     description: This endpoint is deprecated. Please use /api/auth/refresh
 *     tags: [Users]
 *     deprecated: true
 *     responses:
 *       400:
 *         description: Deprecated endpoint
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/refresh", authLimiter, (req, res) => {
  res.status(400).json({ success: false, message: 'Please use /api/auth/refresh' });
});

/**
 * @swagger
 * /api/users/verify-email:
 *   post:
 *     summary: Verify email (Deprecated)
 *     description: This endpoint is deprecated. Please use /api/auth/verify-email
 *     tags: [Users]
 *     deprecated: true
 *     responses:
 *       400:
 *         description: Deprecated endpoint
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/verify-email", apiLimiter, (req, res) => {
  res.status(400).json({ success: false, message: 'Please use /api/auth/verify-email' });
});

// Protected routes
router.use(AuthMiddleware.requireAuth);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieve authenticated user's profile information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 */

// User Profile Management
router.get("/profile", apiLimiter, UserController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update authenticated user's profile information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.put("/profile", apiLimiter, UserController.updateProfile);

/**
 * @swagger
 * /api/users/preferences:
 *   put:
 *     summary: Update user preferences
 *     description: Update authenticated user's preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 example: dark
 *               language:
 *                 type: string
 *                 example: en
 *               notifications:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.put("/preferences", apiLimiter, UserController.updatePreferences);

/**
 * @swagger
 * /api/users/cart:
 *   post:
 *     summary: Add item to cart
 *     description: Add a product to the authenticated user's cart
 *     tags: [Users]
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
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 example: 60d5ecb74b24c72b8c8b4567
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid request or product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */

// Cart Management
router.post("/cart", apiLimiter, UserController.addToCart);

/**
 * @swagger
 * /api/users/cart:
 *   delete:
 *     summary: Remove item from cart
 *     description: Remove a product from the authenticated user's cart
 *     tags: [Users]
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
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid request or product not in cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.delete("/cart", apiLimiter, UserController.removeFromCart);

/**
 * @swagger
 * /api/users/cart:
 *   get:
 *     summary: Get user cart
 *     description: Retrieve authenticated user's cart items
 *     tags: [Users]
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                       price:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 */
router.get("/cart", apiLimiter, UserController.getCart);

/**
 * @swagger
 * /api/users/cart/all:
 *   delete:
 *     summary: Clear user cart
 *     description: Remove all items from the authenticated user's cart
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 */
router.delete("/cart/all", apiLimiter, UserController.clearCart);

/**
 * @swagger
 * /api/users/wishlist:
 *   post:
 *     summary: Add item to wishlist
 *     description: Add a product to the authenticated user's wishlist
 *     tags: [Users]
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
 *     responses:
 *       200:
 *         description: Item added to wishlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid request or product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */

// Wishlist Management
router.post("/wishlist", apiLimiter, UserController.addToWishlist);

/**
 * @swagger
 * /api/users/wishlist:
 *   delete:
 *     summary: Remove item from wishlist
 *     description: Remove a product from the authenticated user's wishlist
 *     tags: [Users]
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
 *     responses:
 *       200:
 *         description: Item removed from wishlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid request or product not in wishlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.delete("/wishlist", apiLimiter, UserController.removeFromWishlist);

/**
 * @swagger
 * /api/users/wishlist:
 *   get:
 *     summary: Get user wishlist
 *     description: Retrieve authenticated user's wishlist items
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 */
router.get("/wishlist", apiLimiter, UserController.getWishlist);

/**
 * @swagger
 * /api/users/addresses:
 *   post:
 *     summary: Add shipping address
 *     description: Add a new shipping address for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - street
 *               - city
 *               - state
 *               - zipCode
 *               - country
 *             properties:
 *               street:
 *                 type: string
 *                 example: 123 Main St
 *               city:
 *                 type: string
 *                 example: New York
 *               state:
 *                 type: string
 *                 example: NY
 *               zipCode:
 *                 type: string
 *                 example: 10001
 *               country:
 *                 type: string
 *                 example: USA
 *               isDefault:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Address added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */

// Shipping Addresses
router.post("/addresses", apiLimiter, UserController.addShippingAddress);

/**
 * @swagger
 * /api/users/loyalty:
 *   get:
 *     summary: Get loyalty points
 *     description: Retrieve authenticated user's loyalty points balance
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loyalty points retrieved successfully
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
 *                     points:
 *                       type: integer
 *                       example: 150
 *                     level:
 *                       type: string
 *                       example: Gold
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 */

// Loyalty & Rewards
router.get("/loyalty", apiLimiter, UserController.getLoyaltyPoints);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics
 *     description: Retrieve authenticated user's activity statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
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
 *                     totalOrders:
 *                       type: integer
 *                       example: 25
 *                     totalSpent:
 *                       type: number
 *                       example: 1250.50
 *                     favoriteCategory:
 *                       type: string
 *                       example: Electronics
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 */

// User Statistics
router.get("/stats", apiLimiter, UserController.getStats);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user (Legacy)
 *     description: Legacy endpoint for getting user profile. Use /api/users/profile instead
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 */

// Legacy routes (for backward compatibility)
router.get("/me", apiLimiter, UserController.getProfile);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user (Legacy)
 *     description: Legacy endpoint for updating user profile. Use /api/users/profile instead
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.put("/me", apiLimiter, UserController.updateProfile);

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Delete current user (Legacy)
 *     description: Legacy endpoint for deleting user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     deprecated: true
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 */
router.delete("/me", apiLimiter, UserController.deleteUser);

module.exports = router;
