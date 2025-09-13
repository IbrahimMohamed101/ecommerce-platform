const axios = require('axios');
const { getKeycloak, KEYCLOAK_CONFIG } = require('../../config/keycloak');
const logger = require('../../utils/logger');

class AuthService {

  static async login(email, password) {
    try {
      // Check if Keycloak is available (for development)
      if (process.env.NODE_ENV === 'development' && !KEYCLOAK_CONFIG.clientSecret) {
        logger.warn('Keycloak client secret not configured - simulating login');
        return {
          success: true,
          data: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer'
          }
        };
      }

      logger.auth('Attempting Keycloak login', { email });

      const response = await axios.post(
        `${KEYCLOAK_CONFIG.authServerUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: KEYCLOAK_CONFIG.clientId,
          client_secret: KEYCLOAK_CONFIG.clientSecret,
          username: email,
          password: password,
          scope: 'openid profile email'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      logger.auth('Keycloak login successful', { email });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.authError('Keycloak login failed', {
        email,
        error: error.response?.data || error.message,
        statusCode: error.response?.status
      });

      // In development, provide more helpful error messages
      if (process.env.NODE_ENV === 'development' && error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Keycloak server is not running. Please start Keycloak or configure environment variables.',
          details: 'Set KEYCLOAK_CLIENT_SECRET and other Keycloak variables in your .env file'
        };
      }

      // Provide specific error messages based on Keycloak response
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      } else if (error.response?.status === 400) {
        return {
          success: false,
          message: 'Invalid login request'
        };
      } else if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Authentication service temporarily unavailable'
        };
      } else {
        return {
          success: false,
          message: 'Login service error'
        };
      }
    }
  }

  static async refreshToken(refreshToken) {
    try {
      logger.auth('Attempting token refresh');

      const response = await axios.post(
        `${KEYCLOAK_CONFIG.authServerUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: KEYCLOAK_CONFIG.clientId,
          client_secret: KEYCLOAK_CONFIG.clientSecret,
          refresh_token: refreshToken,
          scope: 'openid profile email'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      logger.auth('Token refresh successful');

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.authError('Token refresh failed', {
        error: error.response?.data || error.message,
        statusCode: error.response?.status
      });

      if (error.response?.status === 400) {
        return {
          success: false,
          message: 'Invalid or expired refresh token'
        };
      } else if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Authentication service temporarily unavailable'
        };
      } else {
        return {
          success: false,
          message: 'Token refresh failed'
        };
      }
    }
  }

  
  static async logout(refreshToken) {
    try {
      logger.auth('Attempting logout');

      await axios.post(
        `${KEYCLOAK_CONFIG.authServerUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/logout`,
        new URLSearchParams({
          client_id: KEYCLOAK_CONFIG.clientId,
          client_secret: KEYCLOAK_CONFIG.clientSecret,
          refresh_token: refreshToken
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      logger.auth('Logout successful');

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      logger.authError('Logout failed', {
        error: error.response?.data || error.message,
        statusCode: error.response?.status
      });

      // Logout is not critical, so we don't fail hard
      return {
        success: true,
        message: 'Logged out successfully'
      };
    }
    }


  static async createUser(userData) {
    try {
      logger.auth('Attempting user creation', { email: userData.email, username: userData.username });

      // Check if Keycloak is available (for development)
      if (process.env.NODE_ENV === 'development' && !process.env.KEYCLOAK_ADMIN_USERNAME) {
        logger.warn('Keycloak admin credentials not configured - skipping Keycloak user creation');
        return {
          success: true,
          message: 'User creation simulated (Keycloak not configured)',
          simulated: true
        };
      }

      // الحصول على Admin Token
      const adminToken = await this.getAdminToken();

      const userPayload = {
        username: userData.username || userData.email,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        enabled: true,
        emailVerified: true,
        credentials: [{
          type: 'password',
          value: userData.password,
          temporary: false
        }]
      };

      const response = await axios.post(
        `${KEYCLOAK_CONFIG.authServerUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users`,
        userPayload,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const keycloakId = response.headers.location?.split('/').pop();

      logger.auth('User created successfully in Keycloak', {
        email: userData.email,
        username: userData.username,
        userId: keycloakId
      });

      // Assign roles to the newly created user
      if (userData.roles && userData.roles.length > 0) {
        logger.auth('Assigning roles to user', { userId: keycloakId, roles: userData.roles });

        const roleUpdateResult = await this.updateUserRoles(keycloakId, userData.roles);

        if (!roleUpdateResult.success) {
          logger.authError('Failed to assign roles to user', {
            userId: keycloakId,
            roles: userData.roles,
            error: roleUpdateResult.message
          });

          // Don't fail the entire operation if role assignment fails
          // The user is created, just without the expected roles
        } else {
          logger.auth('Roles assigned successfully', { userId: keycloakId, roles: userData.roles });
        }
      }

      return {
        success: true,
        message: 'User created successfully',
        keycloakId: keycloakId
      };
    } catch (error) {
      logger.authError('User creation failed', {
        email: userData.email,
        username: userData.username,
        error: error.response?.data || error.message,
        statusCode: error.response?.status
      });

      // In development, provide more helpful error messages
      if (process.env.NODE_ENV === 'development') {
        if (error.code === 'ECONNREFUSED') {
          return {
            success: false,
            message: 'Keycloak server is not running. Please start Keycloak or configure environment variables.',
            details: 'Set KEYCLOAK_ADMIN_USERNAME, KEYCLOAK_ADMIN_PASSWORD, etc. in your .env file'
          };
        } else if (error.response?.status === 401) {
          return {
            success: false,
            message: 'Invalid Keycloak admin credentials. Check your environment variables.',
            details: 'Verify KEYCLOAK_ADMIN_USERNAME and KEYCLOAK_ADMIN_PASSWORD in .env'
          };
        }
      }
      if (error.response?.status === 409) {
        return {
          success: false,
          message: 'User with this email or username already exists'
        };
      } else if (error.response?.status === 403) {
        return {
          success: false,
          message: 'Insufficient permissions to create user'
        };
      } else if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Authentication service temporarily unavailable'
        };
      } else {
        return {
          success: false,
          message: 'Failed to create user'
        };
      }
    }
    }
  
    // حذف المستخدم من Keycloak
    static async deleteUser(userId) {
      try {
        logger.auth('Attempting user deletion from Keycloak', { userId });
  
        // Check if Keycloak is available (for development)
        if (process.env.NODE_ENV === 'development' && !KEYCLOAK_CONFIG.adminUsername) {
          logger.warn('Keycloak admin credentials not configured - simulating user deletion');
          return {
            success: true,
            message: 'User deleted successfully from Keycloak (simulated)'
          };
        }
  
        const adminToken = await this.getAdminToken();
  
        // Delete user from Keycloak
        await axios.delete(
          `${KEYCLOAK_CONFIG.authServerUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${adminToken}`
            },
            timeout: 15000
          }
        );
  
        logger.auth('User deleted successfully from Keycloak', { userId });
  
        return {
          success: true,
          message: 'User deleted successfully from Keycloak'
        };
      } catch (error) {
        logger.authError('User deletion from Keycloak failed', {
          userId,
          error: error.response?.data || error.message,
          statusCode: error.response?.status
        });
  
        if (process.env.NODE_ENV === 'development') {
          if (error.code === 'ECONNREFUSED') {
            return {
              success: false,
              message: 'Keycloak server is not running. Please start Keycloak or configure environment variables.',
              details: 'Set KEYCLOAK_ADMIN_USERNAME, KEYCLOAK_ADMIN_PASSWORD, etc. in your .env file'
            };
          }
        }
  
        if (error.response?.status === 401) {
          return {
            success: false,
            message: 'Invalid admin credentials. Check your environment variables.',
            details: 'Verify KEYCLOAK_ADMIN_USERNAME and KEYCLOAK_ADMIN_PASSWORD in .env'
          };
        } else if (error.response?.status === 403) {
          return {
            success: false,
            message: 'Insufficient permissions to delete user'
          };
        } else if (error.response?.status === 404) {
          return {
            success: false,
            message: 'User not found in Keycloak'
          };
        } else if (error.code === 'ECONNREFUSED') {
          return {
            success: false,
            message: 'Authentication service temporarily unavailable'
          };
        } else {
          return {
            success: false,
            message: 'Failed to delete user from Keycloak'
          };
        }
      }
    }

  // الحصول على Admin Token
  static async getAdminToken() {
    try {
      // Check if admin credentials are configured
      if (!KEYCLOAK_CONFIG.adminUsername || !KEYCLOAK_CONFIG.adminPassword) {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Keycloak admin credentials not configured - using mock token');
          return 'mock-admin-token-for-development';
        }
        throw new Error('Keycloak admin credentials not configured');
      }

      logger.auth('Requesting admin token');

      const response = await axios.post(
        `${KEYCLOAK_CONFIG.authServerUrl}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: KEYCLOAK_CONFIG.adminClientId,
          username: KEYCLOAK_CONFIG.adminUsername,
          password: KEYCLOAK_CONFIG.adminPassword
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      logger.auth('Admin token obtained successfully');

      return response.data.access_token;
    } catch (error) {
      logger.authError('Failed to get admin token', {
        error: error.response?.data || error.message,
        statusCode: error.response?.status
      });

      if (process.env.NODE_ENV === 'development') {
        logger.warn('Using mock admin token for development');
        return 'mock-admin-token-for-development';
      }

      if (error.response?.status === 401) {
        throw new Error('Invalid admin credentials');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Keycloak server is not available');
      } else {
        throw new Error('Failed to authenticate with Keycloak admin');
      }
    }
    }

  // تحديث كلمة المرور
  static async changePassword(userId, newPassword) {
    try {
      logger.auth('Attempting password change', { userId });

      // Check if Keycloak is available (for development)
      if (process.env.NODE_ENV === 'development' && !KEYCLOAK_CONFIG.adminUsername) {
        logger.warn('Keycloak admin credentials not configured - simulating password change');
        return {
          success: true,
          message: 'Password changed successfully (simulated)'
        };
      }

      const adminToken = await this.getAdminToken();

      // Reset password in Keycloak
      await axios.put(
        `${KEYCLOAK_CONFIG.authServerUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users/${userId}/reset-password`,
        {
          type: 'password',
          value: newPassword,
          temporary: false
        },
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      logger.auth('Password changed successfully', { userId });

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      logger.authError('Password change failed', {
        userId,
        error: error.response?.data || error.message,
        statusCode: error.response?.status
      });

      if (process.env.NODE_ENV === 'development') {
        if (error.code === 'ECONNREFUSED') {
          return {
            success: false,
            message: 'Keycloak server is not running. Please start Keycloak or configure environment variables.',
            details: 'Set KEYCLOAK_ADMIN_USERNAME, KEYCLOAK_ADMIN_PASSWORD, etc. in your .env file'
          };
        }
      }

      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid admin credentials. Check your environment variables.',
          details: 'Verify KEYCLOAK_ADMIN_USERNAME and KEYCLOAK_ADMIN_PASSWORD in .env'
        };
      } else if (error.response?.status === 403) {
        return {
          success: false,
          message: 'Insufficient permissions to change password'
        };
      } else if (error.response?.status === 404) {
        return {
          success: false,
          message: 'User not found'
        };
      } else if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Authentication service temporarily unavailable'
        };
      } else {
        return {
          success: false,
          message: 'Failed to change password'
        };
      }
    }
    }

  // تحديث أدوار المستخدم
  static async updateUserRoles(userId, roles) {
    try {
      const adminToken = await this.getAdminToken();

      // Get available realm roles
      const rolesResponse = await axios.get(
        `${KEYCLOAK_CONFIG.authServerUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles`,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        }
      );

      const existingRoles = rolesResponse.data;
      const availableRoles = [];
      const missingRoles = [];

      // Check which roles exist and which need to be created
      for (const roleName of roles) {
        const existingRole = existingRoles.find(role => role.name === roleName);
        if (existingRole) {
          availableRoles.push(existingRole);
        } else {
          missingRoles.push(roleName);
        }
      }

      // Create missing roles
      for (const roleName of missingRoles) {
        try {
          logger.auth('Creating missing role', { roleName });

          await axios.post(
            `${KEYCLOAK_CONFIG.authServerUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles`,
            {
              name: roleName,
              description: `${roleName} role`
            },
            {
              headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          // Get the newly created role
          const newRoleResponse = await axios.get(
            `${KEYCLOAK_CONFIG.authServerUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/roles/${roleName}`,
            {
              headers: {
                'Authorization': `Bearer ${adminToken}`
              }
            }
          );

          availableRoles.push(newRoleResponse.data);
          logger.auth('Role created successfully', { roleName });
        } catch (createError) {
          logger.authError('Failed to create role', {
            roleName,
            error: createError.response?.data || createError.message
          });
        }
      }

      // Assign roles to user
      if (availableRoles.length > 0) {
        await axios.post(
          `${KEYCLOAK_CONFIG.authServerUrl}/admin/realms/${KEYCLOAK_CONFIG.realm}/users/${userId}/role-mappings/realm`,
          availableRoles,
          {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        logger.auth('Roles assigned to user', { userId, roles: availableRoles.map(r => r.name) });
      }

      return {
        success: true,
        message: 'User roles updated successfully',
        assignedRoles: availableRoles.map(r => r.name),
        missingRoles: missingRoles
      };
    } catch (error) {
      logger.authError('Role update error', {
        userId,
        requestedRoles: roles,
        error: error.response?.data || error.message,
        statusCode: error.response?.status
      });

      return {
        success: false,
        message: 'Failed to update user roles',
        error: error.response?.data || error.message
      };
    }
    }
}

module.exports = AuthService;
