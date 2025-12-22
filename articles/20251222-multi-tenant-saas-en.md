---
title: "Building Multi-Tenant SaaS as a Solo Developer"
emoji: "🏢"
type: "tech"
topics: ["nextjs", "supabase", "saas", "postgresql"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This article is part of the **Solo SaaS Development Advent Calendar 2025**.

In the previous article, I covered GA4 and Microsoft Clarity setup. In this article, I'll share how I built a multi-tenant SaaS architecture.

:::message
The content in this article reflects the design I adopted for my personal project. Rather than best practices, please read this as a record of trial and error from a solo developer.
:::

## Why Multi-Tenant?

When building a SaaS, you need to separate data by user.

For team or organization-based services, the following requirements emerge:

- Organization A's data must not be visible to Organization B
- Even within the same organization, access rights may differ by team
- Administrators and regular members have different operation scopes

Multi-tenant architecture realizes these requirements.

### Why I Considered Multi-Tenant

For many solo development projects, multi-tenant architecture is probably unnecessary. For consumer-facing services, filtering by user ID is sufficient.

In my case, I was aiming to serve both individual users and enterprise customers, so I designed with multi-tenancy in mind from the start. Adding it later could require restructuring the entire data model.

## Tenant Structure Design

In my project, I adopted the following hierarchical structure:

```
Tenant (Organization)
├── Team A
│   ├── Member 1 (Owner)
│   └── Member 2 (Regular)
└── Team B
    ├── Member 1 (Leader)
    └── Member 3 (View Only)
```

### Tenant Table Design

This table manages tenant (organization) information.

```typescript
// Example: Tenant table
const tenants = pgTable('tenants', {
  tenant_id: text('tenant_id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  owner_id: text('owner_id').notNull(),
  plan: text('plan').default('free'),
  status: text('status').default('active'),
  settings: jsonb('settings'),
  created_at: timestamp('created_at').defaultNow(),
});
```

The `slug` is an identifier used in URLs. `settings` stores plan-specific limits in JSON format.

### Membership Design

This manages the relationship between users and tenants.

```typescript
// Example: Tenant members table
const tenantMembers = pgTable('tenants_members', {
  tenant_id: text('tenant_id').notNull(),
  user_id: text('user_id').notNull(),
  role: text('role').notNull(), // 'owner' | 'admin' | 'member' | 'viewer'
  status: text('status').default('active'),
  joined_at: timestamp('joined_at').defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant_id, table.user_id] }),
}));
```

By using a composite primary key (`tenant_id` + `user_id`), I enabled users to belong to multiple tenants.

### Role Definition

For example, the following roles can be considered:

| Role | Permissions |
|------|-------------|
| owner | Full permissions, can delete tenant |
| admin | Member management, settings changes |
| member | Create and edit content |
| viewer | View only |

## Row-Level Security (RLS)

The most important aspect of multi-tenancy is data isolation. If controlled only through application code, bugs could expose one tenant's data to another.

I adopted PostgreSQL's Row-Level Security (RLS), which enables access control at the database level.

### RLS Policy Implementation

```sql
-- Enable RLS
ALTER TABLE app_content.labels ENABLE ROW LEVEL SECURITY;

-- SELECT: Only retrieve data from same tenant
CREATE POLICY labels_select_policy ON app_content.labels
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- INSERT: Only create in same tenant, admin or above
CREATE POLICY labels_insert_policy ON app_content.labels
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)
    AND current_setting('app.current_user_role', true) IN ('OWNER', 'ADMIN')
  );
```

`current_setting('app.current_tenant_id', true)` retrieves the tenant ID set in the session.

### Setting Session Context

I set the current tenant ID and role in the session during API requests.

```typescript
// Setting in API middleware
async function setTenantContext(tenantId: string, role: string) {
  await db.execute(sql`
    SELECT set_config('app.current_tenant_id', ${tenantId}, true);
    SELECT set_config('app.current_user_role', ${role}, true);
  `);
}
```

After this, subsequent queries are automatically filtered by RLS policies.

## Access Control Implementation

### Membership Verification

At API endpoints, I first verify whether the user is a member of the tenant.

```typescript
// Verify tenant access
async function checkTenantAccess(userId: string, tenantId: string) {
  const membership = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(and(
      eq(tenantMembers.tenant_id, tenantId),
      eq(tenantMembers.user_id, userId),
      eq(tenantMembers.status, 'active')
    ));

  if (membership.length === 0) {
    throw new Error('Access denied');
  }

  return membership[0].role;
}
```

### Role-Based Permission Checks

I verify the required role for each operation.

```typescript
// Example: Team creation
app.post('/api/tenants/:tenantId/teams', async (c) => {
  const user = c.get('user');
  const { tenantId } = c.req.param();

  // Verify membership
  const role = await checkTenantAccess(user.id, tenantId);

  // Only owner/admin can create
  if (!['owner', 'admin'].includes(role)) {
    return c.json({ error: 'No permission to create team' }, 403);
  }

  // Team creation logic...
});
```

### Data Isolation with Composite Keys

I use composite primary keys including `tenant_id` in all content tables.

```typescript
// Example: Contents table
const contents = pgTable('contents', {
  tenant_id: text('tenant_id').notNull(),
  content_id: text('content_id').notNull(),
  title: text('title').notNull(),
  // ... other columns
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant_id, table.content_id] }),
}));
```

Master data can be managed as shared data across all tenants using a reserved `tenant_id` like `'SYSTEM'`.

## Implementation Tips

### Explicit Filtering in Queries

In addition to RLS, I explicitly filter by `tenant_id` in application code as well.

```typescript
// Add explicit filter
const userContents = await db
  .select()
  .from(contents)
  .where(and(
    eq(contents.tenant_id, tenantId),  // Explicit filter
    eq(contents.created_by, userId)
  ));
```

Even with RLS, this makes intent clear during code reviews.

### Tenant Switching Consideration

I also implemented switching functionality for users who belong to multiple tenants.

```typescript
// Get list of tenants user belongs to
async function getUserTenants(userId: string) {
  return await db
    .select({
      tenant: tenants,
      role: tenantMembers.role,
    })
    .from(tenants)
    .innerJoin(tenantMembers, eq(tenants.tenant_id, tenantMembers.tenant_id))
    .where(and(
      eq(tenantMembers.user_id, userId),
      eq(tenantMembers.status, 'active')
    ));
}
```

The current tenant is managed in the session and can be switched through the UI.

### Infrastructure Options

In December 2025, Vercel announced "Vercel for Platforms." It provides features like automatic routing for wildcard domains (`*.yourapp.com`) and SSL certificate management for custom domains.

https://vercel.com/changelog/introducing-vercel-for-platforms

Combined with the data isolation design introduced in this article, you can build more sophisticated multi-tenant SaaS applications.

## Summary

I've shared how I built a multi-tenant SaaS architecture.

| Point | Description |
|-------|-------------|
| Tenant Structure | Organization → Team → Member hierarchy |
| RLS | Database-level isolation with PostgreSQL |
| Roles | owner / admin / member / viewer, etc. |
| Composite Keys | Design with tenant_id in primary keys |
| Double Check | Verify in both RLS and application code |

Whether you need to go this far in solo development depends on your product's nature. However, if you're aiming for enterprise SaaS, considering this from the start makes future expansion easier.

---

**Other Articles in This Series**

- 12/21: Visualizing User Behavior: Setting Up GA4 and Microsoft Clarity
- 12/23: How Claude Code Changed My Solo Development: AI Pair Programming in Practice
