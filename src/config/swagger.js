const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce Platform API',
      version: '1.0.0',
      description: 'Comprehensive API for E-commerce Platform with user management, vendor operations, and admin controls',
      contact: {
        name: 'API Support',
        email: 'support@ecommerce-platform.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server',
      },
      {
        url: 'https://ecommerce-platform-9adz.onrender.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            roles: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Vendor: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            businessName: { type: 'string' },
            businessDescription: { type: 'string' },
            businessAddress: { type: 'string' },
            businessPhone: { type: 'string' },
            businessEmail: { type: 'string', format: 'email' },
            businessLicense: { type: 'string' },
            taxNumber: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Wireless Headphones' },
            description: { type: 'string', example: 'High-quality wireless headphones' },
            price: { type: 'number', example: 99.99 },
            category: { type: 'string', example: 'Electronics' },
            stock: { type: 'integer', example: 50 },
            vendorId: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/modules/auth/auth.routes.js',
    './src/modules/users/user.routes.js',
    './src/modules/products/product.routes.js',
    './src/modules/categories/category.routes.js',
    './src/modules/stores/store.routes.js',
    './src/modules/orders/order.routes.js',
    './src/modules/payments/payment.routes.js',
    './src/modules/favorites/favorites.routes.js',
    './src/modules/cart/cart.routes.js',
    './src/modules/admin/admin.routes.js',
    './src/modules/admin/super-admin.routes.js',
    './src/app.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};