const express = require("express");
const router = express.Router();
const AuthMiddleware = require("../../middleware/auth.middleware");
const RoleMiddleware = require("../../middleware/role.middleware");
const StoreController = require("./store.controller");
const { uploadLogo, uploadBanner } = require("../../utils/cloudinary");

/**
 * @swagger
 * /api/stores:
 *   post:
 *     summary: Create store
 *     description: Create a new store (Vendor only - for existing vendors without stores)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Electronics Store
 *               description:
 *                 type: string
 *                 example: Best electronics store in town
 *               slug:
 *                 type: string
 *                 example: my-electronics-store
 *               logo:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                     example: https://example.com/logo.jpg
 *                   alt:
 *                     type: string
 *                     example: Store logo
 *               banner:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                     example: https://example.com/banner.jpg
 *                   alt:
 *                     type: string
 *                     example: Store banner
 *               contact:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     example: contact@mystore.com
 *                   phone:
 *                     type: string
 *                     example: +1234567890
 *                   website:
 *                     type: string
 *                     example: https://mystore.com
 *               businessInfo:
 *                 type: object
 *                 properties:
 *                   taxId:
 *                     type: string
 *                     example: TAX123456
 *                   registrationNumber:
 *                     type: string
 *                     example: REG789012
 *                   address:
 *                     type: object
 *                     properties:
 *                       street:
 *                         type: string
 *                         example: 123 Main St
 *                       city:
 *                         type: string
 *                         example: New York
 *                       state:
 *                         type: string
 *                         example: NY
 *                       zipCode:
 *                         type: string
 *                         example: 10001
 *                       country:
 *                         type: string
 *                         example: USA
 *               settings:
 *                 type: object
 *                 properties:
 *                   currency:
 *                     type: string
 *                     enum: [USD, EUR, GBP, CAD, AUD]
 *                     example: USD
 *                   timezone:
 *                     type: string
 *                     example: America/New_York
 *                   language:
 *                     type: string
 *                     enum: [en, es, fr, de, ar, zh]
 *                     example: en
 *     responses:
 *       201:
 *         description: Store created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor access required
 */
router.post("/", AuthMiddleware.requireAuth, StoreController.createStore);

/**
 * @swagger
 * /api/stores:
 *   get:
 *     summary: Get stores
 *     description: Retrieve a list of stores (Admin only)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of stores per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field (e.g., name, -createdAt)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended]
 *         description: Filter by status
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *         description: Filter by owner ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive stores
 *     responses:
 *       200:
 *         description: Stores retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/", AuthMiddleware.requireAuth, StoreController.getStores);

/**
 * @swagger
 * /api/stores/my-store:
 *   get:
 *     summary: Get my store
 *     description: Retrieve current vendor's store (Vendor only)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive stores
 *     responses:
 *       200:
 *         description: Store retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor access required
 *       404:
 *         description: Store not found
 */
router.get("/my-store", AuthMiddleware.requireAuth, StoreController.getMyStore);

/**
 * @swagger
 * /api/stores/{storeId}:
 *   get:
 *     summary: Get store by ID
 *     description: Retrieve a single store by ID
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive stores
 *     responses:
 *       200:
 *         description: Store retrieved successfully
 *       404:
 *         description: Store not found
 */
router.get("/:storeId", StoreController.getStoreById);

/**
 * @swagger
 * /api/stores/slug/{slug}:
 *   get:
 *     summary: Get store by slug
 *     description: Retrieve a single store by slug
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Store slug
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive stores
 *     responses:
 *       200:
 *         description: Store retrieved successfully
 *       404:
 *         description: Store not found
 */
router.get("/slug/:slug", StoreController.getStoreBySlug);

/**
 * @swagger
 * /api/stores/{storeId}:
 *   put:
 *     summary: Update store
 *     description: Update an existing store (Vendor only)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               slug:
 *                 type: string
 *               logo:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                   alt:
 *                     type: string
 *               banner:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                   alt:
 *                     type: string
 *               contact:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   website:
 *                     type: string
 *               businessInfo:
 *                 type: object
 *                 properties:
 *                   taxId:
 *                     type: string
 *                   registrationNumber:
 *                     type: string
 *                   address:
 *                     type: object
 *                     properties:
 *                       street:
 *                         type: string
 *                       city:
 *                         type: string
 *                       state:
 *                         type: string
 *                       zipCode:
 *                         type: string
 *                       country:
 *                         type: string
 *               settings:
 *                 type: object
 *                 properties:
 *                   currency:
 *                     type: string
 *                     enum: [USD, EUR, GBP, CAD, AUD]
 *                   timezone:
 *                     type: string
 *                   language:
 *                     type: string
 *                     enum: [en, es, fr, de, ar, zh]
 *     responses:
 *       200:
 *         description: Store updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor access required
 *       404:
 *         description: Store not found
 */
router.put("/:storeId", AuthMiddleware.requireAuth, StoreController.updateStore);

/**
 * @swagger
 * /api/stores/{storeId}:
 *   delete:
 *     summary: Delete store
 *     description: Delete a store (Vendor only)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor access required
 *       404:
 *         description: Store not found
 */
router.delete("/:storeId", AuthMiddleware.requireAuth, StoreController.deleteStore);

/**
 * @swagger
 * /api/stores/{storeId}/stats:
 *   put:
 *     summary: Update store statistics
 *     description: Recalculate store statistics
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Statistics updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Access denied
 *       404:
 *         description: Store not found
 */
router.put("/:storeId/stats", AuthMiddleware.requireAuth, StoreController.updateStoreStats);

/**
 * @swagger
 * /api/stores/{storeId}/logo:
 *   post:
 *     summary: Upload store logo
 *     description: Upload a logo for a store (Vendor only)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo image file to upload
 *               alt:
 *                 type: string
 *                 description: Alt text for the logo
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor access required
 *       404:
 *         description: Store not found
 */
router.post("/:storeId/logo", AuthMiddleware.requireAuth, uploadLogo, StoreController.uploadStoreLogo);

/**
 * @swagger
 * /api/stores/{storeId}/banner:
 *   post:
 *     summary: Upload store banner
 *     description: Upload a banner for a store (Vendor only)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Banner image file to upload
 *               alt:
 *                 type: string
 *                 description: Alt text for the banner
 *     responses:
 *       200:
 *         description: Banner uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor access required
 *       404:
 *         description: Store not found
 */
router.post("/:storeId/banner", AuthMiddleware.requireAuth, uploadBanner, StoreController.uploadStoreBanner);

/**
 * @swagger
 * /api/stores/{storeId}/logo:
 *   delete:
 *     summary: Delete store logo
 *     description: Delete the logo of a store (Vendor only)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Logo deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor access required
 *       404:
 *         description: Store not found
 */
router.delete("/:storeId/logo", AuthMiddleware.requireAuth, StoreController.deleteStoreLogo);

/**
 * @swagger
 * /api/stores/{storeId}/banner:
 *   delete:
 *     summary: Delete store banner
 *     description: Delete the banner of a store (Vendor only)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Banner deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor access required
 *       404:
 *         description: Store not found
 */
router.delete("/:storeId/banner", AuthMiddleware.requireAuth, StoreController.deleteStoreBanner);

module.exports = router;