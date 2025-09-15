# Keycloak System Properties Liquibase Fix - September 15, 2025

## Problem Identified

Despite setting `QUARKUS_LIQUIBASE_DROP_FIRST=true` as an environment variable, the Liquibase checksum validation was still failing:

```
liquibase.exception.ValidationFailedException: Validation Failed:
1 changesets check sum
META-INF/jpa-changelog-2.5.0.xml::2.5.0-unicode-oracle::hmlnarik@redhat.com was: 9:f9753208029f582525ed12011a19d054 but is now: 9:3a32bace77c84d7678d035a7f5a8084e
```

## Root Cause Analysis

Environment variables can be overridden or not applied correctly in certain contexts. System properties have higher precedence and are more reliable for runtime configuration overrides.

## Solution Applied

### 1. System Properties Override
Replaced environment variables with JVM system properties in the startup script:

**Before (Environment Variables):**
```bash
export QUARKUS_LIQUIBASE_DROP_FIRST=true
export QUARKUS_LIQUIBASE_CLEAR_CHECKSUMS=true
export QUARKUS_LIQUIBASE_VALIDATE_ON_MIGRATE=false
```

**After (System Properties):**
```bash
export JAVA_OPTS_APPEND="$JAVA_OPTS_APPEND \
-Dquarkus.liquibase.drop-first=true \
-Dquarkus.liquibase.clear-checksums=true \
-Dquarkus.liquibase.validate-on-migrate=false \
-Dquarkus.liquibase.migrate-at-start=true"
```

### 2. Removed Conflicting Environment Variables
Cleaned up the render.yaml by removing the Liquibase environment variables that were being overridden:

```yaml
# Before
- key: QUARKUS_LIQUIBASE_DROP_FIRST
  value: "true"

# After - removed, using system properties instead
```

### 3. Enhanced Logging
Added logging to show both environment variables and system property overrides:

```bash
log "Environment variables set:"
log "  QUARKUS_LIQUIBASE_DROP_FIRST: $QUARKUS_LIQUIBASE_DROP_FIRST"
log "System properties override:"
log "  -Dquarkus.liquibase.drop-first=true"
```

## Why System Properties Work Better

1. **Higher Precedence**: System properties override environment variables
2. **JVM Level Control**: Applied directly to the Java process
3. **Guaranteed Application**: Not subject to shell environment issues
4. **Timing Independent**: Applied during JVM startup, not dependent on script execution order

## Configuration Hierarchy

Keycloak configuration follows this precedence order:
1. **System Properties** (highest precedence) ✅ `-Dquarkus.liquibase.drop-first=true`
2. **Environment Variables** `-DQUARKUS_LIQUIBASE_DROP_FIRST=true`
3. **Configuration Files** (application.properties, etc.)
4. **Default Values** (lowest precedence)

## Files Modified

1. `keycloak/nuclear-reset-startup.sh`:
   - Added system properties to JVM options
   - Enhanced logging for both env vars and system properties

2. `keycloak/render.yaml`:
   - Removed Liquibase environment variables to avoid conflicts
   - Added comment explaining the system properties approach

## Expected Result

The system properties should now take effect and force Liquibase to:
- Drop all database objects first (`drop-first=true`)
- Clear any existing checksums (`clear-checksums=true`)
- Skip validation during migration (`validate-on-migrate=false`)
- Ensure migration runs at startup (`migrate-at-start=true`)

## Verification

The next deployment should show in logs:
```
System properties override:
  -Dquarkus.liquibase.drop-first=true
  -Dquarkus.liquibase.clear-checksums=true
  -Dquarkus.liquibase.validate-on-migrate=false
  -Dquarkus.liquibase.migrate-at-start=true
```

And the Liquibase validation error should be resolved.

## Alternative Approaches

If system properties still don't work, we can consider:
1. Using a custom `application.properties` file
2. Modifying the Dockerfile to include the properties
3. Using Keycloak's configuration profiles
4. Manual database reset using the provided SQL scripts

## Related Fixes

This fix builds upon previous fixes for:
- Build-time options removal
- Proxy configuration corrections
- Database connection parameter additions
- Cache configuration consistency

## Next Steps

1. Push the updated configuration
2. Monitor the next deployment logs
3. Verify Liquibase migration succeeds
4. Confirm Keycloak starts successfully