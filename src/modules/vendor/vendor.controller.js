const VendorService = require('./vendor.service');
const UserService = require('../users/user.service');

class VendorController {

  // طلب أن يصبح المستخدم بائع (Customer فقط)
static async requestVendorStatus(req, res) {
        try {
        const userId = req.user.id;
        const { 
            businessName, 
            businessDescription, 
            businessAddress, 
            businessPhone,
            businessEmail,
            businessLicense,
            taxNumber 
        } = req.body;

        // التحقق من أن المستخدم Customer
        if (!req.user.roles.includes('Customer')) {
            return res.status(403).json({
            success: false,
            message: 'Only customers can request vendor status'
            });
        }

        // التحقق من عدم وجود طلب مسبق
        const existingRequest = await VendorService.getVendorRequest(userId);
        
        if (existingRequest.success && existingRequest.data) {
            return res.status(400).json({
            success: false,
            message: 'Vendor request already exists'
            });
        }

        const vendorData = {
            userId,
            businessName,
            businessDescription,
            businessAddress,
            businessPhone,
            businessEmail: businessEmail || req.user.email,
            businessLicense,
            taxNumber,
            status: 'pending',
            requestedAt: new Date()
        };

        const result = await VendorService.createVendorRequest(vendorData);

        if (result.success) {
            // تحديث حالة المستخدم في قاعدة البيانات
            await UserService.updateUser(userId, {
            vendorRequestStatus: 'pending',
            vendorRequestedAt: new Date()
            });

            return res.status(201).json({
            success: true,
            message: 'Vendor request submitted successfully. Waiting for admin approval.',
            data: result.data
            });
        } else {
            return res.status(400).json({
            success: false,
            message: result.message
            });
        }
        } catch (error) {
        console.error('Request vendor status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
        }
    }

    // الحصول على معلومات البائع الحالي
    static async getVendorProfile(req, res) {
        try {
        const userId = req.user.id;

        const result = await VendorService.getVendorProfile(userId);

        if (result.success) {
            return res.status(200).json({
            success: true,
            data: result.data
            });
        } else {
            return res.status(404).json({
            success: false,
            message: result.message
            });
        }
        } catch (error) {
        console.error('Get vendor profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
        }
    }

    // تحديث معلومات البائع
    static async updateVendorProfile(req, res) {
        try {
        const userId = req.user.id;
        const updateData = req.body;

        // إزالة الحقول التي لا يمكن تحديثها
        delete updateData.userId;
        delete updateData.status;
        delete updateData.approvedAt;
        delete updateData.approvedBy;

        const result = await VendorService.updateVendorProfile(userId, updateData);

        if (result.success) {
            return res.status(200).json({
            success: true,
            message: 'Vendor profile updated successfully',
            data: result.data
            });
        } else {
            return res.status(400).json({
            success: false,
            message: result.message
            });
        }
        } catch (error) {
        console.error('Update vendor profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
        }
    }

    // الحصول على حالة طلب البائع
    static async getVendorRequestStatus(req, res) {
        try {
        const userId = req.user.id;

        const result = await VendorService.getVendorRequest(userId);

        if (result.success) {
            return res.status(200).json({
            success: true,
            data: result.data
            });
        } else {
            return res.status(404).json({
            success: false,
            message: 'No vendor request found'
            });
        }
        } catch (error) {
        console.error('Get vendor request status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
        }
    }

    // الحصول على جميع البائعين (للعرض العام)
    static async getAllVendors(req, res) {
        try {
        const { page = 1, limit = 10, search, category } = req.query;

        const result = await VendorService.getAllActiveVendors({
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            category
        });

        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
        } catch (error) {
        console.error('Get all vendors error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
        }
    }

    // الحصول على تفاصيل بائع معين
    static async getVendorById(req, res) {
        try {
        const { vendorId } = req.params;

        const result = await VendorService.getVendorById(vendorId);

        if (result.success) {
            return res.status(200).json({
            success: true,
            data: result.data
            });
        } else {
            return res.status(404).json({
            success: false,
            message: result.message
            });
        }
        } catch (error) {
        console.error('Get vendor by id error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
        }
    }

    // إحصائيات البائع (للبائع نفسه)
    static async getVendorStats(req, res) {
        try {
        const userId = req.user.id;

        const result = await VendorService.getVendorStats(userId);

        if (result.success) {
            return res.status(200).json({
            success: true,
            data: result.data
            });
        } else {
            return res.status(400).json({
            success: false,
            message: result.message
            });
        }
        } catch (error) {
        console.error('Get vendor stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
        }
    }
}

module.exports = VendorController;