---
title: "Schema Design with Supabase: Partitioning and Normalization"
emoji: "🐘"
type: "tech"
topics: ["IndieHacker", "Supabase", "PostgreSQL", "Database"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 6 of **[Building SaaS Solo - Design, Implementation, and Operation Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday I wrote about Git Branch Strategy. Today I'll explain schema design with Supabase.

## 🎯 Why Separate Schemas?

PostgreSQL has a concept called schemas. It's a mechanism for grouping tables, functioning like namespaces.

### Common Uses of Schemas

Schemas are mainly used for the following purposes:

- **Multi-tenancy**: Separate schemas per customer for complete data isolation (common in enterprise SaaS)
- **Access control**: Set permissions per schema to limit access ranges by user
- **Extension isolation**: Place extensions like pgvector in dedicated schemas

In most projects, it's common to place all tables in the `public` schema.

### Usage in Indie Products

```sql
-- Default is public schema
SELECT * FROM public.users;

-- Create a separate schema
CREATE SCHEMA app_auth;
SELECT * FROM app_auth.users;
```

In Memoreru, my indie project, I initially placed all tables in the `public` schema. However, as the number of tables grew, problems emerged.

**Problems with public schema:**
- Visibility decreases as tables increase
- Hard to tell which table belongs to which feature
- Permission management becomes complex

So I decided to split schemas by feature.

### The Intent Behind `app_` Prefix

There's a reason for adding the `app_` prefix to schema names.

Supabase has system schemas like `auth`, `storage`, and `realtime`. By adding `app_` (short for application) to my custom schemas, I indicate they're "application schemas" while clearly distinguishing them from Supabase's system schemas. When viewing schemas in pgAdmin, the `app_` prefix comes first alphabetically, making it easy to identify my custom schemas at a glance.

```
Supabase system schemas:
├── auth        # Supabase authentication
├── storage     # Supabase storage
├── public      # Default

Application schemas:
├── app_auth    # Custom: authentication
├── app_billing # Custom: billing
├── app_content # Custom: content
```

In Memoreru, I don't use Supabase's system schemas (auth, storage, etc.) and manage everything with custom schemas. This design considers avoiding vendor lock-in for potential future infrastructure migration.

> **Note:** Custom schema partitioning, the `app_` prefix, and vendor lock-in avoidance are approaches I've independently adopted. For small services with few tables, schema partitioning may add overhead. Consider this when your SaaS grows to medium or large scale with many tables.

## 📂 Schema Partitioning Design

Currently in Memoreru, I use the following schemas:

| Schema Name | Responsibility | Example Tables |
|-------------|---------------|----------------|
| `app_admin` | Admin functions | tenants, teams, members |
| `app_ai` | AI features | embeddings, search_vectors |
| `app_auth` | Authentication | users, sessions, accounts |
| `app_billing` | Billing | subscriptions, payment_history |
| `app_content` | Content management | contents, pages, tables |
| `app_social` | Social features | bookmarks, comments, reactions |
| `app_system` | System | activity_logs, system_logs |

### Partitioning Criteria

I follow these criteria for schema partitioning:

**1. Feature Cohesion**
Place related tables in the same schema. For example, authentication-related tables (users, sessions, accounts) are consolidated in `app_auth`.

**2. Change Frequency**
Separate frequently changing tables from stable ones. Content-related tables tend to change often, while billing-related ones are more stable.

**3. Permission Boundaries**
Tables requiring different permission levels go in separate schemas. `app_admin` for admin-only access and `app_content` for general user access are separated.

## 🔧 Schema Definition with Drizzle ORM

In Memoreru, I use Drizzle ORM. Here's how to define schemas:

```typescript
// database/app_auth/schema.ts
import { pgSchema } from 'drizzle-orm/pg-core';

export const appAuth = pgSchema('app_auth');
```

```typescript
// database/app_auth/users.ts
import { appAuth } from './schema';
import { text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = appAuth.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Application Directory Structure

I organize the application directories to match the DB schema structure.

```
src/database/
├── app_auth/
│   ├── schema.ts      # Schema definition
│   ├── users.ts       # Table definition
│   ├── sessions.ts
│   └── index.ts       # Exports
├── app_billing/
│   ├── schema.ts
│   ├── subscriptions.ts
│   └── index.ts
├── index.ts           # All exports
└── relations.ts       # Relation definitions
```

This structure makes it immediately clear which table belongs to which schema.

## 📊 Normalization in Practice

Along with schema partitioning, normalization is important. Even in indie development, basic normalization should be followed, but over-normalization can impact performance.

### Basic Normalization Rules

Normalization includes 1NF through 3NF, but the key points are:

- **1NF**: Eliminate repetition (use junction tables instead of comma-separated values)
- **2NF**: Eliminate partial dependencies (separate columns that depend only on part of the primary key)
- **3NF**: Eliminate transitive dependencies (calculate derived values instead of storing them)

### Adoption Examples in Indie Products

- **Junction tables**: Manage many-to-many relationships between content and tags with junction tables
- **Composite primary keys**: Use `(tenant_id, id)` composite primary keys for multi-tenant support
- **Denormalization**: Keep bookmark and comment counts as columns for read optimization

## 🔐 RLS (Row Level Security) and Schemas

Schema partitioning is also related to Row Level Security (RLS) design. RLS is a PostgreSQL feature that provides row-level access control per table. You can design permission policies per schema.

In Memoreru, I currently handle access control on the application side rather than using RLS, but if RLS is introduced in the future, having schemas already partitioned makes permission design easier.

## 💡 Practical Tips

### Custom Schema Access Configuration

When using custom schemas with Supabase, several settings are required. Forgetting these will cause issues.

**1. Expose schemas in Supabase Dashboard**

Go to Project Settings → Data API → Exposed schemas and add your schemas. The setting location is hard to find, and I often forget it.

```
public, app_admin, app_ai, app_auth, app_billing, app_content, app_social, app_system
```

See the official documentation for details.

https://supabase.com/docs/guides/database/connecting-to-postgres#data-apis

**2. Specify schemas in DATABASE_URL**

Include custom schemas in the `schema` parameter of DATABASE_URL.

```bash
# .env.local
DATABASE_URL=postgresql://user:password@host:5432/postgres?schema=public,app_admin,app_ai,app_auth,app_billing,app_content,app_social,app_system
```

**3. Configure Drizzle ORM's `schemaFilter`**

Specify the `schemaFilter` option in `drizzle.config.ts`.

```typescript
// drizzle.config.ts
export default {
  schema: [
    './src/database/app_admin/index.ts',
    './src/database/app_auth/index.ts',
    './src/database/app_billing/index.ts',
    // ...
  ],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Multiple schema support
  schemaFilter: ['public', 'app_admin', 'app_ai', 'app_auth', 'app_billing', 'app_content', 'app_social', 'app_system'],
} satisfies Config;
```

Without these settings, you'll get "table not found" errors.

## ✅ Summary

Here's what I've learned from schema design in Memoreru.

**What's working well:**
- Clear responsibility separation by partitioning schemas by feature
- Improved readability by matching directory structure to schema names
- Following basic normalization while denormalizing when necessary

**Things to be careful about:**
- Too many schemas can make things more complex
- Exposed schemas setting is required when using custom schemas with Supabase

Being conscious of schema design even in indie development significantly impacts future extensibility and maintainability.

Tomorrow I'll explain "Database ID Design: Choosing ID Methods and Primary Key Strategies."

---

**Other articles in this series**

- 12/5: Git Branch Strategy: A Practical Workflow for Indie Development
- 12/7: Database ID Design: Choosing ID Methods and Primary Key Strategies

