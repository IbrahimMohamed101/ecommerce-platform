const rateLimit = require('express-rate-limit');
const logger = require('./logger');
const authMonitor = require('./authMonitor');

// Create different rate limiters for different endpoints
const createRateLimiter = (options) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    handler = (req, res) => {
      logger.security('Rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent')
      });

      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders,
    legacyHeaders,
    handler
  });
};

// General API rate limiter
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many API requests from this IP, please try again later.'
});

// Strict rate limiter for authentication endpoints
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // 50 in dev, 5 in production
  message: process.env.NODE_ENV === 'development'
    ? 'Development: Rate limit reached, but continuing for testing.'
    : 'Too many login attempts from this IP, please try again later.',
  handler: async (req, res) => {
    // Track rate limit violation
    await authMonitor.trackRateLimitViolation(req.ip, '/api/auth/login');

    logger.security('Login rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get('User-Agent'),
      environment: process.env.NODE_ENV
    });

    if (process.env.NODE_ENV === 'development') {
      // In development, just log and continue
      logger.warn('Development mode: Allowing request despite rate limit', {
        ip: req.ip,
        email: req.body.email
      });
      return req.rateLimit = { remaining: 0, resetTime: new Date(Date.now() + 15 * 60 * 1000) };
    }

    res.status(429).json({
      success: false,
      error: 'Too Many Login Attempts',
      message: 'Too many login attempts from this IP, please try again in 15 minutes.',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});

// Rate limiter for password reset
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 password reset requests per hour
  message: 'Too many password reset requests, please try again later.'
});

// Rate limiter for registration
const registrationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 20 : 3, // 20 in dev, 3 in production
  message: process.env.NODE_ENV === 'development'
    ? 'Development: Registration rate limit reached, but continuing for testing.'
    : 'Too many registration attempts, please try again later.',
  handler: async (req, res) => {
    logger.security('Registration rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get('User-Agent'),
      environment: process.env.NODE_ENV
    });

    if (process.env.NODE_ENV === 'development') {
      // In development, just log and continue
      logger.warn('Development mode: Allowing registration despite rate limit', {
        ip: req.ip,
        email: req.body.email
      });
      return req.rateLimit = { remaining: 0, resetTime: new Date(Date.now() + 60 * 60 * 1000) };
    }

    res.status(429).json({
      success: false,
      error: 'Too Many Registration Attempts',
      message: 'Too many registration attempts, please try again later.',
      retryAfter: 3600 // 1 hour in seconds
    });
  }
});

// Rate limiter for token refresh
const tokenRefreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 10, // 50 in dev, 10 in production
  message: process.env.NODE_ENV === 'development'
    ? 'Development: Token refresh rate limit reached, but continuing for testing.'
    : 'Too many token refresh requests, please try again later.',
  handler: async (req, res) => {
    logger.security('Token refresh rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      environment: process.env.NODE_ENV
    });

    if (process.env.NODE_ENV === 'development') {
      // In development, just log and continue
      logger.warn('Development mode: Allowing token refresh despite rate limit', {
        ip: req.ip
      });
      return req.rateLimit = { remaining: 0, resetTime: new Date(Date.now() + 15 * 60 * 1000) };
    }

    res.status(429).json({
      success: false,
      error: 'Too Many Token Refresh Requests',
      message: 'Too many token refresh requests, please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
  tokenRefreshLimiter,
  createRateLimiter
};