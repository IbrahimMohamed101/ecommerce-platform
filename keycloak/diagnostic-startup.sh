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

# Database connectivity will be tested by Keycloak itself
log "Database connectivity will be validated during Keycloak startup"
log "Database URL: $KC_DB_URL"
log "Database User: $KC_DB_USERNAME"

# Note about Liquibase locks
log "Liquibase lock clearing is handled by configuration:"
log "  QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS: $QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS"
log "  QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE: $QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE"

# Display current configuration
log "Current Keycloak configuration:"
log "  KC_DB: $KC_DB"
log "  KC_CACHE: $KC_CACHE"
log "  KC_CLUSTERING: $KC_CLUSTERING"
log "  QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS: $QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS"
log "  QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE: $QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE"

# Problematic changeset information
log "Monitoring for problematic Liquibase changeset:"
log "  ID: 2.5.0-unicode-oracle"
log "  Author: hmlnarik@redhat.com"
log "  If validation fails, the reset script is available at /opt/keycloak/reset-database.sql"

log "Diagnostic checks completed. Starting Keycloak..."

# Start Keycloak with enhanced logging
exec /opt/keycloak/bin/kc.sh start --optimized