---
title: "TypeScript Strict Mode in Practice: Catching Bugs with Type Safety"
emoji: "🐛"
type: "tech"
topics: ["typescript", "nextjs", "react", "biome"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This article is part of the **[and Design Advent Calendar 2025](https://adventar.org/calendars/12615)** (Day 18).

Yesterday I wrote about "Semantic Search." Today, I'll share my experience introducing TypeScript's strict mode to an existing project.

## Why I Introduced Strict Mode

Even with TypeScript, runtime errors still occur.

```
Cannot read property 'name' of null
undefined is not a function
```

When these errors started piling up, I investigated and found a common pattern. They were happening in places where **type checking was too lenient**.

TypeScript uses lenient settings by default. Without enabling strict mode, many problems slip through undetected.

## Options I Enabled

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

### noImplicitAny

Parameters without type annotations implicitly become `any` type. Since `any` allows any operation, type checking becomes ineffective.

```typescript
// With noImplicitAny: false
function double(value) {  // value is any type
  return value * 2;
}

double("hello");  // Compiles fine, but result is NaN
```

With `noImplicitAny: true`, parameters without type annotations cause errors. You can immediately spot "places where you forgot to write types."

### strictNullChecks

Without this option, all types implicitly include `null` and `undefined`.

```typescript
// With strictNullChecks: false
const user: User = getUser();  // Might return null
console.log(user.name);  // Could crash at runtime
```

With `strictNullChecks: true`, functions that might return null must explicitly declare `User | null`. Since you get compile errors without null checks, you can prevent missed checks.

### Effect of These Two Options

| Option | Errors Prevented |
|--------|------------------|
| `noImplicitAny` | Crashes from operating on unknown types |
| `strictNullChecks` | Crashes from null/undefined access |

I delegated unused variable checking (`noUnusedLocals`) to Biome. TypeScript doesn't recognize `_` prefixed variables, which causes issues when you only want to use part of a destructured assignment.

## Division of Responsibilities: TypeScript and Biome

[Biome](https://biomejs.dev/) is a tool that combines linting (code quality checking) and formatting (code styling). I chose it over [ESLint](https://eslint.org/) because it's faster and has simpler configuration.

I divide checking responsibilities between TypeScript and Biome.

| Check Item | Tool | Reason |
|------------|------|--------|
| Type consistency | TypeScript | Core strength of the type system |
| Null safety | TypeScript | Detectable at type level |
| Unused variables | Biome | Supports `_` prefix convention |
| any type usage | Biome | Easier exception management with biome-ignore |
| Code style | Biome | Managed together with formatting |

Here's an example Biome configuration.

```json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedVariables": "warn",
        "noUnusedImports": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noDoubleEquals": "error"
      }
    }
  }
}
```

By setting `noExplicitAny` to error, I strictly limit the use of any types. When absolutely necessary, I leave a comment explaining why.

## Bugs Prevented by Strict Mode

Here are typical bug patterns that strict mode can detect.

### 1. Missing Null Checks

The most common issue is missing null checks.

```typescript
// Problematic code
function getUserName(user: User | null) {
  return user.name; // user might be null
}
```

With `strictNullChecks` enabled, this becomes a compile-time error.

```typescript
// Fixed
function getUserName(user: User | null) {
  return user?.name ?? 'Anonymous';
}
```

This pattern is especially common with **relational data**. When a user is deleted, the `creator` field of related data becomes null. Code that doesn't account for this will crash at runtime.

### 2. Handling Optional Properties

Optional properties in API responses are another easy-to-miss pattern.

```typescript
interface ApiResponse {
  data: {
    items: Item[];
    nextCursor?: string; // Optional
  };
}

// Problematic code
function getNextPage(response: ApiResponse) {
  return fetch(`/api?cursor=${response.data.nextCursor}`);
  // If nextCursor is undefined, this becomes "?cursor=undefined"
}
```

```typescript
// Fixed
function getNextPage(response: ApiResponse) {
  if (!response.data.nextCursor) return null;
  return fetch(`/api?cursor=${response.data.nextCursor}`);
}
```

### 3. Type Definition and Schema Mismatch

During refactoring, it's easy to forget to update type definitions.

```typescript
// Changed DB schema
// column_name → field_name

// Forgot to update type definition
interface Column {
  column_name: string; // Still using old name
}
```

With strict mode, everywhere using this type will show errors. You'll see red underlines in your IDE, so you won't miss any needed fixes.

## IDE Benefits

When you enable strict mode, you immediately benefit in editors like VS Code.

### Real-time Error Detection

When you write problematic code, red squiggly lines appear in the editor. You can catch issues before running the code, dramatically reducing debugging time.

### Accurate Completions

When types are clear, property and method completion suggestions become accurate. When you type `user.`, only properties that actually exist like `name` and `email` appear as suggestions.

### Safer Refactoring

When you change a type definition, errors appear everywhere affected. You don't need to manually search for "what needs to be fixed."

```typescript
// If you remove email from User type
interface User {
  id: string;
  name: string;
  // email: string;  removed
}

// Errors appear everywhere user.email is used
```

If there are any missed fixes, you get compile errors, so you can change code with confidence.

## Preventing New Errors

Even if you fix existing errors, it's pointless if new code introduces more.

[Husky](https://typicode.github.io/husky/) is a tool for managing git hooks (scripts that run automatically on commit or push). I set up a pre-commit hook to run type checking before every commit.

```bash
#!/bin/sh
# .husky/pre-commit

echo "Running type check..."
bun run type-check

if [ $? -ne 0 ]; then
  echo "TypeScript errors found. Please fix before committing."
  exit 1
fi
```

```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

Commits are blocked if there are TypeScript errors. Since "I'll fix it later" isn't allowed, errors don't accumulate.

## Tips for Gradual Adoption

Here are tips for introducing strict mode to an existing project.

### 1. Progress Gradually

Trying to fix a large number of errors at once is discouraging. A more sustainable approach is to fix a few surrounding errors while working on features, or make only new files strict first and gradually convert the rest.

### 2. Document Reasons for any Types

When you absolutely need an any type, leave a comment explaining why. This allows for review when type definitions improve later.

```typescript
// TODO: Type definitions will improve in library v3
// biome-ignore lint/suspicious/noExplicitAny: temporary workaround
const result = someLibrary.parse(data) as any;
```

### 3. Validate External Data with Zod

[Zod](https://zod.dev/) is a library for runtime data validation. When you define a schema, TypeScript types are automatically generated.

For external data like API responses and form inputs, validate with Zod. This lets you manage type definitions and validation in one place.

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

// Validate at runtime
const user = UserSchema.parse(apiResponse);
```

## Summary

Here are the key points for introducing TypeScript strict mode to an existing project.

| Point | Details |
|-------|---------|
| Enable selectively | Choose high-impact options rather than `strict: true` |
| Divide responsibilities | Split duties between TypeScript and Biome |
| Fix gradually | Progress bit by bit, not all at once |
| Prevent accumulation | Make type checking mandatory with pre-commit hooks |

Ideally, these settings should be enabled from the project's start. Since retrofitting them incurs fixing costs, I recommend enabling strict mode from the beginning for new projects.

Tomorrow I'll discuss "Security Measures for Solo Development."

---

**Other Articles in This Series**

- 12/17: Implementing "Search by Meaning": Introduction to pgvector + OpenAI Embeddings
- 12/19: Security Measures for Solo Development: The Minimum You Should Do
