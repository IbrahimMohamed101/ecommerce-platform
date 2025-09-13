# API Endpoints Documentation

This document lists all the API endpoints created in the ecommerce platform.

## Super Admin Setup

### Initialization
- **Script**: `init-super-admin.js` - Run this script to create the initial Super Admin account
- **Usage**: `node init-super-admin.js [email] [password]`
- **Environment Variables**: Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` for default credentials
- **Requirements**: Only one Super Admin account exists per system, created via initialization script only
- **RBAC**: Only Super Admin can create Admin accounts
- **Note**: Creates Super Admin in database only. Keycloak user creation should be done separately when the application is running

### Super Admin Account
- Created only through initialization script (no UI or public API)
- Exactly one Super Admin account per system
- Required for creating Admin accounts
- Has access to all Super Admin endpoints

## Authentication Endpoints (/api/auth)

- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/refresh` - Refresh access token
- **POST** `/api/auth/logout` - User logout
- **GET** `/api/auth/profile` - Get current user profile
- **PUT** `/api/auth/change-password` - Change user password

## User Management Endpoints (/api/users)

- **POST** `/api/users/register` - Register new user
- **POST** `/api/users/login` - User login
- **POST** `/api/users/refresh` - Refresh token
- **POST** `/api/users/verify-email` - Verify user email
- **GET** `/api/users/me` - Get current user info
- **PUT** `/api/users/me` - Update user profile
- **DELETE** `/api/users/me` - Delete user account

## Product Endpoints (/api/products)

- **POST** `/api/products/` - Create new product (Vendor only)
- **GET** `/api/products/` - Get products list (Customer only)

## Vendor Endpoints (/api/vendors)

- **GET** `/api/vendors/public` - Get all vendors (Public)
- **GET** `/api/vendors/public/:vendorId` - Get vendor by ID (Public)
- **POST** `/api/vendors/request` - Request vendor status (Customer only)
- **GET** `/api/vendors/request/status` - Get vendor request status (Customer/Vendor)
- **GET** `/api/vendors/profile` - Get vendor profile (Vendor only)
- **PUT** `/api/vendors/profile` - Update vendor profile (Vendor only)
- **GET** `/api/vendors/stats` - Get vendor statistics (Vendor only)

## Admin Endpoints (/api/admin)

- **GET** `/api/admin/users` - Get all users
- **GET** `/api/admin/vendors/pending` - Get pending vendor requests
- **PUT** `/api/admin/vendors/:userId/approve` - Approve or reject vendor request
- **PUT** `/api/admin/users/:userId/role` - Update user role
- **DELETE** `/api/admin/users/:userId` - Delete user
- **GET** `/api/admin/stats` - Get system statistics
- **GET** `/api/admin/monitoring/health` - Get monitoring health status
- **GET** `/api/admin/monitoring/report` - Generate monitoring report
- **GET** `/api/admin/audit/logs` - Query audit logs

## Super Admin Endpoints (/api/super-admin)

**Authentication Required**: All endpoints require SuperAdmin role

- **POST** `/api/super-admin/admins` - Create new admin (SuperAdmin only)
- **GET** `/api/super-admin/admins` - Get all admins (SuperAdmin only)
- **DELETE** `/api/super-admin/admins/:adminId` - Delete admin (SuperAdmin only)
- **PUT** `/api/super-admin/admins/:adminId/status` - Toggle admin status (SuperAdmin only)
- **POST** `/api/super-admin/admins/:adminId/reset-password` - Reset admin password (SuperAdmin only)
- **GET** `/api/super-admin/advanced-stats` - Get advanced statistics (SuperAdmin only)
- **GET** `/api/super-admin/audit-log` - Get audit log (SuperAdmin only)

## General Endpoints

- **GET** `/health` - Health check