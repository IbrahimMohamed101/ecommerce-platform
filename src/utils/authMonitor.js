const auditLogger = require('./auditLogger');
const logger = require('./logger');

class AuthMonitor {
  constructor() {
    this.failureCounts = new Map(); // IP -> failure count
    this.suspiciousIPs = new Set();
    this.alertThresholds = {
      loginFailures: 5, // Alert after 5 failed login attempts
      timeWindow: 15 * 60 * 1000, // 15 minutes
      suspiciousActivity: 10 // Alert after 10 suspicious activities
    };

    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.alertThresholds.timeWindow);
  }

  // Track login failures
  async trackLoginFailure(ip, email, reason) {
    const key = `${ip}:${email}`;
    const currentCount = this.failureCounts.get(key) || 0;
    this.failureCounts.set(key, currentCount + 1);

    const failureCount = currentCount + 1;

    // Check if we should alert
    if (failureCount >= this.alertThresholds.loginFailures) {
      await this.alertBruteForceAttempt(ip, email, failureCount);
    }

    // Log suspicious activity if threshold reached
    if (failureCount >= 3) {
      this.suspiciousIPs.add(ip);
      await auditLogger.logSuspiciousActivity(ip, 'unknown', 'MULTIPLE_LOGIN_FAILURES', {
        email,
        failureCount,
        reason
      });
    }
  }

  // Track successful logins (reset failure count)
  resetFailureCount(ip, email) {
    const key = `${ip}:${email}`;
    this.failureCounts.delete(key);
  }

  // Track rate limit violations
  async trackRateLimitViolation(ip, endpoint) {
    await auditLogger.logRateLimitExceeded(ip, endpoint, 1);

    if (this.suspiciousIPs.has(ip)) {
      logger.warn(`Rate limit violation from suspicious IP: ${ip}`, { endpoint });
    }
  }

  // Track suspicious activities
  async trackSuspiciousActivity(ip, userAgent, activity, details = {}) {
    const suspiciousCount = this.getSuspiciousActivityCount(ip);

    if (suspiciousCount >= this.alertThresholds.suspiciousActivity) {
      await this.alertSuspiciousActivity(ip, activity, details);
    }

    await auditLogger.logSuspiciousActivity(ip, userAgent, activity, details);
  }

  // Get failure statistics
  getFailureStats(ip, email) {
    const key = `${ip}:${email}`;
    return {
      count: this.failureCounts.get(key) || 0,
      isBlocked: (this.failureCounts.get(key) || 0) >= this.alertThresholds.loginFailures
    };
  }

  // Check if IP is suspicious
  isSuspiciousIP(ip) {
    return this.suspiciousIPs.has(ip);
  }

  // Get suspicious activity count for IP
  getSuspiciousActivityCount(ip) {
    // This is a simplified implementation
    // In a real system, you'd track this in a database
    return this.suspiciousIPs.has(ip) ? 1 : 0;
  }

  // Alert methods
  async alertBruteForceAttempt(ip, email, attempts) {
    logger.error(`BRUTE FORCE ALERT: ${attempts} failed login attempts from IP ${ip} for email ${email}`);

    await auditLogger.logBruteForceAttempt(ip, email, attempts);

    // In a real system, you might:
    // - Send email alerts to administrators
    // - Temporarily block the IP
    // - Log to external monitoring system
    // - Trigger automated responses
  }

  async alertSuspiciousActivity(ip, activity, details) {
    logger.error(`SUSPICIOUS ACTIVITY ALERT: ${activity} from IP ${ip}`, details);

    // Additional alerting logic would go here
  }

  // Generate monitoring report
  async generateReport(timeRange = 24 * 60 * 60 * 1000) { // 24 hours
    const endTime = new Date();
    const startTime = new Date(endTime - timeRange);

    const auditLogs = await auditLogger.queryAuditLogs({
      startDate: startTime.toISOString(),
      endDate: endTime.toISOString()
    });

    const report = {
      period: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      summary: {
        totalEvents: auditLogs.length,
        loginAttempts: auditLogs.filter(log => log.eventType === 'LOGIN_ATTEMPT').length,
        loginSuccesses: auditLogs.filter(log => log.eventType === 'LOGIN_SUCCESS').length,
        loginFailures: auditLogs.filter(log => log.eventType === 'LOGIN_FAILURE').length,
        registrations: auditLogs.filter(log => log.eventType === 'USER_REGISTRATION').length,
        suspiciousActivities: auditLogs.filter(log => log.eventType.startsWith('SECURITY_')).length
      },
      topFailingIPs: this.getTopFailingIPs(auditLogs),
      recentSuspiciousActivities: auditLogs
        .filter(log => log.eventType.startsWith('SECURITY_'))
        .slice(0, 10)
    };

    return report;
  }

  // Get top IPs with most failures
  getTopFailingIPs(auditLogs) {
    const failureCounts = {};

    auditLogs
      .filter(log => log.eventType === 'LOGIN_FAILURE')
      .forEach(log => {
        failureCounts[log.ip] = (failureCounts[log.ip] || 0) + 1;
      });

    return Object.entries(failureCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, failures: count }));
  }

  // Cleanup old entries
  cleanup() {
    const cutoffTime = Date.now() - this.alertThresholds.timeWindow;

    // Clean up failure counts (simplified - in real system use timestamps)
    for (const [key, count] of this.failureCounts.entries()) {
      if (count < 3) { // Keep only significant failure counts
        this.failureCounts.delete(key);
      }
    }

    logger.info('Auth monitor cleanup completed', {
      remainingFailures: this.failureCounts.size,
      suspiciousIPs: this.suspiciousIPs.size
    });
  }

  // Health check
  getHealthStatus() {
    return {
      status: 'healthy',
      failureCounts: this.failureCounts.size,
      suspiciousIPs: this.suspiciousIPs.size,
      lastCleanup: new Date().toISOString()
    };
  }
}

module.exports = new AuthMonitor();