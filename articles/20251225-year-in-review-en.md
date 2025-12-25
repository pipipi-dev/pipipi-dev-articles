---
title: "2025 Year in Review: Lessons from Solo SaaS Development"
emoji: "🎄"
type: "idea"
topics: ["indiedev", "retrospective", "nextjs", "claudecode"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 25, the final article of the **[Solo SaaS Development - Design, Implementation & Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

I'll reflect on the technical knowledge shared over the past 25 days and summarize what I learned from 6 months of development.

## 🤖 2025: The Year Development Changed

2025 was the year AI-powered development went mainstream.

Claude Code was released in February, followed by GitHub Copilot Agent, OpenAI Codex, and other AI coding tools. "Having AI write your code" became a realistic option for many developers.

I started developing Memoreru in June—right when these tools were maturing.

As I wrote on Day 23, collaborating with Claude Code significantly changed my development style. Humans handle design, AI assists with implementation, and humans take responsibility for reviews. This division of labor enabled solo development that feels like team development.

The PDD (Progress-Driven Development) introduced on Day 24 is also a methodology built around AI collaboration. By maintaining design documents and visualizing progress, you can develop efficiently with AI agents.

Starting indie development in 2025 was good timing. It was a year when AI tools greatly expanded the possibilities for solo developers.

## 📖 The 25-Day Journey

The 25 articles were structured to follow the flow of indie development. The structure allows those starting indie development to experience the development journey vicariously.

**Prologue (12/1-3)** covered the flow from idea to first commit, AI-friendly tech selection, and Next.js + Supabase project structure.

**Foundation (12/4-9)** covered documentation strategy, Git workflow, DB design, and authentication implementation. Day 9's NextAuth.js → Better Auth migration may be helpful for those struggling with auth library choices.

**Frontend, API & Infrastructure (12/10-13)** started with App Router directory design, followed by MPA → SPA migration, Route Handler → Hono migration, and Vercel optimization. The SPA migration on Day 11 was a major refactoring with over 150 commits.

**UX & Features (12/14-17)** introduced mobile-first design, infinite scroll implementation, Excel-like table UI, and semantic search with pgvector. Day 15's React 19 + Zustand pitfall documents an unexpected bug encounter.

**Practical Challenges (12/18-22)** covered bugs discovered through TypeScript strict mode, the React vulnerability disclosed in December, Stripe billing, GA4 + Clarity, and multi-tenant design—all operational topics.

**Retrospective (12/23-25)** covers Claude Code collaboration, Progress-Driven Development (PDD), and concludes with this article.

## 🚀 Tech Stack

Here's the final technology stack after 6 months of development.

### Frontend

| Technology | Purpose | Related Articles |
|------------|---------|------------------|
| Next.js 15 (App Router) | Framework | Days 3, 10, 11 |
| React 19 | UI Library | Day 15 |
| TypeScript 5 | Type Safety | Day 18 |
| Zustand | Client State Management | Days 11, 15 |

### Backend & Infrastructure

| Technology | Purpose | Related Articles |
|------------|---------|------------------|
| Supabase | BaaS | Days 3, 6 |
| PostgreSQL | Database | Days 6, 17 |
| pgvector | Vector Search | Day 17 |
| Drizzle ORM | ORM | Days 3, 6 |
| Better Auth | Authentication & 2FA | Day 9 |
| Hono | API Framework | Day 12 |
| Zod | Schema Definition & Validation | Days 12, 18 |
| Vercel | Hosting | Days 3, 5, 13 |
| Stripe | Payments | Day 20 |
| OpenAI API | AI Features | Day 17 |

### UI & Editor

| Technology | Purpose | Related Articles |
|------------|---------|------------------|
| @dnd-kit | Drag & Drop | Day 16 |
| React Spreadsheet | Spreadsheet UI | Day 16 |

### Development Tools

| Technology | Purpose | Related Articles |
|------------|---------|------------------|
| Claude Code | AI Pair Programming | Days 5, 23, 24 |
| Git Worktree | Parallel Development | Day 5 |
| Biome | Linter / Formatter | Day 18 |
| GA4 | Analytics | Day 21 |
| Microsoft Clarity | Heatmap Analysis | Day 21 |

For more details on the tech stack, see:

https://memoreru.com/about

## 💡 Lessons Learned

### Technology Selection and Migration

On Day 2, I wrote about "Tech Selection for AI-Driven Development." Choose technologies with rich documentation, type safety, and simple APIs. This was my selection philosophy.

However, the first choice isn't always right. Over 6 months, I made 4 major technology migrations.

| Migration | Reason | Related Article |
|-----------|--------|-----------------|
| Prisma → Drizzle ORM | Better type inference, smaller bundle | Day 6 |
| NextAuth.js → Better Auth | Simpler API, Drizzle compatibility | Day 9 |
| Route Handler → Hono | OpenAPI integration, middleware design | Day 12 |
| MPA → SPA | Better UX, centralized state management | Day 11 |

I sometimes think I should have gone with SPA from the start, but starting with MPA helped me understand SPA's benefits.

What's important is maintaining a state where you can make changes when you notice problems. Tests and design documents helped with this.

### Documentation and Testing

On Day 4, I wrote about "Documentation-First Approach."

Feature specs, API specs, DB specs, UI specs, and thought logs recording design decisions. I've been maintaining all of these.

Time spent on documentation paid off as development efficiency. In the Claude Code collaboration introduced on Day 23, having design documents lets you say "implement according to this design." The PDD (Progress-Driven Development) from Day 24 also only works when design documents exist.

Tests proved their value during major changes. SPA migration, Better Auth migration, Drizzle migration. I could make these changes confidently because tests existed. As I wrote on Day 18, TypeScript strict mode prevents type errors but not logic bugs. Having tests meant I could make changes without fear.

### Development Efficiency

Here's a summary of the practices introduced across the 25 articles.

| Challenge | Solution | Article |
|-----------|----------|---------|
| Parallel Development | Git Worktree | Day 5 |
| Type Safety | TypeScript Strict Mode | Day 18 |
| API Type Definitions | Hono + Zod OpenAPI | Day 12 |
| Progress Management | PDD (Progress-Driven Development) | Day 24 |
| AI Collaboration | Design Documents + Claude Code | Day 23 |

These practices are effective individually, but combining them produces even greater results.

## 🌱 Looking Ahead to 2026

2025 was a year when the evolution of AI tools significantly changed how we develop.

I'll continue development in 2026. I hope these 25 articles serve as a reference for those pursuing indie development.

The thinking behind the development is documented in the note Advent Calendar. If interested, please check it out:

https://adventar.org/calendars/12464

I share development updates on X, so please follow if interested:

https://x.com/pipipi_dev

Thank you for reading to the end.

## 📝 Article List

### Prologue (12/1-3)

| Day | Title |
|-----|-------|
| 1 | [Starting Indie Development: From Idea to First Commit](https://zenn.dev/pipipi_dev/articles/20251201-how-to-start-indie-dev) |
| 2 | [Tech Selection for AI-Driven Development: Finding the Right Stack](https://zenn.dev/pipipi_dev/articles/20251202-ai-driven-tech-selection) |
| 3 | [Next.js + Supabase for Indie Dev: Project Structure Overview](https://zenn.dev/pipipi_dev/articles/20251203-nextjs-supabase-project-structure) |

### Foundation: Design, DB & Auth (12/4-9)

| Day | Title |
|-----|-------|
| 4 | [Documentation Strategy for Indie Dev: Design Docs & Thought Logs](https://zenn.dev/pipipi_dev/articles/20251204-indie-dev-documentation-strategy) |
| 5 | [Git Branch Strategy: Workflow for Solo Development](https://zenn.dev/pipipi_dev/articles/20251205-git-branch-strategy) |
| 6 | [Supabase Schema Design: Table Separation and Normalization](https://zenn.dev/pipipi_dev/articles/20251206-supabase-schema-design) |
| 7 | [Database ID Design: Choosing ID Types and Primary Keys](https://zenn.dev/pipipi_dev/articles/20251207-database-id-design) |
| 8 | [DB Migration Operations: Safely Managing Dev and Prod](https://zenn.dev/pipipi_dev/articles/20251208-database-migration-strategy) |
| 9 | [NextAuth.js to Better Auth: Why I Migrated Auth Libraries](https://zenn.dev/pipipi_dev/articles/20251209-nextauth-to-better-auth) |

### Frontend, API & Infrastructure (12/10-13)

| Day | Title |
|-----|-------|
| 10 | [App Router Directory Design: Next.js Project Structure](https://zenn.dev/pipipi_dev/articles/20251210-app-router-directory-design) |
| 11 | [Why I Migrated from MPA to SPA: App Router Refactoring](https://zenn.dev/pipipi_dev/articles/20251211-mpa-to-spa-migration) |
| 12 | [Next.js Route Handler to Hono: Why API Design Got Easier](https://zenn.dev/pipipi_dev/articles/20251212-route-handler-to-hono) |
| 13 | [Vercel Optimization: Reducing Build Time and Improving Response](https://zenn.dev/pipipi_dev/articles/20251213-vercel-optimization) |

### UX & Features (12/14-17)

| Day | Title |
|-----|-------|
| 14 | [Mobile-First for Optimal UX: Responsive Design in Practice](https://zenn.dev/pipipi_dev/articles/20251214-mobile-first-responsive) |
| 15 | [Infinite Scroll × Zustand × React 19: Async Pitfalls](https://zenn.dev/pipipi_dev/articles/20251215-infinite-scroll-zustand) |
| 16 | [No-Code Excel-Like Tables: Implementing Drag & Drop UI](https://zenn.dev/pipipi_dev/articles/20251216-excel-like-table) |
| 17 | [Implementing Semantic Search: pgvector + OpenAI Embeddings](https://zenn.dev/pipipi_dev/articles/20251217-semantic-search-pgvector) |

### Practical Challenges (12/18-22)

| Day | Title |
|-----|-------|
| 18 | [Bugs Found with TypeScript Strict Mode: Type Safety in Practice](https://zenn.dev/pipipi_dev/articles/20251218-typescript-strict-mode) |
| 19 | [December 2025 React Vulnerability: Security for Solo Devs](https://zenn.dev/pipipi_dev/articles/20251219-security-essentials-solo-dev) |
| 20 | [Implementing Tiered Pricing with Stripe: Monetizing Indie Dev](https://zenn.dev/pipipi_dev/articles/20251220-stripe-pricing-design) |
| 21 | [Visualizing User Behavior: Setting Up GA4 and Microsoft Clarity](https://zenn.dev/pipipi_dev/articles/20251221-ga4-clarity-analytics) |
| 22 | [Building Multi-Tenant SaaS Solo: Pursuing Enterprise Quality](https://zenn.dev/pipipi_dev/articles/20251222-multi-tenant-saas) |

### Retrospective (12/23-25)

| Day | Title |
|-----|-------|
| 23 | [How Claude Code Changed My Indie Dev: AI Pair Programming](https://zenn.dev/pipipi_dev/articles/20251223-claude-code-ai-pair-programming) |
| 24 | [Progress-Driven Development (PDD): Indie Dev with AI Agents](https://zenn.dev/pipipi_dev/articles/20251224-progress-driven-development) |
| 25 | 2025 Year in Review: Lessons from Solo SaaS Development (This Article) |
