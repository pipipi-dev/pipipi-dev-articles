---
title: "Drizzle ORM × Claude Code：次世代のTypeScript開発体験"
emoji: "🚀"
type: "tech"
topics: ["typescript", "drizzle", "orm", "claudecode"]
published: true
platforms:
  qiita: true
  devto: false
  memoreru: true
---

## 🎯 この記事の概要

**解決する問題**
- TypeScriptでの型安全なデータベース操作
- ORMツールの選択に迷っている
- AI支援開発との相性を知りたい

**対象読者**
- TypeScript経験1年以上
- データベース操作の基本知識
- 効率的な開発ツールを探している方

**前提知識**
- TypeScriptの基本文法
- SQLの基本概念（SELECT、JOIN等）
- Node.jsプロジェクトの構築経験

## 📊 結論・要点

**Drizzle ORMをおすすめする理由**
- ✅ **完全な型安全性**: コンパイル時にSQLエラーを検出
- ✅ **SQLライクな直感的記法**: 学習コストが低い
- ✅ **AI開発との相性**: 明示的なコードでClaude Codeが理解しやすい
- ✅ **軽量設計**: 最小限のオーバーヘッド

TypeScriptプロジェクトでデータベースを扱う際、Prisma、Supabase-js、TypeORMなど様々な選択肢があります。今回は、**Drizzle ORM**を使った開発体験と、AI支援開発ツール**Claude Code**との相性の良さについて、実際のプロジェクトでの経験を基に解説します。

## 💡 Drizzle ORMとは？

**Drizzle ORM**は、TypeScriptファーストで設計された軽量なORM（Object-Relational Mapping）ツールです。

**主な特徴**
- **SQLライクな記法**: 既存のSQL知識を活かせる直感的なAPI
- **完全な型安全性**: TypeScriptの型システムを活用してコンパイル時エラー検出
- **軽量設計**: 最小限のランタイムオーバーヘッド
- **マルチデータベース対応**: PostgreSQL、MySQL、SQLiteをサポート

**ORMとは？**
ORM（Object-Relational Mapping）は、データベースのテーブルとプログラムのオブジェクトを対応付ける技術です。SQLを直接書く代わりに、プログラミング言語の記法でデータベース操作を行えます。

## 📊 主要ORMの比較

### 基本的なクエリの書き方

```typescript
// Drizzle - SQLに近い直感的な記法
const users = await db
  .select({
    id: users.id,
    name: users.name,
    postCount: count(posts.id)
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId))
  .where(eq(users.isActive, true))
  .groupBy(users.id);

// Prisma - 独自のオブジェクト記法
const users = await prisma.user.findMany({
  where: { isActive: true },
  include: {
    _count: {
      select: { posts: true }
    }
  }
});

// Supabase-js - チェーンメソッド
const { data } = await supabase
  .from('users')
  .select(`
    id,
    name,
    posts(count)
  `)
  .eq('is_active', true);
```

### 型安全性の比較

| 特徴 | Drizzle | Prisma | Supabase-js | TypeORM |
|------|---------|---------|-------------|----------|
| コンパイル時型チェック | ✅ 完全 | ✅ 完全 | ⚠️ 部分的 | ⚠️ 部分的 |
| スキーマからの型生成 | ✅ TypeScript定義 | ✅ 自動生成 | ⚠️ 手動/生成 | ✅ デコレータ |
| JOINの型推論 | ✅ 自動 | ✅ 自動 | ❌ 手動 | ⚠️ 部分的 |
| SQLクエリの型安全性 | ✅ ビルダー経由 | ⚠️ Raw SQLは未対応 | ❌ 文字列 | ⚠️ 部分的 |
| 実行時の型検証 | ❌ なし | ✅ あり | ❌ なし | ⚠️ 部分的 |

## 🚀 Drizzle ORMの実装例

### 1. スキーマ定義

```typescript
// schema/users.ts
import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### 2. 複雑なクエリの実装

```typescript
// 投稿数とともにアクティブユーザーを取得
async function getActiveUsersWithStats() {
  const result = await db
    .select({
      userId: users.id,
      userName: users.name,
      email: users.email,
      totalPosts: count(posts.id),
      publishedPosts: count(
        case_().when(posts.published, 1).else(null)
      ),
      latestPostDate: max(posts.createdAt),
    })
    .from(users)
    .leftJoin(posts, eq(users.id, posts.userId))
    .where(eq(users.isActive, true))
    .groupBy(users.id)
    .having(gt(count(posts.id), 0))
    .orderBy(desc(count(posts.id)));

  return result;
}
```

### 3. トランザクション処理

```typescript
// ユーザーと初期投稿を同時に作成
async function createUserWithWelcomePost(userData: NewUser) {
  return await db.transaction(async (tx) => {
    // ユーザー作成
    const [newUser] = await tx
      .insert(users)
      .values(userData)
      .returning();

    // ウェルカム投稿を作成
    const [welcomePost] = await tx
      .insert(posts)
      .values({
        userId: newUser.id,
        title: 'Welcome to our platform!',
        content: `Hello ${newUser.name}, welcome aboard!`,
        published: true,
      })
      .returning();

    return { user: newUser, post: welcomePost };
  });
}
```

## 🤖 Claude CodeとDrizzleの相性が良い理由

### 1. 明示的なコード生成

Claude Codeは、SQLの知識を直接活用してDrizzleのクエリを生成できます：

```typescript
// Claude Codeへの指示例
"ユーザーの最新10件の投稿を取得するクエリを書いて"

// 生成されるコード
const recentPosts = await db
  .select()
  .from(posts)
  .where(eq(posts.userId, userId))
  .orderBy(desc(posts.createdAt))
  .limit(10);
```

### 2. 段階的な実装サポート

```typescript
// Step 1: 基本クエリから開始
const allUsers = await db.select().from(users);

// Step 2: 条件を追加
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.isActive, true));

// Step 3: JOINを追加
const usersWithPosts = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId))
  .where(eq(users.isActive, true));

// Step 4: 集計を追加
const userStats = await db
  .select({
    user: users,
    postCount: count(posts.id)
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId))
  .groupBy(users.id);
```

### 3. エラーの明確性

```typescript
// TypeScriptの型エラーが具体的
db.select()
  .from(users)
  .where(eq(users.email, 123)); // ❌ Type error: number is not assignable to string

// SQLエラーも理解しやすい
db.select()
  .from(users)
  .where(eq(users.nonExistentColumn, 'value')); // ❌ Property 'nonExistentColumn' does not exist
```

## 💡 Drizzleが特に優れているユースケース

### 1. 複雑なJOINが必要な場合

```typescript
// 複数テーブルを結合した統計情報の取得
const analytics = await db
  .select({
    date: sql<string>`DATE(${orders.createdAt})`,
    totalOrders: count(orders.id),
    uniqueCustomers: countDistinct(orders.customerId),
    totalRevenue: sum(orderItems.price),
    avgOrderValue: avg(orderItems.price),
  })
  .from(orders)
  .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
  .leftJoin(customers, eq(orders.customerId, customers.id))
  .where(gte(orders.createdAt, lastMonth))
  .groupBy(sql`DATE(${orders.createdAt})`);
```

### 2. 動的クエリの構築

```typescript
function buildDynamicQuery(filters: FilterOptions) {
  let query = db.select().from(products);
  
  const conditions = [];
  
  if (filters.category) {
    conditions.push(eq(products.category, filters.category));
  }
  
  if (filters.minPrice) {
    conditions.push(gte(products.price, filters.minPrice));
  }
  
  if (filters.inStock) {
    conditions.push(gt(products.stock, 0));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  if (filters.sortBy) {
    query = query.orderBy(
      filters.sortOrder === 'desc' 
        ? desc(products[filters.sortBy])
        : asc(products[filters.sortBy])
    );
  }
  
  return query;
}
```

### 3. 生SQLが必要な場合

```typescript
// Window関数を使った高度なクエリ
const rankedProducts = await db.execute(sql`
  WITH RankedProducts AS (
    SELECT 
      *,
      ROW_NUMBER() OVER (PARTITION BY category ORDER BY sales DESC) as rank
    FROM products
  )
  SELECT * FROM RankedProducts WHERE rank <= 5
`);
```

## 🎯 導入のベストプラクティス

### 1. プロジェクトのセットアップ

```bash
# 必要なパッケージのインストール
npm install drizzle-orm postgres
npm install -D drizzle-kit @types/pg

# 設定ファイルの作成
touch drizzle.config.ts
```

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/*',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### 2. 接続設定

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString);

export const db = drizzle(sql, { schema });
```

### 3. マイグレーション

```bash
# マイグレーションファイルの生成
npx drizzle-kit generate:pg

# マイグレーションの実行
npx drizzle-kit push:pg
```

## 🚀 まとめ

**Drizzle ORM**は、以下の特徴により、特に**Claude Code**のようなAI支援ツールとの相性が抜群です：

✅ **SQLライクな直感的な記法**
- SQLの知識をそのまま活用できる
- 生成されるクエリが予測可能

✅ **完全な型安全性**
- コンパイル時にエラーを検出
- IDEの補完機能を最大限活用

✅ **最小限のオーバーヘッド**
- 薄いラッパーレイヤー
- 高速な実行速度

✅ **柔軟性**
- 複雑なクエリも型安全に記述
- 生SQLへのエスケープハッチ

### 次のステップ
1. [Drizzle ORM公式ドキュメント](https://orm.drizzle.team/)で基本概念を学習
2. 小規模なプロジェクトで実際に試してみる
3. Claude Codeと組み合わせた開発フローを体験

特に、**複雑なJOINや集計処理**が必要なプロジェクトでは、Drizzle ORMの採用により、開発効率の大きな改善が期待できます。

AI支援開発が当たり前になりつつある現在、**明示的で予測可能なコード**を生成できるDrizzle ORMは、次世代のTypeScript開発における有力な選択肢となるでしょう。

## 📚 参考資料

- [Drizzle ORM 公式ドキュメント](https://orm.drizzle.team/)
- [Drizzle Kit CLI](https://orm.drizzle.team/kit-docs/overview)
- [GitHub - drizzle-team/drizzle-orm](https://github.com/drizzle-team/drizzle-orm)