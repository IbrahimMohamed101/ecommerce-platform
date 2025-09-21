const mongoose = require('mongoose');
const config = require('./environment');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Mongoose connection options
      const options = {
        ...config.MONGODB.OPTIONS,
        // useNewUrlParser and useUnifiedTopology are deprecated and no longer needed
      };

      console.log('🔌 Connecting to MongoDB Atlas...');

      this.connection = await mongoose.connect(config.MONGODB.URI, options);
      this.isConnected = true;

      console.log('✅ MongoDB Atlas connected successfully!');
      console.log(`📊 Database: ${this.connection.connection.name}`);
      console.log(`🌐 Host: ${this.connection.connection.host}`);
      
      // Handle connection events
      this.setupEventHandlers();
      
      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.error('🔍 Connection string:', config.MONGODB.URI.replace(/:[^:@]*@/, ':****@'));
      
      // In development, we might want to retry
      if (config.NODE_ENV === 'development') {
        console.log('🔄 Retrying connection in 5 seconds...');
        setTimeout(() => this.connect(), 5000);
      } else {
        process.exit(1);
      }
    }
  }

  setupEventHandlers() {
    const db = mongoose.connection;

    db.on('connected', () => {
      console.log('📡 Mongoose connected to MongoDB Atlas');
    });

    db.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    db.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Handle app termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.connection.close();
      console.log('👋 MongoDB connection closed through app termination');
      this.isConnected = false;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      // Simple ping to check connection
      const result = await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        connected: this.isConnected,
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        readyState: mongoose.connection.readyState,
        ping: result
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  // Get database statistics
  async getStats() {
    try {
      const stats = await mongoose.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        objects: stats.objects
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;