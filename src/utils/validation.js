const { ValidationError } = require('./errorHandler');

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation regex (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&#]{8,}$/;

// Username validation regex (alphanumeric, underscore, dash, 3-30 chars)
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

// Phone validation regex (international format)
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

class ValidationUtils {
  // Email validation
  static validateEmail(email, fieldName = 'email') {
    if (!email) {
      throw new ValidationError(`${fieldName} is required`);
    }

    if (typeof email !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`);
    }

    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError(`Please provide a valid ${fieldName} address`);
    }

    return email.toLowerCase().trim();
  }

  // Password validation
  static validatePassword(password, fieldName = 'password') {
    if (!password) {
      throw new ValidationError(`${fieldName} is required`);
    }

    if (typeof password !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`);
    }

    if (password.length < 8) {
      throw new ValidationError(`${fieldName} must be at least 8 characters long`);
    }

    if (password.length > 128) {
      throw new ValidationError(`${fieldName} must be less than 128 characters long`);
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      throw new ValidationError(`${fieldName} is too weak. Please choose a stronger password`);
    }

    return password;
  }

  // Strong password validation (optional, more strict)
  static validateStrongPassword(password, fieldName = 'password') {
    this.validatePassword(password, fieldName);

    if (!PASSWORD_REGEX.test(password)) {
      throw new ValidationError(`${fieldName} must contain at least one uppercase letter, one lowercase letter, one number, and may include special characters (@$!%*?&#)`);
    }

    return password;
  }

  // Username validation
  static validateUsername(username, fieldName = 'username') {
    if (!username) {
      throw new ValidationError(`${fieldName} is required`);
    }

    if (typeof username !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`);
    }

    if (!USERNAME_REGEX.test(username)) {
      throw new ValidationError(`${fieldName} must be 3-30 characters long and contain only letters, numbers, underscores, and dashes`);
    }

    return username.trim();
  }

  // Name validation (firstName, lastName)
  static validateName(name, fieldName = 'name') {
    if (!name) {
      throw new ValidationError(`${fieldName} is required`);
    }

    if (typeof name !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`);
    }

    const trimmed = name.trim();

    if (trimmed.length < 2) {
      throw new ValidationError(`${fieldName} must be at least 2 characters long`);
    }

    if (trimmed.length > 50) {
      throw new ValidationError(`${fieldName} must be less than 50 characters long`);
    }

    // Check for valid name characters (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
      throw new ValidationError(`${fieldName} contains invalid characters`);
    }

    return trimmed;
  }

  // Phone validation
  static validatePhone(phone, fieldName = 'phone') {
    if (!phone) {
      return null; // Phone is optional
    }

    if (typeof phone !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`);
    }

    const trimmed = phone.trim();

    if (!PHONE_REGEX.test(trimmed)) {
      throw new ValidationError(`Please provide a valid ${fieldName} number`);
    }

    return trimmed;
  }

  // Required field validation
  static validateRequired(value, fieldName) {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${fieldName} is required`);
    }
    return value;
  }

  // String length validation
  static validateLength(value, fieldName, min = 0, max = Infinity) {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`);
    }

    if (value.length < min) {
      throw new ValidationError(`${fieldName} must be at least ${min} characters long`);
    }

    if (value.length > max) {
      throw new ValidationError(`${fieldName} must be less than ${max} characters long`);
    }

    return value;
  }

  // Sanitize string input
  static sanitizeString(value) {
    if (typeof value !== 'string') return value;
    return value.trim().replace(/[<>]/g, '');
  }

  // Validate login request
  static validateLoginRequest(req) {
    const { email, password } = req.body;

    const validatedEmail = this.validateEmail(email);
    const validatedPassword = this.validatePassword(password);

    return {
      email: validatedEmail,
      password: validatedPassword
    };
  }

  // Validate registration request
  static validateRegistrationRequest(req) {
    const { email, password, firstName, lastName, username } = req.body;

    const validatedEmail = this.validateEmail(email);
    const validatedPassword = this.validateStrongPassword(password);
    const validatedFirstName = this.validateName(firstName, 'firstName');
    const validatedLastName = this.validateName(lastName, 'lastName');
    const validatedUsername = username ? this.validateUsername(username) : validatedEmail;

    return {
      email: validatedEmail,
      password: validatedPassword,
      firstName: validatedFirstName,
      lastName: validatedLastName,
      username: validatedUsername
    };
  }

  // Validate password change request
  static validatePasswordChangeRequest(req) {
    const { currentPassword, newPassword } = req.body;

    const validatedCurrentPassword = this.validatePassword(currentPassword, 'currentPassword');
    const validatedNewPassword = this.validateStrongPassword(newPassword, 'newPassword');

    // Check if new password is different from current
    if (validatedCurrentPassword === validatedNewPassword) {
      throw new ValidationError('New password must be different from current password');
    }

    return {
      currentPassword: validatedCurrentPassword,
      newPassword: validatedNewPassword
    };
  }

  // Validate token refresh request
  static validateTokenRefreshRequest(req) {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new ValidationError('Refresh token is required');
    }

    if (typeof refresh_token !== 'string') {
      throw new ValidationError('Refresh token must be a string');
    }

    return { refresh_token };
  }

  // Validate forgot password request
  static validateForgotPasswordRequest(req) {
    const { email } = req.body;

    const validatedEmail = this.validateEmail(email);

    return { email: validatedEmail };
  }

  // Validate reset password request
  static validateResetPasswordRequest(req) {
    const { token, newPassword } = req.body;

    if (!token) {
      throw new ValidationError('Reset token is required');
    }

    if (typeof token !== 'string') {
      throw new ValidationError('Reset token must be a string');
    }

    const validatedNewPassword = this.validateStrongPassword(newPassword, 'newPassword');

    return {
      token: token.trim(),
      newPassword: validatedNewPassword
    };
  }
}

module.exports = ValidationUtils;