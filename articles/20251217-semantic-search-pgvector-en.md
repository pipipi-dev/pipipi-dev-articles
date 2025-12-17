---
title: "Implementing Semantic Search with pgvector + OpenAI Embeddings"
emoji: "🔮"
type: "tech"
topics: ["postgresql", "openai", "typescript", "nextjs"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 17 of the **[and and and and and and and and and and Solo SaaS Development Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday I wrote about "Excel-like table UI." Today, I'll explain how to implement semantic search—searching by "meaning" rather than keywords.

## What is Semantic Search?

Traditional keyword search finds documents that exactly match (or partially match) the search terms. Searching for "chicken recipe" only returns documents containing that exact string.

Semantic search is different. Searching for "easy dinner ideas" can find documents about "quick recipes" or "meal prep" even though they don't contain those exact keywords—because they're semantically related.

This is made possible by **vector search**.

### What is a Vector?

A vector is simply an "array of numbers."

```
"quick recipes" → [0.023, -0.041, 0.018, ..., 0.056]
```

To make this easier to understand, think of a map. Tokyo Station's location can be expressed as two numbers: "latitude 35.68, longitude 139.76." Looking at these numbers, you can tell that Yokohama Station (35.46, 139.62) is "farther" than Shinagawa Station (35.63, 139.74).

Vector search uses the same concept. It converts text into "coordinates in a semantic space." Similar texts become nearby coordinates, so comparing numbers alone can determine if meanings are "close."

This text-to-coordinate conversion is called "embedding." For example, "quick recipes" and "easy-to-make dishes" clearly mean the same thing to humans. With embeddings, these are converted to nearby coordinates, allowing computers to judge them as "semantically similar."

## Tech Stack and Setup

| Role | Technology |
|------|------------|
| Vector Generation | OpenAI Embeddings API |
| Vector Storage & Search | PostgreSQL + pgvector |
| ORM | Drizzle ORM |

While there are dedicated vector database services (Pinecone, Weaviate, etc.), I chose pgvector because it can be added to existing PostgreSQL, works with SQL, and is available on Supabase.

### Enabling pgvector

On Supabase, enable it from the dashboard, or run this SQL:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Table Design

Create a table to store vectors:

```sql
CREATE TABLE search_vectors (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,        -- Which content this vector belongs to
  text_content TEXT NOT NULL,      -- Original text
  embedding vector(1536) NOT NULL  -- Vector (1536 numbers)
);
```

`vector(1536)` is a column that stores vectors, matching the number of values output by OpenAI's model.

## Implementation

### Generating Vectors

Use OpenAI's Embeddings API to convert text to vectors:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });

  return response.data[0].embedding;
}
```

Pass in text and get back an array of numbers. This array represents the "meaning" of the text.

### Splitting Long Text

Long texts like blog posts have issues when embedded as-is. The API has character limits, and putting long text into a single vector reduces search accuracy.

So, split long text by "paragraphs" or "fixed character counts" before embedding:

```typescript
function chunkText(text: string, chunkSize = 500): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}
```

By splitting, you can search pinpoint results like "the part of this article that discusses X."

### Saving Vectors

Save generated vectors to the database. Vectorize and save text when content is registered or updated:

```typescript
async function saveEmbedding(contentId: string, text: string) {
  const embedding = await generateEmbedding(text);
  const vectorString = `[${embedding.join(',')}]`;

  await db.execute(sql`
    INSERT INTO search_vectors (id, content_id, text_content, embedding)
    VALUES (${crypto.randomUUID()}, ${contentId}, ${text}, ${vectorString}::vector)
  `);
}
```

When content is updated, delete old vectors before saving new ones:

```typescript
async function updateEmbeddings(contentId: string, chunks: string[]) {
  // Delete existing vectors
  await db.execute(sql`
    DELETE FROM search_vectors WHERE content_id = ${contentId}
  `);

  // Save new vectors
  for (const chunk of chunks) {
    await saveEmbedding(contentId, chunk);
  }
}
```

### Similarity Search

The search flow is simple: convert the user's search keywords to a vector, compare with vectors stored in the database, and return the most similar ones:

```typescript
async function searchSimilar(queryText: string, limit = 10) {
  const queryVector = await generateEmbedding(queryText);
  const vectorString = `[${queryVector.join(',')}]`;

  const results = await db.execute(sql`
    SELECT content_id, text_content
    FROM search_vectors
    ORDER BY embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `);

  return results;
}
```

`<=>` is pgvector's "distance comparison operator." With just this, you can find semantically similar documents.

### Overall Flow

**Preparation (When Registering Content)**

1. Send text to OpenAI API
2. Save returned vector to DB

**At Search Time**

1. Vectorize search query with OpenAI API
2. Compare with DB vectors, return closest matches

In other words, the "text → vector" conversion is done in advance, and at search time, we just compare vectors. That's why semantic search is fast.

## Improving Accuracy

### Embed Titles and Body Separately

Rather than making the entire article one vector, embedding "title" and "body paragraphs" separately improves accuracy. Users often search with "title-like keywords," so having title-only vectors makes matching easier even with short search terms.

### Combine with Keyword Search

Semantic search isn't perfect. For version numbers like "Next.js 15" or service names like "Supabase," you want to search for the exact string, not the meaning.

"Hybrid search" that uses both traditional keyword search and semantic search is effective:

- **Semantic search**: "how to build auth" → hits login-related articles
- **Keyword search**: "Supabase" → hits articles containing that word

Combining both results reduces missed matches.

### Speed Up with Indexes

As data grows, comparing against all vectors every time becomes slow. pgvector can add vector indexes to speed up searches.

When you exceed a few thousand records, measure search speed and add indexes if it's getting slow. Adding them from the start is fine too, but the effect is minimal with little data.

## About Costs

Embeddings API costs are very low:

| Operation | Cost Estimate |
|-----------|---------------|
| Embed 1000 characters | ~$0.00002 |
| Embed 10,000 articles | A few dollars |

Unlike the ChatGPT API, the Embeddings API is simple numeric conversion, so costs stay low. It's an accessible price point even for solo developers.

## Summary

Key points for implementing semantic search:

| Challenge | Solution |
|-----------|----------|
| Convert text to numbers | OpenAI Embeddings API |
| Store and search vectors | PostgreSQL + pgvector |
| Handle long text | Split before embedding |
| Improve search accuracy | Embed title and body separately |
| Performance | Add indexes |

With semantic search, users can find related documents even without remembering exact keywords. The more information you have, the more valuable this experience becomes.

Tomorrow I'll discuss "Bugs Found with TypeScript Strict Mode."

---

**Other articles in this series**

- 12/16: Building Excel-like Tables with No-Code: Implementing Drag & Drop UI
- 12/18: Bugs Found with TypeScript Strict Mode: Type Safety in Practice
