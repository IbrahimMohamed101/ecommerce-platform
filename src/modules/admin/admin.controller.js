const AuthService = require('../auth/auth.service');
const UserService = require('../users/user.service');
const VendorService = require('../vendor/vendor.service');
const { VendorRequest, VendorProfile } = require('../vendor/vendor.model');
const User = require('../users/user.model');

class AdminController {
    
  // الحصول على جميع المستخدمين (Admin فقط)
  static async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, role, status } = req.query;
      
      const result = await UserService.getAllUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        role,
        status
      });

      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all users error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // الموافقة على طلب البائع (Admin فقط)
  static async approveVendor(req, res) {
    try {
      const { userId } = req.params;
      const { approved } = req.body; // true or false

      if (typeof approved !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Approval status must be true or false'
        });
      }

      if (approved) {
        // الحصول على بيانات المستخدم لاستخراج keycloakId
        const userData = await UserService.getUserById(userId);
        if (!userData.success) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // تحديث الدور في Keycloak باستخدام keycloakId
        const roleResult = await AuthService.updateUserRoles(userData.data.keycloakId, ['Vendor']);

        if (!roleResult.success) {
          return res.status(400).json({
            success: false,
            message: 'Failed to update user role in Keycloak'
          });
        }

        // الحصول على ObjectId للمستخدم المدير من keycloakId
        const adminUser = await User.findByKeycloakId(req.user.id);
        if (!adminUser) {
          return res.status(404).json({
            success: false,
            message: 'Admin user not found'
          });
        }

        // تحديث الحالة في قاعدة البيانات
        const userResult = await UserService.updateUser(userId, {
          role: 'Vendor',
          status: 'active',
          vendorApproved: true,
          vendorApprovedAt: new Date(),
          vendorApprovedBy: adminUser._id
        });

        if (!userResult.success) {
          return res.status(400).json({
            success: false,
            message: userResult.message
          });
        }

        // تحديث حالة طلب البائع إلى "approved"
        const vendorRequest = await VendorRequest.findOne({ userId });
        if (vendorRequest) {
          vendorRequest.status = 'approved';
          vendorRequest.reviewedAt = new Date();
          vendorRequest.reviewedBy = adminUser._id;
          vendorRequest.reviewNotes = 'Approved via admin panel';
          await vendorRequest.save();

          // إنشاء VendorProfile للبائع المعتمد
          const vendorProfile = new VendorProfile({
            userId: vendorRequest.userId,
            businessName: vendorRequest.businessName,
            businessDescription: vendorRequest.businessDescription,
            businessAddress: vendorRequest.businessAddress,
            businessPhone: vendorRequest.businessPhone,
            businessEmail: vendorRequest.businessEmail,
            businessLicense: vendorRequest.businessLicense,
            taxNumber: vendorRequest.taxNumber,
            approvedAt: new Date(),
            approvedBy: adminUser._id
          });
          await vendorProfile.save();
        }

        // إرسال إيميل للمستخدم
        // await EmailService.sendVendorApprovalEmail(userResult.data.email);

        return res.status(200).json({
          success: true,
          message: 'Vendor approved successfully',
          data: userResult.data
        });
      } else {
        // الحصول على ObjectId للمستخدم المدير من keycloakId
        const adminUser = await User.findByKeycloakId(req.user.id);
        if (!adminUser) {
          return res.status(404).json({
            success: false,
            message: 'Admin user not found'
          });
        }

        // رفض الطلب
        const userResult = await UserService.updateUser(userId, {
          vendorApproved: false,
          vendorRejectedAt: new Date(),
          vendorRejectedBy: adminUser._id,
          status: 'rejected'
        });

        if (!userResult.success) {
          return res.status(400).json({
            success: false,
            message: userResult.message
          });
        }

        // تحديث حالة طلب البائع إلى "rejected"
        const vendorRequest = await VendorRequest.findOne({ userId });
        if (vendorRequest) {
          vendorRequest.status = 'rejected';
          vendorRequest.reviewedAt = new Date();
          vendorRequest.reviewedBy = adminUser._id;
          vendorRequest.rejectionReason = 'Rejected via admin panel';
          await vendorRequest.save();
        }

        return res.status(200).json({
          success: true,
          message: 'Vendor application rejected',
          data: userResult.data
        });
      }
    } catch (error) {
      console.error('Approve vendor error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // الحصول على طلبات البائعين المعلقة (Admin فقط)
  static async getPendingVendorRequests(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await VendorService.getAllVendorRequests({
        page: parseInt(page),
        limit: parseInt(limit),
        status: 'pending'
      });

      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get pending vendor requests error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // حذف مستخدم (Admin فقط)
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      // التحقق من أن المستخدم ليس SuperAdmin
      const user = await UserService.getUserById(userId);
      
      if (user.data && user.data.role === 'SuperAdmin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete SuperAdmin user'
        });
      }

      const result = await UserService.deleteUser(userId);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'User deleted successfully'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // تحديث دور المستخدم (Admin فقط - لا يمكن إنشاء SuperAdmin)
  static async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const validRoles = ['Customer', 'Vendor'];
      
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Valid roles: Customer, Vendor'
        });
      }

      // الحصول على بيانات المستخدم لاستخراج keycloakId
      const userData = await UserService.getUserById(userId);
      if (!userData.success) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // تحديث الدور في Keycloak باستخدام keycloakId
      const roleResult = await AuthService.updateUserRoles(userData.data.keycloakId, [role]);

      if (!roleResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update user role in Keycloak'
        });
      }

      // تحديث الدور في قاعدة البيانات
      const userResult = await UserService.updateUser(userId, { role });

      if (userResult.success) {
        return res.status(200).json({
          success: true,
          message: 'User role updated successfully',
          data: userResult.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: userResult.message
        });
      }
    } catch (error) {
      console.error('Update user role error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // إحصائيات النظام (Admin فقط)
  static async getSystemStats(req, res) {
    try {
      const stats = await UserService.getAdvancedSystemStats();

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get system stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AdminController;