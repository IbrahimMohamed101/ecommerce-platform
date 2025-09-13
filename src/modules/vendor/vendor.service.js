const { VendorRequest, VendorProfile } = require('./vendor.model');
const User = require('../users/user.model');

class VendorService {

  // Get vendor request by user ID (Keycloak UUID)
  static async getVendorRequest(keycloakId) {
    try {
      // Find user by keycloakId to get MongoDB ObjectId
      const user = await User.findOne({ keycloakId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const request = await VendorRequest.findOne({ userId: user._id });
      if (request) {
        return {
          success: true,
          data: request
        };
      } else {
        return {
          success: false,
          message: 'No vendor request found'
        };
      }
    } catch (error) {
      console.error('Error getting vendor request:', error);
      return {
        success: false,
        message: 'Failed to get vendor request'
      };
    }
  }

  // Create a new vendor request
  static async createVendorRequest(vendorData) {
    try {
      // Find user by keycloakId to get MongoDB ObjectId
      const user = await User.findOne({ keycloakId: vendorData.userId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Check if user already has a request
      const existingRequest = await VendorRequest.findOne({ userId: user._id });
      if (existingRequest) {
        return {
          success: false,
          message: 'Vendor request already exists'
        };
      }

      const requestData = {
        ...vendorData,
        userId: user._id // Use MongoDB ObjectId
      };

      const newRequest = new VendorRequest(requestData);
      const savedRequest = await newRequest.save();

      return {
        success: true,
        data: savedRequest
      };
    } catch (error) {
      console.error('Error creating vendor request:', error);
      return {
        success: false,
        message: 'Failed to create vendor request'
      };
    }
  }

  // Get vendor profile by user ID (Keycloak UUID)
  static async getVendorProfile(keycloakId) {
    try {
      // Find user by keycloakId to get MongoDB ObjectId
      const user = await User.findOne({ keycloakId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const profile = await VendorProfile.findOne({ userId: user._id });
      if (profile) {
        return {
          success: true,
          data: profile
        };
      } else {
        return {
          success: false,
          message: 'Vendor profile not found'
        };
      }
    } catch (error) {
      console.error('Error getting vendor profile:', error);
      return {
        success: false,
        message: 'Failed to get vendor profile'
      };
    }
  }

  // Update vendor profile
  static async updateVendorProfile(keycloakId, updateData) {
    try {
      // Find user by keycloakId to get MongoDB ObjectId
      const user = await User.findOne({ keycloakId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const profile = await VendorProfile.findOne({ userId: user._id });
      if (!profile) {
        return {
          success: false,
          message: 'Vendor profile not found'
        };
      }

      // Remove fields that shouldn't be updated directly
      const restrictedFields = ['userId', 'status', 'approvedAt', 'approvedBy', 'createdAt'];
      restrictedFields.forEach(field => delete updateData[field]);

      Object.assign(profile, updateData);
      const updatedProfile = await profile.save();

      return {
        success: true,
        data: updatedProfile
      };
    } catch (error) {
      console.error('Error updating vendor profile:', error);
      return {
        success: false,
        message: 'Failed to update vendor profile'
      };
    }
  }

  // Get all active vendors with pagination and filters
  static async getAllActiveVendors(options = {}) {
    try {
      const { page = 1, limit = 10, search, category } = options;
      const skip = (page - 1) * limit;

      let query = { status: 'active' };

      if (search) {
        query.$or = [
          { businessName: { $regex: search, $options: 'i' } },
          { businessDescription: { $regex: search, $options: 'i' } }
        ];
      }

      if (category) {
        query.categories = { $in: [category] };
      }

      const vendors = await VendorProfile.find(query)
        .populate('userId', 'firstName lastName email')
        .sort({ 'rating.average': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await VendorProfile.countDocuments(query);

      return {
        success: true,
        data: vendors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting active vendors:', error);
      return {
        success: false,
        message: 'Failed to get vendors'
      };
    }
  }

  // Get vendor by ID
  static async getVendorById(vendorId) {
    try {
      const vendor = await VendorProfile.findById(vendorId)
        .populate('userId', 'firstName lastName email phone');

      if (vendor && vendor.status === 'active') {
        return {
          success: true,
          data: vendor
        };
      } else {
        return {
          success: false,
          message: 'Vendor not found'
        };
      }
    } catch (error) {
      console.error('Error getting vendor by ID:', error);
      return {
        success: false,
        message: 'Failed to get vendor'
      };
    }
  }

  // Get vendor statistics
  static async getVendorStats(keycloakId) {
    try {
      // Find user by keycloakId to get MongoDB ObjectId
      const user = await User.findOne({ keycloakId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const profile = await VendorProfile.findOne({ userId: user._id });
      if (!profile) {
        return {
          success: false,
          message: 'Vendor profile not found'
        };
      }

      // Get additional stats from related data
      const totalProducts = await this.getVendorProductCount(user._id);
      const recentOrders = await this.getRecentOrders(user._id);

      const stats = {
        ...profile.stats,
        totalProducts,
        recentOrders: recentOrders.length,
        rating: profile.rating,
        businessInfo: {
          businessName: profile.businessName,
          joinedAt: profile.approvedAt,
          isVerified: profile.isVerified
        }
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting vendor stats:', error);
      return {
        success: false,
        message: 'Failed to get vendor statistics'
      };
    }
  }

  // Helper method to get vendor product count (placeholder - would need Product model)
  static async getVendorProductCount(userObjectId) {
    // This would typically query the Product model
    // For now, return the stored count
    try {
      const profile = await VendorProfile.findOne({ userId: userObjectId });
      return profile ? profile.stats.totalProducts : 0;
    } catch (error) {
      console.error('Error getting vendor product count:', error);
      return 0;
    }
  }

  // Helper method to get recent orders (placeholder - would need Order model)
  static async getRecentOrders(userObjectId) {
    // This would typically query the Order model
    // For now, return empty array
    return [];
  }

  // Approve vendor request
  static async approveVendorRequest(requestId, adminId, reviewNotes = '') {
    try {
      const request = await VendorRequest.findById(requestId);
      if (!request || request.status !== 'pending') {
        return {
          success: false,
          message: 'Invalid vendor request'
        };
      }

      // Update request status
      request.status = 'approved';
      request.reviewedAt = new Date();
      request.reviewedBy = adminId;
      request.reviewNotes = reviewNotes;
      await request.save();

      // Create vendor profile
      const vendorProfile = new VendorProfile({
        userId: request.userId,
        businessName: request.businessName,
        businessDescription: request.businessDescription,
        businessAddress: request.businessAddress,
        businessPhone: request.businessPhone,
        businessEmail: request.businessEmail,
        businessLicense: request.businessLicense,
        taxNumber: request.taxNumber,
        approvedAt: new Date(),
        approvedBy: adminId
      });
      await vendorProfile.save();

      // Update user role
      await User.findByIdAndUpdate(request.userId, {
        role: 'Vendor',
        vendorRequestStatus: 'approved',
        vendorApprovedAt: new Date()
      });

      return {
        success: true,
        data: { request, profile: vendorProfile }
      };
    } catch (error) {
      console.error('Error approving vendor request:', error);
      return {
        success: false,
        message: 'Failed to approve vendor request'
      };
    }
  }

  // Reject vendor request
  static async rejectVendorRequest(requestId, adminId, rejectionReason = '') {
    try {
      const request = await VendorRequest.findById(requestId);
      if (!request || request.status !== 'pending') {
        return {
          success: false,
          message: 'Invalid vendor request'
        };
      }

      // Update request status
      request.status = 'rejected';
      request.reviewedAt = new Date();
      request.reviewedBy = adminId;
      request.rejectionReason = rejectionReason;
      await request.save();

      // Update user status
      await User.findByIdAndUpdate(request.userId, {
        vendorRequestStatus: 'rejected'
      });

      return {
        success: true,
        data: request
      };
    } catch (error) {
      console.error('Error rejecting vendor request:', error);
      return {
        success: false,
        message: 'Failed to reject vendor request'
      };
    }
  }

  // Get all vendor requests (for admin)
  static async getAllVendorRequests(options = {}) {
    try {
      const { page = 1, limit = 10, status } = options;
      const skip = (page - 1) * limit;

      let query = {};
      if (status) {
        query.status = status;
      }

      const requests = await VendorRequest.find(query)
        .populate('userId', 'firstName lastName email')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await VendorRequest.countDocuments(query);

      return {
        success: true,
        data: requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting vendor requests:', error);
      return {
        success: false,
        message: 'Failed to get vendor requests'
      };
    }
  }
}

module.exports = VendorService;