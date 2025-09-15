# Keycloak Build-Time Options Fix - September 15, 2025

## Problem Identified

After fixing the proxy configuration, a new error emerged:

```
Build time option: '--health-enabled' not usable with pre-built image and --optimized
Possible solutions: --help-all, --help
Try 'kc.sh start --help' for more information on the available options.
```

## Root Cause

The `--health-enabled` and `--metrics-enabled` options are **build-time options** that cannot be specified at runtime when using `--optimized` with pre-built images. These features must be configured during the Docker build phase.

## Solution Applied

### Verification
The Dockerfile already has these features enabled at build time:
```dockerfile
ENV KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=true \
```

### Fix Applied
Removed the runtime options from both startup scripts:

**Before:**
```bash
exec /opt/keycloak/bin/kc.sh start \
    --optimized \
    --http-enabled=true \
    --http-host=0.0.0.0 \
    --http-port=8080 \
    --health-enabled=true \     # ❌ Build-time option
    --metrics-enabled=true      # ❌ Build-time option
```

**After:**
```bash
exec /opt/keycloak/bin/kc.sh start \
    --optimized \
    --http-enabled=true \
    --http-host=0.0.0.0 \
    --http-port=8080
    # Health and metrics are already enabled in Dockerfile
```

## Keycloak Build-Time vs Runtime Options

### Build-Time Options (configured in Dockerfile)
These cannot be used with `--optimized`:
- `--db=postgres` ❌
- `--health-enabled` ❌
- `--metrics-enabled` ❌
- `--features=...` ❌

### Runtime Options (can be used with `--optimized`)
These are safe to use:
- `--db-url=...` ✅
- `--db-username=...` ✅
- `--db-password=...` ✅
- `--hostname=...` ✅
- `--proxy=...` ✅
- `--http-enabled` ✅
- `--http-port` ✅

## Files Modified

1. `keycloak/nuclear-reset-startup.sh` - Removed `--health-enabled` and `--metrics-enabled`
2. `keycloak/force-reset-startup.sh` - Removed `--health-enabled` and `--metrics-enabled`

## Verification

The Dockerfile confirms these features are enabled:
- Line 20: `KC_HEALTH_ENABLED=true`
- Line 21: `KC_METRICS_ENABLED=true`
- Lines 59-60: Health check is configured

## Expected Result

The deployment should now proceed without build-time option errors. Health and metrics will still be available because they are configured in the Docker image.

## Related Fixes

This fix was applied in addition to:
- Liquibase checksum validation fix
- Proxy configuration fixes
- Database connection parameter fixes

## Next Steps

1. Push the updated scripts to your repository
2. The next Render deployment should succeed
3. Verify health endpoint: `/health/ready`
4. Verify metrics endpoint: `/metrics` (if needed)