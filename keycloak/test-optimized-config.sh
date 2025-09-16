#!/bin/bash
set -e

echo "=== Keycloak Render Optimization Validation Test ==="
echo "Timestamp: $(date)"
echo "Testing optimized configuration before deployment..."

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] TEST: $1"
}

# Function to check configuration
check_config() {
    local file="$1"
    local description="$2"
    
    if [[ -f "$file" ]]; then
        log "✅ Found $description: $file"
        return 0
    else
        log "❌ Missing $description: $file"
        return 1
    fi
}

# Function to validate YAML syntax
validate_yaml() {
    local file="$1"
    
    if command -v python3 >/dev/null 2>&1; then
        if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
            log "✅ YAML syntax valid: $file"
            return 0
        else
            log "❌ YAML syntax error in: $file"
            return 1
        fi
    else
        log "⚠️  Cannot validate YAML syntax (python3 not available)"
        return 0
    fi
}

# Function to check for specific optimizations
check_optimization() {
    local file="$1"
    local pattern="$2"
    local description="$3"
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        log "✅ $description found in $file"
        return 0
    else
        log "❌ $description missing in $file"
        return 1
    fi
}

log "=== CONFIGURATION FILE VALIDATION ==="

# Check if optimized files exist
config_files_ok=true
check_config "keycloak/render-optimized.yaml" "Optimized Render configuration" || config_files_ok=false
check_config "keycloak/Dockerfile.keycloak-optimized" "Optimized Dockerfile" || config_files_ok=false
check_config "keycloak/RENDER_OPTIMIZATION_GUIDE.md" "Optimization guide" || config_files_ok=false

if [[ "$config_files_ok" == "false" ]]; then
    log "❌ Missing required configuration files"
    exit 1
fi

log "=== YAML SYNTAX VALIDATION ==="

# Validate YAML syntax
yaml_ok=true
validate_yaml "keycloak/render-optimized.yaml" || yaml_ok=false

if [[ "$yaml_ok" == "false" ]]; then
    log "❌ YAML syntax errors found"
    exit 1
fi

log "=== OPTIMIZATION VALIDATION ==="

# Check critical optimizations in render-optimized.yaml
optimizations_ok=true

# 1. Check JGroups clustering is disabled
check_optimization "keycloak/render-optimized.yaml" "value: false" "JGroups clustering disabled" || optimizations_ok=false
check_optimization "keycloak/render-optimized.yaml" "value: local" "Local cache configuration" || optimizations_ok=false

# 2. Check memory optimization
check_optimization "keycloak/render-optimized.yaml" "MaxRAMPercentage=50.0" "Memory optimization (50% heap)" || optimizations_ok=false

# 3. Check database timeouts
check_optimization "keycloak/render-optimized.yaml" "connectTimeout=5000" "Database connection timeout" || optimizations_ok=false
check_optimization "keycloak/render-optimized.yaml" "socketTimeout=10000" "Database socket timeout" || optimizations_ok=false

# 4. Check logging optimization
check_optimization "keycloak/render-optimized.yaml" "value: WARN" "Optimized logging level" || optimizations_ok=false

# 5. Check JGroups bind address fix
check_optimization "keycloak/render-optimized.yaml" "jgroups.bind_addr=SITE_LOCAL" "JGroups bind address fix" || optimizations_ok=false

# 6. Check Infinispan local stack
check_optimization "keycloak/render-optimized.yaml" "infinispan.cluster.stack=local" "Infinispan local stack" || optimizations_ok=false

# 7. Check transaction recovery disabled
check_optimization "keycloak/render-optimized.yaml" "enable-recovery=false" "Transaction recovery disabled" || optimizations_ok=false

# 8. Check Liquibase optimizations
check_optimization "keycloak/render-optimized.yaml" "validate-on-migrate=false" "Liquibase validation disabled" || optimizations_ok=false

log "=== DOCKERFILE VALIDATION ==="

# Check Dockerfile optimizations
check_optimization "keycloak/Dockerfile.keycloak-optimized" "MaxRAMPercentage=50.0" "Dockerfile memory optimization" || optimizations_ok=false
check_optimization "keycloak/Dockerfile.keycloak-optimized" "KC_CLUSTERING=false" "Dockerfile clustering disabled" || optimizations_ok=false
check_optimization "keycloak/Dockerfile.keycloak-optimized" "UseG1GC" "G1 garbage collector enabled" || optimizations_ok=false

log "=== CONFIGURATION CONFLICT CHECK ==="

# Check for potential conflicts
conflicts_found=false

# Check if old configuration might conflict
if [[ -f "keycloak/render.yaml" ]]; then
    log "⚠️  Original render.yaml still exists - may cause conflicts"
    log "   Recommendation: Rename to render.yaml.backup"
    conflicts_found=true
fi

if [[ -f "render.yaml" ]] && grep -q "keycloak" "render.yaml" 2>/dev/null; then
    log "⚠️  Main render.yaml contains Keycloak configuration"
    log "   Recommendation: Use only keycloak/render-optimized.yaml"
    conflicts_found=true
fi

log "=== DEPLOYMENT READINESS CHECK ==="

deployment_ready=true

if [[ "$optimizations_ok" == "false" ]]; then
    log "❌ Critical optimizations missing"
    deployment_ready=false
fi

if [[ "$config_files_ok" == "false" ]]; then
    log "❌ Required configuration files missing"
    deployment_ready=false
fi

if [[ "$yaml_ok" == "false" ]]; then
    log "❌ YAML syntax errors"
    deployment_ready=false
fi

log "=== TEST RESULTS SUMMARY ==="

if [[ "$deployment_ready" == "true" ]]; then
    log "🎉 OPTIMIZATION VALIDATION PASSED"
    log ""
    log "✅ All critical optimizations are in place"
    log "✅ Configuration files are valid"
    log "✅ Ready for deployment to Render"
    log ""
    log "Next steps:"
    log "1. Deploy using: keycloak/render-optimized.yaml"
    log "2. Update Dockerfile path to: keycloak/Dockerfile.keycloak-optimized"
    log "3. Monitor startup logs for improvements"
    log "4. Expected startup time: 1-2 minutes (down from 3-5 minutes)"
    log "5. Expected result: No JGroups clustering errors"
    
    if [[ "$conflicts_found" == "true" ]]; then
        log ""
        log "⚠️  WARNINGS (non-critical):"
        log "   - Configuration conflicts detected"
        log "   - Review and resolve before deployment"
    fi
    
    exit 0
else
    log "❌ OPTIMIZATION VALIDATION FAILED"
    log ""
    log "Issues found:"
    [[ "$optimizations_ok" == "false" ]] && log "   - Missing critical optimizations"
    [[ "$config_files_ok" == "false" ]] && log "   - Missing configuration files"
    [[ "$yaml_ok" == "false" ]] && log "   - YAML syntax errors"
    log ""
    log "Please fix these issues before deployment"
    exit 1
fi