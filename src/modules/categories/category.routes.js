const express = require("express");
const router = express.Router();
const AuthMiddleware = require("../../middleware/auth.middleware");
const RoleMiddleware = require("../../middleware/role.middleware");
const CategoryController = require("./category.controller");
const { uploadSingle } = require("../../utils/cloudinary");
const { uploadLogo, uploadBanner } = require("../../utils/cloudinary");


/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create category
 *     description: Create a new category (Admin/Vendor)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Electronics
 *               slug:
 *                 type: string
 *                 example: electronics
 *               description:
 *                 type: string
 *                 example: Electronic devices and accessories
 *               parent:
 *                 type: string
 *                 example: 60d5ecb74b24c72b8c8b4567
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Category image file
 *               alt:
 *                 type: string
 *                 description: Alt text for the image
 *                 example: Electronics category image
 *               seo:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: Electronics - Best Deals
 *                   description:
 *                     type: string
 *                     example: Shop electronics at great prices
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post("/", AuthMiddleware.requireAuth, uploadSingle,CategoryController.createCategory);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get categories
 *     description: Retrieve a list of categories
 *     tags: [Categories]
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
 *         description: Number of categories per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field (e.g., name, -createdAt, displayOrder)
 *       - in: query
 *         name: parent
 *         schema:
 *           type: string
 *         description: Filter by parent category ID
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *         description: Filter by category level
 *       - in: query
 *         name: featured
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter featured categories
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get("/", CategoryController.getCategories);

/**
 * @swagger
 * /api/categories/{categoryId}:
 *   get:
 *     summary: Get category by ID
 *     description: Retrieve a single category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get("/:categoryId", CategoryController.getCategoryById);

/**
 * @swagger
 * /api/categories/slug/{slug}:
 *   get:
 *     summary: Get category by slug
 *     description: Retrieve a single category by slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Category slug
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get("/slug/:slug", CategoryController.getCategoryBySlug);

/**
 * @swagger
 * /api/categories/{categoryId}:
 *   put:
 *     summary: Update category
 *     description: Update an existing category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
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
 *               parent:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               isFeatured:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Category not found
 */
router.put("/:categoryId", AuthMiddleware.requireAuth, CategoryController.updateCategory);

/**
 * @swagger
 * /api/categories/{categoryId}:
 *   delete:
 *     summary: Delete category
 *     description: Delete a category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Category not found
 */
router.delete("/:categoryId", AuthMiddleware.requireAuth, CategoryController.deleteCategory);

/**
 * @swagger
 * /api/categories/tree:
 *   get:
 *     summary: Get category tree
 *     description: Retrieve hierarchical category tree
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: maxLevel
 *         schema:
 *           type: integer
 *         description: Maximum depth level to return
 *     responses:
 *       200:
 *         description: Category tree retrieved successfully
 */
router.get("/tree/hierarchy", CategoryController.getCategoryTree);

/**
 * @swagger
 * /api/categories/root:
 *   get:
 *     summary: Get root categories
 *     description: Retrieve top-level categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeStats
 *         schema:
 *           type: boolean
 *         description: Include product and subcategory counts
 *     responses:
 *       200:
 *         description: Root categories retrieved successfully
 */
router.get("/root/list", CategoryController.getRootCategories);

/**
 * @swagger
 * /api/categories/{parentId}/subcategories:
 *   get:
 *     summary: Get subcategories
 *     description: Retrieve subcategories of a parent category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent category ID
 *       - in: query
 *         name: includeStats
 *         schema:
 *           type: boolean
 *         description: Include product counts
 *     responses:
 *       200:
 *         description: Subcategories retrieved successfully
 */
router.get("/:parentId/children", CategoryController.getSubcategories);

/**
 * @swagger
 * /api/categories/search:
 *   get:
 *     summary: Search categories
 *     description: Search categories by name or description
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Search term required
 */
router.get("/search/query", CategoryController.searchCategories);

/**
 * @swagger
 * /api/categories/bulk-update:
 *   put:
 *     summary: Bulk update categories
 *     description: Update multiple categories at once (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryIds
 *               - updates
 *             properties:
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["60d5ecb74b24c72b8c8b4567", "60d5ecb74b24c72b8c8b4568"]
 *               updates:
 *                 type: object
 *                 properties:
 *                   isActive:
 *                     type: boolean
 *                   isFeatured:
 *                     type: boolean
 *                   displayOrder:
 *                     type: integer
 *     responses:
 *       200:
 *         description: Categories updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put("/bulk/batch-update", AuthMiddleware.requireAuth, CategoryController.bulkUpdateCategories);

/**
 * @swagger
 * /api/categories/{categoryId}/stats:
 *   put:
 *     summary: Update category statistics
 *     description: Recalculate product and subcategory counts (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Statistics updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Category not found
 */
router.put("/:categoryId/statistics", AuthMiddleware.requireAuth, CategoryController.updateCategoryStats);

/**
 * @swagger
 * /api/categories/featured:
 *   get:
 *     summary: Get featured categories
 *     description: Retrieve featured categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeStats
 *         schema:
 *           type: boolean
 *         description: Include product counts
 *     responses:
 *       200:
 *         description: Featured categories retrieved successfully
 */
router.get("/featured/list", CategoryController.getFeaturedCategories);

/**
 * @swagger
 * /api/categories/{categoryId}/with-stats:
 *   get:
 *     summary: Get category with statistics
 *     description: Retrieve category with updated product and subcategory counts
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category with statistics retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get("/:categoryId/details", CategoryController.getCategoryWithStats);

/**
 * @swagger
 * /api/categories/{categoryId}/image:
 *   post:
 *     summary: Upload category image
 *     description: Upload an image for a category (Admin/Vendor only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *               alt:
 *                 type: string
 *                 description: Alt text for the image
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Category not found
 */
router.post("/:categoryId/image", AuthMiddleware.requireAuth, uploadSingle, CategoryController.uploadCategoryImage);

/**
 * @swagger
 * /api/categories/{categoryId}/image:
 *   delete:
 *     summary: Delete category image
 *     description: Delete the image of a category (Admin/Vendor only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Category not found
 */
router.delete("/:categoryId/image", AuthMiddleware.requireAuth, CategoryController.deleteCategoryImage);

module.exports = router;