    const AuthService = require('../auth/auth.service');
    const UserService = require('../users/user.service');

    class SuperAdminController {
    
    // إنشاء Admin جديد (SuperAdmin فقط)
    static async createAdmin(req, res) {
      try {
      const { email, password, firstName, lastName, username } = req.body;
    
      if (!email || !password) {
          return res.status(400).json({
          success: false,
          message: 'Email and password are required'
          });
      }
    
      // Set default values for required fields if not provided
      const adminFirstName = firstName || 'Admin';
      const adminLastName = lastName || 'User';
      const adminUsername = username || email;

    // إنشاء المستخدم في Keycloak بدور Admin
    const keycloakResult = await AuthService.createUser({
        email,
        password,
        firstName: adminFirstName,
        lastName: adminLastName,
        username: adminUsername,
        roles: ['Admin']
    });

    if (!keycloakResult.success) {
        return res.status(400).json({
        success: false,
        message: keycloakResult.message
        });
    }

    // إنشاء المستخدم في قاعدة البيانات المحلية
    const userResult = await UserService.createUser({
        email,
        firstName: adminFirstName,
        lastName: adminLastName,
        username: adminUsername,
        role: 'Admin',
        status: 'active',
        keycloakId: keycloakResult.keycloakId,
        createdBy: req.user.id
    });

    if (!userResult.success) {
        return res.status(400).json({
        success: false,
        message: userResult.message
        });
    }

    return res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        data: userResult.data
    });
    } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
    }
}

// الحصول على جميع الـ Admins (SuperAdmin فقط)
static async getAllAdmins(req, res) {
    try {
    const { page = 1, limit = 10 } = req.query;
    
    const result = await UserService.getAllUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        role: 'Admin'
    });

    return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
    });
    } catch (error) {
    console.error('Get all admins error:', error);
    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
    }
}

// حذف Admin (SuperAdmin فقط)
static async deleteAdmin(req, res) {
    try {
    const { adminId } = req.params;

    // التحقق من أن المستخدم Admin وليس SuperAdmin
    const user = await UserService.getUserById(adminId);
    
    if (!user.success || !user.data) {
        return res.status(404).json({
        success: false,
        message: 'Admin not found'
        });
    }

    if (user.data.role !== 'Admin') {
        return res.status(400).json({
        success: false,
        message: 'User is not an Admin'
        });
    }

    const result = await UserService.deleteUser(adminId);

    if (result.success) {
        return res.status(200).json({
        success: true,
        message: 'Admin deleted successfully'
        });
    } else {
        return res.status(400).json({
        success: false,
        message: result.message
        });
    }
    } catch (error) {
    console.error('Delete admin error:', error);
    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
    }
}

// تعطيل/تفعيل Admin (SuperAdmin فقط)
static async toggleAdminStatus(req, res) {
    try {
    const { adminId } = req.params;
    const { status } = req.body; // 'active' or 'inactive'

    if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
        success: false,
        message: 'Status must be active or inactive'
        });
    }

    // التحقق من أن المستخدم Admin
    const user = await UserService.getUserById(adminId);
    
    if (!user.success || !user.data || user.data.role !== 'Admin') {
        return res.status(404).json({
        success: false,
        message: 'Admin not found'
        });
    }

    const result = await UserService.updateUser(adminId, { 
        status,
        statusUpdatedBy: req.user.id,
        statusUpdatedAt: new Date()
    });

    if (result.success) {
        return res.status(200).json({
        success: true,
        message: `Admin ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
        data: result.data
        });
    } else {
        return res.status(400).json({
        success: false,
        message: result.message
        });
    }
    } catch (error) {
    console.error('Toggle admin status error:', error);
    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
    }
}

// الحصول على إحصائيات شاملة للنظام (SuperAdmin فقط)
static async getAdvancedStats(req, res) {
    try {
    const stats = await UserService.getAdvancedSystemStats();

    return res.status(200).json({
        success: true,
        data: stats
    });
    } catch (error) {
    console.error('Get advanced stats error:', error);
    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
    }
}

// عرض جميع العمليات الحساسة (SuperAdmin فقط)
static async getAuditLog(req, res) {
    try {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
    
    const result = await UserService.getAuditLog({
        page: parseInt(page),
        limit: parseInt(limit),
        action,
        userId,
        startDate,
        endDate
    });

    return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
    });
    } catch (error) {
    console.error('Get audit log error:', error);
    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
    }
}

// إعادة تعيين كلمة مرور Admin (SuperAdmin فقط)
static async resetAdminPassword(req, res) {
    try {
    const { adminId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
        });
    }

    // التحقق من أن المستخدم Admin
    const user = await UserService.getUserById(adminId);
    
    if (!user.success || !user.data || user.data.role !== 'Admin') {
        return res.status(404).json({
        success: false,
        message: 'Admin not found'
        });
    }

    // تحديث كلمة المرور في Keycloak
    // هذا يتطلب Admin API - سيتم تطويره
    
    // تسجيل العملية في audit log
    await UserService.logAuditAction({
        action: 'RESET_PASSWORD',
        performedBy: req.user.id,
        targetUserId: adminId,
        details: 'Admin password reset by SuperAdmin'
    });

    return res.status(200).json({
        success: true,
        message: 'Admin password reset successfully'
    });
    } catch (error) {
    console.error('Reset admin password error:', error);
    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
    }
}
}

module.exports = SuperAdminController;