const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  // Add timestamp
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // Add colors
  winston.format.colorize({ all: true }),
  // Define the format of the message showing the timestamp, the level and the message
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use to print out messages
const transports = [
  // Allow the use the console to print the messages
  new winston.transports.Console(),
  // Allow to print all the error level messages inside the error.log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
  }),
  // Allow to print all the error message inside the all.log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/all.log'),
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format,
  transports,
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom logger methods for different contexts
logger.auth = (message, meta = {}) => {
  logger.info(`[AUTH] ${message}`, { ...meta, context: 'authentication' });
};

logger.authError = (message, meta = {}) => {
  logger.error(`[AUTH] ${message}`, { ...meta, context: 'authentication' });
};

logger.security = (message, meta = {}) => {
  logger.warn(`[SECURITY] ${message}`, { ...meta, context: 'security' });
};

logger.api = (message, meta = {}) => {
  logger.info(`[API] ${message}`, { ...meta, context: 'api' });
};

logger.apiError = (message, meta = {}) => {
  logger.error(`[API] ${message}`, { ...meta, context: 'api' });
};

module.exports = logger;