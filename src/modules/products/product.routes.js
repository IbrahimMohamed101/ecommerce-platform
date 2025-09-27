const express = require("express");
const router = express.Router();
const AuthMiddleware = require("../../middleware/auth.middleware");
const RoleMiddleware = require("../../middleware/role.middleware");
const ProductController = require("./product.controller");
const { uploadMultiple } = require("../../utils/cloudinary");

/**
 * * @swagger
 * /api/products:
 *   post:
 *     summary: Create product
 *     description: Create a new product (Vendor only).  
 *       This endpoint allows vendors to add all essential product fields as well as custom attributes.  
 *       You can include additional dynamic fields inside the **attributes** object to support product-specific details.
 *     tags: [Products]
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
 *               - description
 *               - price
 *               - category
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 example: Wireless Headphones
 *               description:
 *                 type: string
 *                 example: High-quality wireless headphones with noise cancellation
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 99.99
 *               category:
 *                 type: string
 *                 example: Electronics
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 example: 50
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["image1.jpg", "image2.jpg"]
 *               brand:
 *                 type: string
 *                 example: Sony
 *               vendorId:
 *                 type: string
 *                 description: The ID of the vendor creating this product
 *                 example: 64f1a8e2c1234abcd56789ef
 *               discount:
 *                 type: number
 *                 description: Percentage discount on the product
 *                 example: 10
 *               sku:
 *                 type: string
 *                 description: Unique Stock Keeping Unit
 *                 example: WH-1000XM5
 *               attributes:
 *                 type: object
 *                 description: Flexible key-value attributes for additional product details
 *                 additionalProperties: true
 *                 example:
 *                   color: Black
 *                   connectivity: Bluetooth 5.0
 *                   batteryLife: "30 hours"
 *                   weight: "250g"
 *                   material: "Aluminum"
 *               rating:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 5
 *                 example: 4.7
 *               numReviews:
 *                 type: integer
 *                 example: 128
 *               isActive:
 *                 type: boolean
 *                 description: Whether the product is active/visible
 *                 example: true
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *                 readOnly: true
 *               updatedAt:
 *                 type: string
 *                 format: date-time
 *                 readOnly: true
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
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
router.post("/", AuthMiddleware.requireAuth, RoleMiddleware.requireVendor, ProductController.createProduct);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get products
 *     description: Retrieve a list of products (Customer only)
 *     tags: [Products]
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
 *           maximum: 50
 *         description: Number of products per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: Products retrieved successfully
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
 *                     $ref: '#/components/schemas/Product'
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
 *         description: Forbidden - Customer access required
 */
router.get("/", AuthMiddleware.requireAuth, ProductController.getProducts);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products
 *     description: Search for products using text search and filters (category, vendor, store, price range).
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         required: true
 *         description: The search keyword (e.g. "laptop").
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by category ID
 *       - in: query
 *         name: vendor
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by vendor ID
 *       - in: query
 *         name: store
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by store ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           format: float
 *         required: false
 *         description: Minimum product price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           format: float
 *         required: false
 *         description: Maximum product price
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *         required: false
 *         default: 0
 *         description: Number of results to skip (for pagination)
 *     responses:
 *       200:
 *         description: Successfully retrieved search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 searchTerm:
 *                   type: string
 *                   example: laptop
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// Search products
router.get("/search", AuthMiddleware.requireAuth, ProductController.searchProducts);

/**
 * @swagger
 * /api/products/{productId}:
 *   get:
 *     summary: Get single product
 *     description: Retrieve a single product by its ID (Customer only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Customer access required
 *       404:
 *         description: Product not found
 */
router.get("/:productId", AuthMiddleware.requireAuth, ProductController.getProductById);

/**
 * @swagger
 * /api/products/{productId}:
 *   put:
 *     summary: Update product
 *     description: Update an existing product (Vendor/Admin only). Vendors can only update their own products.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Wireless Headphones
 *               description:
 *                 type: string
 *                 example: Updated high-quality wireless headphones with noise cancellation
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 79.99
 *               category:
 *                 type: string
 *                 example: Electronics
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 example: 40
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["updated-image1.jpg", "updated-image2.jpg"]
 *               brand:
 *                 type: string
 *                 example: Sony
 *               discount:
 *                 type: number
 *                 example: 15
 *               sku:
 *                 type: string
 *                 example: WH-1000XM5-Updated
 *               attributes:
 *                 type: object
 *                 additionalProperties: true
 *                 example:
 *                   color: Black
 *                   connectivity: Bluetooth 5.0
 *                   batteryLife: "25 hours"
 *               rating:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 5
 *                 example: 4.8
 *               numReviews:
 *                 type: integer
 *                 example: 150
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Product updated successfully
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
 *                   example: Product updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor/Admin access required or not owner
 *       404:
 *         description: Product not found
 */
router.put("/:productId", AuthMiddleware.requireAuth, ProductController.updateProduct);

/**
 * @swagger
 * /api/products/{productId}:
 *   delete:
 *     summary: Delete product
 *     description: Delete a product (Vendor/Admin only). Vendors can only delete their own products.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
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
 *                   example: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Vendor/Admin access required or not owner
 *       404:
 *         description: Product not found
 */
router.delete("/:productId", AuthMiddleware.requireAuth, ProductController.deleteProduct);

/**
 * @swagger
 * /api/products/vendor/my-products:
 *   get:
 *     summary: Get vendor's products
 *     description: Retrieve all products belonging to the authenticated vendor (Vendor only)
 *     tags: [Products]
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
 *           maximum: 50
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
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
 *                     $ref: '#/components/schemas/Product'
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
 *         description: Forbidden - Vendor access required
 */
router.get("/vendor/my-products", AuthMiddleware.requireAuth, RoleMiddleware.requireVendor, ProductController.getVendorProducts);

/**
 * @swagger
 * /api/products/{productId}/inventory:
 *   put:
 *     summary: Update product inventory
 *     description: Allows vendors (their own products) or admins (any product) to update inventory details.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 example: 100
 *               trackQuantity:
 *                 type: boolean
 *                 example: true
 *               lowStockThreshold:
 *                 type: integer
 *                 example: 5
 *               continueSellingWhenOutOfStock:
 *                 type: boolean
 *                 example: false
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     variantId:
 *                       type: string
 *                       example: 650f1b2c8f1e2b001f234567
 *                     quantity:
 *                       type: integer
 *                       example: 50
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       200:
 *         description: Inventory updated successfully
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
 *                   example: Inventory updated successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor/Admin access required
 *       404:
 *         description: Product not found
 */
// Update product inventory (Vendor/Admin only)
router.put("/:productId/inventory", AuthMiddleware.requireAuth, ProductController.updateInventory);

/**
 * @swagger
 * /api/products/bulk/update:
 *   put:
 *     summary: Bulk update products
 *     description: Update multiple products at once (Vendor/Admin only). Vendors can only update their own products.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - data
 *                   properties:
 *                     productId:
 *                       type: string
 *                       example: 64f1a8e2c1234abcd56789ef
 *                     data:
 *                       type: object
 *                       properties:
 *                         price:
 *                           type: number
 *                           example: 89.99
 *                         stock:
 *                           type: integer
 *                           example: 30
 *                         isActive:
 *                           type: boolean
 *                           example: false
 *     responses:
 *       200:
 *         description: Products updated successfully
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
 *                   example: 5 products updated successfully
 *                 updatedCount:
 *                   type: integer
 *                   example: 5
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor/Admin access required
 */
router.put("/bulk/update", AuthMiddleware.requireAuth, ProductController.bulkUpdateProducts);

/**
 * @swagger
 * /api/products/{productId}/stats:
 *   get:
 *     summary: Get product statistics
 *     description: Retrieve statistics for a specific product (Vendor/Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product statistics retrieved successfully
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
 *                     productId:
 *                       type: string
 *                       example: 64f1a8e2c1234abcd56789ef
 *                     totalViews:
 *                       type: integer
 *                       example: 1250
 *                     totalSales:
 *                       type: integer
 *                       example: 45
 *                     revenue:
 *                       type: number
 *                       example: 3599.55
 *                     averageRating:
 *                       type: number
 *                       format: float
 *                       example: 4.3
 *                     reviewCount:
 *                       type: integer
 *                       example: 23
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Vendor/Admin access required
 *       404:
 *         description: Product not found
 */
router.get("/:productId/stats", AuthMiddleware.requireAuth, ProductController.getProductStats);

/**
 * @swagger
 * /api/products/vendor/low-stock:
 *   get:
 *     summary: Get low stock products
 *     description: Retrieve products with low stock for the authenticated vendor (Vendor only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 10
 *         description: Stock threshold to consider as low
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
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
 *                     $ref: '#/components/schemas/Product'
 *                 count:
 *                   type: integer
 *                   example: 3
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Vendor access required
 */
router.get("/vendor/low-stock", AuthMiddleware.requireAuth, RoleMiddleware.requireVendor, ProductController.getLowStockProducts);

/**
 * @swagger
 * /api/products/{productId}/duplicate:
 *   post:
 *     summary: Duplicate product
 *     description: Create a copy of an existing product (Vendor/Admin only). Vendors can only duplicate their own products.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to duplicate
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New name for the duplicated product
 *                 example: Copy of Wireless Headphones
 *               sku:
 *                 type: string
 *                 description: New SKU for the duplicated product
 *                 example: WH-1000XM5-COPY
 *     responses:
 *       201:
 *         description: Product duplicated successfully
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
 *                   example: Product duplicated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor/Admin access required or not owner
 *       404:
 *         description: Product not found
 */
router.post("/:productId/duplicate", AuthMiddleware.requireAuth, ProductController.duplicateProduct);

/**
 * @swagger
 * /api/products/category/{categoryId}:
 *   get:
 *     summary: Get products by category
 *     description: Retrieve all products in a specific category (Customer only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
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
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
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
 *                     $ref: '#/components/schemas/Product'
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
 *         description: Forbidden - Customer access required
 *       404:
 *         description: Category not found
 */
router.get("/category/:categoryId", AuthMiddleware.requireAuth, ProductController.getProductsByCategory);

/**
 * @swagger
 * /api/products/featured/products:
 *   get:
 *     summary: Get featured products
 *     description: Retrieve featured products (Customer only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of featured products to retrieve
 *     responses:
 *       200:
 *         description: Featured products retrieved successfully
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
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Customer access required
 */
router.get("/featured/products", AuthMiddleware.requireAuth, ProductController.getFeaturedProducts);

/**
 * @swagger
 * /api/products/sale/products:
 *   get:
 *     summary: Get products on sale
 *     description: Retrieve products that are currently on sale/discount (Customer only)
 *     tags: [Products]
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
 *           maximum: 50
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: Sale products retrieved successfully
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
 *                     $ref: '#/components/schemas/Product'
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
 *         description: Forbidden - Customer access required
 */
router.get("/sale/products", AuthMiddleware.requireAuth, ProductController.getSaleProducts);

/**
 * @swagger
 * /api/products/{productId}/related:
 *   get:
 *     summary: Get related products
 *     description: Retrieve products related to a specific product (Customer only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 5
 *         description: Number of related products to retrieve
 *     responses:
 *       200:
 *         description: Related products retrieved successfully
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
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Customer access required
 *       404:
 *         description: Product not found
 */
router.get("/:productId/related", AuthMiddleware.requireAuth, ProductController.getRelatedProducts);

/**
 * @swagger
 * /api/products/{productId}/images:
 *   post:
 *     summary: Upload product images
 *     description: Upload multiple images for a product (Vendor/Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files to upload
 *               alts:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Alt texts for the images
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor/Admin access required
 *       404:
 *         description: Product not found
 */
router.post("/:productId/images", AuthMiddleware.requireAuth, uploadMultiple, ProductController.uploadProductImages);

/**
 * @swagger
 * /api/products/{productId}/images/{imageIndex}:
 *   delete:
 *     summary: Delete product image
 *     description: Delete a specific image from a product (Vendor/Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: path
 *         name: imageIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Index of the image to delete
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor/Admin access required
 *       404:
 *         description: Product not found
 */
router.delete("/:productId/images/:imageIndex", AuthMiddleware.requireAuth, ProductController.deleteProductImage);

/**
 * @swagger
 * /api/products/{productId}/images/{imageIndex}/primary:
 *   put:
 *     summary: Set primary image
 *     description: Set a specific image as the primary image for a product (Vendor/Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: path
 *         name: imageIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Index of the image to set as primary
 *     responses:
 *       200:
 *         description: Primary image set successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor/Admin access required
 *       404:
 *         description: Product not found
 */
router.put("/:productId/images/:imageIndex/primary", AuthMiddleware.requireAuth, ProductController.setPrimaryImage);

/**
 * @swagger
 * /api/products/{productId}/images/reorder:
 *   put:
 *     summary: Reorder product images
 *     description: Reorder the images of a product (Vendor/Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageOrder
 *             properties:
 *               imageOrder:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 0, 1]
 *                 description: Array of image indices in the desired order
 *     responses:
 *       200:
 *         description: Images reordered successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Vendor/Admin access required
 *       404:
 *         description: Product not found
 */
router.put("/:productId/images/reorder", AuthMiddleware.requireAuth, ProductController.reorderProductImages);

module.exports = router;
