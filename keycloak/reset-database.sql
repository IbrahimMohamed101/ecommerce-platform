-- Database reset script for Keycloak Liquibase checksum issues
-- This script will clear the Liquibase changelog lock and reset checksums

-- Clear any locks that might be preventing migration
DELETE FROM DATABASECHANGELOGLOCK WHERE ID = 1;
INSERT INTO DATABASECHANGELOGLOCK (ID, LOCKED, LOCKGRANTED, LOCKEDBY) VALUES (1, FALSE, NULL, NULL);

-- Clear all Liquibase changelog entries to force a fresh migration
-- WARNING: This will cause Keycloak to recreate all database objects
-- Only use this if you're okay with losing existing data
TRUNCATE TABLE DATABASECHANGELOG;

-- Alternative: Just clear the problematic changeset
-- Uncomment the line below instead of TRUNCATE if you want to preserve other data
-- DELETE FROM DATABASECHANGELOG WHERE ID = '2.5.0-unicode-oracle' AND AUTHOR = 'hmlnarik@redhat.com';