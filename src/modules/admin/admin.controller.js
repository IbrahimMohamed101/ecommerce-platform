const AuthService = require('../auth/auth.service');
const UserService = require('../users/user.service');
const VendorService = require('../vendor/vendor.service');
const { VendorRequest, VendorProfile } = require('../vendor/vendor.model');
const User = require('../users/user.model');
const Store = require('../stores/store.model');
const StoreService = require('../stores/store.service');
const ProductService = require('../products/product.service');

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
        // الحصول على بيانات المستخدم
        const userData = await UserService.getUserById(userId);
        if (!userData.success) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // الحصول على ObjectId للمستخدم المدير
        const adminUser = await User.findById(req.user.id);
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

          // إنشاء متجر تلقائي للبائع المعتمد
          try {
            // Parse address string into address object
            let addressObj = {};
            if (vendorRequest.businessAddress) {
              // Simple parsing: assume format "street, city, state/country"
              const addressParts = vendorRequest.businessAddress.split(',').map(part => part.trim());
              if (addressParts.length >= 2) {
                addressObj = {
                  street: addressParts[0],
                  city: addressParts[1],
                  state: addressParts[2] || '',
                  country: addressParts[3] || 'Egypt' // Default to Egypt if not specified
                };
              } else {
                // If parsing fails, put the whole string in street
                addressObj = {
                  street: vendorRequest.businessAddress,
                  city: '',
                  state: '',
                  country: 'Egypt'
                };
              }
            }

            const storeData = {
              name: vendorRequest.businessName || `${userResult.data.firstName} ${userResult.data.lastName}'s Store`,
              description: vendorRequest.businessDescription || 'Welcome to my store',
              contact: {
                email: vendorRequest.businessEmail || userResult.data.email,
                phone: vendorRequest.businessPhone
              },
              businessInfo: {
                taxId: vendorRequest.taxNumber,
                registrationNumber: vendorRequest.businessLicense,
                address: addressObj
              }
            };

            await StoreService.createStore(storeData, userId);
            console.log(`Store created automatically for vendor ${userId}`);
          } catch (storeError) {
            console.error('Failed to create store for vendor:', storeError);
            // لا نعيد الخطأ لأن الموافقة على البائع نجحت
          }
        }

        // إرسال إيميل للمستخدم
        // await EmailService.sendVendorApprovalEmail(userResult.data.email);

        return res.status(200).json({
          success: true,
          message: 'Vendor approved successfully',
          data: userResult.data
        });
      } else {
        // الحصول على ObjectId للمستخدم المدير
        const adminUser = await User.findById(req.user.id);
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

      // التحقق من أن المستخدم ليس super-admin
      const user = await UserService.getUserById(userId);

      if (user.data && user.data.role === 'super-admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete super-admin user'
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

      const validRoles = ['user', 'vendor'];

      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Valid roles: user, vendor'
        });
      }

      // Map role values to match the user model enum
      const roleMapping = {
        'user': 'Customer',
        'vendor': 'Vendor'
      };
      const mappedRole = roleMapping[role] || role;

      // الحصول على بيانات المستخدم
      const userData = await UserService.getUserById(userId);
      if (!userData.success) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // تحديث الدور في قاعدة البيانات
      const userResult = await UserService.updateUser(userId, { role: mappedRole });

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

  // Get all stores (Admin only)
  static async getAllStores(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;

      const query = {};
      if (status) query.status = status;

      const stores = await Store.find(query)
        .populate('owner', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

      const total = await Store.countDocuments(query);

      return res.status(200).json({
        success: true,
        data: stores,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get all stores error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Suspend or activate store (Admin only)
  static async updateStoreStatus(req, res) {
    try {
      const { storeId } = req.params;
      const { status } = req.body; // 'active' or 'suspended'

      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be active or suspended'
        });
      }

      const store = await Store.findByIdAndUpdate(
        storeId,
        { status, updatedAt: new Date() },
        { new: true }
      ).populate('owner', 'firstName lastName email');

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: `Store ${status === 'suspended' ? 'suspended' : 'activated'} successfully`,
        data: store
      });
    } catch (error) {
      console.error('Update store status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete any product (Admin only)
  static async deleteProduct(req, res) {
    try {
      const { productId } = req.params;

      const result = await ProductService.deleteProduct(productId, req.user.id, true);

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AdminController;