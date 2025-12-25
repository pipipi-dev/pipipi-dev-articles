---
title: "2025年の個人開発を振り返る：技術・設計・運用の学び"
emoji: "🎄"
type: "idea"
topics: ["個人開発", "振り返り", "nextjs", "claudecode"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の25日目、最終日の記事です。

25日間にわたって共有してきた技術的知見を振り返り、6ヶ月間の開発で得た学びをまとめます。

## 🤖 2025年、開発スタイルが変わった

2025年は、AIを活用した開発が本格化した年でした。

2月にClaude Codeがリリースされ、GitHub Copilot AgentやOpenAI Codex等のAIコーディングツールが次々と登場しました。「AIにコードを書いてもらう」という選択肢が、多くの開発者にとって現実的になりました。

私がMemoreruの開発を始めたのは6月。ちょうどこれらのツールが成熟し始めた時期でした。

23日目で書いた通り、Claude Codeとの協働は開発スタイルを大きく変えました。設計は人間が行い、実装はAIと協力して進める。レビューは人間が責任を持つ。この役割分担で、ひとりでもチーム開発のように進められるようになりました。

24日目で紹介したPDD（進捗駆動開発）も、AIとの協働を前提とした手法です。設計ドキュメントを整備し、進捗を可視化することで、AIエージェントと効率的に開発を進められます。

2025年に個人開発を始めたことは、タイミングとして良かったと思います。AIツールの進化によって、個人開発の可能性が大きく広がった年でした。

## 📖 25日間の軌跡

25日間の記事は、個人開発の流れに沿うように作成しました。これから個人開発を始める方が、開発の流れを追体験できるような構成にしています。

**序章（12/1-3）** では、アイデアから最初のコミットまでの流れ、AIとの相性を重視した技術選定、Next.js + Supabaseのプロジェクト構成を紹介しました。

**基盤構築（12/4-9）** では、ドキュメント戦略、Git運用、DB設計、認証実装を扱いました。特に9日目のNextAuth.js→Better Auth移行は、認証ライブラリ選びで悩んでいる方に参考になるかもしれません。

**フロント・API・インフラ（12/10-13）** では、App Routerのディレクトリ設計から始まり、MPA→SPA移行、Route Handler→Hono移行、Vercel最適化と続きます。11日目のSPA移行は150以上のコミットをかけた大規模リファクタリングでした。

**UX・機能実装（12/14-17）** では、モバイルファースト設計、無限スクロールの実装、ExcelライクなテーブルUI、pgvectorを使ったセマンティック検索を紹介しました。15日目のReact 19 + Zustandの落とし穴は、予想外のバグに遭遇した記録です。

**実践的課題（12/18-22）** では、TypeScript厳密モードで発見したバグ、12月に公開されたReactの脆弱性、Stripe課金、GA4 + Clarity、マルチテナント設計と、運用に関わるテーマを扱いました。

**振り返り（12/23-25）** では、Claude Codeとの協働、進捗駆動開発（PDD）、そして本記事で締めくくっています。

## 🚀 技術スタック

6ヶ月間の開発を経て、最終的に採用した技術構成です。

### フロントエンド

| 技術 | 用途 | 関連記事 |
|------|------|----------|
| Next.js 15 (App Router) | フレームワーク | 3, 10, 11日目 |
| React 19 | UIライブラリ | 15日目 |
| TypeScript 5 | 型安全性 | 18日目 |
| Zustand | クライアント状態管理 | 11, 15日目 |

### バックエンド・インフラ

| 技術 | 用途 | 関連記事 |
|------|------|----------|
| Supabase | BaaS | 3, 6日目 |
| PostgreSQL | データベース | 6, 17日目 |
| pgvector | ベクトル検索 | 17日目 |
| Drizzle ORM | ORMマッパー | 3, 6日目 |
| Better Auth | 認証・二要素認証 | 9日目 |
| Hono | APIフレームワーク | 12日目 |
| Zod | スキーマ定義・バリデーション | 12, 18日目 |
| Vercel | ホスティング | 3, 5, 13日目 |
| Stripe | 決済 | 20日目 |
| OpenAI API | AI機能 | 17日目 |

### UI・エディタ

| 技術 | 用途 | 関連記事 |
|------|------|----------|
| @dnd-kit | ドラッグ&ドロップ | 16日目 |
| React Spreadsheet | スプレッドシートUI | 16日目 |

### 開発ツール

| 技術 | 用途 | 関連記事 |
|------|------|----------|
| Claude Code | AIペアプログラミング | 5, 23, 24日目 |
| Git Worktree | 並行開発 | 5日目 |
| Biome | Linter / Formatter | 18日目 |
| GA4 | アクセス解析 | 21日目 |
| Microsoft Clarity | ヒートマップ解析 | 21日目 |

技術構成の詳細は以下を参照ください。

https://memoreru.com/about

## 💡 得られた学び

### 技術選定と移行

2日目で「AI駆動開発のための技術選定」について書きました。ドキュメントが豊富で、型安全で、シンプルなAPIを持つ技術を選ぶ。この方針で技術を選定してきました。

ただ、最初の選択が正解とは限りませんでした。6ヶ月の間に4つの大きな技術移行を行いました。

| 移行内容 | 理由 | 関連記事 |
|----------|------|----------|
| Prisma → Drizzle ORM | 型推論の向上、バンドルサイズ削減 | 6日目 |
| NextAuth.js → Better Auth | APIのシンプルさ、Drizzleとの親和性 | 9日目 |
| Route Handler → Hono | OpenAPI統合、ミドルウェア設計 | 12日目 |
| MPA → SPA | UX向上、状態管理の一元化 | 11日目 |

最初からSPAにしておけばよかったとも思いますが、MPAで作り始めたからこそSPAの良さがわかりました。

問題に気づいたときに変更できる状態を保つことが重要です。そのためにテストと設計ドキュメントが役立ちました。

### ドキュメントとテスト

4日目で「ドキュメントファーストのアプローチ」について書きました。

機能設計書、API設計書、DB設計書、UI設計書、そして設計判断の記録である思考ログ。これらを整備してきました。

ドキュメント整備にかけた時間は、開発効率として返ってきました。23日目で紹介したClaude Codeとの協働では、設計ドキュメントがあることで「この設計に従って実装して」と伝えられます。24日目で紹介したPDD（進捗駆動開発）も、設計ドキュメントがあってこそ機能します。

テストが効果を発揮したのは、大きな変更を行うときでした。SPA移行、Better Auth移行、Drizzle移行。これらの変更を安心して行えたのは、テストがあったからです。18日目で書いた通り、TypeScript厳密モードで型エラーは防げますが、ロジックのバグは防げません。テストがあることで、変更を恐れずに進められました。

### 開発効率化

25日間の記事で紹介した仕組みをまとめます。

| 課題 | 解決策 | 記事 |
|------|--------|------|
| 並行開発 | Git Worktree | 5日目 |
| 型安全性 | TypeScript厳密モード | 18日目 |
| API型定義 | Hono + Zod OpenAPI | 12日目 |
| 進捗管理 | PDD（進捗駆動開発） | 24日目 |
| AI協働 | 設計ドキュメント + Claude Code | 23日目 |

これらの仕組みは単独でも効果がありますが、組み合わせることでより大きな効果を発揮しました。

## 🌱 2026年に向けて

2025年はAIツールの進化によって、開発の進め方が大きく変わった年でした。

2026年も引き続き開発を進めていきます。25日間の記事が、個人開発に取り組む方の参考になれば幸いです。

開発の背景にある考え方はnoteのアドベントカレンダーで書いています。ご興味のある方は、そちらもご覧ください。

https://adventar.org/calendars/12464

開発状況はXで発信していますので、よろしければフォローしてください。

https://x.com/pipipi_dev

最後までお読みいただきありがとうございました。

## 📝 25日間の記事一覧

### 序章（12/1-3）

| 日 | タイトル |
|----|----------|
| 1 | [個人開発の始め方 : アイデアから最初のコミットまで](https://zenn.dev/pipipi_dev/articles/20251201-how-to-start-indie-dev) |
| 2 | [AI駆動開発のための技術選定：相性の良い技術スタックの見極め方](https://zenn.dev/pipipi_dev/articles/20251202-ai-driven-tech-selection) |
| 3 | [Next.js + Supabaseで始める個人開発：プロジェクト構成の全体像](https://zenn.dev/pipipi_dev/articles/20251203-nextjs-supabase-project-structure) |

### 基盤構築：設計・DB・認証（12/4-9）

| 日 | タイトル |
|----|----------|
| 4 | [個人開発のドキュメント戦略：設計書・思考ログの使い分け](https://zenn.dev/pipipi_dev/articles/20251204-indie-dev-documentation-strategy) |
| 5 | [Gitブランチ戦略：個人開発で実践するワークフロー](https://zenn.dev/pipipi_dev/articles/20251205-git-branch-strategy) |
| 6 | [Supabaseでスキーマ設計：テーブル分割と正規化の実践](https://zenn.dev/pipipi_dev/articles/20251206-supabase-schema-design) |
| 7 | [データベースのID設計：ID方式の選択と主キーの考え方](https://zenn.dev/pipipi_dev/articles/20251207-database-id-design) |
| 8 | [DBマイグレーション運用術：開発・本番環境を安全に管理する方法](https://zenn.dev/pipipi_dev/articles/20251208-database-migration-strategy) |
| 9 | [NextAuth.jsからBetter Authへ：認証ライブラリを移行した理由](https://zenn.dev/pipipi_dev/articles/20251209-nextauth-to-better-auth) |

### フロント・API・インフラ（12/10-13）

| 日 | タイトル |
|----|----------|
| 10 | [App Routerのディレクトリ設計：Next.jsプロジェクトの構成術](https://zenn.dev/pipipi_dev/articles/20251210-app-router-directory-design) |
| 11 | [なぜMPAからSPAに移行したのか：App Routerリファクタリング実践](https://zenn.dev/pipipi_dev/articles/20251211-mpa-to-spa-migration) |
| 12 | [Next.js Route HandlerからHonoへ：API設計が楽になった理由](https://zenn.dev/pipipi_dev/articles/20251212-route-handler-to-hono) |
| 13 | [Vercel最適化：ビルド時間短縮とレスポンス改善の実践](https://zenn.dev/pipipi_dev/articles/20251213-vercel-optimization) |

### UX・機能実装（12/14-17）

| 日 | タイトル |
|----|----------|
| 14 | [モバイルファーストで最適なUXを考える：レスポンシブ設計の実践](https://zenn.dev/pipipi_dev/articles/20251214-mobile-first-responsive) |
| 15 | [無限スクロール × Zustand × React 19：非同期の落とし穴](https://zenn.dev/pipipi_dev/articles/20251215-infinite-scroll-zustand) |
| 16 | [ノーコードでExcelライクなテーブル作成：ドラッグ＆ドロップUIの実装](https://zenn.dev/pipipi_dev/articles/20251216-excel-like-table) |
| 17 | [「意味で検索」を実装する：pgvector + OpenAI Embeddings入門](https://zenn.dev/pipipi_dev/articles/20251217-semantic-search-pgvector) |

### 実践的課題（12/18-22）

| 日 | タイトル |
|----|----------|
| 18 | [TypeScript厳密モードで発見したバグ：型安全性の実践](https://zenn.dev/pipipi_dev/articles/20251218-typescript-strict-mode) |
| 19 | [2025年12月のReact脆弱性で考える：個人開発のセキュリティ対策](https://zenn.dev/pipipi_dev/articles/20251219-security-essentials-solo-dev) |
| 20 | [Stripeで実装する段階的課金：個人開発のマネタイズ設計](https://zenn.dev/pipipi_dev/articles/20251220-stripe-pricing-design) |
| 21 | [ユーザーの動きを可視化する：GA4とMicrosoft Clarityの設定](https://zenn.dev/pipipi_dev/articles/20251221-ga4-clarity-analytics) |
| 22 | [個人開発でマルチテナントSaaSを作る：エンタープライズ品質への挑戦](https://zenn.dev/pipipi_dev/articles/20251222-multi-tenant-saas) |

### 振り返り（12/23-25）

| 日 | タイトル |
|----|----------|
| 23 | [Claude Codeで変わった個人開発の進め方：AIペアプログラミングの実践](https://zenn.dev/pipipi_dev/articles/20251223-claude-code-ai-pair-programming) |
| 24 | [進捗駆動開発（PDD）のすすめ：AIエージェントと進める個人開発](https://zenn.dev/pipipi_dev/articles/20251224-progress-driven-development) |
| 25 | 2025年の個人開発を振り返る：技術・設計・運用の学び（本記事） |
