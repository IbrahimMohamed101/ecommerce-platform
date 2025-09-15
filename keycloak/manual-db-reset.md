# Manual Database Reset for Keycloak Liquibase Issues

## When to Use This
If the force reset startup script still fails with Liquibase validation errors, you may need to manually reset the database.

## Option 1: Connect via psql and Reset
```bash
# Connect to the database
psql "postgresql://keycloak_db_yuis_user:xuj0ZjSoBD8zwKJBFMbC1Cs6SiI6cZ6q@dpg-d32g543ipnbc73d5js20-a:5432/keycloak_db_yuis"

# Clear Liquibase locks
DELETE FROM DATABASECHANGELOGLOCK WHERE ID = 1;
INSERT INTO DATABASECHANGELOGLOCK (ID, LOCKED, LOCKGRANTED, LOCKEDBY) VALUES (1, FALSE, NULL, NULL);

# Option A: Remove only the problematic changeset
DELETE FROM DATABASECHANGELOG WHERE ID = '2.5.0-unicode-oracle' AND AUTHOR = 'hmlnarik@redhat.com';

# Option B: Complete reset (WARNING: This will recreate all tables)
TRUNCATE TABLE DATABASECHANGELOG;

# Exit psql
\q
```

## Option 2: Use Render.com Database Console
1. Go to your Render.com dashboard
2. Navigate to your PostgreSQL database service
3. Click "Connect" and use the web console
4. Run the SQL commands above

## Option 3: Temporary Environment Variable Override
Add this to your render.yaml temporarily:
```yaml
- key: QUARKUS_LIQUIBASE_DROP_FIRST
  value: "true"
```

**WARNING**: This will drop and recreate all database objects. Remove this variable after successful deployment.

## Verification
After running the reset, check the deployment logs for:
- No Liquibase validation errors
- Successful database migration messages
- No JGroups clustering warnings