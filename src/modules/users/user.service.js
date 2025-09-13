const User = require('./user.model');
const axios = require("axios");
const { sendVerificationEmail, sendAdminVerificationEmail } = require("./email.service");
const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');
const auditLogger = require('../../utils/auditLogger');

const keycloakBaseUrl = process.env.KEYCLOAK_SERVER_URL;
const realm = process.env.KEYCLOAK_REALM;

async function registerUser({ username, email, password }) {
  // 1. Get admin token
  const adminTokenRes = await axios.post(
    `${keycloakBaseUrl}/realms/master/protocol/openid-connect/token`,
    new URLSearchParams({
      client_id: "admin-cli",
      grant_type: "password",
      username: process.env.KEYCLOAK_ADMIN_USERNAME,
      password: process.env.KEYCLOAK_ADMIN_PASSWORD,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const adminToken = adminTokenRes.data.access_token;

  // 2. Create the user (emailVerified: false)
  const createUserRes = await axios.post(
    `${keycloakBaseUrl}/admin/realms/${realm}/users`,
    {
      username,
      email,
      enabled: true,
      emailVerified: false, // ❌ غير مفعل
      credentials: [{ type: "password", value: password, temporary: false }],
    },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  // 3. Get the user ID from location header
  const userLocation = createUserRes.headers.location;
  const userId = userLocation.split("/").pop();

  // 4. إنشاء token مخصص للتحقق
  const verificationToken = jwt.sign(
    { 
      userId, 
      email, 
      purpose: 'email_verification' 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '12h' }
  );

  // 5. إرسال الإيميل المخصص بدلاً من Keycloak
  await sendAdminVerificationEmail(email, verificationToken, username);

  return { message: "User created successfully and verification email sent." };
}

// دالة للتحقق من الإيميل
async function verifyEmail(token) {
  try {
    // فك تشفير الـ token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    if (decoded.purpose !== 'email_verification') {
      throw new Error('Invalid token purpose');
    }

    // الحصول على admin token
    const adminTokenRes = await axios.post(
      `${keycloakBaseUrl}/realms/master/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: "admin-cli",
        grant_type: "password",
        username: process.env.KEYCLOAK_ADMIN_USERNAME,
        password: process.env.KEYCLOAK_ADMIN_PASSWORD,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const adminToken = adminTokenRes.data.access_token;

    // تفعيل الإيميل في Keycloak
    await axios.put(
      `${keycloakBaseUrl}/admin/realms/${realm}/users/${decoded.userId}`,
      {
        emailVerified: true
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // تحديث قاعدة البيانات المحلية
    const user = await User.findOneAndUpdate(
      { keycloakId: decoded.userId },
      { emailVerified: true, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      logger.authError('User not found in local database during email verification', { keycloakId: decoded.userId });
    } else {
      logger.auth('User email verified in local database', { userId: user._id, email: user.email });
    }

    return { success: true, message: "Email verified successfully." };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Verification token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid verification token');
    }
    throw error;
  }
}

async function loginWithEmail({ email, password }) {
  try {
    // First, try to get tokens directly using password grant
    const tokenRes = await axios.post(
      `${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        grant_type: 'password',
        username: email,  // Try with email as username first
        password: password,
      }),
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    );

    return {
      access_token: tokenRes.data.access_token,
      refresh_token: tokenRes.data.refresh_token,
      expires_in: tokenRes.data.expires_in,
      refresh_expires_in: tokenRes.data.refresh_expires_in
    };
  } catch (error) {
    console.error('Login error (direct grant):', error.response?.data || error.message);
    
    // If direct grant with email fails, try getting username from admin API
    try {
      // Get admin token
      const adminTokenRes = await axios.post(
        `${keycloakBaseUrl}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          client_id: "admin-cli",
          grant_type: "password",
          username: process.env.KEYCLOAK_ADMIN_USERNAME,
          password: process.env.KEYCLOAK_ADMIN_PASSWORD,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const adminToken = adminTokenRes.data.access_token;

      // Search for user by email
      const usersRes = await axios.get(
        `${keycloakBaseUrl}/admin/realms/${realm}/users?email=${encodeURIComponent(email)}`,
        { 
          headers: { 
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (!usersRes.data || usersRes.data.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = usersRes.data[0];
      
      // Try direct grant with username
      const tokenRes = await axios.post(
        `${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          client_id: process.env.KEYCLOAK_CLIENT_ID,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
          grant_type: 'password',
          username: user.username,  // Use username from Keycloak
          password: password,
        }),
        { 
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );

      return {
        access_token: tokenRes.data.access_token,
        refresh_token: tokenRes.data.refresh_token,
        expires_in: tokenRes.data.expires_in,
        refresh_expires_in: tokenRes.data.refresh_expires_in
      };
    } catch (adminError) {
      console.error('Login error (with admin fallback):', adminError.response?.data || adminError.message);
      throw new Error('Invalid email or password');
    }
  }
}

async function createUser(userData) {
  try {
    logger.auth('Creating user in database', { email: userData.email, username: userData.username });

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { username: userData.username },
        { keycloakId: userData.keycloakId }
      ]
    });

    if (existingUser) {
      logger.authError('User already exists', { email: userData.email, username: userData.username });
      return {
        success: false,
        message: 'User with this email, username, or Keycloak ID already exists'
      };
    }

    // Create new user
    const user = new User({
      email: userData.email,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'Customer',
      status: userData.status || 'active',
      keycloakId: userData.keycloakId,
      emailVerified: userData.emailVerified || false
    });

    const savedUser = await user.save();

    logger.auth('User created successfully in database', {
      userId: savedUser._id,
      email: savedUser.email,
      username: savedUser.username
    });

    return {
      success: true,
      data: {
        id: savedUser._id,
        email: savedUser.email,
        username: savedUser.username,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        status: savedUser.status,
        keycloakId: savedUser.keycloakId,
        emailVerified: savedUser.emailVerified,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt
      }
    };
  } catch (error) {
    logger.authError('User creation failed', {
      email: userData.email,
      username: userData.username,
      error: error.message,
      errorName: error.name
    });

    // Handle Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }

      return {
        success: false,
        message: 'Validation failed for user data',
        errors: validationErrors,
        details: 'Please check the provided user data and ensure all required fields are valid'
      };
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return {
        success: false,
        message: `User with ${field} '${value}' already exists`,
        details: `A user with this ${field} is already registered. Please use a different ${field} or try logging in.`
      };
    }

    // Handle other database errors
    return {
      success: false,
      message: 'Database error occurred while creating user',
      details: 'Please try again later or contact support if the problem persists'
    };
  }
}

async function getUserById(userId) {
  try {
    logger.auth('Retrieving user by ID', { userId });

    // First try to find by keycloakId (since middleware provides Keycloak user ID)
    let user = await User.findOne({ keycloakId: userId });

    // If not found, try to find by MongoDB ObjectId (for backward compatibility)
    if (!user) {
      user = await User.findById(userId);
    }

    if (!user) {
      logger.authError('User not found', { userId });
      return {
        success: false,
        message: 'User not found'
      };
    }

    logger.auth('User retrieved successfully', { userId, email: user.email });

    return {
      success: true,
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        keycloakId: user.keycloakId,
        emailVerified: user.emailVerified,
        phone: user.phone,
        address: user.address,
        profileImage: user.profileImage,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    };
  } catch (error) {
    logger.authError('User retrieval failed', { userId, error: error.message });
    return {
      success: false,
      message: 'Failed to retrieve user'
    };
  }
}

async function getAllUsers(filters = {}) {
  try {
    logger.auth('Retrieving all users with filters', { filters });

    // Build query object
    const query = {};

    // Apply role filter if specified
    if (filters.role) {
      query.role = filters.role;
    }

    // Apply status filter if specified
    if (filters.status) {
      query.status = filters.status;
    }

    // Apply email search if specified
    if (filters.email) {
      query.email = { $regex: filters.email, $options: 'i' };
    }

    // Apply username search if specified
    if (filters.username) {
      query.username = { $regex: filters.username, $options: 'i' };
    }

    // Apply date range filters if specified
    if (filters.createdAfter) {
      query.createdAt = { ...query.createdAt, $gte: new Date(filters.createdAfter) };
    }
    if (filters.createdBefore) {
      query.createdAt = { ...query.createdAt, $lte: new Date(filters.createdBefore) };
    }

    // Set pagination defaults
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Execute query with pagination and sorting
    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform data to match expected format
    const transformedUsers = users.map(user => ({
      id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      keycloakId: user.keycloakId,
      emailVerified: user.emailVerified,
      phone: user.phone,
      address: user.address,
      profileImage: user.profileImage,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    logger.auth('Users retrieved successfully', { count: transformedUsers.length, total, page, limit });

    return {
      success: true,
      data: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    };
  } catch (error) {
    logger.authError('User listing failed', { filters, error: error.message });
    return {
      success: false,
      message: 'Failed to retrieve users'
    };
  }
}

async function updateUser(userId, updates) {
  try {
    logger.auth('Updating user in database', { userId, updates: Object.keys(updates) });

    // Find the user first (by keycloakId or MongoDB ObjectId)
    let user = await User.findOne({ keycloakId: userId });

    // If not found, try to find by MongoDB ObjectId (for backward compatibility)
    if (!user) {
      user = await User.findById(userId);
    }

    if (!user) {
      logger.authError('User not found for update', { userId });
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Update the user fields
    Object.keys(updates).forEach(key => {
      user[key] = updates[key];
    });
    user.updatedAt = new Date();

    // Save with validation
    await user.save();

    logger.auth('User updated successfully in database', {
      userId: user._id,
      email: user.email,
      updatedFields: Object.keys(updates)
    });

    return {
      success: true,
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        keycloakId: user.keycloakId,
        emailVerified: user.emailVerified,
        phone: user.phone,
        address: user.address,
        profileImage: user.profileImage,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    };
  } catch (error) {
    logger.authError('User update failed', {
      userId,
      updates: Object.keys(updates),
      error: error.message,
      errorName: error.name
    });

    // Handle specific database errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }

      return {
        success: false,
        message: 'Validation failed for user update',
        errors: validationErrors,
        details: 'Please check the provided update data and ensure all fields are valid'
      };
    }

    if (error.name === 'CastError') {
      return {
        success: false,
        message: 'Invalid user ID format'
      };
    }

    return {
      success: false,
      message: 'Failed to update user',
      details: 'Please try again later or contact support if the problem persists'
    };
  }
}

async function deleteUser(userId) {
  try {
    logger.auth('Attempting user deletion', { userId });

    // In development, simulate user deletion
    if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
      console.log('Development mode: Simulating user deletion from database');
      return {
        success: true,
        message: 'User deleted successfully'
      };
    }

    // Find the user first (by keycloakId or MongoDB ObjectId)
    let user = await User.findOne({ keycloakId: userId });

    // If not found, try to find by MongoDB ObjectId (for backward compatibility)
    if (!user) {
      user = await User.findById(userId);
    }

    if (!user) {
      logger.authError('User not found for deletion', { userId });
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Delete user from Keycloak first
    if (user.keycloakId) {
      const AuthService = require('../auth/auth.service');
      const keycloakDeleteResult = await AuthService.deleteUser(user.keycloakId);

      if (!keycloakDeleteResult.success) {
        logger.authError('Failed to delete user from Keycloak', {
          userId: user._id,
          keycloakId: user.keycloakId,
          error: keycloakDeleteResult.message
        });
        // Continue with local database deletion even if Keycloak deletion fails
      } else {
        logger.auth('User deleted successfully from Keycloak', {
          userId: user._id,
          keycloakId: user.keycloakId
        });
      }
    }

    // Delete user from local database
    await User.findByIdAndDelete(user._id);

    logger.auth('User deleted successfully from database', {
      userId: user._id,
      email: user.email,
      username: user.username
    });

    return {
      success: true,
      message: 'User deleted successfully'
    };
  } catch (error) {
    logger.authError('User deletion failed', {
      userId,
      error: error.message,
      errorName: error.name
    });

    // Handle specific database errors
    if (error.name === 'CastError') {
      return {
        success: false,
        message: 'Invalid user ID format'
      };
    }

    return {
      success: false,
      message: 'Failed to delete user'
    };
  }
}

async function generateResetToken(email) {
  try {
    logger.auth('Generating reset token for user', { email });

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      logger.authError('User not found for password reset', { email });
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token for storage
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token expiry (1 hour from now)
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    logger.auth('Reset token generated successfully', { userId: user._id, email });

    return {
      success: true,
      data: {
        resetToken: resetToken, // Return the unhashed token for email
        userId: user._id,
        email: user.email
      }
    };
  } catch (error) {
    logger.authError('Failed to generate reset token', { email, error: error.message });
    return {
      success: false,
      message: 'Failed to generate reset token'
    };
  }
}

async function resetPassword(token, newPassword) {
  try {
    logger.auth('Attempting password reset with token');

    // Hash the provided token
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      logger.authError('Invalid or expired reset token');
      return {
        success: false,
        message: 'Invalid or expired reset token'
      };
    }

    // Update password in Keycloak
    const AuthService = require('../auth/auth.service');
    const changeResult = await AuthService.changePassword(user.keycloakId, newPassword);

    if (!changeResult.success) {
      logger.authError('Failed to update password in Keycloak', {
        userId: user._id,
        reason: changeResult.message
      });
      return {
        success: false,
        message: 'Failed to update password'
      };
    }

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.auth('Password reset successfully', { userId: user._id, email: user.email });

    return {
      success: true,
      message: 'Password reset successfully'
    };
  } catch (error) {
    logger.authError('Password reset failed', { error: error.message });
    return {
      success: false,
      message: 'Failed to reset password'
    };
  }
}

async function addToCart(userId, productId, variantId, quantity, price) {
  try {
    logger.auth('Adding item to cart', { userId, productId, quantity });

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await user.addToCart(productId, variantId, quantity, price);

    logger.auth('Item added to cart successfully', { userId, productId });
    return { success: true, message: 'Item added to cart', data: user.cart };
  } catch (error) {
    logger.authError('Failed to add item to cart', { userId, productId, error: error.message });
    return { success: false, message: 'Failed to add item to cart' };
  }
}

async function removeFromCart(userId, productId, variantId) {
  try {
    logger.auth('Removing item from cart', { userId, productId });

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await user.removeFromCart(productId, variantId);

    logger.auth('Item removed from cart successfully', { userId, productId });
    return { success: true, message: 'Item removed from cart', data: user.cart };
  } catch (error) {
    logger.authError('Failed to remove item from cart', { userId, productId, error: error.message });
    return { success: false, message: 'Failed to remove item from cart' };
  }
}

async function getCart(userId) {
  try {
    const user = await User.findById(userId).populate('cart.items.productId', 'name price images');
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    return {
      success: true,
      data: {
        items: user.cart?.items || [],
        subtotal: user.cart?.subtotal || 0,
        discount: user.cart?.discount || 0,
        tax: user.cart?.tax || 0,
        total: user.cart?.total || 0,
        itemCount: user.cartItemCount
      }
    };
  } catch (error) {
    logger.authError('Failed to get cart', { userId, error: error.message });
    return { success: false, message: 'Failed to get cart' };
  }
}

async function clearCart(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await user.clearCart();

    logger.auth('Cart cleared successfully', { userId });
    return { success: true, message: 'Cart cleared successfully' };
  } catch (error) {
    logger.authError('Failed to clear cart', { userId, error: error.message });
    return { success: false, message: 'Failed to clear cart' };
  }
}

async function addToWishlist(userId, productId) {
  try {
    logger.auth('Adding item to wishlist', { userId, productId });

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await user.addToWishlist(productId);

    logger.auth('Item added to wishlist successfully', { userId, productId });
    return { success: true, message: 'Item added to wishlist' };
  } catch (error) {
    logger.authError('Failed to add item to wishlist', { userId, productId, error: error.message });
    return { success: false, message: 'Failed to add item to wishlist' };
  }
}

async function removeFromWishlist(userId, productId) {
  try {
    logger.auth('Removing item from wishlist', { userId, productId });

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await user.removeFromWishlist(productId);

    logger.auth('Item removed from wishlist successfully', { userId, productId });
    return { success: true, message: 'Item removed from wishlist' };
  } catch (error) {
    logger.authError('Failed to remove item from wishlist', { userId, productId, error: error.message });
    return { success: false, message: 'Failed to remove item from wishlist' };
  }
}

async function getWishlist(userId) {
  try {
    const user = await User.findById(userId).populate('wishlist.productId', 'name price images category');
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    return {
      success: true,
      data: user.wishlist || []
    };
  } catch (error) {
    logger.authError('Failed to get wishlist', { userId, error: error.message });
    return { success: false, message: 'Failed to get wishlist' };
  }
}

async function addLoyaltyPoints(userId, points, reason = 'purchase') {
  try {
    logger.auth('Adding loyalty points', { userId, points, reason });

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await user.addLoyaltyPoints(points);

    logger.auth('Loyalty points added successfully', { userId, points, newTotal: user.loyaltyPoints.current });
    return {
      success: true,
      message: 'Loyalty points added successfully',
      data: user.loyaltyPoints
    };
  } catch (error) {
    logger.authError('Failed to add loyalty points', { userId, points, error: error.message });
    return { success: false, message: 'Failed to add loyalty points' };
  }
}

async function updateUserPreferences(userId, preferences) {
  try {
    logger.auth('Updating user preferences', { userId });

    const allowedFields = [
      'currency', 'language', 'timezone', 'marketingPreferences',
      'gender', 'dateOfBirth', 'secondaryEmail'
    ];

    const updateData = {};
    Object.keys(preferences).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = preferences[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    logger.auth('User preferences updated successfully', { userId });
    return { success: true, message: 'Preferences updated successfully', data: user };
  } catch (error) {
    logger.authError('Failed to update user preferences', { userId, error: error.message });
    return { success: false, message: 'Failed to update preferences' };
  }
}

async function addShippingAddress(userId, addressData) {
  try {
    logger.auth('Adding shipping address', { userId });

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // If this is the first address or marked as default, unset other defaults
    if (addressData.isDefault || !user.shippingAddresses?.length) {
      if (user.shippingAddresses) {
        user.shippingAddresses.forEach(addr => addr.isDefault = false);
      }
      addressData.isDefault = true;
    }

    if (!user.shippingAddresses) {
      user.shippingAddresses = [];
    }

    user.shippingAddresses.push({
      ...addressData,
      createdAt: new Date()
    });

    await user.save();

    logger.auth('Shipping address added successfully', { userId });
    return { success: true, message: 'Shipping address added successfully', data: user.shippingAddresses };
  } catch (error) {
    logger.authError('Failed to add shipping address', { userId, error: error.message });
    return { success: false, message: 'Failed to add shipping address' };
  }
}

async function getUserStats(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const stats = {
      accountAge: user.accountAge,
      totalOrders: user.purchaseStats?.totalOrders || 0,
      totalSpent: user.purchaseStats?.totalSpent || 0,
      averageOrderValue: user.purchaseStats?.averageOrderValue || 0,
      loyaltyPoints: user.loyaltyPoints?.current || 0,
      loyaltyTier: user.loyaltyPoints?.tier || 'Bronze',
      cartItemCount: user.cartItemCount,
      wishlistCount: user.wishlist?.length || 0,
      referralCount: user.referralCount || 0,
      lastLogin: user.lastLogin,
      memberSince: user.createdAt
    };

    return { success: true, data: stats };
  } catch (error) {
    logger.authError('Failed to get user stats', { userId, error: error.message });
    return { success: false, message: 'Failed to get user stats' };
  }
}

async function sendVerificationEmailToUser(email, token, username) {
  try {
    const { sendVerificationEmail } = require("./email.service");
    await sendVerificationEmail(email, token, username);
    return { success: true, message: 'Verification email sent successfully' };
  } catch (error) {
    logger.authError('Failed to send verification email', { email, error: error.message });
    return { success: false, message: 'Failed to send verification email' };
  }
}

async function logAuditAction({ action, performedBy, targetUserId, details }) {
  try {
    await auditLogger.logAuthEvent(action, {
      performedBy,
      targetUserId,
      details
    });
    return { success: true };
  } catch (error) {
    logger.authError('Failed to log audit action', { action, error: error.message });
    return { success: false, message: 'Failed to log audit action' };
  }
}

async function getAuditLog(filters = {}) {
  try {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = filters;

    const queryFilters = {};
    if (action) queryFilters.eventType = action;
    if (userId) queryFilters.userId = userId;
    if (startDate) queryFilters.startDate = startDate;
    if (endDate) queryFilters.endDate = endDate;

    const logs = await auditLogger.queryAuditLogs(queryFilters, limit);

    // Calculate pagination
    const total = logs.length; // Note: queryAuditLogs doesn't return total, this is simplified
    const pages = Math.ceil(total / limit);

    return {
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    };
  } catch (error) {
    logger.authError('Failed to get audit log', { error: error.message });
    return { success: false, message: 'Failed to get audit log' };
  }
}

async function getAdvancedSystemStats() {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get total admins count
    const totalAdmins = await User.countDocuments({ role: 'Admin' });

    // Get active users count
    const activeUsers = await User.countDocuments({ status: 'active' });

    // Get SuperAdmin count
    const totalSuperAdmins = await User.countDocuments({ role: 'SuperAdmin' });

    // Get users by status
    const usersByStatus = await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get email verification stats
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    const unverifiedUsers = await User.countDocuments({ emailVerified: false });

    const stats = {
      totalUsers,
      totalAdmins,
      totalSuperAdmins,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      recentRegistrations,
      verifiedUsers,
      unverifiedUsers,
      verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0,
      usersByStatus: usersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      totalOrders: 0, // Placeholder - would need orders collection
      totalRevenue: 0, // Placeholder - would need orders collection
      systemHealth: 'OK'
    };

    logger.auth('Advanced system stats retrieved successfully', { totalUsers, totalAdmins });

    return stats;
  } catch (error) {
    logger.authError('Failed to get advanced system stats', { error: error.message });
    return {
      totalUsers: 0,
      totalAdmins: 0,
      totalOrders: 0,
      totalRevenue: 0,
      activeUsers: 0,
      systemHealth: 'ERROR'
    };
  }
}

module.exports = {
  registerUser,
  verifyEmail,
  loginWithEmail,
  createUser,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  generateResetToken,
  resetPassword,
  sendVerificationEmail: sendVerificationEmailToUser,
  addToCart,
  removeFromCart,
  getCart,
  clearCart,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  addLoyaltyPoints,
  updateUserPreferences,
  addShippingAddress,
  getUserStats,
  logAuditAction,
  getAuditLog,
  getAdvancedSystemStats,
};