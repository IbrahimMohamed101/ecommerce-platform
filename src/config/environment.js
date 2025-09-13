    require('dotenv').config();

    const config = {
    // Server Configuration
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    HOST: process.env.HOST || 'localhost',

    // MongoDB Configuration
    MONGODB: {
        URI: process.env.MONGODB_URI,
        OPTIONS: {
        maxPoolSize: parseInt(process.env.MONGODB_OPTIONS_MAX_POOL_SIZE) || 10,
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_OPTIONS_SERVER_SELECTION_TIMEOUT_MS) || 5000,
        socketTimeoutMS: parseInt(process.env.MONGODB_OPTIONS_SOCKET_TIMEOUT_MS) || 45000,
        }
    },

    // Keycloak Configuration
    KEYCLOAK: {
        SERVER_URL: process.env.KEYCLOAK_SERVER_URL || 'http://localhost:8080',
        REALM: process.env.KEYCLOAK_REALM || 'ecommerce-platform',
        CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || 'ecommerce-backend',
        CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET || '',
        ADMIN_USERNAME: process.env.KEYCLOAK_ADMIN_USERNAME || 'admin',
        ADMIN_PASSWORD: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin'
    },

    // JWT Configuration
    JWT: {
        SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
        REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },

    // Security Configuration
    SECURITY: {
        BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
        SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret'
    },

    // Application URLs
    URLS: {
        FRONTEND: process.env.FRONTEND_URL || 'http://localhost:3001',
        BACKEND: process.env.BACKEND_URL || 'http://localhost:3000'
    },

    // Rate Limiting
    RATE_LIMIT: {
        WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
        MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },

    // Logging Configuration
    LOGGING: {
        LEVEL: process.env.LOG_LEVEL || 'debug',
        FILE_PATH: process.env.LOG_FILE_PATH || 'logs/app.log'
    }
    };

    module.exports = config;