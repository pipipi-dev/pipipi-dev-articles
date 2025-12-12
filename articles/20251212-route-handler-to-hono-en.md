---
title: "From Next.js Route Handler to Hono: Why API Design Got Easier"
emoji: "🔥"
type: "tech"
topics: ["nextjs", "hono", "typescript", "API"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This article is Day 12 of the **[Solo SaaS Development - Design, Implementation, and Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday's article covered "Why I Migrated from MPA to SPA." Today, I'll explain why I migrated from Next.js Route Handler to Hono and the benefits it brought.

## 🎯 Why I Migrated from Route Handler

Route Handler makes it easy to create APIs, but as the project grew, several challenges became apparent.

### Route Handler Challenges

**1. Directory Structure Constraints**

With Route Handler, the directory structure under `app/api/` directly maps to URL paths.

```
app/api/
├── users/
│   ├── route.ts           → GET /api/users
│   └── [id]/
│       └── route.ts       → GET /api/users/123
├── contents/
│   ├── route.ts           → GET /api/contents
│   └── [id]/
│       ├── route.ts       → GET /api/contents/456
│       └── comments/
│           └── route.ts   → GET /api/contents/456/comments
```

As endpoints increase, the `app/api/` directory becomes bloated. When trying to share utility functions or validation logic, it becomes unclear where to place files.

**2. Code Duplication**

Each `route.ts` file tends to have similar validation and error handling code.

```typescript
// app/api/users/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validation
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    // Processing...
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// app/api/contents/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Similar validation...
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
    }
    // Processing...
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**3. Manual API Documentation Management**

Creating OpenAPI documentation requires writing definition files separately from the implementation. When the implementation changes, the documentation needs to be updated too, making it prone to divergence.

## 🔥 Why I Chose Hono

Hono is a lightweight and fast web framework.

https://hono.dev/

The following points were decisive factors.

### 1. Directory Structure Freedom

When integrating Hono with Next.js, you only need minimal connection code in `app/api/`, while the API logic can be freely organized in `server/api/`.

```
app/api/
└── [[...route]]/
    └── route.ts          # Hono connection only (a few lines)

server/api/
├── index.ts              # Hono app main
├── routes/
│   ├── users.ts          # User-related APIs
│   ├── contents.ts       # Content-related APIs
│   └── admin.ts          # Admin APIs
└── middleware/
    ├── auth.ts           # Auth middleware
    └── error.ts          # Error handling
```

You can organize files by feature and place shared processing in appropriate locations.

### 2. Automatic Documentation with Zod OpenAPI

Using `@hono/zod-openapi`, you can define request/response types with Zod schemas while automatically generating OpenAPI documentation.

```typescript
import { createRoute, z } from '@hono/zod-openapi';

// Request/Response schema definitions
const CreateUserSchema = z.object({
  name: z.string().min(1).openapi({ example: 'John Doe' }),
  email: z.string().email().openapi({ example: 'john@example.com' }),
});

const UserResponseSchema = z.object({
  id: z.string().openapi({ example: 'user_123' }),
  name: z.string(),
  email: z.string(),
  createdAt: z.string().datetime(),
});

// Route definition (types and docs generated simultaneously)
const createUserRoute = createRoute({
  method: 'post',
  path: '/users',
  request: {
    body: {
      content: { 'application/json': { schema: CreateUserSchema } },
    },
  },
  responses: {
    201: {
      description: 'User created successfully',
      content: { 'application/json': { schema: UserResponseSchema } },
    },
    400: {
      description: 'Validation error',
    },
  },
});
```

Since implementation and documentation are always in sync, there's no worry about divergence.

### 3. Middleware for Shared Processing

Authentication and error handling can be defined as middleware and reused.

```typescript
// server/api/middleware/auth.ts
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await getSession(c.req.header('Authorization'));

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', session.user);
  await next();
});
```

```typescript
// server/api/index.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { authMiddleware } from './middleware/auth';

const app = new OpenAPIHono();

// Apply middleware to routes requiring auth
app.use('/users/*', authMiddleware);
app.use('/contents/*', authMiddleware);

// Public APIs without middleware
app.route('/public', publicRoutes);
```

## ⚡ Implementation

### Integration with Next.js

To integrate Hono with Next.js, use the `hono/vercel` adapter.

```typescript
// app/api/[[...route]]/route.ts
import { handle } from 'hono/vercel';
import { app } from '@/server/api';

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
```

`[[...route]]` is a catch-all segment that routes all requests under `/api/*` to Hono. Just these few lines complete the Next.js connection.

### Separating Auth API

When using authentication libraries like Better Auth, you can separate the auth endpoints.

```
app/api/
├── [[...route]]/         # Hono proxy (main API)
├── auth/                 # Better Auth (auth only)
│   └── [...all]/
└── webhooks/             # Webhooks (Stripe, etc.)
    └── stripe/
```

By separating endpoints based on their nature, each part can be managed independently.

### Error Handling

With Hono, error handling can be defined in one place.

```typescript
// server/api/index.ts
import { OpenAPIHono } from '@hono/zod-openapi';

const app = new OpenAPIHono();

// Zod validation error handling
app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json({
      error: 'Validation Error',
      details: err.errors,
    }, 400);
  }

  // Other errors
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// 404 handling
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});
```

Error handling that was scattered across files in Route Handler is now centralized in one place.

## 🎉 Migration Benefits

Here's a summary of the benefits from migrating Route Handler to Hono.

| Item | Before (Route Handler) | After (Hono) |
|------|------------------------|--------------|
| Directory Structure | Constrained by URL structure | Freely organizable |
| Validation | Manual implementation | Declarative with Zod |
| Type Safety | Manual type definitions | Auto-inferred from Zod |
| API Documentation | Manual management | Auto-generated |
| Error Handling | Duplicated across files | Centralized in middleware |

### Improved Development Efficiency

- **Easier endpoint additions**: When adding new routes, existing schemas and middleware can be reused
- **Early type error detection**: Request/response types are inferred from Zod schemas
- **No documentation updates needed**: Documentation is automatically updated when implementation changes

### OpenAPI Documentation Usage

OpenAPI documentation can be automatically generated from defined routes.

```typescript
// server/api/index.ts
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0',
  },
});
```

Accessing `/api/doc` returns the OpenAPI specification JSON. This JSON can be imported into tools like Swagger UI or Apidog for endpoint listing and request testing.

### Improved Testability

Since Hono applications are framework-independent, tests are easier to write.

```typescript
import { app } from '@/server/api';

describe('Users API', () => {
  it('should create a user', async () => {
    const res = await app.request('/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(201);
  });
});
```

## 💡 Migration Tips

### 1. Migrate Gradually

You don't need to migrate everything at once. You can implement new endpoints with Hono while gradually migrating existing Route Handlers.

### 2. Consider Separating Auth and Webhooks

When libraries provide dedicated handlers, like Better Auth or Stripe Webhooks, it's an option to maintain them as separate endpoints rather than forcing integration with Hono.

## ✅ Summary

Here's what improved from migrating Route Handler to Hono.

**Solved Challenges:**
- Directory structure constraints → Free organization in `server/api/`
- Code duplication → Middleware and schema reuse
- Manual documentation management → Auto-generated with Zod OpenAPI

**Benefits Gained:**
- Improved type safety (auto-inference from Zod)
- Improved development efficiency (easier endpoint additions)
- Improved testability (framework-independent)

Hono works well with Next.js, resolving Route Handler challenges while enabling more structured API development.

Tomorrow's article will cover "Vercel Optimization."

---

**Other articles in this series**

- 12/11: Why I Migrated from MPA to SPA: App Router Refactoring in Practice
- 12/13: Vercel Optimization: Reducing Build Time and Improving Response
