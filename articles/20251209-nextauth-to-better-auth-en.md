---
title: "NextAuth.js to Better Auth: Why I Switched Auth Libraries"
emoji: "🔐"
type: "tech"
topics: ["BetterAuth", "Authentication", "NextJS", "TypeScript"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 9 of **[Building SaaS Solo - Design, Implementation, and Operation Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday I wrote about "Database Migration Operations." Today I'll explain why I migrated my authentication library from NextAuth.js to Better Auth.

## 🎯 What Triggered the Migration

NextAuth.js (now Auth.js) is the de facto standard for implementing authentication in Next.js. I was also using NextAuth.js initially.

The trigger for my migration decision was a major announcement in September 2025.

### Auth.js Team Joins Better Auth

In September 2025, it was announced that the Auth.js (formerly NextAuth.js) development team would be joining Better Auth.

https://www.better-auth.com/blog/authjs-joins-better-auth

Auth.js will continue to receive security patches and critical updates, but Better Auth is now recommended for new projects.

Seeing this announcement, I decided it would be better to migrate early considering future development direction.

## 🔑 Better Auth Features

Better Auth is an authentication library designed with a TypeScript-first approach.

### Rich Feature Set

Better Auth provides various authentication features as plugins.

- **Email/Password Authentication**
- **Social Login** (Google, GitHub, X, etc.)
- **Two-Factor Authentication (2FA)**
- **Organization/Team Management**
- **Magic Link Authentication**
- **Passkey Support**

Since you can add features as plugins, you can start with a simple configuration and expand as needed.

### Framework Agnostic

Better Auth works with various frameworks beyond Next.js, including Nuxt, SvelteKit, Hono, and Express.

Since I implement my API with Hono, the framework-agnostic nature was also appealing.

### Drizzle ORM Integration

Better Auth can integrate directly with Drizzle ORM. Since my project uses Drizzle ORM, being able to manage authentication tables the same way is convenient.

## 🔄 Authentication Options

For a Next.js + Supabase setup, there are several authentication options.

### Fully Managed Services

**Auth0, Clerk, Kinde** and other fully managed services are options that delegate all authentication to external services.

**Benefits:**
- Easy setup
- Maintained by security experts
- Rich features available immediately

**Drawbacks:**
- Free tiers exist, but costs increase with user count
- High dependency on external services
- Limited customization flexibility

Fully managed services offer peace of mind by handling security and operations, but considering long-term costs and dependencies, I ruled them out this time.

### Supabase Auth Features

Supabase has a built-in authentication feature called Supabase Auth. If you're using Supabase, this is also an option.

**Benefits:**
- Built into Supabase, minimal additional setup
- Easy integration with RLS (Row Level Security)
- Manage authentication from Supabase Studio

**Drawbacks:**
- Depends on Supabase (makes future migration difficult)
- Limited customization flexibility
- Authentication logic is on the Supabase side, harder to understand

### Better Auth Features

Better Auth is a library that lets you manage authentication logic in your own code.

**Benefits:**
- Framework and DB agnostic (easy to migrate)
- High customization flexibility
- Authentication logic managed in code
- Extensible through plugins

**Drawbacks:**
- Initial setup required
- Supabase RLS integration must be implemented yourself

### Why I Chose Better Auth

| Aspect | Supabase Auth | Better Auth |
|--------|---------------|-------------|
| Dependency | Strongly depends on Supabase | DB/Framework agnostic |
| Customization | Limited | High flexibility |
| Auth Logic | Supabase side | Managed in your code |
| Future Migration | Difficult | Easy |

The main reason I chose Better Auth was that I **wanted to keep future options open**.

Supabase is an excellent service, but if I depend on Supabase for authentication too, the impact becomes significant if I want to migrate the database in the future. By managing authentication logic in my own code, I can keep infrastructure options flexible.

Also, managing authentication tables with Drizzle ORM allows me to handle the entire application schema uniformly, which was another advantage.

## 📦 Migration Overview

### Before Migration

```
Auth: NextAuth.js
DB: Prisma Adapter → Supabase
```

### After Migration

```
Auth: Better Auth
DB: Drizzle Adapter → Supabase
```

### Basic Setup

The basic setup for Better Auth is simple.

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/db"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
})
```

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/client"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

export const { signIn, signOut, useSession } = authClient
```

For detailed implementation, the official documentation is comprehensive.

https://www.better-auth.com/docs

## 💡 Migration Considerations

### Migrating Existing User Data

Since NextAuth.js and Better Auth have different table structures, existing user data migration is required.

Better Auth's official documentation has a migration guide from Auth.js (NextAuth.js).

https://www.better-auth.com/docs/guides/next-auth-migration-guide

### Re-login Required

Due to different session management methods, existing users need to re-login after migration.

In my case, I migrated before release, so there was no impact. If migrating after release, consider that users will need to re-login.

## ✅ Summary

Here's a summary of the main reasons for migrating from NextAuth.js to Better Auth.

**Reasons for Migration:**
- Auth.js development team joined Better Auth (promising future direction)
- Rich features (2FA, organization management, passkeys, etc.)
- Framework agnostic (easy integration with Hono)
- Drizzle ORM integration

**Considerations:**
- Existing user data migration required
- Re-login required

Better Auth is still a relatively new library, but with the Auth.js team joining, future development looks promising.

Tomorrow I'll explain "App Router Directory Design."

---

**Other Articles in This Series**

- Day 8: Database Migration Operations: Safely Managing Dev and Production Environments
- Day 10: App Router Directory Design: Next.js Project Structure Best Practices
