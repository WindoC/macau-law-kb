# Database Migration Guide

This document explains how to migrate your existing Supabase database to work with the new direct PostgreSQL implementation.

## Overview

The migration adds minimal changes to your existing database schema:
- Adds `provider` and `provider_id` columns to the `users` table for OIDC authentication
- Creates performance indexes for common queries
- Updates existing users with legacy provider information
- **No data loss** - all existing data is preserved

## Prerequisites

1. **Environment Variables**: Ensure your `.env` file has the correct database connection details:
   ```bash
   DATABASE_URL=postgresql://postgres:password@host:5432/database
   DB_HOST=your-supabase-postgres-host
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your-password
   DB_SSL=true
   ```

2. **Database Access**: You need direct PostgreSQL access to your Supabase database (not through Supabase client)

## Migration Steps

### Step 1: Run Database Migration

```bash
cd webapp
npm run db:migrate
```

This will:
- Add `provider` and `provider_id` columns to the `users` table
- Create performance indexes
- Update existing users with `provider = 'legacy'`

### Step 2: Verify Migration

Check that the migration was successful:

```bash
# Connect to your database and verify
psql $DATABASE_URL -c "SELECT provider, COUNT(*) FROM users GROUP BY provider;"
```

You should see output like:
```
 provider | count
----------+-------
 legacy   |    10
(1 row)
```

### Step 3: (Optional) Seed Test Data

For development/testing, you can add sample data:

```bash
npm run db:seed
```

This creates:
- A test user with email `test@example.com`
- Sample search history
- Sample QA history
- Sample conversation data

### Step 4: Setup Complete Database

Run both migration and seeding in one command:

```bash
npm run db:setup
```

## Schema Changes

### New Columns Added

```sql
-- Added to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'oidc';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id TEXT;
```

### New Indexes Created

```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_history_user_created ON qa_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultant_conversations_user ON consultant_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultant_messages_conversation ON consultant_messages(conversation_id, created_at ASC);
```

### Data Updates

```sql
-- Update existing users
UPDATE users SET provider = 'legacy', provider_id = id::text WHERE provider IS NULL;
```

## Authentication Provider Values

After migration, users will have one of these provider values:

- `legacy` - Existing users from before OIDC migration
- `google` - Users who log in with Google OIDC
- `github` - Users who log in with GitHub OAuth
- `test` - Test users created by seeding script

## Rollback

If you need to rollback the migration:

```sql
-- Remove added columns (optional - they don't interfere with old code)
ALTER TABLE users DROP COLUMN IF EXISTS provider;
ALTER TABLE users DROP COLUMN IF EXISTS provider_id;

-- Remove indexes (optional - they only improve performance)
DROP INDEX IF EXISTS idx_users_provider;
DROP INDEX IF EXISTS idx_search_history_user_created;
DROP INDEX IF EXISTS idx_qa_history_user_created;
DROP INDEX IF EXISTS idx_consultant_conversations_user;
DROP INDEX IF EXISTS idx_consultant_messages_conversation;
```

## Troubleshooting

### Connection Issues

If you get connection errors:

1. **Check SSL Settings**: Ensure `DB_SSL=true` for Supabase
2. **Verify Credentials**: Double-check your database password and host
3. **Network Access**: Ensure your IP is whitelisted in Supabase dashboard

### Permission Issues

If you get permission errors:

1. **Database User**: Ensure your database user has CREATE and ALTER permissions
2. **Schema Access**: Verify you're connecting to the correct schema (usually `public`)

### Migration Already Run

If you see "column already exists" errors, the migration has already been run successfully. This is safe to ignore.

## Verification Queries

After migration, verify everything is working:

```sql
-- Check user table structure
\d users

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname LIKE 'idx_%';

-- Check user data
SELECT id, email, provider, provider_id FROM users LIMIT 5;

-- Check all tables are accessible
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

## Next Steps

After successful migration:

1. **Test Authentication**: Try logging in with Google/GitHub
2. **Test API Endpoints**: Verify search, QA, and consultant features work
3. **Monitor Performance**: Check that new indexes improve query performance
4. **Update Production**: Run the same migration on your production database

## Support

If you encounter issues:

1. Check the migration script logs for specific error messages
2. Verify your database connection settings
3. Ensure you have the required database permissions
4. Check that your database version supports the required features (PostgreSQL 12+)