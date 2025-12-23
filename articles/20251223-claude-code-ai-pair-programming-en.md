---
title: "How Claude Code Changed My Solo Dev Workflow: AI Pair Programming"
emoji: "🤖"
type: "tech"
topics: ["claudecode", "ai", "solodev", "productivity"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 23 of the **[Building a SaaS Solo - Design, Implementation, and Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday's article covered "Multi-tenant SaaS Design." Today, I'll share my practical experience developing with Claude Code.

:::message
The basics of Claude Code are well documented in official resources and other articles. This article focuses on my personal workflow and insights gained from continuous use in solo development.
:::

**Reference Documents**
- [Claude Code Documentation](https://code.claude.com/docs/overview)
- [Claude Code Blog](https://claude.com/blog)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

## 🛠️ Think Like a Construction Site

Through continuous development with Claude Code, I found that approaching it like a construction site works well.

```
1. Draw blueprints (Requirements)
2. Build scaffolding (Basic/Detailed Design)
3. Construct (Implementation)
4. Write "why we built it this way" on the walls (Comments, README, CLAUDE.md)
5. Remove scaffolding (Integrate specs into implementation)
```

### Draw Blueprints (Requirements)

First, clarify "what to build."

```markdown
## Feature Overview
A feature for users to create and manage learning content

## Use Cases
- Create, edit, and delete content
- View own content in a list
- Write body text in Markdown format

## Constraints
- Cannot see other tenants' content
- Title is required, body is optional
```

By providing this blueprint to Claude Code, the AI can generate code with a complete understanding of the big picture.

### Build Scaffolding (Basic/Detailed Design)

Once requirements are set, decide "how to build it." Organize file structure and processing flow in plain language.

```markdown
## File Structure
- src/types/content.ts - Type definitions
- src/app/api/contents/route.ts - API endpoint
- src/client/components/ContentForm.tsx - Input form

## API Endpoints
### GET /api/contents
- Authentication check
- Filter by tenant_id
- Return in descending order by update time

### POST /api/contents
- Authentication check
- Validation (title required, body optional)
- Save to DB and return created record
```

With this design document, Claude Code can easily understand "what to implement and how."

### Construct (Implementation)

Once scaffolding is ready, it's time to implement. This is where Claude Code shines.

```
Please implement src/app/api/contents/route.ts.
Follow these specifications:
- GET: Filter by tenant_id and return content list
- POST: Create new content
- Reference existing src/app/api/labels/route.ts for error handling
```

Having it reference existing code maintains consistency within the project.

### Write the Reasoning

After implementation, document "why it was implemented this way" in comments or README.

```typescript
// Check tenant_id at application layer in addition to RLS
// Defense in depth in case of RLS configuration oversight
const contents = await db
  .select()
  .from(contentsTable)
  .where(eq(contentsTable.tenantId, tenantId));
```

This record helps future you or AI understand "why it's built this way."

### Remove Scaffolding

Finally, integrate design document content into the implementation. Delete temporary TODO comments, organize type definitions, and clean up obsolete specs.

This also "prevents Context pollution." If old design documents or temporary comments remain, AI might read them and get confused. Making source code the Single Source of Truth reduces AI misreadings.

## 💬 Context Sharing with CLAUDE.md

In Claude Code, placing `CLAUDE.md` at the project root helps AI understand the project context.

```markdown
# Project Overview
Memoreru - A tool to organize knowledge and nurture thinking

# Tech Stack
- Next.js 15 (App Router)
- TypeScript strict mode
- Drizzle ORM + PostgreSQL (Supabase)
- Hono (API)
- shadcn/ui

# Coding Conventions
- Use function components
- Prefer named exports
- Error handling uses Result type pattern

# Directory Structure
src/
├── app/          # Next.js App Router
├── client/       # Client-side logic
├── server/       # Server-side logic
├── database/     # DB schema & queries
└── shared/       # Common utilities
```

Write this once, and you won't need to explain it every time.

### Documenting Implementation Patterns

It's also helpful to document project-specific implementation patterns in CLAUDE.md.

```markdown
# API Endpoint Patterns

## Authenticated Endpoints
1. Get user ID from session
2. Verify access rights to tenant_id
3. Set RLS context
4. Execute processing

## Error Response Format
{ error: string, code?: string }
```

## ⚡ Using Extensions

Claude Code has extensions like MCP and Skills.

### MCP

MCP (Model Context Protocol) is a protocol that enables integration with external tools. I use these three:

- **Playwright**: Browser automation, E2E testing
- **Supabase**: Database schema inspection
- **Serena**: IDE integration

https://modelcontextprotocol.io

MCP is convenient, but overuse can bloat Context. As AI processes more information, response speed and accuracy can be affected. I recommend limiting to essentials.

https://code.claude.com/docs/mcp

### Skills

Skills is a mechanism for templating instructions for specific tasks. Place SKILL.md files in the `.claude/skills/` directory.

I haven't fully utilized this yet, but it seems useful for sharing rules like review guidelines across teams. An official Skills marketplace is also available.

https://claude.com/skills

## 💡 Tips for Interacting with AI

### Be Specific

Vague instructions lead to unexpected results. Communicate what you want specifically.

```
❌ "Make it better"
✅ "Sort the list by update time in descending order"
```

### Request Incrementally

Break large features into smaller requests. If you request everything at once, course corrections become difficult.

```
1. First, define the Contents table schema
2. Next, create CRUD API endpoints
3. Finally, create the frontend form
```

### State Constraints Explicitly

Communicating what you don't want prevents unintended changes.

```
Please implement with these constraints:
- Don't change existing API response format
- Don't add new libraries
- Prioritize readability over performance
```

### Prevent Over-Engineering

Claude Code tends to add complexity by considering backward compatibility. Be explicit about keeping things simple.

```
❌ What AI tends to do on its own:
- Keep old API and add new API
- Create wrapper functions with deprecation warnings
- Add feature flags to toggle between old and new

✅ State explicitly:
"Backward compatibility is not needed. Please modify existing code directly."
```

## 🧠 Role Division

Here's the role division between humans and AI that emerged from six months of development.

### What Humans Decide

- **Product direction**: What to build, what not to build
- **Architecture**: Technology selection, directory structure
- **Security**: Authentication/authorization design, vulnerability checks
- **User experience**: Usability, clarity
- **Final verification**: Does it actually work without issues?

### What to Delegate to AI

- **Pattern-based code generation**: CRUD APIs, form components
- **Refactoring**: Naming consistency, directory organization
- **Boilerplate creation**: Type definitions, test scaffolds
- **Error investigation**: Root cause inference from stack traces

AI changed the "How." The "What" and "Why" remain human work.

### Always Review Code

Always review AI-generated code yourself.

- **Security**: Is user ID being taken directly from request?
- **Type safety**: Is `any` or `as any` being used to bypass type errors?
- **Edge cases**: Are empty arrays, null values, etc. considered?

AI generates code that "works," but that doesn't mean it's "safe."

Being conscious of this role division has made collaboration with AI smoother. It's not about "delegating everything" but "building together."

## ✅ Summary

I shared my practices for developing with Claude Code.

| Point | Content |
|-------|---------|
| Construction Site Approach | Blueprint → Scaffolding → Build → Reasoning → Remove |
| CLAUDE.md | Share project context with AI |
| Extensions | MCP/Skills (minimal usage) |
| Interaction Tips | Be specific, incremental, state constraints |
| Role Division | How=AI, What/Why=Human, Review required |

AI is a powerful tool, but humans are the ones who wield it. I continue development with a mindset of "collaboration" rather than "delegation."

Tomorrow, I'll explain "Progress-Driven Development (PDD)."

---

**Other Articles in This Series**

- 12/22: Building Multi-tenant SaaS as a Solo Developer: Pursuing Enterprise Quality
- 12/24: Progress-Driven Development (PDD): Solo Development with AI Agents
