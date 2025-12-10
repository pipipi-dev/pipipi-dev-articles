---
title: "App Routerのディレクトリ設計：Next.jsプロジェクトの構成術"
emoji: "🎨"
type: "tech"
topics: ["nextjs", "AppRouter", "typescript", "設計"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の10日目の記事です。

昨日の記事では「認証ライブラリを移行した理由」について書きました。この記事では、App Routerのディレクトリ設計について、実際のプロジェクト構成を交えて解説します。

## 📝 この記事で使う用語

- **CSR（Client Side Rendering）**: ブラウザ側でJavaScriptを実行してHTMLを生成する方式
- **SSR（Server Side Rendering）**: サーバー側でHTMLを生成してからブラウザに送る方式。表示が高速になる
- **Streaming**: HTMLを分割して順次送信する方式。ページ全体の読み込みを待たずに表示が始まる

## 📖 App Routerの基本

Next.js 13以降で導入されたApp Routerでは、`app/`ディレクトリの構造がそのままURLになります。

```
app/
├── page.tsx          → /
├── about/
│   └── page.tsx      → /about
└── contents/
    └── [id]/
        └── page.tsx  → /contents/123
```

`page.tsx`を配置したディレクトリがページとして認識され、`[id]`のような動的セグメントも使えます。ディレクトリ構造を見ればURLが分かるため、直感的に開発できます。

## 🎯 ディレクトリ設計で意識したこと

App Routerを採用したプロジェクトでは、以下の点を意識して設計しました。

- **責務の分離**: app/、client/、server/など役割ごとに分離
- **レイアウトの共有**: 認証ページ、メインアプリなど画面種別ごとに整理
- **SSRの維持**: レイアウトはServer Componentに保つ

## 📁 全体のディレクトリ構成

```
src/
├── app/              # ルーティング定義のみ
│   ├── [locale]/     # 国際化対応
│   │   ├── (auth)/   # 認証ページ
│   │   ├── (main)/   # メインアプリ
│   │   └── (marketing)/ # マーケティングページ
│   └── api/          # APIエンドポイント
├── client/           # クライアントサイドコード
│   ├── components/   # Reactコンポーネント
│   ├── contexts/     # React Context
│   ├── hooks/        # カスタムフック
│   ├── lib/          # クライアント専用ユーティリティ
│   ├── providers/    # Providerコンポーネント
│   └── stores/       # Zustand Store
├── server/           # サーバーサイドコード
│   ├── actions/      # Server Actions
│   ├── api/          # Hono APIハンドラ
│   ├── interfaces/   # 外部サービス連携
│   ├── lib/          # サーバー専用ユーティリティ
│   ├── loaders/      # サーバー側でのデータ取得
│   ├── repositories/ # データアクセス層
│   └── usecases/     # ビジネスロジック
├── database/         # Drizzle ORMスキーマ
│   ├── app_admin/    # 管理機能
│   ├── app_ai/       # AI機能
│   ├── app_auth/     # 認証
│   ├── app_billing/  # 課金
│   ├── app_content/  # コンテンツ管理
│   ├── app_social/   # ソーシャル機能
│   └── app_system/   # システムログ
├── shared/           # クライアント・サーバー共通
│   ├── lib/          # 共有ユーティリティ
│   └── types/        # 共通型定義
├── i18n/             # 国際化設定
└── messages/         # 翻訳ファイル（ja.json, en.json）
```

### 役割ごとの分離

App Routerでは、`app/`ディレクトリにすべてのコードを置くこともできます。しかし、規模が大きくなると管理が難しくなります。

そこで、役割ごとにディレクトリを分けました。この構成は、以下の記事を参考にしています。

https://note.com/jujunjun110/n/na653d4120d7e

特に、`client/`と`server/`を明確に分ける構成は効果的でした。Next.jsではサーバー専用モジュールをクライアントから誤って呼び出すと実行時エラーになりますが、ディレクトリレベルで分離することで、そのようなミスを防ぎやすくなります。

- **app/**: ルーティング定義のみ。ビジネスロジックは書かない
- **client/**: `"use client"`が必要なコンポーネントとフック
- **server/**: サーバーサイド専用のコード
- **database/**: DBスキーマ定義（Drizzle ORM）
- **shared/**: 両方で使える純粋な関数と型定義
- **i18n/**, **messages/**: 国際化対応

この分離により、「このコードはどこにあるか」が明確になります。

### DBスキーマに合わせたディレクトリ構造

`database/`ディレクトリは、PostgreSQLのスキーマ構造に合わせています。

```
database/
├── app_admin/        # 管理（tenants, teams, members）
├── app_ai/           # AI機能（embeddings, search_vectors）
├── app_auth/         # 認証（users, sessions, accounts）
├── app_billing/      # 課金（subscriptions, payment_history）
├── app_content/      # コンテンツ管理（contents, pages, tables）
├── app_social/       # ソーシャル（bookmarks, comments, reactions）
└── app_system/       # システム（activity_logs, system_logs）
```

各ディレクトリがPostgreSQLのスキーマに対応しています。テーブルを探すとき、「どのスキーマに属するか」を考えれば、ファイルの場所が分かります。

`server/repositories/`もこのスキーマ構造に合わせているため、DBスキーマ→リポジトリ→ユースケースという流れが追いやすくなっています。

## 🗂️ Route Groupsの活用

Route Groupsは、URLに影響を与えずにディレクトリを整理できる機能です。

```
app/[locale]/
├── (auth)/           # 認証フロー用レイアウト
│   ├── login/
│   ├── register/
│   └── layout.tsx    # 認証ページ専用レイアウト
├── (main)/           # メインアプリ用レイアウト
│   ├── contents/
│   ├── settings/
│   └── layout.tsx    # サイドバー付きレイアウト
└── (marketing)/      # マーケティングページ
    ├── landing/
    └── about/
```

Route Groupごとに`layout.tsx`を配置することで、異なるレイアウトを適用できます。認証ページはシンプルなレイアウト、メインアプリはサイドバー付きのレイアウトといった使い分けが可能です。

URLは `/login`、`/contents` のようにシンプルなまま、レイアウトだけを分離できます。

## 🌐 APIルーティングの設計

APIエンドポイントは、役割ごとに分離しています。

```
app/api/
├── [[...route]]/     # Hono APIへのプロキシ
├── auth/             # Better Auth
│   └── [...all]/
├── og/               # OGP画像生成
└── webhooks/         # Webhook受信
    └── stripe/
```

### HonoをNext.jsに統合

メインのAPIはHonoで実装しています。API本体は`server/api/`に配置し、`app/api/`にはNext.jsと接続するための最小限のコードだけを置いています。

**Honoを使うメリット:**

- **ディレクトリ構造が自由**: Next.jsのRoute Handlerは`app/api/`配下にファイルを配置する必要がありますが、Honoなら`server/api/`で自由に整理できます
- **OpenAPI仕様の自動生成**: `@hono/zod-openapi`を使えば、APIドキュメント（openapi.json）を自動生成できます
- **フレームワーク非依存**: 将来的にNext.js以外に移行する場合も、API部分はそのまま使えます

```tsx
// app/api/[[...route]]/route.ts
// Next.jsとの接続部分のみ
import { handle } from 'hono/vercel';
import { app } from '@/server/api';

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
```

### 認証APIの分離

Better Authは専用のエンドポイントで処理します。

```tsx
// app/api/auth/[...all]/route.ts
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/server/lib/auth/better-auth';

const handler = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  return await handler.GET(request);
}
```

`/api/auth/*` は Better Auth、それ以外は Hono が処理する構成です。

## 🖥️ Server Componentsを活かす設計

App Routerの最大の利点は、Server Componentsです。この恩恵を最大化するため、レイアウトをServer Componentに保つ工夫をしています。

### Before: レイアウトがClient Component

```tsx
// ❌ layout.tsx が "use client" だと全ページがCSRに
"use client";

export default function MainLayout({ children }) {
  const [state, setState] = useState();
  return <div>{children}</div>;
}
```

### After: レイアウトはServer Componentに保つ

`layout.tsx`自体はServer Componentのままにして、状態管理が必要な部分だけをClient Componentとして切り出します。

```tsx
// ✅ layout.tsx は Server Component として維持
export default function MainLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <ClientProvider>  {/* 状態管理が必要な部分だけClient Component */}
        {children}
      </ClientProvider>
    </div>
  );
}
```

```tsx
// ClientProvider.tsx
"use client";

export function ClientProvider({ children }) {
  const [state, setState] = useState();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
```

こうすることで、`layout.tsx`配下の子ページはSSRとStreamingの恩恵を受けられます。

## 🔀 補足: Parallel RoutesとIntercepting Routes

より高度なルーティング機能として、Parallel RoutesとIntercepting Routesがあります。私が開発しているMemoreruでは、テーブルコンテンツの行編集機能でこれらを活用しています。

### 構成

```
contents/table/[id]/
├── page.tsx           # テーブル詳細ページ
├── layout.tsx         # Parallel Routesの定義
├── @roweditor/        # 行編集パネル（Parallel Route）
│   ├── default.tsx    # デフォルト（何も表示しない）
│   └── (.)rows/       # Intercepting Route
│       └── [rowId]/
│           └── page.tsx
└── rows/              # 通常の行編集ページ
    └── [rowId]/
        └── page.tsx
```

### Parallel Routesの仕組み

`layout.tsx`で複数のスロットを受け取ります。

```tsx
export default function TableContentLayout({
  children,
  roweditor,
}: {
  children: ReactNode;
  roweditor: ReactNode;
}) {
  return (
    <>
      {children}   {/* テーブル詳細 */}
      {roweditor}  {/* 行編集パネル */}
    </>
  );
}
```

### Intercepting Routesの効果

`(.)rows/[rowId]/` は、テーブル詳細ページ内でのリンククリックを検知して、別の表示方法に切り替えます。

- **通常アクセス** `/contents/table/123/rows/456` → 行編集の専用ページ
- **テーブルから遷移** → スライドインパネルで表示

ユーザーは同じURLでも、アクセス方法によって異なるUIを体験できます。

```tsx
// スライドインパネルの実装
export default function RowEditorSlideIn({ params }) {
  const router = useRouter();
  const { id, rowId } = use(params);

  const handleClose = () => {
    router.back(); // 履歴を戻してパネルを閉じる
  };

  return <TableRowEditPanel tableId={id} rowIndex={rowId} onClose={handleClose} />;
}
```

## ✅ まとめ

App Routerのディレクトリ設計で意識したポイントをまとめます。

**構成のポイント:**
- app/はルーティング定義のみ、ロジックは書かない
- client/、server/、shared/で責務を分離
- Route Groupsでレイアウトを分離
- レイアウトはServer Componentに保つ

ディレクトリ設計に正解はありませんが、一貫したルールを決めておくと、コードの場所が予測しやすくなります。

明日は「なぜMPAからSPAに移行したのか」について解説します。

---

**シリーズの他の記事**

- 12/9: NextAuth.jsからBetter Authへ：認証ライブラリを移行した理由
- 12/11: なぜMPAからSPAに移行したのか：App Routerリファクタリング実践
