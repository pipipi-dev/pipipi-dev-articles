---
title: "Documentation Strategy for Indie Dev: Design Docs vs Thinking Logs"
emoji: "🐣"
type: "idea"
topics: ["IndieHacker", "Documentation", "Design", "ClaudeCode"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 4 of **Building SaaS Solo - Design, Implementation, and Operation Advent Calendar 2025**.

Yesterday I wrote about "Starting Indie Development with Next.js + Supabase." Today I'll share my documentation strategy for indie development.

**Note:** What I'm sharing here is my current approach after much trial and error. I've had plenty of failures, and I'll share those too.

## 📁 Current Documentation Structure

I spent many years at a SIer doing waterfall development. The flow of requirements → basic design → detailed design → implementation → testing is ingrained in me. When I started building Memoreru as an indie project, I initially took a waterfall approach, but gradually evolved into a hybrid style incorporating agile elements.

After much trial and error, Memoreru's documentation has the following structure. This may continue to evolve.

```
docs/
├── 00_project_management/   # Dev logs, task management
├── 05_market_strategy/      # Competitor analysis, positioning
├── 10_requirements/         # Functional & non-functional requirements
├── 20_basic_design/         # Architecture, DB design
├── 30_detailed_design/      # Screen definitions, API specs, table definitions
├── 40_implementation/       # Implementation guides, coding standards
├── 50_testing/              # Test specs, test plans
├── 60_release/              # Release procedures, checklists
├── 70_manual/               # User guides
├── 80_operations/           # Monitoring, incident response
├── 90_misc/                 # Hard to categorize items
├── 99_archive/              # Outdated documents
├── analysis/                # Analysis reports
├── features/                # Feature-specific research
├── learning/                # Technical research notes
├── refactoring/             # Refactoring plans
├── thinking/                # Thinking logs
└── deleted/                 # Deleted features
```

The numbered directories correspond to waterfall development phases. Meanwhile, `thinking/` and `features/` were added as needs arose during development.

The latter structure was inspired by this post:

https://x.com/commte/status/1980832165182284233

### Notes

Creating systematic documentation waterfall-style is really for medium to large-scale development like SaaS. For smaller projects, a more agile approach of placing date-prefixed documents flat without detailed folder structures might be more suitable. For example, this repository has date-prefixed documents placed flat:

https://github.com/team-mirai-volunteer/marumie/tree/develop/docs

Also, if you're concerned about Vercel auto-deploying every time you update docs, you can avoid this with Vercel's "Ignored Build Step." Including `[skip ci]` in commit messages is another option.

You could also put documentation in a separate repository from code. Separating repositories allows for different access permissions, but for indie development, I find having everything in the same place better for searchability and maintainability.

## 🚀 Early Stage: Locking Down Requirements Waterfall-Style

In the early stages of development, I took a waterfall approach. I brainstormed with Claude Code to create requirements documents like this:

```markdown
# Functional Requirements

## 1. User Management
- 1.1 User registration & login
- 1.2 Profile editing
- 1.3 Account deletion

## 2. Content Management
- 2.1 Create, edit, delete
- 2.2 Publishing settings
```

I created documents sequentially: "10_requirements" → "20_basic_design" → "30_detailed_design". I wasn't conscious of it at the time, but this was essentially a "spec-driven development" approach.

At this stage, the cycle of writing documentation before implementing was working well.

## 😿 Failure: Documentation Maintenance Couldn't Keep Up

However, problems emerged as implementation progressed.

Code changes daily, but documentation stays stale. Design docs and implementation diverge. The cycle of "update documentation before implementing" stopped working.

I have tons of files in detailed design alone, but honestly, many of them don't match the current implementation. This is something I need to reflect on.

## 🔄 Shift: Hybrid with Agile

Feeling the limits of documentation-driven development, I changed my approach.

- **Major design changes**: Write documentation first (waterfall-style)
- **Daily implementation**: Write code first, update documentation as needed (agile-style)

I settled into a hybrid style that's neither purely waterfall nor purely agile.

## 🧠 Tip 1: Keep Date-Prefixed Thinking Logs

While design doc maintenance fell behind, the thinking logs in the `thinking/` directory are still useful. When I look back later, I can understand why I made certain decisions. For example:

```
thinking/
├── 20251010_table_design_review.md
├── 20251110_id_generation_review.md
├── 20251111_caching_strategy_review.md
└── 20251113_ai_feature_design.md
```

I use dates as prefixes to record what I considered that day.

The key to thinking logs is recording not just "what was decided" but "why it was decided." Here's the format I use:

```markdown
## 2025-11-10: Delete Feature Specification

### Background
Need to decide how to handle user data deletion.

### Options Considered
1. Hard delete (completely remove)
2. Soft delete (flag as hidden)
3. Trash feature (auto-delete after 30 days)

### Decision
Adopted the trash feature.

### Reasoning
- Allows recovery from accidental deletion
- Storage can be managed with periodic deletion
```

Even if design docs become outdated, thinking logs retain value as "decisions at that point in time."

## 💡 Tip 2: Place Documentation Near the Code

To prevent documentation and implementation from diverging, I'm trying an approach of **placing documentation near the code**.

```
src/server/README.md   # Server layer design explanation
```

For example, the server directory README describes the layer structure and naming conventions:

```markdown
## Directory Structure

server/
├── loaders/          # Read entry points (for SSR)
├── actions/          # Write entry points
├── api/              # API handlers
├── usecases/         # Business logic
└── repositories/     # Data access layer

## Layer Structure

Request → api/ → usecases/ → repositories/ → database/
```

When documentation is near the code, it's easier to update together when changing implementation. This is working well.

## 📊 Tip 3: Use Documentation as AI Context

When developing with Claude Code, documentation plays an important role.

AI can read code, but it can't understand the intent behind "why this design was chosen." By having it read thinking logs, you get suggestions that understand the background. Documentation also functions as context for AI.

### CLAUDE.md: Instructions for AI Agents

With Claude Code, you can place a `CLAUDE.md` file at your project root to communicate project-specific rules and context to the AI.

Memoreru's `CLAUDE.md` includes information like:

- **Project status**: Development stage, top priorities
- **Design philosophy**: Core values, design principles
- **Directory structure**: Role of each directory
- **Implementation rules**: Coding standards, prohibited actions
- **Git workflow**: Branch strategy, commit rules
- **References to thinking**: Links to past design decisions

Especially by documenting prohibited actions (like direct production environment operations), you can reduce the risk of AI suggesting incorrect operations.

For CLAUDE.md tips, this post is also helpful:

https://x.com/oikon48/status/1995781484108734682

## ✅ Summary: Lessons from Trial and Error

Here are the lessons learned from trial and error with Memoreru.

**What worked:**
- Brainstorming with AI during requirements definition
- Keeping date-prefixed thinking logs
- Placing READMEs near the code

**What didn't work:**
- Trying to write perfect detailed design docs before implementing
- Postponing documentation updates

I'm currently exploring better documentation practices with the direction of "making the code itself the design document." How do you handle documentation in your projects?

Tomorrow I'll discuss "Git Branch Strategy: Workflows for Indie Development."

---

**Other articles in this series**

- 12/3: Starting Indie Development with Next.js + Supabase: Project Structure Overview
- 12/5: Git Branch Strategy: Workflows for Indie Development
