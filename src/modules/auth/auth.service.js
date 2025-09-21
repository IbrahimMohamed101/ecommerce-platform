const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../users/user.model');
const logger = require('../../utils/logger');

class AuthService {
  // Generate JWT access token
  static generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        type: 'access'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
  }

  // Generate JWT refresh token
  static generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        type: 'refresh'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw error;
    }
  }

  // Login user
  static async login(email, password) {
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

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Store refresh token in database
      user.refreshToken = refreshToken;
      await user.save();

      logger.auth('Login successful', {
        email,
        userId: user._id,
        role: user.role
      });

      return {
        success: true,
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
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

  // Refresh access token
  static async refreshToken(refreshToken) {
    try {
      logger.auth('Attempting token refresh');

      // Verify refresh token
      const decoded = this.verifyToken(refreshToken);
      if (decoded.type !== 'refresh') {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Find user and verify refresh token matches
      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Check if user is still active
      if (user.status !== 'active') {
        return {
          success: false,
          message: 'User account is not active'
        };
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Update refresh token in database
      user.refreshToken = newRefreshToken;
      await user.save();

      logger.auth('Token refresh successful', { userId: user._id });

      return {
        success: true,
        data: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken
        }
      };
    } catch (error) {
      logger.authError('Token refresh failed', { error: error.message });
      return {
        success: false,
        message: 'Invalid or expired refresh token'
      };
    }
  }

  // Logout user
  static async logout(refreshToken) {
    try {
      logger.auth('Attempting logout');

      // Find user with this refresh token and clear it
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = null;
        await user.save();
        logger.auth('Logout successful', { userId: user._id });
      }

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      logger.authError('Logout error', { error: error.message });
      // Don't fail logout even if there's an error
      return {
        success: true,
        message: 'Logged out successfully'
      };
    }
  }

  // Register new user
  static async register(userData) {
    try {
      logger.auth('Attempting user registration', { email: userData.email });

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email.toLowerCase() },
          { username: userData.username }
        ]
      });

      if (existingUser) {
        logger.authError('Registration failed - user exists', { email: userData.email });
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
        role: 'Customer', // Default role
        status: 'active',
        emailVerified: false
      });

      await user.save();

      logger.auth('User registered successfully', {
        email: userData.email,
        userId: user._id
      });

      return {
        success: true,
        message: 'User registered successfully',
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
        email: userData.email,
        error: error.message
      });
      return {
        success: false,
        message: 'Failed to register user'
      };
    }
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      logger.auth('Attempting password change', { userId });

      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }

      // Update password (will be hashed by pre-save middleware)
      user.password = newPassword;
      await user.save();

      logger.auth('Password changed successfully', { userId });

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      logger.authError('Password change failed', { userId, error: error.message });
      return {
        success: false,
        message: 'Failed to change password'
      };
    }
  }

  // Generate password reset token
  static async generatePasswordResetToken(email) {
    try {
      logger.auth('Generating password reset token', { email });

      const user = await User.findByEmail(email);
      if (!user) {
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

      logger.auth('Password reset token generated', { userId: user._id });

      return {
        success: true,
        data: {
          resetToken,
          userId: user._id
        },
        message: 'Password reset token generated successfully'
      };
    } catch (error) {
      logger.authError('Password reset token generation failed', { email, error: error.message });
      return {
        success: false,
        message: 'Failed to generate password reset token'
      };
    }
  }

  // Reset password using token
  static async resetPassword(token, newPassword) {
    try {
      logger.auth('Attempting password reset');

      // Verify token
      const decoded = this.verifyToken(token);
      if (decoded.type !== 'password_reset') {
        return {
          success: false,
          message: 'Invalid reset token'
        };
      }

      const user = await User.findById(decoded.userId);
      if (!user || user.resetPasswordToken !== token) {
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      // Check if token is expired
      if (user.resetPasswordExpires < new Date()) {
        return {
          success: false,
          message: 'Reset token has expired'
        };
      }

      // Update password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      logger.auth('Password reset successful', { userId: user._id });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      logger.authError('Password reset failed', { error: error.message });
      return {
        success: false,
        message: 'Invalid or expired reset token'
      };
    }
  }

  // Verify email
  static async verifyEmail(token) {
    try {
      logger.auth('Attempting email verification');

      // Verify token
      const decoded = this.verifyToken(token);
      if (decoded.type !== 'email_verification') {
        return {
          success: false,
          message: 'Invalid verification token'
        };
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
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

      // Verify email
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      logger.auth('Email verified successfully', { userId: user._id });

      return {
        success: true,
        message: 'Email verified successfully'
      };
    } catch (error) {
      logger.authError('Email verification failed', { error: error.message });
      return {
        success: false,
        message: 'Invalid or expired verification token'
      };
    }
  }

  // Generate email verification token
  static async generateEmailVerificationToken(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const verificationToken = jwt.sign(
        { userId: user._id, email: user.email, type: 'email_verification' },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
      );

      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
      await user.save();

      return {
        success: true,
        data: { verificationToken }
      };
    } catch (error) {
      logger.authError('Email verification token generation failed', { userId, error: error.message });
      return {
        success: false,
        message: 'Failed to generate verification token'
      };
    }
  }
}

module.exports = AuthService;
