---
title: "Tech Selection for AI-Driven Development: Choosing the Right Stack"
emoji: "🤖"
type: "tech"
topics: ["indiedev", "nextjs", "typescript", "ai"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 2 of the **[Building a SaaS Solo - Design, Implementation, and Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday's article covered "How to Start Indie Development." Today, I'll dive deeper into tech selection, which is crucial for AI-driven development.

## 💡 What is AI-Driven Development?

It's a development style that leverages AI coding assistants like Claude Code, Codex, or Cursor.

Tell the AI "implement this feature" and it generates code. When you get an error, say "fix this error" and it suggests solutions.

To maximize development efficiency with this style, it's important to **choose tech stacks that AI can understand well**.

There's a great document called "Indie Development Complete Guide" on izanami, a posting platform for indie developers, which summarizes tech selection resources and the overall picture of indie development. I learned about this guide after I had already finished my tech selection. (I wish I had known about it before I started... lol)

https://izanami.dev/kojin-kaihatsu

Since just saying "check this out" would end the conversation here, in this article I'll share the tech stack I actually chose and the criteria behind those decisions.

## ✏️ Characteristics of AI-Friendly Technologies

### 1. Type Information Improves Accuracy

With type information, AI can more easily understand "what this function receives and what it returns."

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // AI can understand what this function returns
}
```

Statically typed languages like TypeScript are easier for AI to understand because type information is embedded in the code. However, dynamically typed languages like Ruby or Python can also work well with AI if documentation is comprehensive.

### 2. Rich Documentation

Technologies with comprehensive documentation tend to get more accurate responses from AI. Conversely, AI might return outdated or incorrect information for minor libraries with sparse documentation.

### 3. Active Community

Technologies with many users tend to get more appropriate responses from AI.

Next.js, React, Supabase, and similar technologies have large user bases. When you say "I want to do X," AI suggests appropriate implementation patterns.

### 4. Clear Rules

Technologies with clear rules are easier for AI to handle.

Next.js App Router is a good example. `app/page.tsx` is the top page, `app/about/page.tsx` is the /about page. Rules are clear, so AI accurately understands file placement.

## 🛠️ Tech Stack Adopted in Memoreru

For Memoreru, which I'm developing, I adopted the following technologies. All were chosen based on "good compatibility with AI." For the full tech stack, see the "About Memoreru" page.

https://memoreru.com/about

I'm originally a server-side engineer and wasn't familiar with frontend technologies. Even so, by asking AI questions and researching as I went, I've managed to shape things up. I feel that AI-driven development makes it easier to tackle unfamiliar areas.

### Frontend

| Technology | Selection Reason |
|------------|------------------|
| Next.js | Rich documentation, clear App Router conventions |
| TypeScript | Type information improves AI accuracy |
| Tailwind CSS | Intuitive class names, easy for AI to understand |

### Backend & Infrastructure

| Technology | Selection Reason |
|------------|------------------|
| Supabase | PostgreSQL-based, comprehensive documentation |
| Vercel | Excellent compatibility with Next.js, easy deployment |
| Drizzle ORM | Type-safe, SQL-like syntax |

### Auth & API

| Technology | Selection Reason |
|------------|------------------|
| Better Auth | Built with TypeScript, type-safe |
| Hono | Built with TypeScript, lightweight |

## 🎯 What to Avoid in Tech Selection

### Too New Technologies

Technologies just released may not get accurate code generation from AI. It's safer to wait at least 6 months to a year.

### Documentation Only in Non-English Languages

Libraries with English documentation tend to get more accurate responses from AI. For libraries with documentation only in other languages (like Japanese), AI may not be able to provide appropriate suggestions.

### Technologies with Many Custom Conventions

Technologies with high learning curves are also difficult for AI. Frameworks with many unique concepts and conventions may get incorrect suggestions from AI.

## 🔄 Expect to Switch Technologies

There's no perfect tech selection. As development progresses, you might realize "this technology wasn't right."

In Memoreru, I switched several technologies:

- **Prisma → Drizzle ORM**: Prioritizing type safety and performance
- **NextAuth.js → Better Auth**: Needed more flexible authentication
- **Route Handler → Hono**: Improving API design efficiency

Switching is tedious, but with AI-driven development, AI can help with migration work. Rather than aiming for perfection from the start, it's better to start with the mindset of "if it doesn't work, I'll change it."

## 💬 Consulting AI for Tech Selection

During the tech selection process, I often asked Claude Code questions. When I asked things like "compare authentication libraries" or "what are my ORM options," it organized each library's features and pros/cons for me. I make the final decision myself, but the efficiency of comparison work improved significantly.

## ✅ Summary: Tech Selection Checklist for AI-Driven Development

When unsure about tech selection, refer to this checklist:

- [ ] Is official documentation comprehensive (in English)?
- [ ] Does it have a significant user base on GitHub?
- [ ] Has it been more than 6 months since release?
- [ ] Are rules and conventions clear?

If all boxes are checked, you can develop efficiently with AI-driven development.

---

Tomorrow, I'll explain "Project Structure Overview for Indie Development with Next.js + Supabase."
