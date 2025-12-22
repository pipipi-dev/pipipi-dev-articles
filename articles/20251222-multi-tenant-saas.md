---
title: "個人開発でマルチテナントSaaSを作る：エンタープライズ品質への挑戦"
emoji: "🏢"
type: "tech"
topics: ["nextjs", "supabase", "saas", "postgresql"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の22日目の記事です。

昨日の記事では「GA4とMicrosoft Clarityの設定」について書きました。この記事では、私がマルチテナントSaaSを構築した方法を紹介します。

:::message
この記事で紹介する内容は、私が個人プロダクトで採用した設計です。ベストプラクティスというより、個人開発者としての試行錯誤の記録として読んでいただければ幸いです。
:::

## 🤔 なぜマルチテナントか

SaaSを作るとき、ユーザーごとにデータを分離する必要があります。

チームや組織で使うサービスでは、以下のような要件が出てきます。

- 組織Aのデータは組織Bから見えてはいけない
- 同じ組織内でも、チームごとにアクセス権を分けたい
- 管理者と一般メンバーで操作できる範囲が違う

これを実現するのがマルチテナントアーキテクチャです。

### 私がマルチテナントを考慮した理由

多くの個人開発では、マルチテナントは不要だと思います。個人向けサービスなら、ユーザーIDでフィルタすれば十分です。

私の場合は、個人向けに加えて法人向けのSaaSも目指していたので、最初からマルチテナントを意識した設計にしました。後から追加しようとすると、データ構造から作り直しになることもあります。

## 🌳 テナント構造の設計

私のプロジェクトでは、以下の階層構造を採用しました。

```
テナント（組織）
├── チームA
│   ├── メンバー1（オーナー）
│   └── メンバー2（一般）
└── チームB
    ├── メンバー1（リーダー）
    └── メンバー3（閲覧のみ）
```

### テナントテーブルの設計

テナント（組織）の情報を管理するテーブルです。

```typescript
// テナントテーブルの例
const tenants = pgTable('tenants', {
  tenant_id: text('tenant_id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  owner_id: text('owner_id').notNull(),
  plan: text('plan').default('free'),
  status: text('status').default('active'),
  settings: jsonb('settings'),
  created_at: timestamp('created_at').defaultNow(),
});
```

`slug`はURLに使う識別子です。`settings`にはプランごとの制限値などをJSON形式で保存します。

### メンバーシップの設計

ユーザーとテナントの関係を管理します。

```typescript
// テナントメンバーテーブルの例
const tenantMembers = pgTable('tenants_members', {
  tenant_id: text('tenant_id').notNull(),
  user_id: text('user_id').notNull(),
  role: text('role').notNull(), // 'owner' | 'admin' | 'member' | 'viewer'
  status: text('status').default('active'),
  joined_at: timestamp('joined_at').defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant_id, table.user_id] }),
}));
```

複合主キー（`tenant_id` + `user_id`）を使うことで、同じユーザーが複数のテナントに所属できるようにしました。

### ロールの定義

たとえば以下のようなロールが考えられます。

| ロール | 権限 |
|--------|------|
| owner | 全権限、テナント削除可能 |
| admin | メンバー管理、設定変更 |
| member | コンテンツの作成・編集 |
| viewer | 閲覧のみ |

## 🔒 Row-Level Security（RLS）

マルチテナントで最も重要なのはデータの分離です。アプリケーションコードだけで制御すると、バグで他テナントのデータが見えてしまうリスクがあります。

そこで、PostgreSQLのRow-Level Security（RLS）を採用しました。データベースレベルでアクセス制御ができます。

### RLSポリシーの実装

```sql
-- RLSを有効化
ALTER TABLE app_content.labels ENABLE ROW LEVEL SECURITY;

-- SELECT: 同じテナントのデータのみ取得可能
CREATE POLICY labels_select_policy ON app_content.labels
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- INSERT: 同じテナントにのみ作成可能、admin以上
CREATE POLICY labels_insert_policy ON app_content.labels
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)
    AND current_setting('app.current_user_role', true) IN ('OWNER', 'ADMIN')
  );
```

`current_setting('app.current_tenant_id', true)`で、セッションに設定されたテナントIDを取得します。

### セッションへのコンテキスト設定

APIリクエスト時に、現在のテナントIDとロールをセッションに設定するようにしています。

```typescript
// APIミドルウェアでの設定
async function setTenantContext(tenantId: string, role: string) {
  await db.execute(sql`
    SELECT set_config('app.current_tenant_id', ${tenantId}, true);
    SELECT set_config('app.current_user_role', ${role}, true);
  `);
}
```

これで、以降のクエリは自動的にRLSポリシーでフィルタされます。

## 🛡️ アクセス制御の実装

### メンバーシップの確認

APIエンドポイントでは、まずユーザーがテナントのメンバーかどうかを確認するようにしています。

```typescript
// テナントへのアクセス権確認
async function checkTenantAccess(userId: string, tenantId: string) {
  const membership = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(and(
      eq(tenantMembers.tenant_id, tenantId),
      eq(tenantMembers.user_id, userId),
      eq(tenantMembers.status, 'active')
    ));

  if (membership.length === 0) {
    throw new Error('アクセス権限がありません');
  }

  return membership[0].role;
}
```

### ロールベースの権限チェック

操作ごとに必要なロールを確認するようにしています。

```typescript
// チーム作成の例
app.post('/api/tenants/:tenantId/teams', async (c) => {
  const user = c.get('user');
  const { tenantId } = c.req.param();

  // メンバーシップ確認
  const role = await checkTenantAccess(user.id, tenantId);

  // owner/admin のみ作成可能
  if (!['owner', 'admin'].includes(role)) {
    return c.json({ error: 'チーム作成権限がありません' }, 403);
  }

  // チーム作成処理...
});
```

### 複合キーによるデータ分離

すべてのコンテンツテーブルで`tenant_id`を含む複合主キーを使用しています。

```typescript
// コンテンツテーブルの例
const contents = pgTable('contents', {
  tenant_id: text('tenant_id').notNull(),
  content_id: text('content_id').notNull(),
  title: text('title').notNull(),
  // ... 他のカラム
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant_id, table.content_id] }),
}));
```

マスターデータは`tenant_id = 'SYSTEM'`のように全テナント共通データとして管理する方法もあります。

## 💡 実装のポイント

### クエリでの明示的なフィルタ

RLSに加えて、アプリケーションコードでも明示的に`tenant_id`でフィルタするようにしています。

```typescript
// 明示的なフィルタを追加
const userContents = await db
  .select()
  .from(contents)
  .where(and(
    eq(contents.tenant_id, tenantId),  // 明示的なフィルタ
    eq(contents.created_by, userId)
  ));
```

RLSがあっても、コードレビューで意図が分かりやすくなります。

### テナント切り替えの考慮

ユーザーが複数テナントに所属している場合の切り替え機能も実装しました。

```typescript
// ユーザーが所属するテナント一覧を取得
async function getUserTenants(userId: string) {
  return await db
    .select({
      tenant: tenants,
      role: tenantMembers.role,
    })
    .from(tenants)
    .innerJoin(tenantMembers, eq(tenants.tenant_id, tenantMembers.tenant_id))
    .where(and(
      eq(tenantMembers.user_id, userId),
      eq(tenantMembers.status, 'active')
    ));
}
```

現在のテナントはセッションで管理し、UIで切り替えられるようにしています。

### インフラ面での選択肢

2025年12月、Vercelが「Vercel for Platforms」を発表しました。ワイルドカードドメイン（`*.yourapp.com`）の自動ルーティング、カスタムドメインのSSL証明書管理などの機能を提供しています。

https://vercel.com/changelog/introducing-vercel-for-platforms

この記事で紹介したデータ分離の設計と組み合わせることで、より本格的なマルチテナントSaaSを構築できます。

## ✅ まとめ

私がマルチテナントSaaSを構築した方法を紹介しました。

| ポイント | 内容 |
|---------|------|
| テナント構造 | 組織 → チーム → メンバーの階層 |
| RLS | PostgreSQLでデータベースレベルの分離 |
| ロール | owner / admin / member / viewer など |
| 複合キー | tenant_id を含む主キーで設計 |
| 二重チェック | RLS + アプリケーションコードの両方で確認 |

個人開発でここまでやる必要があるかは、プロダクトの性質によります。ただ、法人向けSaaSを目指すなら、最初から意識しておくと後の拡張が楽になります。

明日は「Claude Codeで変わった個人開発の進め方」について解説します。

---

**シリーズの他の記事**

- 12/21: ユーザーの動きを可視化する：GA4とMicrosoft Clarityの設定
- 12/23: Claude Codeで変わった個人開発の進め方：AIペアプログラミングの実践
