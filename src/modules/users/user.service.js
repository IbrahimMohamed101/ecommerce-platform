const User = require('./user.model');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendPasswordResetEmail } = require("./email.service");
const logger = require('../../utils/logger');
const auditLogger = require('../../utils/auditLogger');
const { uploadFromBuffer, deleteImage, getOptimizedUrl } = require('../../utils/cloudinary');

async function registerUser({ username, email, password, firstName, lastName }) {
  try {
    logger.auth('Attempting user registration', { email, username });

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username }
      ]
    });

    if (existingUser) {
      logger.authError('Registration failed - user exists', { email, username });
      return {
        success: false,
        message: 'User with this email or username already exists'
      };
    }

    // Create new user
    const user = new User({
      email,
      username,
      password,
      firstName,
      lastName,
      role: 'Customer',
      status: 'active',
      emailVerified: false
    });

    await user.save();

    // Generate email verification token
    const verificationToken = jwt.sign(
      { userId: user._id, email: user.email, type: 'email_verification' },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Store verification token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, username);
      logger.auth('Verification email sent successfully', { email, userId: user._id });
    } catch (emailError) {
      logger.authError('Failed to send verification email', {
        email,
        userId: user._id,
        error: emailError.message
      });
      // Don't fail registration if email fails
    }

    logger.auth('User registered successfully', {
      email,
      username,
      userId: user._id
    });

    return {
      success: true,
      message: "User created successfully and verification email sent.",
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified
      }
    };
  } catch (error) {
    logger.authError('Registration failed', {
      email,
      username,
      error: error.message
    });
    return {
      success: false,
      message: 'Failed to register user'
    };
  }
}

async function verifyEmail(token) {
  try {
    logger.auth('Attempting email verification');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token purpose');
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      logger.authError('User not found during email verification', { userId: decoded.userId });
      return {
        success: false,
        message: 'User not found'
      };
    }

    if (user.emailVerified) {
      return {
        success: false,
        message: 'Email is already verified'
      };
    }

    // Check if token is expired
    if (!user.emailVerificationToken || user.emailVerificationToken !== token) {
      return {
        success: false,
        message: 'Invalid verification token'
      };
    }

    if (user.emailVerificationExpires < new Date()) {
      return {
        success: false,
        message: 'Verification token has expired'
      };
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    logger.auth('Email verified successfully', { userId: user._id, email: user.email });

    return {
      success: true,
      message: "Email verified successfully."
    };
  } catch (error) {
    logger.authError('Email verification failed', { error: error.message });

    if (error.name === 'TokenExpiredError') {
      return {
        success: false,
        message: 'Verification token has expired'
      };
    } else if (error.name === 'JsonWebTokenError') {
      return {
        success: false,
        message: 'Invalid verification token'
      };
    }

    return {
      success: false,
      message: 'Failed to verify email'
    };
  }
}

async function loginWithEmail({ email, password }) {
  try {
    logger.auth('Attempting login', { email });

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      logger.authError('Login failed - user not found', { email });
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check if user is active
    if (user.status !== 'active') {
      logger.authError('Login failed - user not active', { email, status: user.status });
      return {
        success: false,
        message: 'Account is not active'
      };
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        user.status = 'suspended';
        logger.authError('Account locked due to failed attempts', { email });
      }

      await user.save();

      logger.authError('Login failed - invalid password', { email });
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      logger.authError('Login failed - account locked', { email });
      return {
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      };
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    logger.auth('Login successful', {
      email,
      userId: user._id,
      role: user.role
    });

    return {
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified
        }
      }
    };
  } catch (error) {
    logger.authError('Login error', { email, error: error.message });
    return {
      success: false,
      message: 'Login service error'
    };
  }
}

async function createUser(userData) {
  try {
    logger.auth('Creating user in database', { email: userData.email, username: userData.username });

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { username: userData.username }
      ]
    });

    if (existingUser) {
      logger.authError('User already exists', { email: userData.email, username: userData.username });
      return {
        success: false,
        message: 'User with this email or username already exists'
      };
    }

    // Create new user
    const user = new User({
      email: userData.email,
      username: userData.username,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'Customer',
      status: userData.status || 'active',
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

    const user = await User.findById(userId);

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

    const user = await User.findById(userId);

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

    const user = await User.findById(userId);

    if (!user) {
      logger.authError('User not found for deletion', { userId });
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Delete user from database
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
      // Don't reveal if user exists for security
      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      };
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.username);
      logger.auth('Password reset email sent successfully', { userId: user._id, email });
    } catch (emailError) {
      logger.authError('Failed to send password reset email', {
        userId: user._id,
        email,
        error: emailError.message
      });
      // Don't fail the token generation if email fails
    }

    logger.auth('Reset token generated successfully', { userId: user._id, email });

    return {
      success: true,
      data: {
        resetToken,
        userId: user._id
      },
      message: 'If an account with that email exists, a password reset link has been sent.'
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

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'password_reset') {
      return {
        success: false,
        message: 'Invalid reset token'
      };
    }

    // Find user with valid reset token
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      logger.authError('Invalid or expired reset token');
      return {
        success: false,
        message: 'Invalid or expired reset token'
      };
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
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

    if (error.name === 'TokenExpiredError') {
      return {
        success: false,
        message: 'Reset token has expired'
      };
    } else if (error.name === 'JsonWebTokenError') {
      return {
        success: false,
        message: 'Invalid reset token'
      };
    }

    return {
      success: false,
      message: 'Failed to reset password'
    };
  }
}

async function sendVerificationEmailToUser(email, token, username) {
  try {
    await sendVerificationEmail(email, token, username);
    return { success: true, message: 'Verification email sent successfully' };
  } catch (error) {
    logger.authError('Failed to send verification email', { email, error: error.message });
    return { success: false, message: 'Failed to send verification email' };
  }
}

// Cart functions
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

// Wishlist functions
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

// Loyalty points
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

// User preferences
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

// Shipping addresses
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

// User stats
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

// Audit logging
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

// Audit log retrieval
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

// System stats
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

// Profile image upload
async function uploadProfileImage(userId, imageUrl) {
  try {
    logger.auth('Uploading profile image', { userId });

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Delete existing profile image if present
    if (user.profileImage) {
      try {
        const publicId = user.profileImage.split('/').pop().split('.')[0];
        await deleteImage(`ecommerce-platform/${publicId}`);
      } catch (deleteError) {
        logger.warn('Failed to delete old profile image', { userId, error: deleteError.message });
      }
    }

    // Extract public ID from Cloudinary URL
    const publicId = imageUrl.split('/').pop().split('.')[0];

    // Update user with new profile image
    user.profileImage = imageUrl;
    user.updatedAt = new Date();

    await user.save();

    logger.auth('Profile image uploaded successfully', {
      userId,
      profileImageUrl: user.profileImage
    });

    return {
      success: true,
      data: {
        profileImage: user.profileImage,
        publicId: publicId
      },
      message: 'Profile image uploaded successfully'
    };
  } catch (error) {
    logger.authError('Failed to upload profile image', { userId, error: error.message });
    return { success: false, message: 'Failed to upload profile image' };
  }
}

// Delete profile image
async function deleteProfileImage(userId) {
  try {
    logger.auth('Deleting profile image', { userId });

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (!user.profileImage) {
      return { success: false, message: 'User has no profile image to delete' };
    }

    // Delete from Cloudinary
    const publicId = user.profileImage.split('/').pop().split('.')[0];
    await deleteImage(`ecommerce-platform/${publicId}`);

    // Remove profile image from user
    user.profileImage = undefined;
    user.updatedAt = new Date();

    await user.save();

    logger.auth('Profile image deleted successfully', { userId });

    return {
      success: true,
      message: 'Profile image deleted successfully'
    };
  } catch (error) {
    logger.authError('Failed to delete profile image', { userId, error: error.message });
    return { success: false, message: 'Failed to delete profile image' };
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
  uploadProfileImage,
  deleteProfileImage,
};