# E-commerce Platform API Documentation

## Overview
This document provides comprehensive information about the E-commerce Platform API, including authentication, endpoints, and usage examples.

## Access Points

### Swagger UI (Interactive Documentation)
- **URL**: `http://localhost:5000/api-docs`
- **Description**: Interactive web interface for exploring and testing API endpoints
- **Features**:
  - Try out API calls directly from the browser
  - View request/response schemas
  - Authentication support
  - Real-time API testing

### OpenAPI Specification
- **URL**: `http://localhost:5000/api-docs.json`
- **Description**: Complete OpenAPI 3.0 specification in JSON format
- **Use Cases**:
  - Import into API clients (Postman, Insomnia)
  - Generate client SDKs
  - API documentation generation
  - Code generation tools

## Authentication

### Bearer Token Authentication
Most API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Getting Started
1. **Register**: Create a new user account via `/api/auth/register`
2. **Login**: Obtain access and refresh tokens via `/api/auth/login`
3. **Use Token**: Include the access token in subsequent API calls
4. **Refresh Token**: Use refresh token to get new access token when expired

## API Endpoints Overview

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get current user profile

### User Management (`/api/users`)
- `GET /api/users/me` - Get current user info
- `PUT /api/users/me` - Update user profile
- `DELETE /api/users/me` - Delete user account

### Vendor Management (`/api/vendors`)
- `POST /api/vendors/request` - Request vendor account
- `GET /api/vendors/request/status` - Check vendor request status
- `GET /api/vendors/public` - Get approved vendors
- `GET /api/vendors/profile` - Get vendor profile
- `PUT /api/vendors/profile` - Update vendor profile
- `GET /api/vendors/stats` - Get vendor statistics

### Admin Operations (`/api/admin`)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/vendors/pending` - Get pending vendor requests
- `PUT /api/admin/vendors/{id}/approve` - Approve/reject vendor
- `DELETE /api/admin/users/{id}` - Delete user
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/monitoring/health` - System health check
- `GET /api/admin/monitoring/report` - Generate monitoring report
- `GET /api/admin/audit/logs` - Query audit logs

### Super Admin Operations (`/api/super-admin`)
- `POST /api/super-admin/admins` - Create admin user
- `GET /api/super-admin/admins` - Get all admins
- `DELETE /api/super-admin/admins/{id}` - Delete admin
- `PUT /api/super-admin/admins/{id}/status` - Toggle admin status
- `POST /api/super-admin/admins/{id}/reset-password` - Reset admin password
- `GET /api/super-admin/advanced-stats` - Get advanced statistics
- `GET /api/super-admin/audit-log` - Get audit log

### System Health (`/health`)
- `GET /health` - System health check

## Using the API

### 1. Via Swagger UI
1. Navigate to `http://localhost:5000/api-docs`
2. Click on any endpoint to expand it
3. Click "Try it out"
4. Fill in required parameters
5. Click "Execute" to make the API call
6. View the response

### 2. Via Postman
1. Import the Postman collection: `ecommerce-platform.postman_collection.json`
2. Set the `{{URL}}` variable to your API base URL
3. Set the `{{TOKEN}}` variable with your JWT token
4. Use the collection to make API calls

### 3. Via Code
Use the OpenAPI specification to generate client libraries or make direct HTTP requests.

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- Authentication endpoints: 5 requests per 15 minutes
- Registration: 3 requests per hour
- Token refresh: 10 requests per hour
- General API: 100 requests per 15 minutes

## Security Features

- JWT-based authentication
- Keycloak integration for advanced auth
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers
- Audit logging

## Support

For API support or questions:
- Check the Swagger UI for detailed endpoint documentation
- Review the OpenAPI specification for complete schema information
- Contact the development team for technical assistance

## Version History

- **v1.0.0**: Initial release with core e-commerce functionality
  - User authentication and management
  - Vendor registration and management
  - Admin operations and monitoring
  - Swagger/OpenAPI documentation integration
