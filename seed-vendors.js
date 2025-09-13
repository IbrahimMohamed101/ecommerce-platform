#!/usr/bin/env node

/**
 * Vendor Seeding Script
 *
 * This script creates sample vendor data for testing the ecommerce platform.
 * It creates active vendors that can be retrieved via the /api/vendors/public endpoint.
 *
 * Usage:
 *   node seed-vendors.js
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { VendorProfile } = require('./src/modules/vendor/vendor.model');
const User = require('./src/modules/users/user.model');

// Sample vendor data
const sampleVendors = [
  {
    businessName: 'TechHub Electronics',
    businessDescription: 'Your one-stop shop for the latest electronics and gadgets. We offer competitive prices and excellent customer service.',
    businessAddress: '123 Tech Street, Silicon Valley, CA 94043',
    businessPhone: '+1-555-0101',
    businessEmail: 'contact@techhub.com',
    businessLicense: 'TECH123456',
    taxNumber: 'TXN789012',
    businessType: 'company',
    website: 'https://techhub.com',
    categories: ['Electronics', 'Computers', 'Mobile Phones'],
    tags: ['gadgets', 'laptops', 'smartphones', 'accessories'],
    rating: { average: 4.5, count: 128 },
    stats: {
      totalProducts: 250,
      totalOrders: 89,
      totalRevenue: 45000,
      totalCustomers: 67
    },
    isVerified: true,
    status: 'active'
  },
  {
    businessName: 'Fashion Forward',
    businessDescription: 'Trendy clothing and accessories for men and women. Discover the latest fashion trends with our curated collection.',
    businessAddress: '456 Fashion Ave, New York, NY 10001',
    businessPhone: '+1-555-0202',
    businessEmail: 'info@fashionforward.com',
    businessLicense: 'FASH654321',
    taxNumber: 'TXN345678',
    businessType: 'company',
    website: 'https://fashionforward.com',
    categories: ['Clothing', 'Fashion', 'Accessories'],
    tags: ['trendy', 'designer', 'casual', 'formal'],
    rating: { average: 4.2, count: 95 },
    stats: {
      totalProducts: 180,
      totalOrders: 156,
      totalRevenue: 32000,
      totalCustomers: 89
    },
    isVerified: true,
    status: 'active'
  },
  {
    businessName: 'Green Garden Supplies',
    businessDescription: 'Everything you need for your garden. From seeds to tools, we help you create your perfect outdoor space.',
    businessAddress: '789 Garden Lane, Portland, OR 97201',
    businessPhone: '+1-555-0303',
    businessEmail: 'support@greengarden.com',
    businessLicense: 'GARD987654',
    taxNumber: 'TXN567890',
    businessType: 'individual',
    website: 'https://greengarden.com',
    categories: ['Gardening', 'Home & Garden', 'Tools'],
    tags: ['plants', 'seeds', 'tools', 'outdoor'],
    rating: { average: 4.7, count: 73 },
    stats: {
      totalProducts: 95,
      totalOrders: 42,
      totalRevenue: 15800,
      totalCustomers: 38
    },
    isVerified: true,
    status: 'active'
  },
  {
    businessName: 'BookWorld',
    businessDescription: 'A paradise for book lovers. Find your next great read from our extensive collection of books across all genres.',
    businessAddress: '321 Literature St, Boston, MA 02101',
    businessPhone: '+1-555-0404',
    businessEmail: 'orders@bookworld.com',
    businessLicense: 'BOOK456789',
    taxNumber: 'TXN123456',
    businessType: 'company',
    website: 'https://bookworld.com',
    categories: ['Books', 'Education', 'Literature'],
    tags: ['fiction', 'non-fiction', 'textbooks', 'novels'],
    rating: { average: 4.8, count: 201 },
    stats: {
      totalProducts: 1200,
      totalOrders: 312,
      totalRevenue: 67800,
      totalCustomers: 156
    },
    isVerified: true,
    status: 'active'
  },
  {
    businessName: 'Healthy Bites',
    businessDescription: 'Organic and healthy food products. We source the finest ingredients to bring you nutritious meals and snacks.',
    businessAddress: '654 Health Blvd, Austin, TX 78701',
    businessPhone: '+1-555-0505',
    businessEmail: 'nutrition@healthybites.com',
    businessLicense: 'HLTH112233',
    taxNumber: 'TXN445566',
    businessType: 'company',
    website: 'https://healthybites.com',
    categories: ['Food', 'Health', 'Organic'],
    tags: ['organic', 'healthy', 'nutrition', 'snacks'],
    rating: { average: 4.3, count: 67 },
    stats: {
      totalProducts: 75,
      totalOrders: 98,
      totalRevenue: 22100,
      totalCustomers: 54
    },
    isVerified: true,
    status: 'active'
  }
];

async function seedVendors() {
  try {
    console.log('🌱 Starting vendor seeding process...');

    // Validate environment variables
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
    console.log('📡 Connecting to database...');

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to database');

    // Check if vendors already exist
    const existingVendors = await VendorProfile.countDocuments();
    if (existingVendors > 0) {
      console.log(`ℹ️  ${existingVendors} vendors already exist in the database`);
      console.log('❓ Do you want to add more sample vendors? (y/n)');

      // For now, we'll skip if vendors exist
      console.log('💡 Skipping seeding to avoid duplicates');
      console.log('✅ Seeding process complete');
      return;
    }

    console.log('👤 Creating sample vendors...');

    // Create a dummy user for vendors (since vendors need a userId reference)
    // In a real scenario, these would be actual users
    const dummyUser = new User({
      email: 'vendor@example.com',
      firstName: 'Sample',
      lastName: 'Vendor',
      username: 'samplevendor',
      role: 'Vendor',
      status: 'active',
      keycloakId: 'sample-keycloak-id',
      emailVerified: true
    });

    const savedUser = await dummyUser.save();
    console.log('✅ Created dummy user for vendors');

    // Create vendors
    const createdVendors = [];
    for (const vendorData of sampleVendors) {
      const vendor = new VendorProfile({
        ...vendorData,
        userId: savedUser._id,
        approvedAt: new Date(),
        verifiedAt: new Date()
      });

      const savedVendor = await vendor.save();
      createdVendors.push(savedVendor);
      console.log(`✅ Created vendor: ${vendorData.businessName}`);
    }

    console.log(`🎉 Successfully seeded ${createdVendors.length} vendors!`);
    console.log('\n📊 Seeded Vendors:');
    createdVendors.forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.businessName} (${vendor.categories.join(', ')})`);
    });

    console.log('\n🚀 You can now test the /api/vendors/public endpoint');
    console.log('   It should return the seeded vendors with pagination');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('📡 Database connection closed');
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, closing database connection...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, closing database connection...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

// Run the seeding
if (require.main === module) {
  seedVendors();
}

module.exports = { seedVendors };