#!/bin/bash
set -e

echo "=== Render Free Tier Resource Constraint Analysis ==="
echo "Timestamp: $(date)"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] RESOURCE_DIAGNOSTIC: $1"
}

log "=== RENDER FREE TIER LIMITATIONS ==="
log "Render Starter Plan Constraints:"
log "  - RAM: 512MB"
log "  - CPU: 0.1 vCPU (shared)"
log "  - Disk: 1GB"
log "  - Network: Limited bandwidth"
log "  - Sleep after 15min inactivity"

log "=== JVM MEMORY CONFIGURATION ANALYSIS ==="

# Check JVM memory settings
log "JVM Memory Settings:"
log "  JAVA_OPTS_APPEND: ${JAVA_OPTS_APPEND:-'NOT_SET'}"

if [[ -n "$JAVA_OPTS_APPEND" ]]; then
    if echo "$JAVA_OPTS_APPEND" | grep -q "MaxRAMPercentage"; then
        percentage=$(echo "$JAVA_OPTS_APPEND" | grep -o 'MaxRAMPercentage=[0-9.]*' | cut -d'=' -f2)
        log "  Current MaxRAMPercentage: ${percentage}%"
        
        # Calculate memory usage for 512MB container
        memory_mb=$(echo "512 * $percentage / 100" | bc -l)
        log "  Calculated heap size: ${memory_mb}MB (out of 512MB total)"
        
        if (( $(echo "$percentage > 60" | bc -l) )); then
            log "  ❌ MaxRAMPercentage too high for Render free tier"
            log "     Recommended: 50-60% max for 512MB containers"
        else
            log "  ✅ MaxRAMPercentage appropriate for free tier"
        fi
    else
        log "  ⚠️  No MaxRAMPercentage set - using JVM defaults"
    fi
    
    # Check for other memory-related options
    if echo "$JAVA_OPTS_APPEND" | grep -q "UseContainerSupport"; then
        log "  ✅ UseContainerSupport enabled (good for containers)"
    else
        log "  ⚠️  UseContainerSupport not enabled"
    fi
else
    log "  ❌ No JVM options configured"
fi

log "=== STARTUP TIME OPTIMIZATION ANALYSIS ==="

# Check for startup-related configurations
log "Startup Optimization Settings:"

# Check health check configuration
log "Health Check Settings:"
if [[ -n "$KC_HEALTH_ENABLED" ]]; then
    log "  KC_HEALTH_ENABLED: $KC_HEALTH_ENABLED"
    if [[ "$KC_HEALTH_ENABLED" == "true" ]]; then
        log "  ⚠️  Health checks enabled (adds startup overhead)"
    fi
fi

if [[ -n "$KC_METRICS_ENABLED" ]]; then
    log "  KC_METRICS_ENABLED: $KC_METRICS_ENABLED"
    if [[ "$KC_METRICS_ENABLED" == "true" ]]; then
        log "  ⚠️  Metrics enabled (adds startup overhead)"
    fi
fi

log "=== RENDER-SPECIFIC OPTIMIZATIONS ==="

log "Render Platform Considerations:"
log "1. Cold Start Problem:"
log "   - Free tier sleeps after 15min inactivity"
log "   - First request after sleep triggers cold start"
log "   - Cold start includes full Keycloak initialization"

log "2. Resource Competition:"
log "   - Shared CPU with other containers"
log "   - Limited I/O bandwidth"
log "   - Network latency to database"

log "3. Database Connection:"
log "   - External PostgreSQL service"
log "   - Network latency affects Liquibase migrations"
log "   - Connection pooling overhead"

log "=== PERFORMANCE BOTTLENECK ANALYSIS ==="

# Analyze potential bottlenecks
log "Likely Performance Bottlenecks on Render Free Tier:"

log "1. Memory Pressure:"
if [[ -n "$JAVA_OPTS_APPEND" ]] && echo "$JAVA_OPTS_APPEND" | grep -q "MaxRAMPercentage=70"; then
    log "   ❌ 70% heap (358MB) leaves only 154MB for OS/container"
    log "   ❌ Risk of OOM kills during startup"
fi

log "2. CPU Constraints:"
log "   ❌ 0.1 vCPU shared - very limited processing power"
log "   ❌ Liquibase migrations are CPU-intensive"
log "   ❌ JGroups clustering attempts waste CPU cycles"

log "3. I/O Bottlenecks:"
log "   ❌ Database connection over network"
log "   ❌ Liquibase reading/writing migration metadata"
log "   ❌ Log file I/O (especially at DEBUG level)"

log "=== OPTIMIZATION RECOMMENDATIONS ==="

log "Critical Optimizations for Render Free Tier:"
log "1. Reduce JVM heap to 50-55% (256-281MB)"
log "2. Completely disable JGroups clustering"
log "3. Set all logging to WARN level (not DEBUG/INFO)"
log "4. Disable health checks and metrics during startup"
log "5. Add aggressive database connection timeouts"
log "6. Skip Liquibase validation entirely"
log "7. Use build-time optimizations"

log "=== RENDER DEPLOYMENT STRATEGY ==="

log "Recommended Deployment Strategy:"
log "1. Use optimized Docker image with pre-built Keycloak"
log "2. Minimize environment variables (use system properties)"
log "3. Implement startup readiness probe with longer timeout"
log "4. Consider database connection pooling"
log "5. Use persistent volume for Keycloak data"

log "=== DIAGNOSTIC COMPLETE ==="