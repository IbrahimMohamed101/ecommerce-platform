#!/usr/bin/env node

/**
 * Super Admin Initialization Script
 *
 * This script creates the initial Super Admin account for the ecommerce platform.
 * It ensures only one Super Admin exists and is idempotent.
 *
 * Usage:
 *   node init-super-admin.js [email] [password]
 *
 * Or set environment variables:
 *   SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD
 *
 * The script will use command line arguments if provided, otherwise fall back to env vars.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const axios = require('axios');
const User = require('./src/modules/users/user.model');
const UserService = require('./src/modules/users/user.service');

// Keycloak configuration
const KEYCLOAK_CONFIG = {
  serverUrl: process.env.KEYCLOAK_SERVER_URL || 'http://localhost:8080',
  realm: process.env.KEYCLOAK_REALM || 'ecommerce',
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'ecommerce-platform',
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
  adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
  adminClientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
  adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME,
  adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD
};

// Default Super Admin credentials
const DEFAULT_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'hemaatar4@gmail.com';
const DEFAULT_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || '011461519790sS@';

// Keycloak Admin API helper functions
async function getAdminToken() {
  try {
    const tokenUrl = `${KEYCLOAK_CONFIG.serverUrl}/realms/master/protocol/openid-connect/token`;

    const response = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'password',
      client_id: KEYCLOAK_CONFIG.adminClientId,
      client_secret: KEYCLOAK_CONFIG.adminClientSecret,
      username: KEYCLOAK_CONFIG.adminUsername,
      password: KEYCLOAK_CONFIG.adminPassword
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('❌ Failed to get admin token from Keycloak:', error.message);
    throw new Error('Keycloak authentication failed. Please check your admin credentials and server availability.');
  }
}

async function createUserInKeycloak(adminToken, userData) {
  try {
    const usersUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users`;

    const response = await axios.post(usersUrl, {
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      enabled: true,
      emailVerified: true
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Get the user ID from the Location header
    const location = response.headers.location;
    const userId = location.split('/').pop();

    return userId;
  } catch (error) {
    console.error('❌ Failed to create user in Keycloak:', error.response?.data || error.message);
    throw error;
  }
}

async function setUserPassword(adminToken, userId, password) {
  try {
    const passwordUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users/${userId}/reset-password`;

    await axios.put(passwordUrl, {
      type: 'password',
      value: password,
      temporary: false
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ User password set in Keycloak');
  } catch (error) {
    console.error('❌ Failed to set user password in Keycloak:', error.response?.data || error.message);
    throw error;
  }
}

async function getRoleId(adminToken, roleName) {
  try {
    const rolesUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles`;

    const response = await axios.get(rolesUrl, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const role = response.data.find(r => r.name === roleName);
    if (!role) {
      throw new Error(`Role '${roleName}' not found in Keycloak realm`);
    }

    return role.id;
  } catch (error) {
    console.error('❌ Failed to get role ID from Keycloak:', error.response?.data || error.message);
    throw error;
  }
}

async function assignRoleToUser(adminToken, userId, roleId) {
  try {
    const roleMappingUrl = `${KEYCLOAK_CONFIG.serverUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users/${userId}/role-mappings/realm`;

    await axios.post(roleMappingUrl, [{
      id: roleId,
      name: 'SuperAdmin'
    }], {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ SuperAdmin role assigned to user in Keycloak');
  } catch (error) {
    console.error('❌ Failed to assign role to user in Keycloak:', error.response?.data || error.message);
    throw error;
  }
}

async function initializeSuperAdmin() {
  try {
    console.log('🔧 Initializing Super Admin account...');

    // Validate required environment variables
    const requiredEnvVars = [
      'KEYCLOAK_SERVER_URL',
      'KEYCLOAK_REALM',
      'KEYCLOAK_CLIENT_ID',
      'KEYCLOAK_CLIENT_SECRET',
      'KEYCLOAK_ADMIN_CLIENT_ID',
      'KEYCLOAK_ADMIN_CLIENT_SECRET',
      'KEYCLOAK_ADMIN_USERNAME',
      'KEYCLOAK_ADMIN_PASSWORD',
      'SUPER_ADMIN_EMAIL',
      'SUPER_ADMIN_PASSWORD',
      'MONGODB_URI'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.log('💡 Please set these in your .env file or environment');
      process.exit(1);
    }

    // Get email and password from command line arguments or environment variables
    const email = process.argv[2] || DEFAULT_EMAIL;
    const password = process.argv[3] || DEFAULT_PASSWORD;

    // Validate inputs
    if (!email || !password) {
      console.error('❌ Error: Email and password are required');
      console.log('Usage: node init-super-admin.js [email] [password]');
      console.log('Or set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables');
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Error: Invalid email format');
      process.exit(1);
    }

    // Validate password strength
    if (password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters long');
      process.exit(1);
    }

    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
    console.log('📡 Connecting to database...');

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to database');

    // Check if Super Admin already exists
    console.log('🔍 Checking for existing Super Admin...');
    const existingSuperAdmin = await User.findOne({ role: 'SuperAdmin' });

    if (existingSuperAdmin) {
      console.log('ℹ️  Super Admin already exists:');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Created: ${existingSuperAdmin.createdAt}`);
      console.log('✅ Initialization complete (no action needed)');
      return;
    }

    console.log('🔐 Connecting to Keycloak...');

    // Get admin token from Keycloak
    let adminToken;
    try {
      adminToken = await getAdminToken();
      console.log('✅ Connected to Keycloak');
    } catch (error) {
      console.error('❌ Keycloak connection failed:', error.message);
      console.log('💡 Please ensure Keycloak is running and admin credentials are correct');
      process.exit(1);
    }

    console.log('👤 Creating Super Admin account in Keycloak...');

    // Create user in Keycloak
    const userData = {
      username: email,
      email: email,
      firstName: 'Super',
      lastName: 'Admin'
    };

    let keycloakId;
    try {
      keycloakId = await createUserInKeycloak(adminToken, userData);
      console.log(`✅ User created in Keycloak with ID: ${keycloakId}`);
    } catch (error) {
      console.error('❌ Failed to create user in Keycloak:', error.message);
      process.exit(1);
    }

    // Set user password in Keycloak
    try {
      await setUserPassword(adminToken, keycloakId, password);
    } catch (error) {
      console.error('❌ Failed to set password in Keycloak:', error.message);
      process.exit(1);
    }

    // Get SuperAdmin role ID
    let roleId;
    try {
      roleId = await getRoleId(adminToken, 'SuperAdmin');
      console.log(`✅ Found SuperAdmin role with ID: ${roleId}`);
    } catch (error) {
      console.error('❌ Failed to get SuperAdmin role:', error.message);
      console.log('💡 Please ensure the SuperAdmin role exists in your Keycloak realm');
      process.exit(1);
    }

    // Assign SuperAdmin role to user
    try {
      await assignRoleToUser(adminToken, keycloakId, roleId);
    } catch (error) {
      console.error('❌ Failed to assign SuperAdmin role:', error.message);
      process.exit(1);
    }

    console.log('💾 Storing Super Admin in database...');

    // Create Super Admin in local database
    const userResult = await UserService.createUser({
      email: email,
      firstName: 'Super',
      lastName: 'Admin',
      username: email,
      role: 'SuperAdmin',
      status: 'active',
      keycloakId: keycloakId,
      emailVerified: true
    });

    if (!userResult.success) {
      console.error('❌ Failed to create Super Admin in database:', userResult.message);
      process.exit(1);
    }

    console.log('✅ Super Admin stored in database');
    console.log('🎉 Super Admin initialization successful!');
    console.log(`   Email: ${email}`);
    console.log(`   Keycloak ID: ${keycloakId}`);
    console.log(`   Role: SuperAdmin`);
    console.log('⚠️  Please change the default password after first login');

  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
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

// Run the initialization
if (require.main === module) {
  initializeSuperAdmin();
}

module.exports = { initializeSuperAdmin };