const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const { initKeycloak } = require("./config/keycloak");
const { swaggerUi, specs } = require("./config/swagger");
const {
  errorHandler,
  requestLogger,
  notFoundHandler
} = require("./utils/errorHandler");
const logger = require("./utils/logger");
const authMonitor = require("./utils/authMonitor");
const auditLogger = require("./utils/auditLogger");

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https://api.example.com"], // Add your API domains
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Request logging
app.use(requestLogger);

// Body parsing middleware
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Keycloak
const keycloak = initKeycloak(app);
app.use(keycloak.middleware());

// ✅ Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/user.routes'));
app.use('/api/products', require('./modules/products/product.routes'));
app.use('/api/vendors', require('./modules/vendor/vendor.routes'));
app.use('/api/admin', require('./modules/admin/admin.routes'));
app.use('/api/super-admin', require('./modules/admin/super-admin.routes'));

// Swagger Documentation Routes
/**
 * @swagger
 * /api-docs:
 *   get:
 *     summary: API Documentation
 *     description: Access interactive API documentation
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Swagger UI interface
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /api-docs.json:
 *   get:
 *     summary: OpenAPI Specification
 *     description: Get the OpenAPI 3.0 specification in JSON format
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

/**
 * @swagger
 * /verify-email:
 *   get:
 *     summary: Email verification page
 *     description: Serve the email verification page
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Email verification page served
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
app.get("/verify-email", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "verify-email", "index.html"));
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check server health status
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
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
 *                   example: Server is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 1234.567
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @swagger
 * /api/admin/monitoring/health:
 *   get:
 *     summary: Get monitoring health status
 *     description: Retrieve authentication monitoring health status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monitoring health status retrieved
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
 *                     authMonitor:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: healthy
 *                         lastCheck:
 *                           type: string
 *                           format: date-time
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
app.get('/api/admin/monitoring/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      authMonitor: authMonitor.getHealthStatus(),
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * @swagger
 * /api/admin/monitoring/report:
 *   get:
 *     summary: Generate monitoring report
 *     description: Generate authentication monitoring report for specified time range
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *         description: Time range in hours (default 24)
 *     responses:
 *       200:
 *         description: Monitoring report generated successfully
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
 *                     totalRequests:
 *                       type: integer
 *                     failedAuthentications:
 *                       type: integer
 *                     suspiciousActivities:
 *                       type: integer
 *                     timeRange:
 *                       type: string
 *       500:
 *         description: Failed to generate report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/admin/monitoring/report', async (req, res) => {
  try {
    const timeRange = req.query.hours ? parseInt(req.query.hours) * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const report = await authMonitor.generateReport(timeRange);

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Failed to generate monitoring report', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

/**
 * @swagger
 * /api/admin/audit/logs:
 *   get:
 *     summary: Query audit logs
 *     description: Query system audit logs with filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity level
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: ip
 *         schema:
 *           type: string
 *         description: Filter by IP address
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Maximum number of logs to return (default 100)
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
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
 *                       eventType:
 *                         type: string
 *                       severity:
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
 *       500:
 *         description: Failed to query audit logs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/admin/audit/logs', async (req, res) => {
  try {
    const filters = {
      eventType: req.query.eventType,
      severity: req.query.severity,
      userId: req.query.userId,
      ip: req.query.ip,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const limit = parseInt(req.query.limit) || 100;
    const logs = await auditLogger.queryAuditLogs(filters, limit);

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Failed to query audit logs', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to query audit logs'
    });
  }
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
