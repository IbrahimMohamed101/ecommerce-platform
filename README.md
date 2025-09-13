# E-commerce Platform

A comprehensive e-commerce platform built with Node.js, Express, and Keycloak authentication. This platform provides a robust foundation for online stores with advanced user management, shopping cart functionality, wishlist management, loyalty programs, and comprehensive security features.

## 🚀 Features

### Core E-commerce Features
- **User Authentication & Management**: Secure user registration, login, and profile management
- **Shopping Cart**: Persistent cart with real-time calculations and product variants support
- **Wishlist Management**: Save favorite products with timestamp tracking
- **Loyalty Program**: Tier-based reward system (Bronze, Silver, Gold, Platinum)
- **Multi-currency Support**: USD, EUR, GBP, CAD, AUD
- **Multi-language Support**: English, Spanish, French, German, Arabic, Chinese
- **Multiple Shipping Addresses**: Home, work, and custom address management

### Advanced Features
- **Vendor Management**: Request and approve vendor accounts
- **Admin Dashboard**: Comprehensive admin operations and monitoring
- **Super Admin Controls**: Create and manage admin accounts
- **Audit Logging**: Complete tracking of all authentication and admin events
- **Rate Limiting**: Protection against abuse with configurable limits
- **Real-time Monitoring**: Health checks and performance monitoring

### Security & Scalability
- **JWT Authentication**: Secure token-based authentication with Keycloak integration
- **Session Management**: Redis-backed sessions for production scalability
- **Input Validation**: Comprehensive validation and sanitization
- **Error Handling**: Structured error responses with correlation IDs
- **Distributed Caching**: Redis-based token caching for high performance
- **Circuit Breaker Pattern**: Fault tolerance for external service calls

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Primary database
- **Keycloak** - Identity and access management
- **Redis** - Session store and caching
- **PostgreSQL** - Keycloak database

### Security & Monitoring
- **Helmet** - Security headers
- **Winston** - Logging framework
- **Morgan** - HTTP request logging
- **Express Rate Limit** - Rate limiting
- **Swagger** - API documentation

### Development Tools
- **Docker** - Containerization
- **Nodemon** - Development auto-restart
- **Swagger UI** - Interactive API documentation

## 📋 Prerequisites

- **Node.js** 18+
- **MongoDB** 4.4+
- **Redis** (for production session management)
- **Docker** & Docker Compose (recommended)
- **Keycloak** 23.0+

## 🚀 Installation

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecommerce-platform
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** (see Configuration section)

4. **Start the application**
   ```bash
   docker-compose up -d
   ```

The application will be available at:
- **API**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api-docs
- **Keycloak Admin**: http://localhost:8080

### Option 2: Manual Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd ecommerce-platform
   npm install
   ```

2. **Set up MongoDB and Redis**
   - Install MongoDB locally or use MongoDB Atlas
   - Install Redis locally or use Redis Cloud

3. **Configure Keycloak**
   - Download and install Keycloak 23.0
   - Set up realm and client as per configuration

4. **Start the application**
   ```bash
   npm run dev
   ```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/ecommerce

# Keycloak Configuration
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=ecommerce
KEYCLOAK_CLIENT_ID=ecommerce-platform
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_CLIENT_SECRET=your-admin-secret
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin

# Security
SESSION_SECRET=your-super-secret-key
JWT_SECRET=your-jwt-secret

# Email Configuration (Optional)
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=E-commerce Platform
ADMIN_EMAIL=admin@yourdomain.com

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
NODE_ENV=development

# Redis (for production)
REDIS_URL=redis://localhost:6379
```

## 📖 Usage

### Starting the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### API Endpoints Overview

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

#### User Management
- `GET /api/users/me` - Get current user info
- `PUT /api/users/me` - Update user profile
- `GET /api/users/cart` - Get shopping cart
- `POST /api/users/cart` - Add item to cart
- `GET /api/users/wishlist` - Get wishlist

#### Vendor Management
- `POST /api/vendors/request` - Request vendor account
- `GET /api/vendors/public` - Get approved vendors
- `GET /api/vendors/profile` - Get vendor profile

#### Admin Operations
- `GET /api/admin/users` - Get all users
- `GET /api/admin/vendors/pending` - Get pending vendor requests
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/monitoring/health` - System health check

#### Super Admin
- `POST /api/super-admin/admins` - Create admin user
- `GET /api/super-admin/admins` - Get all admins
- `GET /api/super-admin/advanced-stats` - Get advanced statistics

### Using the API

1. **Via Swagger UI**: Visit `http://localhost:3000/api-docs` for interactive documentation
2. **Via Postman**: Import `ecommerce-platform.postman_collection.json`
3. **Via Code**: Use the OpenAPI spec at `http://localhost:3000/api-docs.json`

## 🔐 Security Features

### Authentication & Authorization
- JWT token-based authentication with Keycloak integration
- Role-based access control (User, Vendor, Admin, Super Admin)
- Secure session management with HttpOnly cookies
- Automatic token refresh mechanism

### Security Measures
- **Rate Limiting**: Configurable limits on all endpoints
- **Input Validation**: Comprehensive validation and sanitization
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security Headers**: XSS protection, HSTS, content security policy
- **Audit Logging**: Complete tracking of security events
- **Brute Force Protection**: Automatic detection and blocking

### Monitoring & Alerting
- Real-time security monitoring
- Automated alerts for suspicious activities
- Comprehensive audit trails
- Performance monitoring and health checks

## 📈 Scalability Features

### Session Management
- Redis-backed sessions for multi-instance deployments
- Distributed session storage with automatic failover
- Configurable session timeouts and cleanup

### Caching Strategy
- In-memory token caching (5-minute TTL)
- Redis distributed cache for production
- Automatic cache invalidation and cleanup

### Database Optimization
- MongoDB connection pooling
- Strategic indexing for fast queries
- Read/write separation support
- Optimized queries for user and product data

### Performance Monitoring
- Response time tracking
- Cache hit rate monitoring
- Database connection pool usage
- Automatic scaling triggers

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   App Instance  │
│   (Nginx/HAProxy)│    │   (Node.js)     │
└─────────────────┘    └─────────────────┘
                      │
                      ▼
┌─────────────────┐    ┌─────────────────┐
│   Redis Cluster │────│   Keycloak      │
│   (Sessions)    │    │   (Auth)        │
└─────────────────┘    └─────────────────┘
                      │
                      ▼
┌─────────────────┐    ┌─────────────────┐
│   MongoDB       │────│   Read Replicas │
│   (Primary)     │    │   (Secondary)   │
└─────────────────┘    └─────────────────┘
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure all security best practices are followed

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Check the [API Documentation](API_DOCUMENTATION.md)
- Review the [Security Documentation](SECURITY_DOCUMENTATION.md)
- Contact the development team

## 🔄 Version History

- **v1.0.0**: Initial release with core e-commerce functionality
  - User authentication and management
  - Shopping cart and wishlist
  - Vendor management system
  - Admin dashboard and monitoring
  - Comprehensive security features
  - Docker containerization support

---

Built with ❤️ using Node.js, Express, and Keycloak