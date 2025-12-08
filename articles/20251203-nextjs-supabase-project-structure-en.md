---
title: "Next.js + Supabase Project Structure for Indie Development"
emoji: "🏗️"
type: "tech"
topics: ["indiedev", "nextjs", "supabase", "vercel"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 3 of the **[Building a SaaS Solo - Design, Implementation, and Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday's article covered "Tech Selection for AI-Driven Development." Today, I'll explain the overall project structure using Next.js + Supabase + Vercel.

## 🏗️ Next.js + Supabase + Vercel Stack

For Memoreru, which I'm developing, I adopted the Next.js + Supabase + Vercel stack. This combination is a popular choice for indie development. There are alternatives like Neon for databases or Cloudflare for hosting. I recommend comparing features and plans to find what works best for you.

### Difference from Traditional Development

At my previous company, releasing a product involved these steps:

1. Build and publish modules
2. Upload to Azure KUDU
3. Verify on staging environment
4. Manually switch between staging and production

With Vercel, all of this is automated by just pushing to GitHub. Creating a PR automatically generates a preview environment, and merging to main deploys to production. No more manual switching.

| Before | Now |
|--------|-----|
| Install PostgreSQL locally | Create DB in the cloud with Supabase |
| Manual build, upload, and switch | Auto-deploy by pushing to GitHub |
| Manage SSL certificates | Vercel handles setup and renewal automatically |

### Role of Each Service

**Next.js** is a full-stack framework that handles both frontend and backend in a single project. For indie development, not having to split the codebase is a significant advantage.

**Supabase** is a BaaS (Backend as a Service) that hosts PostgreSQL. You can create tables and check data from the admin panel without setting up a local environment.

**Vercel** is a hosting service provided by the creators of Next.js. It auto-deploys when you push to GitHub and automatically generates preview environments.

## 📊 Using Supabase

In Memoreru, I use Supabase purely as PostgreSQL hosting.

### Why I Chose Supabase

Here's why I chose Supabase:

- **PostgreSQL**: Can use the familiar RDB
- **Free tier**: Sufficient capacity for indie development
- **Admin panel**: Create tables and check data from the browser
- **External tool integration**: Works with pgAdmin and Supabase MCP
- **pgvector support**: Vector search functionality supported by default

In my case, I connect with the familiar pgAdmin, and use Supabase MCP to operate the DB and check schemas from Claude Code.

Supabase also has Auth and Storage features, but Memoreru uses Better Auth for authentication and Cloudflare R2 for file storage, so I only use it as a pure database.

I'll cover schema design details on 12/6 in "Schema Design with Supabase: Table Splitting and Normalization in Practice."

### Database Access

I use Drizzle ORM for database access. You can write queries with SQL-like syntax.

```typescript
// Query with Drizzle ORM
const result = await db
  .select()
  .from(contents)
  .where(eq(contents.userId, userId))
  .orderBy(desc(contents.createdAt))
  .limit(10);
```

For more on Drizzle ORM, see my past article "Drizzle ORM × Claude Code: Next-Generation TypeScript Development Experience."

## ⚡ Deployment with Vercel

### Auto-Deployment

By just connecting your GitHub repository, the following are automated:

- Merge to main branch → Production deployment
- Create PR → Preview environment generation
- Build status confirmation for each commit

In indie development, you don't want to spend time on CI/CD setup. With Vercel, you can achieve all this with almost no configuration.

### Environment Variable Management

In the Vercel dashboard, you can set different environment variables for preview and production environments.

- **Preview**: Staging Supabase and Stripe test keys
- **Production**: Production Supabase and production Stripe keys

You can manage secrets without committing them to Git, and environment switching happens automatically.

## 📁 Project Structure

There are various approaches, but in Memoreru, I divide the source code into roughly 5 areas.

```
src/
├── app/           # Next.js App Router (routing)
├── client/        # Client-only code
├── server/        # Server-only code
├── shared/        # Client/Server shared
├── database/      # DB schema definitions
└── ...
```

- **app/**: Next.js App Router routing definitions
- **client/**: React components, custom hooks, state management, etc.
- **server/**: Server Actions, API handlers, business logic, etc.
- **shared/**: Type definitions, common utilities, etc.
- **database/**: Drizzle ORM schema definitions

This separation prevents server code from being bundled into the client bundle.

I'll cover detailed directory design on 12/10 in "App Router Directory Design: Next.js Project Structure Techniques."

## 🔄 Pros and Cons of This Stack

### Pros

1. **Development speed**: Manage frontend and backend in the same repository
2. **Cost**: Free tier covers a lot for indie development scale
3. **Easy deployment**: Just push to GitHub
4. **Scalability**: Can expand by simply upgrading to Pro plan

### Cons

1. **Vendor lock-in**: Depending on proprietary features may make migration difficult

## ✅ Summary

Next.js + Supabase + Vercel is a popular choice for indie development.

- **Next.js**: Frontend and backend in one project
- **Supabase**: Managed PostgreSQL hosting
- **Vercel**: Zero-config CI/CD and hosting

With this stack, you can minimize infrastructure management overhead and focus on product development.

Tomorrow, I'll explain "Documentation Strategy for Indie Development: How to Use Design Documents and Thought Logs."

---

**Other articles in this series**

- 12/6: Schema Design with Supabase: Table Splitting and Normalization in Practice
- 12/10: App Router Directory Design: Next.js Project Structure Techniques
