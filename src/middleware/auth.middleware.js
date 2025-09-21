const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');
const logger = require('../utils/logger');
const { AuthenticationError } = require('../utils/errorHandler');

class AuthMiddleware {
  // Cache for token validation to reduce database calls
  static tokenCache = new Map();
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Verify JWT token and attach user to request
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

      logger.auth('Verifying JWT token', {
        ip: req.ip,
        url: req.originalUrl
      });

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if it's an access token
      if (decoded.type !== 'access') {
        throw new AuthenticationError('Invalid token type');
      }

      // Get user from database
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new AuthenticationError('User account is not active');
      }

      // Create user object for request
      const userInfo = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
        token: token
      };

      // Cache the user info
      AuthMiddleware.cacheUser(token, userInfo);

      req.user = userInfo;

      logger.auth('Token verified successfully', {
        userId: userInfo.id,
        email: userInfo.email,
        role: userInfo.role,
        ip: req.ip
      });

      next();
    } catch (error) {
      logger.authError('Token verification failed', {
        error: error.message,
        errorName: error.name,
        ip: req.ip,
        url: req.originalUrl
      });

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else if (error.name === 'NotBeforeError') {
        return res.status(401).json({
          success: false,
          message: 'Token not active'
        });
      } else {
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

  // Require authentication
  static requireAuth(req, res, next) {
    return AuthMiddleware.verifyToken(req, res, next);
  }

  // Optional authentication (doesn't fail if no token)
  static optionalAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next();
    }

    // If token exists, verify it but don't fail if invalid
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type === 'access') {
        User.findById(decoded.userId).then(user => {
          if (user && user.status === 'active') {
            req.user = {
              id: user._id.toString(),
              email: user.email,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              emailVerified: user.emailVerified,
              token: token
            };
          }
          next();
        }).catch(() => {
          next();
        });
      } else {
        next();
      }
    } catch (error) {
      next();
    }
  }
}

module.exports = AuthMiddleware;