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
            shortDescription: { type: 'string' },
            price: { type: 'number', example: 99.99 },
            compareAtPrice: { type: 'number' },
            costPrice: { type: 'number' },
            sku: { type: 'string', example: 'WH-1000XM5' },
            barcode: { type: 'string' },
            trackQuantity: { type: 'boolean', default: true },
            quantity: { type: 'integer', example: 50 },
            lowStockThreshold: { type: 'integer', default: 5 },
            continueSellingWhenOutOfStock: { type: 'boolean', default: false },
            category: { type: 'string' },
            subcategories: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            brand: { type: 'string', example: 'Sony' },
            vendor: { type: 'string' },
            store: { type: 'string' },
            variants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  value: { type: 'string' },
                  priceModifier: { type: 'number' },
                  sku: { type: 'string' },
                  quantity: { type: 'integer' },
                  isActive: { type: 'boolean' }
                }
              }
            },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  alt: { type: 'string' },
                  position: { type: 'integer' },
                  isPrimary: { type: 'boolean' }
                }
              }
            },
            seo: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } }
              }
            },
            weight: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                unit: { type: 'string', enum: ['kg', 'g', 'lb', 'oz'] }
              }
            },
            dimensions: {
              type: 'object',
              properties: {
                length: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
                unit: { type: 'string', enum: ['cm', 'm', 'in', 'ft'] }
              }
            },
            requiresShipping: { type: 'boolean', default: true },
            status: { type: 'string', enum: ['active', 'draft', 'archived'], default: 'draft' },
            visibility: { type: 'string', enum: ['public', 'hidden', 'password_protected'], default: 'public' },
            password: { type: 'string' },
            isOnSale: { type: 'boolean', default: false },
            saleStartDate: { type: 'string', format: 'date-time' },
            saleEndDate: { type: 'string', format: 'date-time' },
            salePrice: { type: 'number' },
            productType: { type: 'string', enum: ['physical', 'digital', 'service'], default: 'physical' },
            digitalProduct: {
              type: 'object',
              properties: {
                downloadUrl: { type: 'string' },
                fileSize: { type: 'number' },
                downloadLimit: { type: 'integer' },
                expirationDays: { type: 'integer' }
              }
            },
            isGiftCard: { type: 'boolean', default: false },
            rating: {
              type: 'object',
              properties: {
                average: { type: 'number', minimum: 0, maximum: 5 },
                count: { type: 'integer' }
              }
            },
            stats: {
              type: 'object',
              properties: {
                views: { type: 'integer' },
                purchases: { type: 'integer' },
                wishlistCount: { type: 'integer' },
                cartCount: { type: 'integer' }
              }
            },
            collections: { type: 'array', items: { type: 'string' } },
            relatedProducts: { type: 'array', items: { type: 'string' } },
            crossSellProducts: { type: 'array', items: { type: 'string' } },
            upSellProducts: { type: 'array', items: { type: 'string' } },
            customFields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  value: { type: 'string' },
                  type: { type: 'string', enum: ['text', 'number', 'boolean', 'date', 'select'] },
                  required: { type: 'boolean' },
                  options: { type: 'array', items: { type: 'string' } }
                }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            publishedAt: { type: 'string', format: 'date-time' },
            vendorCreatedAt: { type: 'string', format: 'date-time' },
            vendorUpdatedAt: { type: 'string', format: 'date-time' }
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Electronics' },
            slug: { type: 'string', example: 'electronics' },
            description: { type: 'string' },
            store: { type: 'string' },
            parent: { type: 'string' },
            ancestors: { type: 'array', items: { type: 'string' } },
            level: { type: 'integer', minimum: 1, maximum: 5 },
            image: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                alt: { type: 'string' }
              }
            },
            icon: { type: 'string' },
            seo: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } }
              }
            },
            displayOrder: { type: 'integer', default: 0 },
            isActive: { type: 'boolean', default: true },
            isFeatured: { type: 'boolean', default: false },
            stats: {
              type: 'object',
              properties: {
                productCount: { type: 'integer' },
                totalViews: { type: 'integer' },
                subcategoriesCount: { type: 'integer' }
              }
            },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
        },
        Store: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'My Store' },
            description: { type: 'string' },
            slug: { type: 'string', example: 'my-store' },
            owner: { type: 'string' },
            status: { type: 'string', enum: ['active', 'suspended'], default: 'active' },
            logo: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                alt: { type: 'string' }
              }
            },
            banner: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                alt: { type: 'string' }
              }
            },
            contact: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                phone: { type: 'string' },
                website: { type: 'string' }
              }
            },
            businessInfo: {
              type: 'object',
              properties: {
                taxId: { type: 'string' },
                registrationNumber: { type: 'string' },
                address: {
                  type: 'object',
                  properties: {
                    street: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' },
                    zipCode: { type: 'string' },
                    country: { type: 'string' }
                  }
                }
              }
            },
            settings: {
              type: 'object',
              properties: {
                currency: { type: 'string', default: 'USD' },
                timezone: { type: 'string', default: 'UTC' },
                language: { type: 'string', default: 'en' }
              }
            },
            stats: {
              type: 'object',
              properties: {
                totalProducts: { type: 'integer' },
                totalCategories: { type: 'integer' },
                totalOrders: { type: 'integer' },
                totalRevenue: { type: 'number' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string', example: 'ORD-123456-789' },
            customer: { type: 'string' },
            customerEmail: { type: 'string' },
            customerName: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { type: 'string' },
                  variantId: { type: 'string' },
                  productName: { type: 'string' },
                  productImage: { type: 'string' },
                  sku: { type: 'string' },
                  quantity: { type: 'integer' },
                  unitPrice: { type: 'number' },
                  totalPrice: { type: 'number' },
                  vendor: { type: 'string' },
                  status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'] },
                  trackingNumber: { type: 'string' },
                  shippedAt: { type: 'string', format: 'date-time' },
                  deliveredAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            subtotal: { type: 'number' },
            discount: { type: 'number' },
            discountCode: { type: 'string' },
            tax: { type: 'number' },
            taxRate: { type: 'number' },
            shipping: { type: 'number' },
            total: { type: 'number' },
            shippingAddress: {
              type: 'object',
              properties: {
                recipientName: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' },
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                country: { type: 'string' },
                instructions: { type: 'string' }
              }
            },
            shippingMethod: { type: 'string', enum: ['standard', 'express', 'overnight', 'pickup'] },
            shippingCarrier: { type: 'string' },
            trackingNumber: { type: 'string' },
            payment: {
              type: 'object',
              properties: {
                method: { type: 'string', enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'] },
                status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'] },
                transactionId: { type: 'string' },
                paymentGateway: { type: 'string' },
                amount: { type: 'number' },
                currency: { type: 'string' },
                paidAt: { type: 'string', format: 'date-time' },
                refundedAt: { type: 'string', format: 'date-time' },
                refundAmount: { type: 'number' },
                paymentIntentId: { type: 'string' }
              }
            },
            status: { type: 'string', enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] },
            orderedAt: { type: 'string', format: 'date-time' },
            confirmedAt: { type: 'string', format: 'date-time' },
            processingAt: { type: 'string', format: 'date-time' },
            shippedAt: { type: 'string', format: 'date-time' },
            deliveredAt: { type: 'string', format: 'date-time' },
            cancelledAt: { type: 'string', format: 'date-time' },
            refundedAt: { type: 'string', format: 'date-time' },
            cancellationReason: { type: 'string' },
            refundReason: { type: 'string' },
            refundAmount: { type: 'number' },
            customerNotes: { type: 'string' },
            adminNotes: { type: 'string' },
            isGift: { type: 'boolean' },
            giftMessage: { type: 'string' },
            referralCode: { type: 'string' },
            affiliateId: { type: 'string' },
            ipAddress: { type: 'string' },
            userAgent: { type: 'string' },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
        },
        Cart: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { type: 'string' },
                  variantId: { type: 'string' },
                  productName: { type: 'string' },
                  productImage: { type: 'string' },
                  sku: { type: 'string' },
                  quantity: { type: 'integer' },
                  unitPrice: { type: 'number' },
                  totalPrice: { type: 'number' },
                  vendor: { type: 'string' },
                  addedAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            subtotal: { type: 'number' },
            itemCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
        },
        Favorites: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            user: { type: 'string' },
            products: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
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