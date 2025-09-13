const jwt = require('jsonwebtoken');
const axios = require('axios');
const { KEYCLOAK_CONFIG } = require('../config/keycloak');
const logger = require('../utils/logger');
const { AuthenticationError } = require('../utils/errorHandler');

class AuthMiddleware {
  // Cache for token validation to reduce external calls
  static tokenCache = new Map();
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // التحقق من صحة الـ Token
  static async verifyToken(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.authError('Access attempt without token', {
          ip: req.ip,
          url: req.originalUrl,
          userAgent: req.get('User-Agent')
        });
        return res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
      }

      // Check cache first
      const cachedUser = AuthMiddleware.getCachedUser(token);
      if (cachedUser) {
        req.user = cachedUser;
        return next();
      }

      logger.auth('Verifying token', {
        ip: req.ip,
        url: req.originalUrl,
        nodeEnv: process.env.NODE_ENV,
        hasClientSecret: !!KEYCLOAK_CONFIG.clientSecret
      });

      // Check if Keycloak is available (for development)
      if (process.env.NODE_ENV === 'development' && !KEYCLOAK_CONFIG.clientSecret) {
        logger.warn('Keycloak client secret not configured - simulating token verification');

        // فك تشفير الـ Token للحصول على معلومات المستخدم
        const decoded = jwt.decode(token);

        if (!decoded) {
          throw new AuthenticationError('Invalid token format');
        }

        const user = {
          id: decoded.sub || 'mock-user-id',
          email: decoded.email || 'mock@example.com',
          username: decoded.preferred_username || 'mockuser',
          roles: decoded.realm_access?.roles || ['Customer'],
          token: token
        };

        // Cache the user info
        AuthMiddleware.cacheUser(token, user);

        req.user = user;

        logger.auth('Token verified successfully (simulated)', {
          userId: user.id,
          email: user.email,
          ip: req.ip
        });

        return next();
      }

      // In development or production, skip userinfo call and just decode JWT if configured
      if (process.env.NODE_ENV === 'development' || process.env.SKIP_USERINFO === 'true') {
        logger.auth(`${process.env.NODE_ENV} mode - skipping userinfo call, using JWT decode only`);

        // فك تشفير الـ Token للحصول على معلومات المستخدم
        const decoded = jwt.decode(token);

        if (!decoded) {
          throw new AuthenticationError('Invalid token format');
        }

        const user = {
          id: decoded.sub,
          email: decoded.email,
          username: decoded.preferred_username,
          roles: decoded.realm_access?.roles || [],
          token: token
        };

        // Cache the user info
        AuthMiddleware.cacheUser(token, user);

        req.user = user;

        logger.auth('Token verified successfully (JWT decode only)', {
          userId: user.id,
          email: user.email,
          ip: req.ip
        });

        return next();
      }

      // التحقق من الـ Token مع Keycloak
      const response = await axios.get(
        `${KEYCLOAK_CONFIG.authServerUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/userinfo`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 5000 // 5 second timeout
        }
      );

      // فك تشفير الـ Token للحصول على معلومات المستخدم
      const decoded = jwt.decode(token);

      if (!decoded) {
        throw new AuthenticationError('Invalid token format');
      }

      const user = {
        id: decoded.sub,
        email: decoded.email,
        username: decoded.preferred_username,
        roles: decoded.realm_access?.roles || [],
        token: token
      };

      // Cache the user info
      AuthMiddleware.cacheUser(token, user);

      req.user = user;

      logger.auth('Token verified successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });

      next();
    } catch (error) {
      logger.authError('Token verification failed', {
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
        ip: req.ip,
        url: req.originalUrl,
        statusCode: error.response?.status,
        responseData: error.response?.data
      });

      // In development, simulate token verification if Keycloak is not available
      if (process.env.NODE_ENV === 'development' && error.code === 'ECONNREFUSED') {
        logger.warn('Keycloak server not available - simulating token verification for development');

        // فك تشفير الـ Token للحصول على معلومات المستخدم
        const decoded = jwt.decode(token);

        if (!decoded) {
          throw new AuthenticationError('Invalid token format');
        }

        const user = {
          id: decoded.sub || 'dev-user-id',
          email: decoded.email || 'dev@example.com',
          username: decoded.preferred_username || 'devuser',
          roles: decoded.realm_access?.roles || ['Customer'],
          token: token
        };

        // Cache the user info
        AuthMiddleware.cacheUser(token, user);

        req.user = user;

        logger.auth('Token verified successfully (simulated for development)', {
          userId: user.id,
          email: user.email,
          ip: req.ip
        });

        return next();
      }

      if (error.response?.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else if (error.code === 'ECONNREFUSED') {
        return res.status(500).json({
          success: false,
          message: 'Authentication service temporarily unavailable'
        });
      } else if (error.response?.status === 403) {
        return res.status(401).json({
          success: false,
          message: 'Token not authorized for user info access'
        });
      } else if (error.response?.status === 404) {
        return res.status(500).json({
          success: false,
          message: 'Authentication service endpoint not found'
        });
      } else if (error.response?.status >= 500) {
        return res.status(500).json({
          success: false,
          message: 'Authentication service temporarily unavailable'
        });
      } else {
        // For any other error, return 401 to be safe
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    }
  }

  // Cache management methods
  static getCachedUser(token) {
    const cached = AuthMiddleware.tokenCache.get(token);
    if (cached && Date.now() - cached.timestamp < AuthMiddleware.CACHE_TTL) {
      return cached.user;
    } else {
      // Remove expired cache entry
      AuthMiddleware.tokenCache.delete(token);
      return null;
    }
  }

  static cacheUser(token, user) {
    AuthMiddleware.tokenCache.set(token, {
      user,
      timestamp: Date.now()
    });

    // Clean up old entries periodically
    if (AuthMiddleware.tokenCache.size > 1000) {
      AuthMiddleware.cleanupCache();
    }
  }

  static cleanupCache() {
    const now = Date.now();
    for (const [token, data] of AuthMiddleware.tokenCache.entries()) {
      if (now - data.timestamp > AuthMiddleware.CACHE_TTL) {
        AuthMiddleware.tokenCache.delete(token);
      }
    }
  }

  // التحقق من أن المستخدم مسجل دخول فقط
  static requireAuth(req, res, next) {
    return AuthMiddleware.verifyToken(req, res, next);
  }
}

module.exports = AuthMiddleware;