#!/bin/bash
set -e

echo "=== Keycloak Diagnostic Startup Script ==="
echo "Timestamp: $(date)"
echo "Environment: Production"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting Keycloak diagnostic checks..."

# Check database connectivity
log "Testing database connectivity..."
if command -v psql &> /dev/null; then
    if psql "$KC_DB_URL" -U "$KC_DB_USERNAME" -c "SELECT 1;" &> /dev/null; then
        log "✓ Database connection successful"
    else
        log "✗ Database connection failed"
        exit 1
    fi
else
    log "⚠ psql not available, skipping database connectivity test"
fi

# Check for Liquibase lock issues
log "Checking for Liquibase locks..."
if command -v psql &> /dev/null; then
    LOCK_COUNT=$(psql "$KC_DB_URL" -U "$KC_DB_USERNAME" -t -c "SELECT COUNT(*) FROM DATABASECHANGELOGLOCK WHERE LOCKED = true;" 2>/dev/null || echo "0")
    if [ "$LOCK_COUNT" -gt 0 ]; then
        log "⚠ Found $LOCK_COUNT Liquibase locks, clearing them..."
        psql "$KC_DB_URL" -U "$KC_DB_USERNAME" -c "UPDATE DATABASECHANGELOGLOCK SET LOCKED = false, LOCKGRANTED = NULL, LOCKEDBY = NULL;" || true
    else
        log "✓ No Liquibase locks found"
    fi
fi

# Display current configuration
log "Current Keycloak configuration:"
log "  KC_DB: $KC_DB"
log "  KC_CACHE: $KC_CACHE"
log "  KC_CLUSTERING: $KC_CLUSTERING"
log "  QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS: $QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS"
log "  QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE: $QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE"

# Check for problematic changeset
log "Checking for problematic Liquibase changeset..."
if command -v psql &> /dev/null; then
    PROBLEMATIC_CHANGESET=$(psql "$KC_DB_URL" -U "$KC_DB_USERNAME" -t -c "SELECT COUNT(*) FROM DATABASECHANGELOG WHERE ID = '2.5.0-unicode-oracle' AND AUTHOR = 'hmlnarik@redhat.com';" 2>/dev/null || echo "0")
    if [ "$PROBLEMATIC_CHANGESET" -gt 0 ]; then
        log "⚠ Found problematic changeset, this may cause validation issues"
        log "  Consider running the database reset script if startup continues to fail"
    else
        log "✓ Problematic changeset not found in database"
    fi
fi

log "Diagnostic checks completed. Starting Keycloak..."

# Start Keycloak with enhanced logging
exec /opt/keycloak/bin/kc.sh start --optimized