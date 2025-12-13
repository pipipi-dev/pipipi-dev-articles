---
title: "Vercel Optimization: Reducing Build Time and Improving Response"
emoji: "⚡"
type: "tech"
topics: ["nextjs", "vercel", "performance", "typescript"]
published: true
platforms:
  qiita: false
  zenn: false
  devto: true
---

This article is Day 13 of the **[Solo SaaS Development - Design, Implementation, and Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday's article covered "Migrating from Route Handler to Hono." This article explains the optimizations I implemented to reduce build time and improve response times on Vercel.

## 🎯 Why Vercel Optimization Matters

When deploying a Next.js app to Vercel for indie development, several challenges emerge:

- **Increasing build time**: As dependencies and pages grow, deployment wait times lengthen
- **Response delays**: Particularly noticeable during cold starts or when loading pages with large bundles
- **Wasted resources**: Using the same settings for development and production, failing to leverage caching

This article introduces the optimizations I implemented to address these challenges.

## ⏱️ Build Time Reduction

### Migrating to Bun

For local development, I migrated the package manager from npm to Bun.

https://bun.com/

```bash
# Before
npm install  # tens of seconds to minutes

# After
bun install  # a few seconds
```

Bun is compatible with npm while being significantly faster at installation. The more dependencies your project has, the more you'll notice the difference.

Migration is simple—just run `bun install` and a `bun.lock` file will be generated. Your existing `package.json` works as-is.

```bash
# Migration steps
bun install
rm package-lock.json  # delete if no longer needed
```

You can also use Bun on Vercel by changing `installCommand` to `bun install` in `vercel.json`, but I'm using npm for compatibility since some dependencies require `--legacy-peer-deps`. Local development efficiency has improved dramatically.

### Optimizing Package Imports

You can improve tree-shaking for large libraries using `optimizePackageImports` in `next.config.ts`.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@tiptap/react',
      'echarts',
      'framer-motion',
      'date-fns',
      'recharts',
    ],
  },
};
```

These libraries tend to bloat bundle size when imported entirely. This setting ensures only the parts you use are included in the bundle.

### TypeScript Incremental Builds

Enabling incremental builds in `tsconfig.json` skips recompilation of unchanged files.

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".next/cache/tsconfig.tsbuildinfo",
    "skipLibCheck": true
  }
}
```

- `incremental: true`: Enables incremental builds
- `tsBuildInfoFile`: Specifies where to cache build information
- `skipLibCheck`: Skips type checking in `node_modules`

## 🚀 Response Time Improvements

### Dramatic Improvement Through Region Settings

Region settings are the optimization where you'll see the most noticeable improvement. This might be obvious to experienced developers, but beginners often overlook it. Here's an episode from my development experience.

Dashboard page loading took about 2 seconds in development but over 5 seconds in production.

Upon investigation, I found that Vercel Functions were running in Washington DC (iad1) by default. Since the database was in Tokyo (Supabase ap-northeast-1), every request was crossing the Pacific Ocean.

```
Development (Local):
Local PC (Japan) → Supabase DB (Tokyo) = Fast

Production (Before fix):
Vercel Functions (Washington DC) → Supabase DB (Tokyo) = Slow
```

The solution was simply adding a region setting to `vercel.json`.

```json
{
  "regions": ["hnd1"]
}
```

`hnd1` refers to the Tokyo region. Adding this single line and deploying improved dashboard loading from 5 seconds to under 2 seconds.

You can verify which region is being used by checking the `x-vercel-id` response header.

```
Before: hnd1::iad1::xxxxx
After: hnd1::hnd1::xxxxx
```

Here's how to read `x-vercel-id`:

- 1st part: Edge region
- 2nd part: Functions region
- 3rd part: Request ID

### The Difference Between Edge and Functions

Vercel has two types of execution environments: "Edge" and "Functions."

**Edge (Edge Network):**
- Role: Static file delivery, caching, request routing
- Location: Hundreds of locations worldwide (CDN)
- Feature: Responds from the location closest to the user

**Functions (Serverless Functions):**
- Role: Dynamic processing like API routes, SSR, and database connections
- Location: The configured region (Tokyo hnd1 in this case)
- Feature: Runs on Node.js runtime, can connect to databases

Here's how requests flow:

```
User (Japan)
    ↓
Edge (Tokyo) ← Static files are returned here
    ↓
Functions (Tokyo) ← API calls, DB connections
    ↓
Supabase DB (Tokyo)
```

By placing Functions in the same region as your database, you can minimize latency.

### Caching Strategy

Configure caching per resource type using `headers()` in `next.config.ts`. It's important to choose the appropriate caching strategy based on the nature of each resource.

**Static Assets (`/_next/static/`):**

```typescript
{
  source: '/_next/static/(.*)',
  headers: [
    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
  ],
}
```

Next.js static assets include a hash in their filenames, so the URL changes when content changes. Since stale caches are never a problem, long-term caching of 1 year is possible.

**HTML Pages:**

```typescript
{
  source: '/(.*)',
  headers: [
    { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
  ],
}
```

HTML can change dynamically, so we verify with the server each time. However, if unchanged, a 304 response handles it efficiently.

**API:**

```typescript
{
  source: '/api/(.*)',
  headers: [
    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
  ],
}
```

APIs may return authentication information or user-specific data, so caching is completely disabled. Returning stale data risks causing inconsistencies.

### API Timeout Settings

You can set timeouts individually for APIs that take longer to process in `vercel.json`.

```json
{
  "functions": {
    "src/app/api/search/route.ts": { "maxDuration": 30 },
    "src/app/api/chat/route.ts": { "maxDuration": 60 },
    "src/app/api/embeddings/route.ts": { "maxDuration": 30 }
  }
}
```

The default timeout for the Hobby plan is 10 seconds, but APIs that take longer—like LLM processing or vector search—need individual extensions.

### Other Response Optimizations

- **Edge Functions**: Run lightweight processing at the edge with `export const runtime = 'edge'` (e.g., OG image generation)
- **Font optimization**: Load only necessary subsets and weights with `next/font`
- **Middleware optimization**: Skip Middleware for static files and API routes using `matcher` settings
- **Image optimization**: Automate WebP conversion and resizing with `next/image`

## 🎉 Optimization Results

Here's a summary of the results from applying these optimizations:

| Item | Before | After |
|------|--------|-------|
| Local install | npm (tens of seconds) | Bun (a few seconds) |
| Region | iad1 (Washington DC) | hnd1 (Tokyo) |
| Dashboard display | Over 5 seconds | Under 2 seconds |
| Static assets | Fetched every time | 1 year cache |

The region setting in particular delivered noticeable improvement with just a one-line change.

## ✅ Summary

This article covered performance optimization on Vercel.

**Build Time Reduction:**
- Speed up local development by migrating to Bun
- Optimize large libraries with `optimizePackageImports`
- Enable TypeScript incremental builds

**Response Improvements:**
- Place Functions in the same region as your DB (5s → 2s)
- Set caching strategies per resource type
- Adjust API timeouts based on processing requirements

For indie development, you don't need perfect optimization from the start. I recommend improving where needed based on user feedback and Vercel Analytics.

Tomorrow's article will cover "Designing Mobile-First UX: Responsive Design in Practice."

---

**Other Articles in This Series**

- Day 12: From Next.js Route Handler to Hono: Why API Design Got Easier
- Day 14: Designing Mobile-First UX: Responsive Design in Practice
