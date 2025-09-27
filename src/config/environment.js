    const config = {
    // Server Configuration
    PORT: process.env.PORT || 8080,
    NODE_ENV: process.env.NODE_ENV || 'development',
    HOST: process.env.HOST || 'localhost',

    // MongoDB Configuration
    MONGODB: {
        URI: process.env.MONGODB_URI,
        OPTIONS: {
        maxPoolSize: parseInt(process.env.MONGODB_OPTIONS_MAX_POOL_SIZE) || 10,
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_OPTIONS_SERVER_SELECTION_TIMEOUT_MS) || 5000,
        socketTimeoutMS: parseInt(process.env.MONGODB_OPTIONS_SOCKET_TIMEOUT_MS) || 45000,
        connectTimeoutMS: 10000,
        maxIdleTimeMS: 30000,
        }
    },

    // JWT Configuration
    JWT: {
        SECRET: process.env.JWT_SECRET,
        EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
        REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },

    // Security Configuration
    SECURITY: {
        BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
        SESSION_SECRET: process.env.SESSION_SECRET
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

    // OAuth Configuration
    OAUTH: {
        GOOGLE: {
            CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
            CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
        }
    },

    // Logging Configuration
    LOGGING: {
        LEVEL: process.env.LOG_LEVEL || 'debug',
        FILE_PATH: process.env.LOG_FILE_PATH || 'logs/app.log'
    }
    };

    module.exports = config;