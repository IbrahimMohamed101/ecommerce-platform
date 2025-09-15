#!/bin/bash
set -e

echo "=== Keycloak NUCLEAR RESET Startup Script ==="
echo "Timestamp: $(date)"
echo "Environment: Production - NUCLEAR RESET MODE"
echo "WARNING: This will completely reset the database schema"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "NUCLEAR RESET MODE: This will drop and recreate all database objects"

# Set critical environment variables explicitly
export QUARKUS_LIQUIBASE_MIGRATE_AT_START=true
export QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE=false
export QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS=true
export QUARKUS_LIQUIBASE_DROP_FIRST=true
export KC_CACHE=tcp             # Changed from 'local' to supported value
export KC_CLUSTERING=false

log "Environment variables set:"
log "  QUARKUS_LIQUIBASE_DROP_FIRST: $QUARKUS_LIQUIBASE_DROP_FIRST"
log "  QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS: $QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS"
log "  QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE: $QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE"
log "  KC_CACHE: $KC_CACHE"
log "  KC_CLUSTERING: $KC_CLUSTERING"

# Nuclear JVM options - force everything through system properties
export JAVA_OPTS_APPEND="$JAVA_OPTS_APPEND -Dkeycloak.profile=production \
-Djgroups.bind_addr=127.0.0.1 \
-Djgroups.tcpping.initial_hosts=127.0.0.1[7800] \
-Dinfinispan.cluster.name=local \
-Dinfinispan.node.name=single-node \
-Djgroups.discovery.protocol=LOCAL \
-Dquarkus.liquibase.migrate-at-start=true \
-Dquarkus.liquibase.validate-on-migrate=false \
-Dquarkus.liquibase.clear-checksums=true \
-Dquarkus.liquibase.drop-first=true"

log "Starting Keycloak with NUCLEAR RESET configuration..."
log "JVM Options: $JAVA_OPTS_APPEND"

# Start Keycloak with nuclear reset
exec /opt/keycloak/bin/kc.sh start \
    --optimized \
    --hostname="$KC_HOSTNAME" \
    --hostname-strict=false \
    --proxy=passthrough \
    --http-enabled=true \
    --http-host=0.0.0.0 \
    --http-port=8080 \
    --health-enabled=true \
    --metrics-enabled=true
