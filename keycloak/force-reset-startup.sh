#!/bin/bash
set -e

echo "=== Keycloak Force Reset Startup Script ==="
echo "Timestamp: $(date)"
echo "Environment: Production - AGGRESSIVE RESET MODE"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "FORCE RESET MODE: This will clear Liquibase checksums and force fresh migration"

# Set critical environment variables explicitly
export QUARKUS_LIQUIBASE_MIGRATE_AT_START=true
export QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE=false
export QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS=true
export QUARKUS_LIQUIBASE_DROP_FIRST=false
export KC_CACHE=local
export KC_CLUSTERING=false

log "Environment variables set:"
log "  QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS: $QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS"
log "  QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE: $QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE"
log "  KC_CACHE: $KC_CACHE"
log "  KC_CLUSTERING: $KC_CLUSTERING"

# Enhanced JVM options with Liquibase overrides and clustering disable
export JAVA_OPTS_APPEND="$JAVA_OPTS_APPEND -Dkeycloak.profile=production -Djgroups.bind_addr=127.0.0.1 -Djgroups.tcpping.initial_hosts=127.0.0.1[7800] -Dinfinispan.cluster.name=local -Dinfinispan.node.name=single-node -Djgroups.discovery.protocol=LOCAL -Dquarkus.liquibase.migrate-at-start=true -Dquarkus.liquibase.validate-on-migrate=false -Dquarkus.liquibase.clear-checksums=true"

log "Starting Keycloak with force reset configuration..."
log "JVM Options: $JAVA_OPTS_APPEND"

# Start Keycloak with explicit parameters (no build-time options with --optimized)
exec /opt/keycloak/bin/kc.sh start \
    --db=postgres \
    --db-url="$KC_DB_URL" \
    --db-username="$KC_DB_USERNAME" \
    --db-password="$KC_DB_PASSWORD" \
    --hostname="$KC_HOSTNAME" \
    --hostname-strict=false \
    --proxy passthrough \
    --http-enabled=true \
    --http-host=0.0.0.0 \
    --http-port=8080 \
    --health-enabled=true \
    --metrics-enabled=true
