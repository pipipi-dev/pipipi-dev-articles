---
title: "Vercel最適化：ビルド時間短縮とレスポンス改善の実践"
emoji: "⚡"
type: "tech"
topics: ["nextjs", "vercel", "performance", "typescript"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の13日目の記事です。

昨日の記事では「Route HandlerからHonoへの移行」について書きました。この記事では、ビルド時間短縮とVercelでのレスポンス改善のために実践した最適化について解説します。

## 🎯 なぜVercel最適化が必要か

個人開発でNext.jsアプリをVercelにデプロイしていると、いくつかの課題が見えてきます。

- **ビルド時間の増加**: 依存パッケージやページが増えるたびに、デプロイ完了までの待ち時間が伸びる
- **レスポンスの遅延**: 特にコールドスタート時や、大きなバンドルを読み込むページで顕著
- **リソースの無駄遣い**: 開発環境と本番環境で同じ設定を使い、キャッシュを活用できていない

この記事では、これらの課題に対して実践した最適化を紹介します。

## ⏱️ ビルド時間短縮の施策

### Bunへの移行

ローカル開発では、パッケージマネージャをnpmからBunに移行しました。

https://bun.com/

```bash
# Before
npm install  # 数十秒〜数分

# After
bun install  # 数秒
```

Bunはnpmと互換性がありながら、インストール速度が大幅に高速です。依存パッケージが多いプロジェクトほど効果を実感できます。

移行は簡単で、`bun install`を実行するだけで`bun.lock`が生成されます。既存の`package.json`はそのまま使えます。

```bash
# 移行手順
bun install
rm package-lock.json  # 不要になったら削除
```

Vercelでも`vercel.json`の`installCommand`を`bun install`に変更すれば使えますが、`--legacy-peer-deps`が必要な依存関係があるため、互換性を考慮してnpmを使っています。ローカル開発の効率は大幅に向上しました。

### パッケージインポートの最適化

`next.config.ts`の`optimizePackageImports`で、大型ライブラリのtree-shakingを改善できます。

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@tiptap/react',
      'echarts',
      'framer-motion',
      'date-fns',
      'recharts',
    ],
  },
};
```

これらのライブラリは、全体をインポートするとバンドルサイズが大きくなりがちです。この設定で、使用している部分だけがバンドルに含まれるようになります。

### TypeScriptのインクリメンタルビルド

`tsconfig.json`でインクリメンタルビルドを有効にすると、変更がないファイルの再コンパイルをスキップできます。

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".next/cache/tsconfig.tsbuildinfo",
    "skipLibCheck": true
  }
}
```

- `incremental: true`: 増分ビルドを有効化
- `tsBuildInfoFile`: ビルド情報のキャッシュ先を指定
- `skipLibCheck`: `node_modules`内の型チェックをスキップ

## 🚀 レスポンス改善の施策

### リージョン設定による劇的改善

リージョン設定は、最も効果を実感しやすい最適化です。有識者にとっては当たり前の設定かもしれませんが、初心者は見落としがちなポイントです。実際に開発中に体験したエピソードを紹介します。

ダッシュボード画面の読み込みが、開発環境では2秒程度なのに、本番環境では5秒以上かかっていました。

原因を調べたところ、Vercel FunctionsがデフォルトでワシントンDC（iad1）で実行されていました。データベースは東京（Supabase ap-northeast-1）にあるため、毎回太平洋を往復していたのです。

```
開発環境（ローカル）:
ローカルPC（日本） → Supabase DB（東京） = 速い

本番環境（修正前）:
Vercel Functions（ワシントンDC） → Supabase DB（東京） = 遅い
```

`vercel.json`にリージョン設定を追加するだけで解決しました。

```json
{
  "regions": ["hnd1"]
}
```

`hnd1`は東京リージョンを指します。この1行を追加してデプロイしたところ、ダッシュボードの読み込みが5秒から2秒以下に改善されました。

実際にどのリージョンで実行されているかは、レスポンスヘッダーの`x-vercel-id`で確認できます。

```
修正前: hnd1::iad1::xxxxx
修正後: hnd1::hnd1::xxxxx
```

`x-vercel-id`の読み方は以下の通りです。

- 1つ目: エッジのリージョン
- 2つ目: Functionsのリージョン
- 3つ目: リクエストID

### エッジとFunctionsの違い

Vercelには「エッジ」と「Functions」という2種類の実行環境があります。

**エッジ（Edge Network）:**
- 役割: 静的ファイル配信、キャッシュ、リクエストのルーティング
- 場所: 世界中に数百箇所（CDN）
- 特徴: ユーザーに最も近い場所から応答

**Functions（Serverless Functions）:**
- 役割: APIルート、SSR、DB接続などの動的処理
- 場所: 設定されたリージョン（今回は東京 hnd1）
- 特徴: Node.jsランタイムで実行、DB接続が可能

リクエストの流れはこうなります。

```
ユーザー（日本）
    ↓
エッジ（東京）← 静的ファイルはここで返す
    ↓
Functions（東京）← API呼び出し、DB接続
    ↓
Supabase DB（東京）
```

DBと同じリージョンにFunctionsを配置することで、遅延を最小化できます。

### キャッシュ戦略

`next.config.ts`の`headers()`で、リソースの種類ごとにキャッシュを設定します。リソースの性質に応じて適切なキャッシュ戦略を選ぶことが重要です。

**静的アセット（`/_next/static/`）:**

```typescript
{
  source: '/_next/static/(.*)',
  headers: [
    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
  ],
}
```

Next.jsの静的アセットはファイル名にハッシュが含まれるため、内容が変わればURLも変わります。古いキャッシュが問題になることがないため、1年間の長期キャッシュが可能です。

**HTMLページ:**

```typescript
{
  source: '/(.*)',
  headers: [
    { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
  ],
}
```

HTMLは動的に変わる可能性があるため、毎回サーバーに確認します。ただし、変更がなければ304レスポンスで効率的に処理されます。

**API:**

```typescript
{
  source: '/api/(.*)',
  headers: [
    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
  ],
}
```

APIは認証情報やユーザー固有のデータを返すことがあるため、キャッシュを完全に無効化しています。古いデータが返されると不整合が発生するリスクがあります。

### APIタイムアウトの設定

`vercel.json`で、処理時間がかかるAPIのタイムアウトを個別に設定できます。

```json
{
  "functions": {
    "src/app/api/search/route.ts": { "maxDuration": 30 },
    "src/app/api/chat/route.ts": { "maxDuration": 60 },
    "src/app/api/embeddings/route.ts": { "maxDuration": 30 }
  }
}
```

Hobbyプランのデフォルトタイムアウトは10秒ですが、LLMを使った処理やベクトル検索など時間がかかるAPIは個別に延長します。

### その他のレスポンス最適化

- **Edge Functions**: `export const runtime = 'edge'`で軽量な処理をエッジで実行（OG画像生成など）
- **フォント最適化**: `next/font`で必要なサブセット・ウェイトのみを読み込み
- **Middlewareの最適化**: `matcher`設定で、静的ファイルやAPIルートはMiddlewareをスキップ
- **画像最適化**: `next/image`でWebP変換・リサイズを自動化

## 🎉 最適化の効果

これらの最適化を適用した結果をまとめます。

| 項目 | Before | After |
|------|--------|-------|
| ローカルインストール | npm（数十秒） | Bun（数秒） |
| リージョン | iad1（ワシントンDC） | hnd1（東京） |
| ダッシュボード表示 | 5秒以上 | 2秒以下 |
| 静的アセット | 毎回取得 | 1年間キャッシュ |

特にリージョン設定は、1行の変更で体感できるレベルの改善が得られました。

## ✅ まとめ

Vercelでのパフォーマンス最適化について解説しました。

**ビルド時間短縮:**
- Bunへの移行でローカル開発を高速化
- `optimizePackageImports`で大型ライブラリを最適化
- TypeScriptのインクリメンタルビルドを有効化

**レスポンス改善:**
- DBと同じリージョンにFunctionsを配置（5秒→2秒）
- リソースの種類ごとにキャッシュ戦略を設定
- APIタイムアウトを処理内容に応じて調整

個人開発では、最初から完璧な最適化は不要です。ユーザーからのフィードバックやVercel Analyticsを見ながら、必要な箇所から改善していくのがおすすめです。

明日は「モバイルファーストで最適なUXを考える」について解説します。

---

**シリーズの他の記事**

- 12/12: Next.js Route HandlerからHonoへ：API設計が楽になった理由
- 12/14: モバイルファーストで最適なUXを考える：レスポンシブ設計の実践
