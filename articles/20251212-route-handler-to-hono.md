---
title: "Next.js Route HandlerからHonoへ：API設計が楽になった理由"
emoji: "🔥"
type: "tech"
topics: ["nextjs", "hono", "typescript", "API"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の12日目の記事です。

昨日の記事では「MPAからSPAに移行した理由」について書きました。この記事では、Next.js Route HandlerからHonoに移行した理由と、その効果について解説します。

## 🎯 なぜRoute Handlerから移行したのか

Route Handlerは手軽にAPIを作成できますが、プロジェクトが成長するにつれて課題が見えてきました。

### Route Handlerの課題

**1. ディレクトリ構造の制約**

Route Handlerでは、`app/api/`配下のディレクトリ構造がそのままURLパスになります。

```
app/api/
├── users/
│   ├── route.ts           → GET /api/users
│   └── [id]/
│       └── route.ts       → GET /api/users/123
├── contents/
│   ├── route.ts           → GET /api/contents
│   └── [id]/
│       ├── route.ts       → GET /api/contents/456
│       └── comments/
│           └── route.ts   → GET /api/contents/456/comments
```

エンドポイントが増えるにつれ、`app/api/`配下が肥大化していきます。ユーティリティ関数やバリデーションを共有したいとき、ファイルの配置場所に迷うことも多くなりました。

**2. コードの重複**

各`route.ts`ファイルで似たようなバリデーションやエラーハンドリングを書くことになりがちです。

```typescript
// app/api/users/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // バリデーション
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    // 処理...
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// app/api/contents/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 同じようなバリデーション...
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
    }
    // 処理...
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**3. APIドキュメントの手動管理**

OpenAPIドキュメントを作成しようとすると、実装とは別に手動で定義ファイルを書く必要があります。実装を変更したらドキュメントも更新する必要があり、乖離が発生しやすい状況でした。

## 🔥 Honoを選んだ理由

Honoは軽量で高速なWebフレームワークです。

https://hono.dev/

以下の点が決め手になりました。

### 1. ディレクトリ構造の自由度

HonoをNext.jsに統合すると、`app/api/`には接続用の最小限のコードだけを置き、API本体は`server/api/`で自由に整理できます。

```
app/api/
└── [[...route]]/
    └── route.ts          # Honoへの接続のみ（数行）

server/api/
├── index.ts              # Honoアプリ本体
├── routes/
│   ├── users.ts          # ユーザー関連API
│   ├── contents.ts       # コンテンツ関連API
│   └── admin.ts          # 管理者API
└── middleware/
    ├── auth.ts           # 認証ミドルウェア
    └── error.ts          # エラーハンドリング
```

機能ごとにファイルを整理でき、共通処理も適切な場所に配置できます。

### 2. Zod OpenAPIによる自動ドキュメント生成

`@hono/zod-openapi`を使うと、Zodスキーマからリクエスト・レスポンスの型を定義し、同時にOpenAPIドキュメントを自動生成できます。

```typescript
import { createRoute, z } from '@hono/zod-openapi';

// リクエスト・レスポンスのスキーマ定義
const CreateUserSchema = z.object({
  name: z.string().min(1).openapi({ example: '田中太郎' }),
  email: z.string().email().openapi({ example: 'tanaka@example.com' }),
});

const UserResponseSchema = z.object({
  id: z.string().openapi({ example: 'user_123' }),
  name: z.string(),
  email: z.string(),
  createdAt: z.string().datetime(),
});

// ルート定義（型とドキュメントが同時に生成される）
const createUserRoute = createRoute({
  method: 'post',
  path: '/users',
  request: {
    body: {
      content: { 'application/json': { schema: CreateUserSchema } },
    },
  },
  responses: {
    201: {
      description: 'ユーザー作成成功',
      content: { 'application/json': { schema: UserResponseSchema } },
    },
    400: {
      description: 'バリデーションエラー',
    },
  },
});
```

実装とドキュメントが常に同期されるため、乖離の心配がありません。

### 3. ミドルウェアによる共通処理

認証やエラーハンドリングをミドルウェアとして定義し、再利用できます。

```typescript
// server/api/middleware/auth.ts
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await getSession(c.req.header('Authorization'));

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', session.user);
  await next();
});
```

```typescript
// server/api/index.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { authMiddleware } from './middleware/auth';

const app = new OpenAPIHono();

// 認証が必要なルートにミドルウェアを適用
app.use('/users/*', authMiddleware);
app.use('/contents/*', authMiddleware);

// 公開APIはミドルウェアなし
app.route('/public', publicRoutes);
```

## ⚡ 実装方法

### Next.jsとの統合

HonoをNext.jsに統合するには、`hono/vercel`アダプタを使います。

```typescript
// app/api/[[...route]]/route.ts
import { handle } from 'hono/vercel';
import { app } from '@/server/api';

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
```

`[[...route]]`はキャッチオールセグメントで、`/api/*`配下のすべてのリクエストをHonoにルーティングします。この数行だけでNext.jsとの接続が完了します。

### 認証APIとの分離

Better Authのような認証ライブラリを使う場合は、認証エンドポイントを別に分けることもできます。

```
app/api/
├── [[...route]]/         # Honoへのプロキシ（メインAPI）
├── auth/                 # Better Auth（認証専用）
│   └── [...all]/
└── webhooks/             # Webhook（Stripe等）
    └── stripe/
```

処理の性質に応じてエンドポイントを分離することで、各部分が独立して管理できます。

### エラーハンドリング

Honoでは、エラーハンドリングを一箇所で定義できます。

```typescript
// server/api/index.ts
import { OpenAPIHono } from '@hono/zod-openapi';

const app = new OpenAPIHono();

// Zodバリデーションエラーのハンドリング
app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json({
      error: 'Validation Error',
      details: err.errors,
    }, 400);
  }

  // その他のエラー
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// 404ハンドリング
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});
```

Route Handlerでは各ファイルに書いていたエラー処理が、1箇所にまとまります。

## 🎉 移行の効果

Route HandlerからHonoへの移行で得られた効果をまとめます。

| 項目 | Before（Route Handler） | After（Hono） |
|------|------------------------|---------------|
| ディレクトリ構造 | URL構造に制約される | 自由に整理可能 |
| バリデーション | 手動で記述 | Zodで宣言的に定義 |
| 型安全性 | 手動で型定義 | Zodから自動推論 |
| APIドキュメント | 手動管理 | 自動生成 |
| エラー処理 | 各ファイルで重複 | ミドルウェアで一元化 |

### 開発効率の向上

- **エンドポイント追加が楽に**: 新しいルートを追加するとき、既存のスキーマやミドルウェアを再利用できる
- **型エラーの早期発見**: リクエスト・レスポンスの型がZodスキーマから推論される
- **ドキュメント更新が不要**: 実装を変更すれば自動的にドキュメントも更新される

### OpenAPIドキュメントの活用

定義したルートからOpenAPIドキュメントを自動生成できます。

```typescript
// server/api/index.ts
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0',
  },
});
```

`/api/doc`にアクセスするとOpenAPI仕様のJSONが取得できます。このJSONをSwagger UIやApidogなどのツールにインポートすれば、エンドポイントの一覧確認やリクエストのテストができます。

### テスタビリティの向上

Honoのアプリケーションはフレームワーク非依存なので、テストが書きやすくなります。

```typescript
import { app } from '@/server/api';

describe('Users API', () => {
  it('should create a user', async () => {
    const res = await app.request('/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(201);
  });
});
```

## 💡 移行のポイント

### 1. 段階的に移行する

すべてを一度に移行する必要はありません。新しいエンドポイントからHonoで実装し、既存のRoute Handlerは徐々に移行していく方法もあります。

### 2. 認証・Webhookは分離を検討

Better AuthやStripe Webhookのように、ライブラリが専用のハンドラを提供している場合は、無理にHonoに統合せず、別エンドポイントとして維持するのも選択肢です。

## ✅ まとめ

Route HandlerからHonoへの移行で改善したことをまとめます。

**解決した課題:**
- ディレクトリ構造の制約 → `server/api/`で自由に整理
- コードの重複 → ミドルウェアとスキーマの再利用
- ドキュメントの手動管理 → Zod OpenAPIで自動生成

**得られた効果:**
- 型安全性の向上（Zodによる自動推論）
- 開発効率の向上（エンドポイント追加が容易）
- テスタビリティの向上（フレームワーク非依存）

HonoはNext.jsと相性が良く、Route Handlerの課題を解消しながら、より構造化されたAPI開発が可能になります。

明日は「Vercel最適化」について解説します。

---

**シリーズの他の記事**

- 12/11: なぜMPAからSPAに移行したのか：App Routerリファクタリング実践
- 12/13: Vercel最適化：ビルド時間短縮とレスポンス改善の実践
