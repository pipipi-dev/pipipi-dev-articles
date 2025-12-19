---
title: "What the React 2025 Vulnerability Taught Me About Solo Dev Security"
emoji: "🔐"
type: "tech"
topics: ["security", "nextjs", "nodejs", "react"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This article is part of the **[and Design Advent Calendar 2025](https://adventar.org/calendars/12615)** (Day 19).

Yesterday I wrote about "TypeScript Strict Mode." In this article, I'll share the security practices I follow in my solo development projects.

## 🚨 Security Incidents in December 2025

In December 2025, critical vulnerabilities were discovered in the Next.js/React ecosystem. Security is not someone else's problem, even for solo developers.

### React Server Components Vulnerability (CVE-2025-55182)

On December 3, 2025, a remote code execution vulnerability in React Server Components was disclosed. The CVSS score, which indicates severity, is 10.0—the maximum possible value.

https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components

- **Affected**: All applications using React 19.0 to 19.2.0
- **Attack vector**: Malicious HTTP requests can execute arbitrary code on the server
- **Affected frameworks**: Next.js, React Router, Waku, Parcel RSC, and others

```bash
# For Next.js, update to a patched version
npm install next@15.1.11  # For 15.1.x
npm install next@15.0.7   # For 15.0.x
npm install next@14.2.35  # For 14.x
```

For Memoreru, the app I'm developing, I noticed a warning on Vercel's deployment screen and immediately updated to Next.js 15.5.9 and React 19.2.3. Because I had made a habit of keeping dependencies updated, the transition was smooth.

https://x.com/pipipi_dev/status/1996301018532118914

### Multiple Node.js Vulnerabilities

Also in December 2025, multiple vulnerabilities were reported in Node.js.

https://nodejs.org/en/blog/vulnerability/december-2025-security-releases

| Severity | Count | Affected Versions |
|----------|-------|-------------------|
| High | 3 | v20.x, v22.x, v24.x, v25.x |
| Medium | 1 | Same as above |
| Low | 1 | Same as above |

Patches are scheduled for release on January 7, 2026 (as of December 19, 2025).

## 🛡️ Security Practices I Follow

Here are the security measures I've implemented in Memoreru's development.

### 1. Keeping Dependencies Updated

The most fundamental and effective measure is keeping dependencies up to date.

```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable vulnerabilities
npm audit fix

# For breaking changes (use with caution)
npm audit fix --force
```

Setting up [Dependabot](https://github.com/dependabot) or [Renovate](https://www.mend.io/renovate/) automatically creates PRs for dependency updates.

### 2. Input Validation

I implement with the assumption that **all user input is untrusted**. Using [Zod](https://zod.dev/), you can manage validation and type definitions in one place.

```typescript
import { z } from 'zod';

// Schema definition
const CreateUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase, and numbers'),
  name: z.string().min(1).max(100),
});

// Validation execution
const result = CreateUserSchema.safeParse(requestBody);
if (!result.success) {
  return Response.json({ error: result.error.issues }, { status: 400 });
}

// result.data is type-safe
const { email, password, name } = result.data;
```

I validate API query parameters the same way.

```typescript
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});
```

### 3. Authentication and Authorization

I use libraries for authentication rather than building it myself. For Memoreru, I chose [Better Auth](https://www.better-auth.com/). [Auth.js](https://authjs.dev/) is also an option.

```typescript
// API middleware requiring authentication
export async function requireAuth(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return Response.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return session;
}
```

I also implement authorization (permission checks).

```typescript
// Resource ownership check
const content = await db.query.contents.findFirst({
  where: (contents, { eq }) => eq(contents.id, contentId),
});

if (content?.userId !== session.user.id) {
  return Response.json(
    { error: 'You do not have permission to access this resource' },
    { status: 403 }
  );
}
```

### 4. Environment Variable Management

I manage secrets through environment variables and avoid hardcoding them in code.

```bash
# .env.local (include in gitignore)
DATABASE_URL="postgresql://user:password@host:5432/db"
AUTH_SECRET="random string of 32+ characters"
STRIPE_SECRET_KEY="sk_live_..."
```

I prepare a `.env.example` file for developers to document required environment variables.

```bash
# .env.example (commit to repository)
DATABASE_URL="postgresql://user:password@host:5432/db"
AUTH_SECRET=""
STRIPE_SECRET_KEY=""
```

### 5. Security Headers

In Next.js, you can configure security headers in `next.config.ts`.

```typescript
const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        // Clickjacking protection
        { key: 'X-Frame-Options', value: 'DENY' },
        // MIME sniffing protection
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        // Referrer information control
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // Disable unnecessary features
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
};
```

In production, I also add the HSTS (HTTP Strict Transport Security) header. This header ensures browsers automatically use HTTPS.

```typescript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains'
}
```

### 6. CSRF Protection

CSRF (Cross-Site Request Forgery) is an attack that tricks users into sending unintended requests. For example, simply opening a malicious site could trigger actions on a service you're logged into.

As a countermeasure, I use CSRF tokens for form submissions and API requests.

```typescript
// Token generation (with HMAC-SHA256 signature)
async function generateCsrfToken(userId: string): Promise<string> {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const payload = `${userId}:${timestamp}:${nonce}`;

  const signature = await signWithHmac(payload, process.env.CSRF_SECRET);
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

// Token validation
async function validateCsrfToken(token: string, userId: string): Promise<boolean> {
  const [payloadBase64, signature] = token.split('.');
  const payload = Buffer.from(payloadBase64, 'base64').toString();
  const [tokenUserId, timestamp] = payload.split(':');

  // Signature verification
  const expectedSignature = await signWithHmac(payload, process.env.CSRF_SECRET);
  if (signature !== expectedSignature) return false;

  // Expiration check (1 hour)
  if (Date.now() - parseInt(timestamp) > 3600000) return false;

  // User ID match check
  if (tokenUserId !== userId) return false;

  return true;
}
```

### 7. SQL Injection Protection

SQL injection is an attack that executes malicious SQL through user input. For example, entering special characters in a login form could bypass authentication or steal data.

Using an ORM (a library that lets you write database operations in code) correctly is generally safe, but when writing raw SQL, I use parameterized queries.

```typescript
// Dangerous: String concatenation
const query = `SELECT * FROM users WHERE email = '${email}'`;

// Safe: Parameterized query
const query = `SELECT * FROM users WHERE email = $1`;
const result = await db.query(query, [email]);
```

Using [Drizzle ORM](https://orm.drizzle.team/) or [Prisma](https://www.prisma.io/) automatically parameterizes queries.

```typescript
// With Drizzle ORM
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, email));
```

### 8. Rate Limiting

Rate limiting restricts the number of requests within a time window. This helps mitigate DoS attacks that overwhelm servers with requests, and brute force password attacks.

Here's a simple implementation.

```typescript
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests = 100,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}
```

For production scaling, distributed rate limiting using Redis with services like [Upstash](https://upstash.com/) is also an option.

## 📋 Security Checklist

Here's a summary of items I check.

| Category | Check Item |
|----------|------------|
| **Dependencies** | No vulnerabilities in `npm audit` |
| **Dependencies** | Major packages (Next.js, React, Node.js) are up to date |
| **Input Validation** | All user input is validated |
| **Authentication** | Using an auth library (not custom implementation) |
| **Authorization** | Resource access permissions are verified |
| **Environment Variables** | No secrets hardcoded in code |
| **Headers** | Security headers are configured |
| **HTTPS** | HTTPS is enforced in production |
| **CSRF** | CSRF tokens are used for form submissions |
| **SQL** | Using parameterized queries or ORM |
| **API** | Rate limiting is implemented |

## 🔔 Staying Updated on Vulnerabilities

Make it a habit to regularly check security information. Following official accounts and developers who actively share security information on social media like X helps you catch important updates quickly.

- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security) - Next.js official
- [React Blog](https://react.dev/blog) - React official
- [Node.js Security Releases](https://nodejs.org/en/blog/vulnerability) - Node.js official

## ✅ Summary

Even for solo development, basic security measures are essential.

| Measure | Priority | Reason |
|---------|----------|--------|
| Dependency updates | Highest | Prevents known vulnerabilities |
| Input validation | Highest | Entry point for many attacks |
| Authentication/Authorization | High | Prevents unauthorized access |
| Environment variable management | High | Prevents information leaks |
| Security headers | High | Effective with minimal effort |
| CSRF protection | High | Prevents unintended actions |
| SQL injection protection | Medium | Handled automatically by ORM |
| Rate limiting | Medium | Mitigates high-volume attacks |

"I'll add security later" is dangerous. Building in basic protections from the start lets you develop with peace of mind.

Tomorrow I'll cover "Implementing Tiered Pricing with Stripe."

---

**Other articles in this series**

- 12/18: TypeScript Strict Mode in Practice: Catching Bugs with Type Safety
- 12/20: Implementing Tiered Pricing with Stripe: Monetization Design for Solo Developers
