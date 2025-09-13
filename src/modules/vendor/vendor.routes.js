const express = require('express');
const router = express.Router();
const VendorController = require('./vendor.controller');
const AuthMiddleware = require('../../middleware/auth.middleware');
const RoleMiddleware = require('../../middleware/role.middleware');

// المسارات العامة (بدون تسجيل دخول)
/**
 * @swagger
 * /api/vendor/public:
 *   get:
 *     summary: Get all vendors
 *     description: Retrieve a list of all approved vendors
 *     tags: [Vendors]
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
 *           maximum: 50
 *         description: Number of vendors per page
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
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
 *                     $ref: '#/components/schemas/Vendor'
 */
router.get('/public', VendorController.getAllVendors);

/**
 * @swagger
 * /api/vendor/public/{vendorId}:
 *   get:
 *     summary: Get vendor by ID
 *     description: Retrieve details of a specific vendor
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vendor'
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/public/:vendorId', VendorController.getVendorById);

// المسارات التي تتطلب تسجيل الدخول
router.use(AuthMiddleware.requireAuth);

/**
 * @swagger
 * /api/vendor/request:
 *   post:
 *     summary: Request vendor status
 *     description: Submit a request to become a vendor
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - businessDescription
 *               - businessAddress
 *               - businessPhone
 *               - businessEmail
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: My Awesome Store
 *               businessDescription:
 *                 type: string
 *                 example: We sell quality products
 *               businessAddress:
 *                 type: string
 *                 example: 123 Business St, City, State 12345
 *               businessPhone:
 *                 type: string
 *                 example: +1234567890
 *               businessEmail:
 *                 type: string
 *                 format: email
 *                 example: business@example.com
 *               businessLicense:
 *                 type: string
 *                 example: LIC123456
 *               taxNumber:
 *                 type: string
 *                 example: TAX789012
 *     responses:
 *       201:
 *         description: Vendor request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error or already requested
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Customer access required
 */

// طلب أن يصبح بائع (Customer فقط)
router.post('/request', RoleMiddleware.requireCustomer, VendorController.requestVendorStatus);

/**
 * @swagger
 * /api/vendor/request/status:
 *   get:
 *     summary: Get vendor request status
 *     description: Check the status of vendor registration request
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Request status retrieved successfully
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
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected]
 *                       example: pending
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                     reviewedAt:
 *                       type: string
 *                       format: date-time
 *                     reviewerNotes:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No request found
 */

// الحصول على حالة الطلب (Customer أو Vendor)
router.get('/request/status', RoleMiddleware.requireCustomerorVendor, VendorController.getVendorRequestStatus);

// مسارات البائعين فقط
router.use(RoleMiddleware.requireVendor);

/**
 * @swagger
 * /api/vendor/profile:
 *   get:
 *     summary: Get vendor profile
 *     description: Retrieve authenticated vendor's profile information
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vendor'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Vendor access required
 */

// الحصول على معلومات البائع
router.get('/profile', VendorController.getVendorProfile);

/**
 * @swagger
 * /api/vendor/profile:
 *   put:
 *     summary: Update vendor profile
 *     description: Update authenticated vendor's profile information
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: Updated Store Name
 *               businessDescription:
 *                 type: string
 *                 example: Updated description
 *               businessAddress:
 *                 type: string
 *                 example: New Address
 *               businessPhone:
 *                 type: string
 *                 example: +1987654321
 *               businessEmail:
 *                 type: string
 *                 format: email
 *                 example: newemail@example.com
 *     responses:
 *       200:
 *         description: Vendor profile updated successfully
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
 *       403:
 *         description: Forbidden - Vendor access required
 */

// تحديث معلومات البائع
router.put('/profile', VendorController.updateVendorProfile);

/**
 * @swagger
 * /api/vendor/stats:
 *   get:
 *     summary: Get vendor statistics
 *     description: Retrieve authenticated vendor's business statistics
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor statistics retrieved successfully
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
 *                     totalProducts:
 *                       type: integer
 *                       example: 25
 *                     totalOrders:
 *                       type: integer
 *                       example: 150
 *                     totalRevenue:
 *                       type: number
 *                       example: 12500.50
 *                     averageRating:
 *                       type: number
 *                       example: 4.5
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Vendor access required
 */

// إحصائيات البائع
router.get('/stats', VendorController.getVendorStats);

module.exports = router;