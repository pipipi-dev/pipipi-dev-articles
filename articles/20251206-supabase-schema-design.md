---
title: "Supabaseでスキーマ設計：テーブル分割と正規化の実践"
emoji: "🐘"
type: "tech"
topics: ["個人開発", "Supabase", "PostgreSQL", "データベース"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025** の6日目の記事です。

昨日の記事では「Gitブランチ戦略」について書きました。この記事では、Supabaseでのスキーマ設計について解説します。

## 🎯 なぜスキーマを分けるのか

PostgreSQLにはスキーマという概念があります。テーブルをグループ化する仕組みで、名前空間のように機能します。

### スキーマの一般的な用途

スキーマは主に以下の目的で使われます。

- **マルチテナント**: 顧客ごとにスキーマを分けてデータを完全分離（エンタープライズSaaSで多い）
- **アクセス制御**: スキーマ単位で権限を設定し、ユーザーごとにアクセス範囲を制限
- **拡張機能の分離**: pgvectorなどの拡張を専用スキーマに配置

多くのプロジェクトでは`public`スキーマに全テーブルを置くのが一般的です。

### 個人プロダクトでの使い方

```sql
-- デフォルトはpublicスキーマ
SELECT * FROM public.users;

-- 別スキーマを作成
CREATE SCHEMA app_auth;
SELECT * FROM app_auth.users;
```

私が個人開発しているMemoreruでは、最初はすべてのテーブルを`public`スキーマに置いていました。しかし、テーブル数が増えてくると問題が出てきました。

**publicスキーマの問題:**
- テーブル数が増えると見通しが悪くなる
- どのテーブルがどの機能に属するか分かりにくい
- 権限管理が複雑になる

そこで、機能ごとにスキーマを分割することにしました。

### `app_`プレフィックスの意図

スキーマ名に`app_`というプレフィックスをつけているのには理由があります。

Supabaseには`auth`、`storage`、`realtime`など、システムが使用するスキーマがあります。自分で作成したスキーマに`app_`（applicationの略）をつけることで、「アプリケーション用のスキーマ」であることを示しつつ、Supabaseのシステムスキーマと明確に区別できます。pgAdminでスキーマを見たとき、並び順で`app_`が先頭に来るため、自分で作ったスキーマだと一目で分かります。

```
Supabaseのシステムスキーマ:
├── auth        # Supabase認証
├── storage     # Supabaseストレージ
├── public      # デフォルト

アプリケーション用スキーマ:
├── app_auth    # 自作：認証
├── app_billing # 自作：課金
├── app_content # 自作：コンテンツ
```

Memoreruでは、Supabaseのシステムスキーマ（auth, storage等）は使用せず、すべて自作のスキーマで管理しています。将来的に別のインフラに移行する際のベンダーロックインを回避できることを考慮した設計です。

:::message
カスタムスキーマによる分割、`app_`プレフィックス、ベンダーロックインの回避は、あくまで私が独自に行っている工夫です。テーブル数が少ない小規模なサービスでは、スキーマ分割はオーバーヘッドになる可能性があります。中規模〜大規模のSaaSでテーブル数が多くなってきた場合に検討するとよいでしょう。
:::

## 📂 スキーマ分割の設計

現在のMemoreruでは、以下のスキーマを使用しています。

| スキーマ名 | 責務 | 主なテーブル例 |
|-----------|------|---------------|
| `app_admin` | 管理機能 | tenants, teams, members |
| `app_ai` | AI機能 | embeddings, search_vectors |
| `app_auth` | 認証 | users, sessions, accounts |
| `app_billing` | 課金 | subscriptions, payment_history |
| `app_content` | コンテンツ管理 | contents, pages, tables |
| `app_social` | ソーシャル機能 | bookmarks, comments, reactions |
| `app_system` | システム | activity_logs, system_logs |

### 分割の基準

スキーマ分割の基準として、以下を意識しています。

**1. 機能の凝集度**
関連するテーブルは同じスキーマに配置します。例えば、認証関連のテーブル（users, sessions, accounts）は`app_auth`に集約します。

**2. 変更頻度**
頻繁に変更が発生するテーブルと、安定しているテーブルを分けます。例えば、コンテンツ系は変更が多く、課金系は安定している傾向があります。

**3. 権限の境界**
異なる権限レベルが必要なテーブルは別スキーマにします。管理者のみがアクセスする`app_admin`と、一般ユーザーがアクセスする`app_content`は分けています。

## 🔧 Drizzle ORMでのスキーマ定義

Memoreruでは、Drizzle ORMを使用しています。スキーマの定義は以下のように行います。

```typescript
// database/app_auth/schema.ts
import { pgSchema } from 'drizzle-orm/pg-core';

export const appAuth = pgSchema('app_auth');
```

```typescript
// database/app_auth/users.ts
import { appAuth } from './schema';
import { text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = appAuth.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### アプリケーション側のディレクトリ構成

DBのスキーマ構造に合わせて、アプリケーション側もディレクトリを分けています。

```
src/database/
├── app_auth/
│   ├── schema.ts      # スキーマ定義
│   ├── users.ts       # テーブル定義
│   ├── sessions.ts
│   └── index.ts       # エクスポート
├── app_billing/
│   ├── schema.ts
│   ├── subscriptions.ts
│   └── index.ts
├── index.ts           # 全エクスポート
└── relations.ts       # リレーション定義
```

この構成により、どのテーブルがどのスキーマに属するか一目で分かります。

## 📊 正規化の実践

スキーマ分割と合わせて、正規化も重要です。個人開発でも基本的な正規化は守るべきですが、過度な正規化はパフォーマンスに影響します。

### 正規化の基本ルール

正規化には第1〜第3正規形がありますが、要点は以下の3つです。

- **第1正規形**: 繰り返しを排除（カンマ区切りではなく中間テーブルで管理）
- **第2正規形**: 部分関数従属を排除（主キーの一部にのみ依存するカラムを分離）
- **第3正規形**: 推移的関数従属を排除（導出可能な値は保存せず計算）

### 個人プロダクトでの採用例

- **中間テーブルの活用**: コンテンツとタグの多対多関係を中間テーブルで管理
- **複合主キーの採用**: マルチテナント対応のため`(tenant_id, id)`の複合主キーを採用
- **非正規化の採用**: 読み取り最適化のため、ブックマーク数やコメント数をカウントカラムとして保持

## 🔐 RLS（Row Level Security）とスキーマ

スキーマ分割はRow Level Security（RLS）の設計とも関連します。RLSはPostgreSQLの機能で、テーブル単位で行レベルのアクセス制御を行います。スキーマごとに権限ポリシーを設計できます。

Memoreruでは現在、RLSではなくアプリケーション側でアクセス制御を行っていますが、将来的にRLSを導入する場合、スキーマ分割されていると権限設計がしやすくなります。

## 💡 実践Tips

### カスタムスキーマへのアクセス設定

Supabaseでカスタムスキーマを使う場合、いくつかの設定が必要です。これを忘れるとハマります。

**1. Supabaseダッシュボードでスキーマを公開**

Project Settings → Data API → Exposed schemas に、使用するスキーマを追加します。設定場所がわかりづらく、私もよく忘れます。

```
public, app_admin, app_ai, app_auth, app_billing, app_content, app_social, app_system
```

詳細は公式ドキュメントを参照してください。

https://supabase.com/docs/guides/database/connecting-to-postgres#data-apis

**2. DATABASE_URLでスキーマを指定**

DATABASE_URLの`schema`パラメータにカスタムスキーマを含める必要があります。

```bash
# .env.local
DATABASE_URL=postgresql://user:password@host:5432/postgres?schema=public,app_admin,app_ai,app_auth,app_billing,app_content,app_social,app_system
```

**3. Drizzle ORMの`schemaFilter`を設定**

`drizzle.config.ts`で`schemaFilter`オプションを指定します。

```typescript
// drizzle.config.ts
export default {
  schema: [
    './src/database/app_admin/index.ts',
    './src/database/app_auth/index.ts',
    './src/database/app_billing/index.ts',
    // ...
  ],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // 複数スキーマ対応
  schemaFilter: ['public', 'app_admin', 'app_ai', 'app_auth', 'app_billing', 'app_content', 'app_social', 'app_system'],
} satisfies Config;
```

これらを設定しないと「テーブルが見つからない」というエラーになります。

## ✅ まとめ

Memoreruでのスキーマ設計から得た学びをまとめます。

**うまくいっていること:**
- 機能ごとにスキーマを分けて責務を明確化
- ディレクトリ構成とスキーマ名を対応させて可読性向上
- 基本的な正規化を守りつつ、必要に応じて非正規化

**注意が必要なこと:**
- スキーマが増えすぎると逆に複雑になる
- Supabaseでカスタムスキーマを使う場合はExposed schemasの設定が必要

個人開発でもスキーマ設計を意識することで、将来の拡張性やメンテナンス性が大きく変わります。

明日は「データベースのID設計：UUID・CUID2・連番などの使い分け」について解説します。

---

**シリーズの他の記事**

- 12/5: Gitブランチ戦略：個人開発で実践するワークフロー
- 12/7: データベースのID設計：UUID・CUID2・連番などの使い分け
