const AuthService = require('./auth.service');
const UserService = require('../users/user.service');
const { catchAsync, ValidationError, AuthenticationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');
const ValidationUtils = require('../../utils/validation');
const auditLogger = require('../../utils/auditLogger');
const jwt = require('jsonwebtoken');
const { generateResetToken, resetPassword } = require('../users/user.service');

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
                userId: result.data?.userId || 'unknown'
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
                userAgent: req.get('User-Agent')
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

        // إنشاء المستخدم في Keycloak بدور Customer تلقائياً
        const keycloakResult = await AuthService.createUser({
            email,
            password,
            firstName,
            lastName,
            username: username || email,
            roles: ['Customer']
        });

        if (!keycloakResult.success) {
            await auditLogger.logRegistration(email, req.ip, req.get('User-Agent'), false, keycloakResult.message);

            logger.authError('Keycloak user creation failed', {
                email,
                reason: keycloakResult.message,
                ip: req.ip
            });
            throw new ValidationError(keycloakResult.message);
        }

        // إنشاء المستخدم في قاعدة البيانات المحلية
        const userResult = await UserService.createUser({
            email,
            firstName,
            lastName,
            username: username || email,
            role: 'Customer',
            status: 'active',
            keycloakId: keycloakResult.keycloakId
        });

        if (!userResult.success) {
            await auditLogger.logRegistration(email, req.ip, req.get('User-Agent'), false, userResult.message);

            logger.authError('Local user creation failed', {
                email,
                reason: userResult.message,
                ip: req.ip,
                keycloakId: keycloakResult.keycloakId
            });

            // Attempt cleanup: delete user from Keycloak if MongoDB save failed
            try {
                if (keycloakResult.keycloakId) {
                    logger.auth('Attempting cleanup: deleting user from Keycloak', { keycloakId: keycloakResult.keycloakId });
                    // Note: Implement cleanup logic here if needed
                    // This would require adding a deleteUser method to AuthService
                }
            } catch (cleanupError) {
                logger.authError('Cleanup failed', {
                    keycloakId: keycloakResult.keycloakId,
                    cleanupError: cleanupError.message
                });
            }

            // Provide detailed error message based on the type of failure
            let errorMessage = userResult.message;
            if (userResult.errors) {
                // Format validation errors for client
                const errorDetails = Object.entries(userResult.errors)
                    .map(([field, message]) => `${field}: ${message}`)
                    .join(', ');
                errorMessage = `Validation failed: ${errorDetails}`;
            } else if (userResult.details) {
                errorMessage = `${userResult.message}. ${userResult.details}`;
            }

            throw new ValidationError(errorMessage);
        }

        // Send verification email after successful registration
        try {
            const verificationToken = jwt.sign(
                {
                    userId: userResult.data.keycloakId,
                    email,
                    purpose: 'email_verification'
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '12h' }
            );

            await UserService.sendVerificationEmail(email, verificationToken, userResult.data.username || email);

            logger.auth('Verification email sent successfully', {
                email,
                userId: userResult.data.id,
                ip: req.ip
            });
        } catch (emailError) {
            logger.authError('Failed to send verification email', {
                email,
                userId: userResult.data.id,
                error: emailError.message,
                ip: req.ip
            });
            // Don't fail registration if email fails, just log it
        }

        await auditLogger.logRegistration(email, req.ip, req.get('User-Agent'), true);

        logger.auth('User registration successful', {
            email,
            userId: userResult.data?.id || 'unknown',
            ip: req.ip
        });

        return res.status(201).json({
            success: true,
            message: 'User registered successfully as Customer. Please check your email to verify your account.',
            data: userResult.data
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
                roles: user.roles,
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

        // التحقق من كلمة المرور الحالية
        const loginResult = await AuthService.login(user.email, currentPassword);

        if (!loginResult.success) {
            logger.authError('Password change failed - incorrect current password', {
                userId: user.id,
                email: user.email,
                ip: req.ip
            });
            throw new AuthenticationError('Current password is incorrect');
        }

        // تحديث كلمة المرور في Keycloak
        const changeResult = await AuthService.changePassword(user.id, newPassword);

        if (!changeResult.success) {
            logger.authError('Password change failed in Keycloak', {
                userId: user.id,
                email: user.email,
                ip: req.ip,
                reason: changeResult.message
            });
            throw new ValidationError(changeResult.message);
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
        const tokenResult = await UserService.generateResetToken(email);

        if (!tokenResult.success) {
            // Don't reveal if user exists or not for security
            logger.auth('Forgot password - user not found or error', {
                email,
                ip: req.ip,
                reason: tokenResult.message
            });

            // Return success to prevent email enumeration attacks
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // TODO: Send email with reset token (not implemented yet as per requirements)
        logger.auth('Reset token generated successfully', {
            email,
            userId: tokenResult.data.userId,
            ip: req.ip
        });

        return res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.',
            // For development/testing - remove in production
            ...(process.env.NODE_ENV === 'development' && {
                resetToken: tokenResult.data.resetToken,
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

        // Reset password using token
        const resetResult = await UserService.resetPassword(token, newPassword);

        if (!resetResult.success) {
            logger.authError('Password reset failed', {
                ip: req.ip,
                reason: resetResult.message
            });
            throw new ValidationError(resetResult.message);
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

        // Verify email using token
        const verifyResult = await UserService.verifyEmail(token);

        if (!verifyResult.success) {
            logger.authError('Email verification failed', {
                ip: req.ip,
                reason: verifyResult.message
            });
            throw new ValidationError(verifyResult.message);
        }

        logger.auth('Email verification successful', {
            ip: req.ip
        });

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully'
        });
    });
}

module.exports = AuthController;