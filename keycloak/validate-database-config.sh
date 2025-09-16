#!/bin/bash
set -e

echo "=== Database & Liquibase Performance Diagnostic Script ==="
echo "Timestamp: $(date)"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] DB_DIAGNOSTIC: $1"
}

log "=== DATABASE CONNECTION ANALYSIS ==="

# Check database configuration
log "Database Configuration:"
log "  KC_DB: ${KC_DB:-'NOT_SET'}"
log "  KC_DB_URL: ${KC_DB_URL:-'NOT_SET'}"
log "  KC_DB_USERNAME: ${KC_DB_USERNAME:-'NOT_SET'}"
log "  KC_DB_PASSWORD: ${KC_DB_PASSWORD:+***SET***}"

# Analyze database URL for performance parameters
if [[ -n "$KC_DB_URL" ]]; then
    log "Database URL Analysis:"
    if echo "$KC_DB_URL" | grep -q "connectTimeout"; then
        timeout=$(echo "$KC_DB_URL" | grep -o 'connectTimeout=[0-9]*' | cut -d'=' -f2)
        log "  ✅ Connect timeout set: ${timeout}ms"
    else
        log "  ⚠️  No connect timeout specified (may cause slow startup)"
    fi
    
    if echo "$KC_DB_URL" | grep -q "socketTimeout"; then
        timeout=$(echo "$KC_DB_URL" | grep -o 'socketTimeout=[0-9]*' | cut -d'=' -f2)
        log "  ✅ Socket timeout set: ${timeout}ms"
    else
        log "  ⚠️  No socket timeout specified"
    fi
    
    if echo "$KC_DB_URL" | grep -q "loginTimeout"; then
        timeout=$(echo "$KC_DB_URL" | grep -o 'loginTimeout=[0-9]*' | cut -d'=' -f2)
        log "  ✅ Login timeout set: ${timeout}s"
    else
        log "  ⚠️  No login timeout specified"
    fi
fi

log "=== LIQUIBASE CONFIGURATION ANALYSIS ==="

# Check Liquibase environment variables
log "Liquibase Environment Variables:"
log "  QUARKUS_LIQUIBASE_MIGRATE_AT_START: ${QUARKUS_LIQUIBASE_MIGRATE_AT_START:-'NOT_SET'}"
log "  QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE: ${QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE:-'NOT_SET'}"
log "  QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS: ${QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS:-'NOT_SET'}"
log "  QUARKUS_LIQUIBASE_DROP_FIRST: ${QUARKUS_LIQUIBASE_DROP_FIRST:-'NOT_SET'}"

# Check for Liquibase system properties in JVM options
log "Liquibase System Properties in JVM Options:"
if [[ -n "$JAVA_OPTS_APPEND" ]]; then
    if echo "$JAVA_OPTS_APPEND" | grep -q "quarkus.liquibase"; then
        log "  ✅ Found Liquibase system properties:"
        echo "$JAVA_OPTS_APPEND" | grep -o '\-Dquarkus\.liquibase[^[:space:]]*' | while read param; do
            log "    $param"
        done
    else
        log "  ⚠️  No Liquibase system properties found in JVM options"
    fi
fi

log "=== TRANSACTION CONFIGURATION ANALYSIS ==="

# Check transaction recovery settings
log "Transaction Recovery Settings:"
log "  QUARKUS_TRANSACTION_MANAGER_ENABLE_RECOVERY: ${QUARKUS_TRANSACTION_MANAGER_ENABLE_RECOVERY:-'NOT_SET'}"

if [[ "$QUARKUS_TRANSACTION_MANAGER_ENABLE_RECOVERY" == "false" ]]; then
    log "  ✅ Transaction recovery disabled (faster startup)"
else
    log "  ⚠️  Transaction recovery enabled (slower startup)"
fi

log "=== LOGGING CONFIGURATION ANALYSIS ==="

# Check logging levels that affect performance
log "Logging Levels (affecting performance):"
log "  KC_LOG_LEVEL: ${KC_LOG_LEVEL:-'NOT_SET'}"
log "  QUARKUS_LOG_LEVEL: ${QUARKUS_LOG_LEVEL:-'NOT_SET'}"
log "  QUARKUS_LOG_CATEGORY_LIQUIBASE_LEVEL: ${QUARKUS_LOG_CATEGORY_LIQUIBASE_LEVEL:-'NOT_SET'}"
log "  QUARKUS_LOG_CATEGORY_ORG_JGROUPS_LEVEL: ${QUARKUS_LOG_CATEGORY_ORG_JGROUPS_LEVEL:-'NOT_SET'}"

# Analyze logging impact
if [[ "$KC_LOG_LEVEL" == "DEBUG" ]] || [[ "$QUARKUS_LOG_CATEGORY_LIQUIBASE_LEVEL" == "DEBUG" ]]; then
    log "  ❌ DEBUG logging enabled - significantly slows startup"
elif [[ "$KC_LOG_LEVEL" == "INFO" ]] && [[ "$QUARKUS_LOG_CATEGORY_LIQUIBASE_LEVEL" == "INFO" ]]; then
    log "  ✅ INFO level logging (reasonable performance)"
else
    log "  ⚠️  Mixed logging levels detected"
fi

log "=== PERFORMANCE RECOMMENDATIONS ==="
log "For faster startup on Render free tier:"
log "1. Add database connection timeouts to KC_DB_URL:"
log "   ?connectTimeout=5000&socketTimeout=10000&loginTimeout=10"
log "2. Disable Liquibase validation: validate-on-migrate=false"
log "3. Set logging to WARN/INFO level (not DEBUG)"
log "4. Disable transaction recovery: enable-recovery=false"
log "5. Use system properties for Liquibase (higher precedence)"

log "=== DIAGNOSTIC COMPLETE ==="