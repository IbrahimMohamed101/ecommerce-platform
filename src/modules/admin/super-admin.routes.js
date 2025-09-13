const express = require('express');
const router = express.Router();
const SuperAdminController = require('./super-admin.controller');
const AuthMiddleware = require('../../middleware/auth.middleware');
const RoleMiddleware = require('../../middleware/role.middleware');

// جميع المسارات تتطلب تسجيل الدخول ودور SuperAdmin
router.use(AuthMiddleware.requireAuth);
router.use(RoleMiddleware.requireSuperAdmin);

/**
 * @swagger
 * /api/admin/super-admin/admins:
 *   post:
 *     summary: Create admin
 *     description: Create a new admin user
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: adminuser
 *               firstName:
 *                 type: string
 *                 example: Admin
 *               lastName:
 *                 type: string
 *                 example: User
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecureAdminPass123!
 *     responses:
 *       201:
 *         description: Admin created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error or admin already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin access required
 */

// إدارة الـ Admins
router.post('/admins', SuperAdminController.createAdmin);

/**
 * @swagger
 * /api/admin/super-admin/admins:
 *   get:
 *     summary: Get all admins
 *     description: Retrieve a list of all admin users
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admins retrieved successfully
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
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - SuperAdmin access required
 */
router.get('/admins', SuperAdminController.getAllAdmins);

/**
 * @swagger
 * /api/admin/super-admin/admins/{adminId}:
 *   delete:
 *     summary: Delete admin
 *     description: Delete an admin user account
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID to delete
 *     responses:
 *       200:
 *         description: Admin deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Admin not found or cannot delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin access required
 */
router.delete('/admins/:adminId', SuperAdminController.deleteAdmin);

/**
 * @swagger
 * /api/admin/super-admin/admins/{adminId}/status:
 *   put:
 *     summary: Toggle admin status
 *     description: Enable or disable an admin account
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - active
 *             properties:
 *               active:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Admin status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid request or admin not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin access required
 */
router.put('/admins/:adminId/status', SuperAdminController.toggleAdminStatus);

/**
 * @swagger
 * /api/admin/super-admin/admins/{adminId}/reset-password:
 *   post:
 *     summary: Reset admin password
 *     description: Reset an admin's password to a temporary one
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID to reset password for
 *     responses:
 *       200:
 *         description: Password reset successfully
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
 *                   example: Password reset successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     tempPassword:
 *                       type: string
 *                       example: TempPass123!
 *       400:
 *         description: Admin not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SuperAdmin access required
 */
router.post('/admins/:adminId/reset-password', SuperAdminController.resetAdminPassword);

/**
 * @swagger
 * /api/admin/super-admin/advanced-stats:
 *   get:
 *     summary: Get advanced statistics
 *     description: Retrieve detailed system statistics and analytics
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Advanced statistics retrieved successfully
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
 *                     userGrowth:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: integer
 *                         weekly:
 *                           type: integer
 *                         monthly:
 *                           type: integer
 *                     revenueAnalytics:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         monthly:
 *                           type: number
 *                         growth:
 *                           type: number
 *                     topProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           sales:
 *                             type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - SuperAdmin access required
 */

// إحصائيات متقدمة
router.get('/advanced-stats', SuperAdminController.getAdvancedStats);

/**
 * @swagger
 * /api/admin/super-admin/audit-log:
 *   get:
 *     summary: Get audit log
 *     description: Retrieve system audit log entries
 *     tags: [SuperAdmin]
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
 *         description: Number of entries per page
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: Audit log retrieved successfully
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
 *                       id:
 *                         type: string
 *                       action:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       details:
 *                         type: object
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       ipAddress:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - SuperAdmin access required
 */

// سجل العمليات
router.get('/audit-log', SuperAdminController.getAuditLog);

module.exports = router;