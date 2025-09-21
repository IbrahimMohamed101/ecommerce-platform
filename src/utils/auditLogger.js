const logger = require('./logger');
const fs = require('fs').promises;
const path = require('path');

class AuditLogger {
  constructor() {
    this.auditLogPath = path.join(__dirname, '../../logs/audit.log');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
  }

  // Log authentication events
  async logAuthEvent(eventType, details) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      ...details,
      severity: this.getSeverityLevel(eventType)
    };

    // Write to audit log
    await this.writeToAuditLog(auditEntry);

    // Also log to main logger with appropriate level
    const logLevel = this.getLogLevel(eventType);
    logger.log(logLevel, `[AUDIT] ${eventType}`, auditEntry);
  }

  // Log security events
  async logSecurityEvent(eventType, details) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType: `SECURITY_${eventType}`,
      ...details,
      severity: 'HIGH'
    };

    await this.writeToAuditLog(auditEntry);
    logger.security(`[AUDIT] ${eventType}`, auditEntry);
  }

  // Specific authentication events
  async logLoginAttempt(email, ip, userAgent, success = false, failureReason = null) {
    await this.logAuthEvent('LOGIN_ATTEMPT', {
      email,
      ip,
      userAgent,
      success,
      failureReason,
      userId: null // Will be set if successful
    });
  }

  async logLoginSuccess(userId, email, ip, userAgent) {
    await this.logAuthEvent('LOGIN_SUCCESS', {
      userId,
      email,
      ip,
      userAgent
    });
  }

  async logLoginFailure(email, ip, userAgent, reason) {
    await this.logAuthEvent('LOGIN_FAILURE', {
      email,
      ip,
      userAgent,
      failureReason: reason
    });
  }

  async logLogout(userId, email, ip) {
    await this.logAuthEvent('LOGOUT', {
      userId,
      email,
      ip
    });
  }

  async logTokenRefresh(userId, email, ip, success = true) {
    await this.logAuthEvent('TOKEN_REFRESH', {
      userId,
      email,
      ip,
      success
    });
  }

  async logRegistration(email, ip, userAgent, success = true, failureReason = null) {
    await this.logAuthEvent('USER_REGISTRATION', {
      email,
      ip,
      userAgent,
      success,
      failureReason
    });
  }

  async logPasswordChange(userId, email, ip, success = true) {
    await this.logAuthEvent('PASSWORD_CHANGE', {
      userId,
      email,
      ip,
      success
    });
  }

  async logProfileAccess(userId, email, ip) {
    await this.logAuthEvent('PROFILE_ACCESS', {
      userId,
      email,
      ip
    });
  }

  // Security events
  async logBruteForceAttempt(ip, email, attempts) {
    await this.logSecurityEvent('BRUTE_FORCE_ATTEMPT', {
      ip,
      email,
      attempts
    });
  }

  async logSuspiciousActivity(ip, userAgent, activity, details) {
    await this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
      ip,
      userAgent,
      activity,
      details
    });
  }

  async logRateLimitExceeded(ip, endpoint, attempts) {
    await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      ip,
      endpoint,
      attempts
    });
  }

  // Helper methods
  getSeverityLevel(eventType) {
    const highSeverityEvents = [
      'LOGIN_FAILURE',
      'SECURITY_BRUTE_FORCE_ATTEMPT',
      'SECURITY_SUSPICIOUS_ACTIVITY',
      'SECURITY_RATE_LIMIT_EXCEEDED'
    ];

    const mediumSeverityEvents = [
      'USER_REGISTRATION',
      'PASSWORD_CHANGE'
    ];

    if (highSeverityEvents.includes(eventType)) return 'HIGH';
    if (mediumSeverityEvents.includes(eventType)) return 'MEDIUM';
    return 'LOW';
  }

  getLogLevel(eventType) {
    const errorEvents = [
      'LOGIN_FAILURE',
      'SECURITY_BRUTE_FORCE_ATTEMPT',
      'SECURITY_SUSPICIOUS_ACTIVITY'
    ];

    const warnEvents = [
      'SECURITY_RATE_LIMIT_EXCEEDED',
      'USER_REGISTRATION'
    ];

    if (errorEvents.includes(eventType)) return 'error';
    if (warnEvents.includes(eventType)) return 'warn';
    return 'info';
  }

  async writeToAuditLog(entry) {
    try {
      const logEntry = JSON.stringify(entry) + '\n';

      // Check if log rotation is needed
      await this.checkLogRotation();

      // Append to audit log
      await fs.appendFile(this.auditLogPath, logEntry);
    } catch (error) {
      logger.error('Failed to write to audit log', { error: error.message });
    }
  }

  async checkLogRotation() {
    try {
      const stats = await fs.stat(this.auditLogPath);
      if (stats.size > this.maxLogSize) {
        await this.rotateLogFiles();
      }
    } catch (error) {
      // File doesn't exist yet, that's fine
    }
  }

  async rotateLogFiles() {
    try {
      // Rotate existing log files
      for (let i = this.maxLogFiles - 1; i >= 1; i--) {
        const oldPath = `${this.auditLogPath}.${i}`;
        const newPath = `${this.auditLogPath}.${i + 1}`;

        try {
          await fs.access(oldPath);
          if (i === this.maxLogFiles - 1) {
            await fs.unlink(oldPath); // Delete oldest
          } else {
            await fs.rename(oldPath, newPath);
          }
        } catch (error) {
          // File doesn't exist, skip
        }
      }

      // Move current log to .1
      await fs.rename(this.auditLogPath, `${this.auditLogPath}.1`);
    } catch (error) {
      logger.error('Failed to rotate audit logs', { error: error.message });
    }
  }

  // Query audit logs (for admin purposes)
  async queryAuditLogs(filters = {}, limit = 100) {
    try {
      const logContent = await fs.readFile(this.auditLogPath, 'utf8');
      const entries = logContent.trim().split('\n').map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return null;
        }
      }).filter(entry => entry !== null);

      // Apply filters
      let filteredEntries = entries;

      if (filters.eventType) {
        filteredEntries = filteredEntries.filter(entry => entry.eventType === filters.eventType);
      }

      if (filters.severity) {
        filteredEntries = filteredEntries.filter(entry => entry.severity === filters.severity);
      }

      if (filters.userId) {
        filteredEntries = filteredEntries.filter(entry => entry.userId === filters.userId);
      }

      if (filters.ip) {
        filteredEntries = filteredEntries.filter(entry => entry.ip === filters.ip);
      }

      if (filters.startDate) {
        filteredEntries = filteredEntries.filter(entry => new Date(entry.timestamp) >= new Date(filters.startDate));
      }

      if (filters.endDate) {
        filteredEntries = filteredEntries.filter(entry => new Date(entry.timestamp) <= new Date(filters.endDate));
      }

      // Sort by timestamp (newest first) and limit
      return filteredEntries
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

    } catch (error) {
      logger.error('Failed to query audit logs', { error: error.message });
      return [];
    }
  }
}

module.exports = new AuditLogger();