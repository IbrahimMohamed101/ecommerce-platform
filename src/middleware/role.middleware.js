class RoleMiddleware {
  static requireRole(role) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;

      if (userRole !== role) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${role} role required.`
        });
      }

      next();
    };
  }

  static requireAnyRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const hasRole = roles.includes(userRole);

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: `Access denied. One of the following roles required: ${roles.join(', ')}.`
        });
      }

      next();
    };
  }

  static requireCustomer(req, res, next) {
    return RoleMiddleware.requireRole('Customer')(req, res, next);
  }

  static requireVendor(req, res, next) {
    return RoleMiddleware.requireRole('Vendor')(req, res, next);
  }

  static requireAdmin(req, res, next) {
    return RoleMiddleware.requireRole('Admin')(req, res, next);
  }

  static requireSuperAdmin(req, res, next) {
    return RoleMiddleware.requireRole('SuperAdmin')(req, res, next);
  }

  static requireAdminOrSuperAdmin(req, res, next) {
    return RoleMiddleware.requireAnyRole(['Admin', 'SuperAdmin'])(req, res, next);
  }

  static requireCustomerOrVendor(req, res, next) {
    return RoleMiddleware.requireAnyRole(['Customer', 'Vendor'])(req, res, next);
  }

  static requireOwnershipOrAdmin(resourceUserField = 'userId') {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const isAdmin = userRole === 'Admin' || userRole === 'SuperAdmin';

      // If user is Admin or SuperAdmin, they can access everything
      if (isAdmin) {
        return next();
      }

      // Check ownership
      const resourceUserId = req.params.userId || req.body[resourceUserField] || req.query.userId;

      if (resourceUserId && resourceUserId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

      next();
    };
  }

  // Check if user has minimum role level (hierarchical)
  static requireMinimumRole(minimumRole) {
    const roleHierarchy = {
      'Customer': 1,
      'Vendor': 2,
      'Admin': 3,
      'SuperAdmin': 4
    };

    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const userLevel = roleHierarchy[userRole] || 0;
      const requiredLevel = roleHierarchy[minimumRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${minimumRole} role or higher required.`
        });
      }

      next();
    };
  }
}

module.exports = RoleMiddleware;