#!/bin/bash
set -e

echo "=== JGroups Clustering Diagnostic Script ==="
echo "Timestamp: $(date)"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] DIAGNOSTIC: $1"
}

log "=== CLUSTERING CONFIGURATION ANALYSIS ==="

# Check clustering environment variables
log "Environment Variables:"
log "  KC_CLUSTERING: ${KC_CLUSTERING:-'NOT_SET'}"
log "  KC_CACHE: ${KC_CACHE:-'NOT_SET'}"
log "  KC_CACHE_STACK: ${KC_CACHE_STACK:-'NOT_SET'}"
log "  JGROUPS_DISCOVERY_PROTOCOL: ${JGROUPS_DISCOVERY_PROTOCOL:-'NOT_SET'}"

# Check JVM options for clustering parameters
log "JVM Options Analysis:"
log "  JAVA_OPTS_APPEND: ${JAVA_OPTS_APPEND:-'NOT_SET'}"

# Extract clustering-related JVM parameters
if [[ -n "$JAVA_OPTS_APPEND" ]]; then
    if echo "$JAVA_OPTS_APPEND" | grep -q "jgroups"; then
        log "  ⚠️  FOUND JGroups parameters in JVM options:"
        echo "$JAVA_OPTS_APPEND" | grep -o '\-Djgroups[^[:space:]]*' | while read param; do
            log "    $param"
        done
    else
        log "  ✅ No JGroups parameters found in JVM options"
    fi
    
    if echo "$JAVA_OPTS_APPEND" | grep -q "infinispan"; then
        log "  ⚠️  FOUND Infinispan parameters in JVM options:"
        echo "$JAVA_OPTS_APPEND" | grep -o '\-Dinfinispan[^[:space:]]*' | while read param; do
            log "    $param"
        done
    else
        log "  ✅ No Infinispan clustering parameters found"
    fi
fi

# Check for conflicting configurations
log "=== CONFIGURATION CONFLICT ANALYSIS ==="

if [[ "$KC_CLUSTERING" == "false" ]]; then
    log "✅ KC_CLUSTERING is properly set to false"
    
    # But check if JVM options contradict this
    if echo "$JAVA_OPTS_APPEND" | grep -q "jgroups.tcpping.initial_hosts"; then
        log "❌ CONFLICT: KC_CLUSTERING=false but JGroups TCP ping hosts are configured"
        log "   This may cause JGroups to attempt clustering despite KC_CLUSTERING=false"
    fi
    
    if echo "$JAVA_OPTS_APPEND" | grep -q "infinispan.cluster.name"; then
        log "❌ CONFLICT: KC_CLUSTERING=false but Infinispan cluster name is set"
    fi
else
    log "❌ KC_CLUSTERING is not set to false (current: ${KC_CLUSTERING:-'NOT_SET'})"
fi

# Check cache configuration
if [[ "$KC_CACHE" == "local" ]]; then
    log "✅ KC_CACHE is properly set to local"
else
    log "❌ KC_CACHE should be 'local' for single-node (current: ${KC_CACHE:-'NOT_SET'})"
fi

log "=== RECOMMENDATIONS ==="
log "For single-node deployment, ensure:"
log "1. KC_CLUSTERING=false"
log "2. KC_CACHE=local"
log "3. Remove JGroups parameters from JAVA_OPTS_APPEND"
log "4. Remove Infinispan cluster parameters"
log "5. Set JGROUPS_DISCOVERY_PROTOCOL=LOCAL"

log "=== DIAGNOSTIC COMPLETE ==="