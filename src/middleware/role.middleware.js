    class RoleMiddleware {
    static requireRole(role) {
        return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
            success: false,
            message: 'Authentication required'
            });
        }

        const userRoles = req.user.roles || [];
        
        if (!userRoles.includes(role)) {
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
        const userRoles = req.user.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));
        
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

    static requireAdminorSuperAdmin(req, res, next) {
        return RoleMiddleware.requireAnyRole(['Admin', 'SuperAdmin'])(req, res, next);
    }

    static requireCustomerorVendor(req, res, next) {
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

        const userRoles = req.user.roles || [];
        const isAdmin = userRoles.includes('Admin') || userRoles.includes('SuperAdmin');
        
        // إذا كان Admin، يمكنه الوصول لكل شيء
        if (isAdmin) {
            return next();
        }

        // التحقق من الملكية
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
}

module.exports = RoleMiddleware;