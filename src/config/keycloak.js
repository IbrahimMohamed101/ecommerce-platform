// src/config/keycloak.js
const Keycloak = require("keycloak-connect");
const session = require("express-session");
const mongoose = require("mongoose");

let _keycloak;

// Custom MongoDB Session Store
class MongoSessionStore extends session.Store {
  constructor(options = {}) {
    super(options);
    this.collectionName = options.collectionName || 'sessions';
    this.ttl = options.ttl || 86400000; // 24 hours in milliseconds
  }

  async get(sid, callback) {
    try {
      const SessionModel = this.getSessionModel();
      const session = await SessionModel.findOne({ _id: sid });

      if (session) {
        // Check if session has expired
        if (session.expires && session.expires < new Date()) {
          await this.destroy(sid);
          return callback(null, null);
        }
        return callback(null, session.session);
      }
      callback(null, null);
    } catch (error) {
      callback(error);
    }
  }

  async set(sid, session, callback) {
    try {
      const SessionModel = this.getSessionModel();
      const expires = new Date(Date.now() + this.ttl);

      await SessionModel.findOneAndUpdate(
        { _id: sid },
        {
          _id: sid,
          session: session,
          expires: expires
        },
        { upsert: true, new: true }
      );

      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  async destroy(sid, callback) {
    try {
      const SessionModel = this.getSessionModel();
      await SessionModel.deleteOne({ _id: sid });
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  async touch(sid, session, callback) {
    try {
      const SessionModel = this.getSessionModel();
      const expires = new Date(Date.now() + this.ttl);

      await SessionModel.findOneAndUpdate(
        { _id: sid },
        { expires: expires }
      );

      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  async all(callback) {
    try {
      const SessionModel = this.getSessionModel();
      const sessions = await SessionModel.find({});
      const result = {};

      sessions.forEach(doc => {
        result[doc._id] = doc.session;
      });

      callback(null, result);
    } catch (error) {
      callback(error);
    }
  }

  async length(callback) {
    try {
      const SessionModel = this.getSessionModel();
      const count = await SessionModel.countDocuments();
      callback(null, count);
    } catch (error) {
      callback(error);
    }
  }

  async clear(callback) {
    try {
      const SessionModel = this.getSessionModel();
      await SessionModel.deleteMany({});
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  getSessionModel() {
    if (!this.SessionModel) {
      const sessionSchema = new mongoose.Schema({
        _id: String,
        session: mongoose.Schema.Types.Mixed,
        expires: Date
      }, {
        collection: this.collectionName,
        timestamps: false
      });

      // Add TTL index for automatic cleanup
      sessionSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

      this.SessionModel = mongoose.model('Session', sessionSchema);
    }
    return this.SessionModel;
  }
}

const initKeycloak = (app) => {
  if (_keycloak) {
    console.warn("Keycloak already initialized!");
    return _keycloak;
  }

  // Use MongoDB store in production, MemoryStore for development
  let sessionStore;
  if (process.env.NODE_ENV === 'production') {
    // For production, use MongoDB store
    console.log('🔧 Using MongoDB session store for production');
    sessionStore = new MongoSessionStore({
      collectionName: 'sessions',
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    });
  } else {
    // For development, use MemoryStore
    console.log('🔧 Using MemoryStore for development');
    sessionStore = new session.MemoryStore();
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false, // Changed to false for better security
      store: sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict' // CSRF protection
      },
      name: 'ecommerce.sid' // Change default session name
    })
  );

  _keycloak = new Keycloak({ store: sessionStore }, {
   "realm": process.env.KEYCLOAK_REALM || "ecommerce",
   "auth-server-url": process.env.KEYCLOAK_SERVER_URL || "http://localhost:8080/",
   "ssl-required": process.env.NODE_ENV === 'production' ? "external" : "none",
   "resource": process.env.KEYCLOAK_CLIENT_ID || "ecommerce-platform",
   "public-client": true,
   "confidential-port": 0
 });

  return _keycloak;
};



const getKeycloak = () => _keycloak;

const KEYCLOAK_CONFIG = {
  authServerUrl: process.env.KEYCLOAK_SERVER_URL || 'http://localhost:8080',
  realm: process.env.KEYCLOAK_REALM || 'ecommerce',
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'ecommerce-platform',
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
  adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli',
  adminClientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
  adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME,
  adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD,
  // Additional configuration
  tokenEndpoint: '/protocol/openid-connect/token',
  userinfoEndpoint: '/protocol/openid-connect/userinfo',
  logoutEndpoint: '/protocol/openid-connect/logout',
  adminTokenEndpoint: '/protocol/openid-connect/token'
};

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredVars = [
    'KEYCLOAK_CLIENT_SECRET',
    'KEYCLOAK_ADMIN_CLIENT_SECRET',
    'KEYCLOAK_ADMIN_USERNAME',
    'KEYCLOAK_ADMIN_PASSWORD',
    'SESSION_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}


module.exports = { initKeycloak, getKeycloak,KEYCLOAK_CONFIG };
