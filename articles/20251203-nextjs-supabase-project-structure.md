---
title: "Next.js + Supabaseで始める個人開発：プロジェクト構成の全体像"
emoji: "🏗️"
type: "tech"
topics: ["個人開発", "nextjs", "supabase", "vercel"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**ひとりで作るSaaS - 設計・実装・運用の記録 Advent Calendar 2025** の3日目の記事です。

昨日の記事では「AI駆動開発のための技術選定」について書きました。この記事では、Next.js + Supabase + Vercelを使ったプロジェクトの全体像について解説します。

## 🏗️ Next.js + Supabase + Vercel構成

私が個人開発しているMemoreruでは、Next.js + Supabase + Vercelという構成を採用しています。この組み合わせは個人開発でよく選ばれる構成の1つです。データベースはNeon、ホスティングはCloudflareなど他の選択肢もあります。機能やプランを比較して、自分に合ったものを選ぶのがおすすめです。

### 従来の開発との違い

自分が働いていた以前の会社では、プロダクトのリリース時にこんな作業をしていました。

1. ビルドしてモジュールをPublish
2. AzureのKUDUにアップロード
3. ステージング環境で動作確認
4. ステージングと本番を手動で切り替え

Vercelでは、GitHubにpushするだけでこれらが自動化されます。PRを作ればプレビュー環境が自動生成され、mainにマージすれば本番にデプロイされる。手動での切り替え作業が不要になりました。

| 従来 | 現在 |
|------|------|
| ローカルにPostgreSQLインストール | Supabaseでクラウド上にDB作成 |
| 手動ビルド・アップロード・切り替え | GitHubにpushで自動デプロイ |
| SSL証明書の管理 | Vercelが自動で設定・更新 |

### 各サービスの役割

**Next.js**は、フルスタックなフレームワークで、フロントエンドとバックエンドを1つのプロジェクトで扱えます。個人開発では、コードベースを分けずに済むのは大きなメリットです。

**Supabase**は、PostgreSQLをホスティングしてくれるBaaS（Backend as a Service）です。管理画面からテーブル作成やデータ確認ができ、ローカルに環境構築する必要がありません。

**Vercel**は、Next.jsの開発元が提供するホスティングサービスです。GitHubにpushするだけで自動デプロイされ、プレビュー環境も自動生成されます。

## 📊 Supabaseの活用

Memoreruでは、Supabaseを純粋なPostgreSQLホスティングとして使っています。

### Supabaseを選んだ理由

Supabaseを選んだ理由は以下の通りです。

- **PostgreSQL**: 使い慣れたRDBを使える
- **無料枠**: 個人開発なら十分な容量
- **管理画面**: ブラウザからテーブル作成・データ確認ができる
- **外部ツール連携**: pgAdminやSupabase MCPが使える
- **pgvector対応**: ベクトル検索機能を標準サポート

自分の場合は、使い慣れたpgAdminで接続したり、Supabase MCPを使ってClaude CodeからDBの操作やスキーマ確認をしています。

SupabaseにはAuthやStorageの機能もありますが、Memoreruでは認証にBetter Auth、ファイルストレージにCloudflare R2を使っているため、純粋なデータベースとしてのみ活用しています。

スキーマ設計の詳細については、12/6の「Supabaseでスキーマ設計：テーブル分割と正規化の実践」で解説します。

### データベースへのアクセス

データベースへのアクセスにはDrizzle ORMを使っています。SQLライクな構文でクエリが書けます。

```typescript
// Drizzle ORMでのクエリ
const result = await db
  .select()
  .from(contents)
  .where(eq(contents.userId, userId))
  .orderBy(desc(contents.createdAt))
  .limit(10);
```

Drizzle ORMについては、過去記事「Drizzle ORM × Claude Code：次世代のTypeScript開発体験」も参考にしてください。

## ⚡ Vercelでのデプロイ

### 自動デプロイ

GitHubリポジトリと連携するだけで、以下が自動化されます。

- mainブランチへのマージ → 本番デプロイ
- PRの作成 → プレビュー環境の生成
- コミットごとのビルド状況の確認

個人開発では、CI/CDの設定に時間をかけたくありません。Vercelなら、ほぼ設定不要でこれらが実現できます。

### 環境変数の管理

Vercelのダッシュボードで、プレビュー環境と本番環境で異なる環境変数を設定できます。

- **Preview**: ステージング用のSupabaseやStripeテストキー
- **Production**: 本番用のSupabaseや本番Stripeキー

秘匿情報をGitにコミットせずに管理でき、環境ごとの切り替えも自動で行われます。

## 📁 プロジェクト構造

いろいろな考え方がありますが、Memoreruではソースコードの構成を大きく5つの領域に分けています。

```
src/
├── app/           # Next.js App Router（ルーティング）
├── client/        # クライアント専用コード
├── server/        # サーバー専用コード
├── shared/        # クライアント・サーバー共通
├── database/      # DBスキーマ定義
└── ...
```

- **app/**: Next.js App Routerのルーティング定義
- **client/**: Reactコンポーネント、カスタムフック、状態管理など
- **server/**: Server Actions、APIハンドラー、ビジネスロジックなど
- **shared/**: 型定義、共通ユーティリティなど
- **database/**: Drizzle ORMのスキーマ定義

この分離により、クライアントバンドルにサーバーコードが混入するのを防いでいます。

詳細なディレクトリ設計については、12/10の「App Routerのディレクトリ設計：Next.jsプロジェクトの構成術」で解説します。

## 🔄 この構成のメリット・デメリット

### メリット

1. **開発速度**: フロントエンドとバックエンドを同じリポジトリで管理できる
2. **コスト**: 個人開発の規模なら、無料枠でかなりカバーできる
3. **デプロイの簡単さ**: GitHubにpushするだけ
4. **スケーラビリティ**: 将来的にProプランに移行するだけで拡張可能

### デメリット

1. **ベンダーロックイン**: 特有の機能に依存すると移行が困難になる可能性がある

## ✅ まとめ

Next.js + Supabase + Vercelは、個人開発でよく選ばれる構成です。

- **Next.js**: フロントエンドとバックエンドを1つのプロジェクトで
- **Supabase**: PostgreSQLのマネージドホスティング
- **Vercel**: 設定不要のCI/CDとホスティング

この構成で、インフラ管理の手間を最小限に抑えつつ、プロダクト開発に集中することができます。

明日は「個人開発のドキュメント戦略：設計書・思考ログの使い分け」について解説します。

---

**シリーズの他の記事**

- 12/6: Supabaseでスキーマ設計：テーブル分割と正規化の実践
- 12/10: App Routerのディレクトリ設計：Next.jsプロジェクトの構成術
