---
title: "Database Migration: Safely Managing Dev and Production Environments"
emoji: "🛡️"
type: "tech"
topics: ["Supabase", "PostgreSQL", "DrizzleORM", "ClaudeCode"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 8 of **[Building SaaS Solo - Design, Implementation, and Operation Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday I wrote about "Database ID Design." Today I'll explain how to manage database migrations.

:::message
The approach described in this article is something I arrived at through trial and error. If you know a better way, please let me know in the comments.
:::

## 🎯 Common Migration Management Approaches

There are several ways to manage database migrations.

### Using ORM Migration Features

ORMs like Drizzle ORM, Prisma, and TypeORM have built-in migration features.

```bash
# For Drizzle ORM
npx drizzle-kit generate  # Generate migrations from schema
npx drizzle-kit migrate   # Apply migrations
```

For example, when you write table definitions in TypeScript, it detects changes and automatically generates SQL like `ALTER TABLE`.

**Benefits:**
- Automatically generates migration SQL from code changes
- Manages application history in database tables
- Can be applied with a single command

**Challenges:**
- Difficult to handle complex data migrations (like transforming existing data)
- Sometimes hard to understand what will be executed

### Challenges When Managing Multiple Environments

ORM migration features are convenient for single environment management, but when operating separate development and production environments, there are challenges:

- Schema can get out of sync between dev and production
- Hard to track "applied to dev but not yet to production" state
- Difficult to know what was applied when

I faced these same challenges while developing Memoreru, my indie project, and through trial and error arrived at my current operational rules.

## 📂 Migration Management for Indie Projects

### Sequential File Management

Migration files are created by Claude Code and managed with sequential numbers.

```
database/migrations/
├── sql/
│   ├── 001_create_users_table.sql
│   ├── 002_create_posts_table.sql
│   ├── 003_add_user_profile.sql
│   ├── 004_add_status_column.sql
│   └── ...
├── scripts/
│   └── migrate.sh
├── status.json
└── README.md
```

**Benefits of sequential management:**
- Application order is clear at a glance
- File names show which point in time the schema represents
- Easy to identify differences between production and development

### Why Manage SQL Files Directly

Instead of using Drizzle ORM's migration generation feature (`drizzle-kit generate`), I create SQL files directly. However, schema definitions themselves are managed with Drizzle ORM, so type safety is maintained.

**Reasons for managing SQL files directly:**
- Easier to handle complex changes (those involving data migration)
- Complete understanding of what will be executed
- Easier to identify causes when troubleshooting

## 🔄 Shared Migration Script for Dev and Production

In Memoreru, I use the **same script** to apply migrations in both development and production environments.

### Why a Shared Script

```bash
# Development environment
./database/migrations/scripts/migrate.sh dev 004_add_status_column.sql

# Production environment
./database/migrations/scripts/migrate.sh pro 004_add_status_column.sql
```

**Benefits of a shared script:**

1. **Rehearsal effect**: By following the same procedure in dev as production, you can discover problems before applying to production
2. **Unified procedure**: Having different approaches (Claude Code directly in dev, script in production) leads to accidents
3. **Centralized logging**: Execution logs from both environments remain in the same format

### Environment-Specific Differences

| Item | Development | Production |
|------|-------------|------------|
| Connection info | Auto-loaded from `.env.local` | Manual input each time |
| Backup recommendation | None | Warning displayed |

Entering the production connection string each time is tedious, but it functions as a **safety measure**. It prevents accidents where you think you're in dev but accidentally operate on production.

Additionally, I don't give Claude Code the production DB connection information. This eliminates the risk of AI accidentally operating on the production database.

Also, I take backups using pgAdmin's backup feature before applying migrations in both environments. It's important to prepare for potential rollbacks.

## 🛡️ Safety Mechanisms

The script includes the following safety measures:

- **Confirmation flow**: Displays confirmation prompts before applying to prevent mistakes
- **Connection test**: Verifies DB connection before applying
- **Automatic log saving**: Saves all execution logs to `logs/migrations/` for later review

The specific script implementation was created by Claude Code. Just tell it your requirements, and it will generate a script suited to your environment.

## 📊 Centralized Status Management with status.json

I manage the application status of both dev and production environments in a single file.

```json
{
  "lastUpdated": "2025-12-04",
  "environments": {
    "dev": {
      "name": "Development",
      "lastApplied": "004_add_status_column",
      "appliedAt": "2025-12-04"
    },
    "pro": {
      "name": "Production",
      "lastApplied": "003_add_user_profile",
      "appliedAt": "2025-11-30"
    }
  },
  "pending": {
    "pro": ["004_add_status_column"]
  }
}
```

### Checking Pending Production Migrations

```bash
# Display pending list
jq '.pending.pro' database/migrations/status.json
# => ["004_add_status_column"]
```

You can see at a glance which migrations have been applied to dev but not yet to production.

### Automatic Updates

After applying migrations, the script automatically updates `status.json`. No need to update manually, preventing forgotten updates.

## 💡 Practical Tips

### Tip 1: Make Destructive Changes Gradually

Execute column name changes or table structure changes in stages, not all at once.

```sql
-- Step 1: Add new column
ALTER TABLE contents ADD COLUMN new_name TEXT;

-- Step 2: Migrate data
UPDATE contents SET new_name = old_name;

-- Step 3: Drop old column (in a separate migration)
ALTER TABLE contents DROP COLUMN old_name;
```

By checking application behavior between steps 2 and 3, you can minimize impact even if problems occur.

### Tip 2: Prepare Rollback SQL

For important migrations, leave rollback SQL as comments.

```sql
-- Migration
ALTER TABLE contents ADD COLUMN status TEXT DEFAULT 'draft';

-- Rollback (execute only when needed)
-- ALTER TABLE contents DROP COLUMN status;
```

### Tip 3: Collaboration Rules with Claude Code

I document migration operation rules in CLAUDE.md.

```markdown
## Migration Operations

- Don't execute SQL directly with psql
- Always apply via migrate.sh script
- Rehearse in dev environment before production
- Commit status.json after applying
```

This prevents AI agents from accidentally executing SQL directly.

## ✅ Summary

Here's what I've learned from database migration operations.

**What's working well:**
- Sequential file management for chronological tracking
- Rehearsals with shared dev/production script
- Centralized status management with status.json
- Confirmation flow to prevent mistakes

**Things to be careful about:**
- Manual SQL management can become difficult as change volume increases
- Test complex data migrations with test data beforehand
- Think through rollback procedures in advance

Even for indie development, establishing rules from the start prevents problems later.

Tomorrow I'll explain "Migrating from NextAuth.js to Better Auth: Why I Switched Authentication Libraries."

---

**Other Articles in This Series**

- Day 7: Database ID Design: Choosing ID Methods and Primary Key Strategies
- Day 9: Migrating from NextAuth.js to Better Auth: Why I Switched Authentication Libraries
