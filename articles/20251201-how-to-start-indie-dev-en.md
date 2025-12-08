---
title: "How to Start Indie Development: From Idea to First Commit"
emoji: "🚀"
type: "idea"
topics: ["indiedev", "nextjs", "typescript", "supabase"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 1 of the **[Building a SaaS Solo - Design, Implementation, and Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Over 25 days, I'll share technical insights from developing my own product.

Since the product hasn't launched yet, this is a record of trial and error, not success stories. It's also an exercise in organizing my thoughts, so please read with that in mind.

### 25-Day Structure

| Period | Theme | Content |
|--------|-------|---------|
| 12/1-3 | Beginning | Idea, Tech Selection, Project Structure |
| 12/4-9 | Foundation | Documentation, Git, DB Design, Auth |
| 12/10-13 | Frontend & API | App Router, SPA, Hono, Vercel |
| 12/14-17 | Features | UX, Infinite Scroll, Table UI, AI Search |
| 12/18-22 | Practical Issues | TypeScript, Security, Billing, Analytics |
| 12/23-25 | Retrospective | Claude Code, Persistence, Summary |

### Project Overview

- **Product Name**: Memoreru
- **Concept**: Organize knowledge, nurture thinking
- **Target**: From personal notes to team knowledge sharing
- **Development Period**: June 2025~ (about 5 months)
- **Tech Stack**: Next.js / TypeScript / Tailwind CSS / Supabase / Vercel
- **Service URL**: https://memoreru.com/ (in development)

## 💡 It Started with Everyday Inconveniences

In June 2025, I decided to seriously start indie development. The trigger was small inconveniences I felt in information management.

I'd take notes on things I learned, but couldn't find them later. When sharing information with a team, it became unclear where everything was.

I tried BI tools to visualize data. But data entry and visualization were separate, and integration didn't work well. I ended up manually transcribing data anyway.

Many people probably have similar experiences.

Notion is a great tool, but has a steep learning curve. BI tools are powerful, but can't handle everything from data entry to visualization seamlessly.

I wanted a tool that was more intuitive and could handle data utilization. That was the origin of Memoreru.

## ✏️ Starting with Design: A Documentation-First Approach

Once an idea takes shape, it's tempting to start coding immediately. However, I deliberately started with creating design documents.

In indie development, you basically handle everything alone. That's exactly why I thought it was important to verbalize and organize the ideas in my head.

Specifically, I created documents like these first:

**Functional Requirements**: What to build
**Non-Functional Requirements**: What quality to aim for
**System Design**: How to build it
**Database Design**: How to manage data

Writing these documents clarified ambiguous areas. Questions like "Is this feature really necessary?" and "Can this be simpler?" naturally emerged, improving design accuracy.

However, you don't need perfect documentation. Starting coding at a reasonable completion level and updating as development progresses is sufficient.

## 🛠️ Tech Selection: Choose Proven Technologies

Choosing technologies with rich documentation and abundant information makes problem-solving smoother.

For Memoreru, I adopted these technologies:

**Frontend**
- Next.js / TypeScript / Tailwind CSS

**Backend & Infrastructure**
- Supabase / Vercel

These are mature technology stacks as of 2025. When you're stuck, searching usually finds solutions.

## 🎯 The First Commit

On June 20, 2025, I made my first commit.

Honestly, I wasn't perfectly prepared. Design documents were incomplete, code wasn't working. But I thought "just start" and made the commit.

There's no right answer for a first commit. Just a README is fine, or after writing some code.

What matters is **creating a repository and taking that first step**.

Rather than staring at an empty repository, having some commit makes you feel like "let's build more." Waiting for perfection means never starting.

## 🔄 Tips for Continuing Development

About 5 months since the first commit, and now the commit count exceeds 2,600.

The reason I could continue is simple: **I didn't seek perfection**.

I started with Prisma but later migrated to Drizzle ORM. Authentication also switched from NextAuth.js to Better Auth. If you make mistakes, just fix them. That's the mindset I've maintained.

## ✅ Summary: Just Start

You don't need special preparation to start indie development.

1. **Note everyday inconveniences**: What troubles you becomes ideas
2. **Write simple design docs**: Organize what you're building in your head
3. **Choose proven technologies**: Next.js, Supabase, TypeScript, etc.
4. **Make the first commit**: Doesn't need to be perfect, just the skeleton
5. **Progress a little each day**: If you make mistakes, just fix them

I was anxious at first too, wondering "can I really do this?" But now it's a project with over 2,600 commits.

What matters is starting. And continuing.

I hope this article encourages those thinking about starting indie development.

---

Tomorrow, I'll explain "Tech Selection for AI-Driven Development" in more detail.
