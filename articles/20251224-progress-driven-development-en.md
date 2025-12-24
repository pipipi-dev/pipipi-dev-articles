---
title: "Progress-Driven Development (PDD): Solo Development with AI Agents"
emoji: "🌱"
type: "idea"
topics: ["solodev", "projectmanagement", "claudecode", "pdd"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 24 of the **[Building a SaaS Solo - Design, Implementation, and Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday's article covered "AI Pair Programming with Claude Code." Today, I'll introduce "Progress-Driven Development (PDD)," a methodology for collaborating with AI agents.

:::message
"Progress-Driven Development (PDD)" is a term and concept I coined for this article. Drawing from over 10 years of PM/PdM experience with various progress management tools and methodologies, I developed this approach while exploring progress management methods suited to collaborating with AI agents.
:::

## 💡 What is Progress-Driven Development?

Progress-Driven Development (PDD: Progress-Driven Development) is a methodology that structures the entire development process and clarifies completion criteria for each step, enabling humans and AI to collaborate efficiently.

### Challenges in Solo Development

When continuing solo development, do you ever face challenges like these?

- Can't remember "how far did I get with that feature?"
- Don't know what to do next when resuming after a break
- Can't grasp what percentage of the overall project is complete

Spec-Driven Development (SDD: Spec-Driven Development) is a methodology that uses specification documents as the SSoT (Single Source of Truth) to drive design and implementation. Test-Driven Development (TDD: Test-Driven Development) is a methodology that repeats short cycles of writing a failing test (Red), implementing to pass the test (Green), and refactoring (Refactor).

These methodologies focus on "what to build" and "how to build it," but a separate mechanism is needed to understand "how much is done."

**Reference Documents**
- [Revisiting SDD (Spec-Driven Development) and Specifications](https://zenn.dev/beagle/articles/fd60745bc54de1)
- ["Having AI Write All Tests First" Isn't TDD. But That's OK.](https://zenn.dev/loglass/articles/16745471ef55ff)

### PDD's Position

PDD doesn't reject SDD or TDD. It complements them by adding a **progress management perspective**.

```
SDD:  Drive implementation using specification documents as the single source of truth
TDD:  Ensure code quality through short test-implementation cycles
PDD:  Visualize progress to understand "how much is done"
```

By breaking development into multiple steps and clarifying completion criteria for each, you can see at a glance "how far along we are now."

### Comparison with SDD/TDD

| Method | Focus | Artifact | Cycle |
|--------|-------|----------|-------|
| SDD | Specification clarity | Spec documents | Spec→Design→Implement |
| TDD | Code quality | Test code | Test→Implement→Refactor |
| PDD | Progress visualization | Progress matrix | Check→Implement→Scan→Review |

If TDD is a methodology for developers, PDD is a **methodology for management**. These are not mutually exclusive and can be combined.

### Application to Team Development

While I conceived this methodology for solo development, it can also be applied to team development. PDD progress tables can be shown directly to non-engineering team members.

| Method | Artifact Readability | Progress Visualization | Stakeholder Sharing |
|--------|---------------------|----------------------|-------------------|
| SDD | Spec documents (anyone can read) | Fulfillment level (progress hard to see) | Easy |
| TDD | Test code (for technical people) | pass/fail (progress hard to see) | Explanation needed |
| PDD | Progress table (anyone can read) | Matrix display (progress easy to understand) | Easy |

## 🔢 Feature × Step Matrix

PDD's characteristic is managing progress with a **Feature (vertical axis) × Step (horizontal axis)** matrix.

### Step Definition

In my project, I manage each feature in 10 stages. I use 10 stages because it makes progress calculation easy at 10% increments (10% × 10 steps = 100%).

| # | Step | Content | Owner |
|---|------|---------|-------|
| 01 | spec | Specification (requirements) | AI/Human |
| 02 | design | Design (API design, DB design, etc.) | AI/Human |
| 03 | database | Schema & migrations | AI |
| 04 | ui | Screens & components | AI |
| 05 | api | API endpoints | AI |
| 06 | usecase | Business logic | AI |
| 07 | repository | Data access layer | AI |
| 08 | unit-test | Unit tests | AI |
| 09 | guide | User guide | AI |
| 10 | review | Overall review | Human |

The number and content of steps can be freely designed according to your product. My product requires a user guide, so I include guide, but you can omit it if unnecessary. 5 or 8 stages work fine too. What's important is clarifying "what constitutes completion."

In my case, 01-spec and 02-design are created collaboratively by humans and AI, 03-09 are implemented by AI. The final 10-review is where humans do the final confirmation.

### Status Definition

In my project, I set 5 status levels for each cell.

| Status | Symbol | Progress | Meaning |
|--------|--------|----------|---------|
| none | `[n]` | 0% | Not started |
| started | `[s]` | 25% | Started |
| draft | `[d]` | 50% | Draft complete |
| reviewed | `[r]` | 75% | Reviewed |
| done | `[x]` | 100% | Complete |

The number and names of status levels can also be freely designed according to your project. A simple 3-stage "Not started / In progress / Complete" works fine too.

## 🧩 Progress Management System

In my project, I place progress management files in `docs/progress/`. I created these by consulting with Claude Code. You can request it with a prompt like this:

```
I want to create a progress management system for my project.

Requirements:
- Manage progress with JSON files per feature
- Each feature consists of 10 steps (spec, design, database, ui, api, usecase, repository, unit-test, guide, review)
- Status has 5 levels: none/started/draft/reviewed/done
- Also create JSON files listing related file paths per step (for quick document access)
- CLI commands for progress display and auto-scanning
- Matrix format display with color coding

First, propose the directory structure and an example JSON file for one feature.
```

You don't need to create something perfect from the start. It's fine to improve it as you use it. Below, I'll introduce the structure I actually use.

### Directory Structure

```
docs/progress/
├── features/           # Progress files per feature
│   ├── 01-auth/
│   │   ├── 01-register.json
│   │   ├── 02-verify-email.json
│   │   ├── 03-login.json
│   │   └── ...
│   ├── 02-home/
│   ├── 03-contents/
│   └── ...
├── steps/              # File lists per step
│   ├── 01-spec.json
│   ├── 02-design.json
│   └── ...
├── checklists/         # Completion criteria per step
│   ├── 01-spec.md
│   ├── 02-design.md
│   ├── 03-database.md
│   └── ...
└── scripts/            # CLI tools
    └── pdd.ts          # Provides pdd scan / pdd status
```

### 1. Progress Management per Feature

Progress for each feature is managed with JSON files.

```json
{
  "id": "login",
  "name": "Login",
  "description": "Login with email/password",
  "steps": {
    "01-spec": {
      "status": "done",
      "files": [{ "path": "src/_spec.md", "reviewed": false }]
    },
    "02-design": {
      "status": "done",
      "files": [{ "path": "src/client/components/auth/login/_design.md", "reviewed": false }]
    },
    "03-database": { "status": "done", "files": [...] },
    "04-ui": {
      "status": "done",
      "files": [
        { "path": "src/app/[locale]/(auth)/login/page.tsx", "reviewed": false },
        { "path": "src/client/components/auth/login/LoginPage.tsx", "reviewed": false }
      ]
    },
    "05-api": { "status": "done", "files": [...] },
    "06-usecase": { "status": "na" },
    "07-repository": { "status": "na" },
    "08-unit-test": { "status": "done", "files": [...] },
    "09-guide": { "status": "none" },
    "10-review": { "status": "none", "note": "Need final auth flow confirmation" }
  }
}
```

Key points:
- `files`: Records files created for that step (updated by auto-scan)
- `reviewed`: Tracks whether each file has been reviewed
- `note`: Records supplementary information and TODOs
- `na`: When that step is not applicable

### 2. Artifact List per Step

The `steps/` directory contains JSON files summarizing artifacts (file paths) per step.

In my project, I place design documents (`_design.md`) near the implementation files. This makes it easier for AI agents to reference designs during implementation. However, when humans review, design documents are scattered and hard to find. By summarizing lists in `steps/`, both humans and AI agents can proceed with development smoothly.

```json
{
  "step": "02-design",
  "name": "Design",
  "categories": [
    {
      "category": "auth",
      "categoryName": "01 Auth",
      "subcategories": [
        {
          "subcategory": "01-01",
          "subcategoryName": "User Registration",
          "files": [
            { "path": "src/client/components/auth/register/_design.md" }
          ]
        },
        {
          "subcategory": "01-02",
          "subcategoryName": "Email Verification",
          "files": [
            { "path": "src/client/components/auth/verify-email/_design.md" }
          ]
        },
        {
          "subcategory": "01-03",
          "subcategoryName": "Login",
          "files": [
            { "path": "src/client/components/auth/login/_design.md" }
          ]
        }
      ]
    }
  ]
}
```

Combined with the VS Code extension "Open File From Path," you can place your cursor on a path in the JSON file and press a shortcut key (alt+d) to jump directly to that file. It's convenient when you want to "check design documents" or "see the unit test list."

https://marketplace.visualstudio.com/items?itemName=jack89ita.open-file-from-path

### 3. Completion Criteria Checklists

Each step has completion criteria defined as checklists. With these checklists, AI can self-determine "what to do next."

**04-ui (Screen) example:**

```markdown
## Completion Criteria
- [ ] Required page components exist
- [ ] Required UI components exist
- [ ] TypeScript compiles successfully
- [ ] Screen displays correctly

## Quality Criteria
| State | Criteria |
|-------|----------|
| done | User operations are processed, loading/error states implemented |
| draft | UI displays but operations not implemented, using dummy data |
| none | Component files don't exist |
```

**10-review (Overall Review) example:**

```markdown
## Completion Criteria
- [ ] Code review completed
- [ ] Functionality verification completed
- [ ] Usability confirmed
- [ ] Security review completed

## AI's Role
- AI cannot "perform" the review
- AI can detect and report "review is needed"
```

## 🎮 Progress Management Commands

I've prepared a CLI tool `pdd` for progress management. It's implemented in TypeScript and placed in `docs/progress/scripts/pdd.ts`.

| Command | Role |
|---------|------|
| `pdd scan` | Auto-update status based on file existence |
| `pdd status` | Display progress in terminal |

The benefit of CLI-based management is that it's self-contained locally without requiring external services like progress management tools. Progress data is included in the repository as JSON files, so it can also be version-controlled with Git. Implementation is simple - just JSON file reading/writing and directory traversal. You can implement it in your preferred language or tools.

### Auto Scan

Traverses source code and auto-updates progress file statuses.

```bash
pdd scan
```

**Behavior:**

1. Traverse source code directories
2. Check for files corresponding to each feature
3. Auto-update to `done` if files exist, `none` if not
4. Don't overwrite manually set statuses (`draft` and `started` are preserved)

By running this command after implementation, progress is automatically reflected.

### Progress Display

Reads progress files and displays progress.

```bash
pdd status
```

**Summary Display:**

First displays overall progress summary.

```
Overall Progress  [██████████████░░░░░░] 70%

By Section
  01 Auth               [███████░░░] 68%
  02 Home               [███████░░░] 70%
  03 Contents           [███████░░░] 74%
  04 Search             [██████░░░░] 63%

By Step
  01 spec               [██████████] 100%
  02 design             [██████████] 100%
  03 database           [█████████░] 86%
  08 unit-test          [███░░░░░░░] 25%
  10 review             [░░░░░░░░░░] 0%
```

You can see at a glance: "70% overall complete," "tests are behind," "review not yet started."

**Matrix Display:**

Then displays detailed per-feature information in matrix format.

```
Legend: [n]Not started [s]Started [d]Draft [r]Reviewed [x]Done [-]N/A
Steps: [1]spec [2]design [3]database [4]ui [5]api [6]usecase [7]repository [8]unit-test [9]guide [10]review

🚀 01 Auth
  01 User Registration  [██████░░░░] 63% [x] [x] [x] [-] [-] [x] [x] [n] [n] [n]
  02 Email Verification [███████░░░] 67% [x] [x] [x] [-] [-] [x] [x] [n] [-] [n]
  03 Login              [████████░░] 75% [x] [x] [x] [-] [-] [x] [x] [x] [n] [n]

🚀 02 Home
  01 Bookmarks          [█████████░] 89% [x] [x] [x] [x] [x] [x] [x] [x] [-] [n]
  02 Public             [███████░░░] 67% [x] [x] [-] [-] [-] [x] [x] [n] [-] [n]
```

In my environment, I display with color coding in the terminal (green=80%+, yellow=50%+, red=below 50%).

## 🚀 Development Workflow

### Daily Workflow

My daily development flow is as follows.

**1. Check Progress**
```bash
pdd status
```
Check overall progress and what's behind.

**2. Instruct AI**
```
"Please implement 08-unit-test for the login feature.
Refer to docs/progress/checklists/08-unit-test.md for the checklist."
```
AI can self-determine what to do by looking at the checklist.

**3. Auto Scan**
```bash
pdd scan
```
Detect newly created files and auto-update status.

**4. Review**
Verify actual operation, update `10-review` to `done` if no issues.

With this repetition, you can continue development without wondering "what to do next."

### Combining with Parallel Development

PDD becomes even more efficient when combined with parallel development using Git Worktree.

| Worktree | Assigned Steps | Scope |
|----------|---------------|-------|
| spec-design | 01-spec, 02-design | Spec & design documents |
| database | 03-database | Schema & migrations |
| frontend | 04-ui | Screens & components |
| backend | 05-api, 06-usecase, 07-repository | Server-side implementation |
| unit-test | 08-unit-test | Test code |
| guide | 09-guide | Guides & seed data |
| develop | 10-review | Integration, final review |

Different AI agents work in parallel in each Worktree, then integrate in the develop branch.

**Merge Order (considering dependencies):**

```
1. spec-design  ← Reference for other implementations
2. database     ← Can't write repository without schema
3. frontend     ← Create screen mocks first
4. backend      ← Depends on DB schema
5. unit-test    ← Depends on implementation
6. guide        ← After implementation complete
```

By merging in order considering dependencies, conflicts are minimized.

For team development, everyone checks progress together, and a manager should consolidate progress file updates to avoid conflicts.

## ✅ Summary

I introduced Progress-Driven Development (PDD).

| Point | Content |
|-------|---------|
| Position | Adds progress management perspective to SDD/TDD |
| Matrix Management | Visualize progress with Feature × Step |
| Progress System | JSON + Checklists + Auto-scan |
| Role Division | Spec/Design=collaborate, Implementation=AI, Review=Human |
| Parallel Development | Multiple AIs work simultaneously with Git Worktree |

PDD is a methodology that maximizes AI agent capabilities while humans guarantee final quality. By visualizing progress, "what to do next" becomes clear, helping sustain solo development. It can also be applied to team development.

Tomorrow, I'll write about "Reflecting on 2025 Solo Development."

---

**Other Articles in This Series**

- 12/23: How Claude Code Changed My Solo Dev Workflow: AI Pair Programming
- 12/25: Reflecting on 2025 Solo Development: Lessons in Technology, Design, and Operations
