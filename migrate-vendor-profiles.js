const mongoose = require('mongoose');
const { VendorRequest, VendorProfile } = require('./src/modules/vendor/vendor.model');
require('dotenv').config();

async function migrateVendorProfiles() {
try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all approved vendor requests
    const approvedRequests = await VendorRequest.find({ status: 'approved' });
    console.log(`Found ${approvedRequests.length} approved vendor requests`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const request of approvedRequests) {
      // Check if VendorProfile already exists
    const existingProfile = await VendorProfile.findOne({ userId: request.userId });

    if (!existingProfile) {
        // Create VendorProfile
        const vendorProfile = new VendorProfile({
            userId: request.userId,
            businessName: request.businessName,
            businessDescription: request.businessDescription,
            businessAddress: request.businessAddress,
            businessPhone: request.businessPhone,
            businessEmail: request.businessEmail,
            businessLicense: request.businessLicense,
            taxNumber: request.taxNumber,
            approvedAt: request.reviewedAt || new Date(),
            approvedBy: request.reviewedBy
        });

        await vendorProfile.save();
        console.log(`Created VendorProfile for: ${request.businessName}`);
        createdCount++;
    } else {
        console.log(`VendorProfile already exists for: ${request.businessName}`);
        skippedCount++;
    }
    }

    console.log(`Migration completed: ${createdCount} created, ${skippedCount} skipped`);

} catch (error) {
    console.error('Migration error:', error);
} finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
}
}

migrateVendorProfiles();