# Keycloak Proxy Option Fix - September 15, 2025

## Problem Identified

After fixing the Liquibase checksum validation error, a new issue emerged:

```
Unknown option: '--proxy-headers'
Possible solutions: --proxy
Try 'kc.sh start --help' for more information on the available options.
```

## Root Cause

The `--proxy-headers` option is not valid for Keycloak 23.0. The correct option is `--proxy` with a value.

## Solution Applied

### Files Fixed

1. **nuclear-reset-startup.sh** (Line 43):
   - **Before**: `--proxy-headers=xforwarded`
   - **After**: `--proxy=xforwarded`

2. **force-reset-startup.sh** (Line 44):
   - **Before**: `--proxy-headers=xforwarded`
   - **After**: `--proxy=xforwarded`

### Keycloak 23.0 Proxy Options

For Keycloak 23.0, the valid proxy configuration values are:
- `--proxy=edge` - For edge proxy with forwarded headers (recommended for Render)
- `--proxy=reencrypt` - For re-encrypting proxy
- `--proxy=passthrough` - For direct proxy passthrough
- `--proxy=none` - To disable proxy support

## Verification

The deployment should now proceed past the proxy option error and continue with the database migration process.

## Related Fixes

This fix was applied in addition to:
- Liquibase checksum validation fix
- Database connection parameter fixes
- Cache configuration consistency fixes

## Next Steps

1. Push the updated scripts to your repository
2. The next Render deployment should succeed
3. Monitor logs for successful Keycloak startup
4. Verify the `/health/ready` endpoint

## Files Modified

1. `keycloak/nuclear-reset-startup.sh` - Fixed proxy option
2. `keycloak/force-reset-startup.sh` - Fixed proxy option
3. `keycloak/LIQUIBASE_CHECKSUM_FIX.md` - Updated documentation
4. `keycloak/PROXY_OPTION_FIX.md` - This documentation