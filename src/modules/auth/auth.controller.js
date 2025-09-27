const AuthService = require('./auth.service');
const UserService = require('../users/user.service');
const User = require('../users/user.model');
const { catchAsync, ValidationError, AuthenticationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');
const ValidationUtils = require('../../utils/validation');
const auditLogger = require('../../utils/auditLogger');
const jwt = require('jsonwebtoken');

class AuthController {

    // تسجيل الدخول
    static login = catchAsync(async (req, res) => {
        // Comprehensive input validation
        const { email, password } = ValidationUtils.validateLoginRequest(req);

        logger.auth('Login attempt', {
            email,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        const result = await AuthService.login(email, password);

        if (result.success) {
            logger.auth('Login successful', {
                email,
                ip: req.ip,
                userId: result.data?.user?.id || 'unknown'
            });

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result.data
            });
        } else {
            logger.authError('Login failed', {
                email,
                reason: result.message,
                ip: req.ip
            });

            throw new AuthenticationError(result.message);
        }
    });

    // تجديد الـ Token
    static refreshToken = catchAsync(async (req, res) => {
        // Validate token refresh request
        const { refresh_token } = ValidationUtils.validateTokenRefreshRequest(req);

        logger.auth('Token refresh attempt', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        const result = await AuthService.refreshToken(refresh_token);

        if (result.success) {
            logger.auth('Token refresh successful', {
                ip: req.ip,
                userId: result.data?.userId || 'unknown'
            });

            return res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: result.data
            });
        } else {
            logger.authError('Token refresh failed', {
                reason: result.message,
                ip: req.ip
            });

            throw new AuthenticationError(result.message);
        }
    });

    // تسجيل الخروج
    static logout = catchAsync(async (req, res) => {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            logger.authError('Logout attempt without refresh token', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                hasBody: !!req.body,
                bodyKeys: req.body ? Object.keys(req.body) : 'no body'
            });
            throw new ValidationError('Refresh token is required');
        }

        logger.auth('Logout attempt', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        const result = await AuthService.logout(refresh_token);

        logger.auth('Logout successful', {
            ip: req.ip
        });

        return res.status(200).json({
            success: true,
            message: result.message
        });
    });

    // تسجيل مستخدم جديد (Customer تلقائياً)
    static register = catchAsync(async (req, res) => {
        // Comprehensive registration validation
        const { email, password, firstName, lastName, username } = ValidationUtils.validateRegistrationRequest(req);

        logger.auth('User registration attempt', {
            email,
            username,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Register user using UserService
        const result = await UserService.registerUser({
            email,
            password,
            firstName,
            lastName,
            username: username || email
        });

        if (!result.success) {
            await auditLogger.logRegistration(email, req.ip, req.get('User-Agent'), false, result.message);

            logger.authError('User registration failed', {
                email,
                reason: result.message,
                ip: req.ip
            });
            throw new ValidationError(result.message);
        }

        await auditLogger.logRegistration(email, req.ip, req.get('User-Agent'), true);

        logger.auth('User registration successful', {
            email,
            userId: result.data?.id || 'unknown',
            ip: req.ip
        });

        return res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email to verify your account.',
            data: result.data
        });
    });

    // الحصول على معلومات المستخدم الحالي
    static getProfile = catchAsync(async (req, res) => {
        const user = req.user;

        logger.auth('Profile access', {
            userId: user.id,
            email: user.email,
            ip: req.ip
        });

        // الحصول على بيانات إضافية من قاعدة البيانات
        const userData = await UserService.getUserById(user.id);

        if (!userData.success) {
            logger.authError('Failed to retrieve user profile data', {
                userId: user.id,
                reason: userData.message,
                ip: req.ip
            });
            throw new AuthenticationError('Failed to retrieve user profile');
        }

        return res.status(200).json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role, // Single role instead of roles array
                ...userData.data
            }
        });
    });

    // تحديث كلمة المرور
    static changePassword = catchAsync(async (req, res) => {
        const user = req.user;

        // Comprehensive password change validation
        const { currentPassword, newPassword } = ValidationUtils.validatePasswordChangeRequest(req);

        logger.auth('Password change attempt', {
            userId: user.id,
            email: user.email,
            ip: req.ip
        });

        // Change password using AuthService
        const result = await AuthService.changePassword(user.id, currentPassword, newPassword);

        if (!result.success) {
            logger.authError('Password change failed', {
                userId: user.id,
                email: user.email,
                ip: req.ip,
                reason: result.message
            });
            throw new ValidationError(result.message);
        }

        logger.auth('Password changed successfully', {
            userId: user.id,
            email: user.email,
            ip: req.ip
        });

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    });

    // نسيان كلمة المرور
    static forgotPassword = catchAsync(async (req, res) => {
        // Validate forgot password request
        const { email } = ValidationUtils.validateForgotPasswordRequest(req);

        logger.auth('Forgot password request', {
            email,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Generate reset token
        const result = await UserService.generateResetToken(email);

        if (!result.success) {
            logger.auth('Forgot password - user not found or error', {
                email,
                ip: req.ip,
                reason: result.message
            });

            // Return success to prevent email enumeration attacks
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        logger.auth('Reset token generated successfully', {
            email,
            userId: result.data.userId,
            ip: req.ip
        });

        return res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.',
            // For development/testing - remove in production
            ...(process.env.NODE_ENV === 'development' && {
                resetToken: result.data.resetToken,
                note: 'Token included for development purposes only'
            })
        });
    });

    // إعادة تعيين كلمة المرور
    static resetPassword = catchAsync(async (req, res) => {
        // Validate reset password request
        const { token, newPassword } = ValidationUtils.validateResetPasswordRequest(req);

        logger.auth('Password reset attempt', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Reset password using UserService
        const result = await UserService.resetPassword(token, newPassword);

        if (!result.success) {
            logger.authError('Password reset failed', {
                ip: req.ip,
                reason: result.message
            });
            throw new ValidationError(result.message);
        }

        logger.auth('Password reset successful', {
            ip: req.ip
        });

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    });

    // التحقق من البريد الإلكتروني
    static verifyEmail = catchAsync(async (req, res) => {
        const { token } = req.body;

        if (!token) {
            logger.authError('Email verification attempt without token', {
                ip: req.ip
            });
            throw new ValidationError('Verification token is required');
        }

        logger.auth('Email verification attempt', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Verify email using UserService
        const result = await UserService.verifyEmail(token);

        if (!result.success) {
            logger.authError('Email verification failed', {
                ip: req.ip,
                reason: result.message
            });
            throw new ValidationError(result.message);
        }

        logger.auth('Email verification successful', {
            ip: req.ip
        });

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully'
        });
    });

    // إعادة إرسال البريد الإلكتروني للتحقق
    static resendVerificationEmail = catchAsync(async (req, res) => {
        // Validate resend verification email request
        const { email } = ValidationUtils.validateResendVerificationEmailRequest(req);

        logger.auth('Resend verification email attempt', {
            email,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            logger.authError('Resend verification email - user not found', {
                email,
                ip: req.ip
            });
            // Don't reveal if user exists for security
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a verification email has been sent.'
            });
        }

        // Check if email is already verified
        if (user.emailVerified) {
            logger.auth('Resend verification email - email already verified', {
                email,
                userId: user._id,
                ip: req.ip
            });
            return res.status(200).json({
                success: true,
                message: 'Email is already verified.'
            });
        }

        // Generate new verification token
        const verificationToken = jwt.sign(
            {
                userId: user._id,
                email,
                type: 'email_verification'
            },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        // Store verification token
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
        await user.save();

        // Send verification email
        try {
            await UserService.sendVerificationEmailToUser(email, verificationToken, user.username || email);

            logger.auth('Verification email resent successfully', {
                email,
                userId: user._id,
                ip: req.ip
            });

            return res.status(200).json({
                success: true,
                message: 'Verification email sent successfully.'
            });
        } catch (emailError) {
            logger.authError('Failed to resend verification email', {
                email,
                userId: user._id,
                error: emailError.message,
                ip: req.ip
            });
            throw new ValidationError('Failed to send verification email. Please try again later.');
        }
    });

    // Google OAuth callback
    static googleOAuthCallback = catchAsync(async (req, res) => {
        const user = req.user;

        logger.auth('Google OAuth successful', {
            userId: user._id,
            email: user.email,
            ip: req.ip
        });

        // Generate JWT tokens for the authenticated user
        const accessToken = AuthService.generateAccessToken(user);
        const refreshToken = AuthService.generateRefreshToken(user);

        // Store refresh token in database
        user.refreshToken = refreshToken;
        await user.save();

        // Return tokens and user data
        return res.status(200).json({
            success: true,
            message: 'Google authentication successful',
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
        });
    });
}

module.exports = AuthController;