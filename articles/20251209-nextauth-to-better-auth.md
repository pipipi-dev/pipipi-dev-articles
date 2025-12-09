---
title: "NextAuth.jsからBetter Authへ：認証ライブラリを移行した理由"
emoji: "🔐"
type: "tech"
topics: ["BetterAuth", "認証", "NextJS", "TypeScript"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の9日目の記事です。

昨日の記事では「DBマイグレーション運用術」について書きました。この記事では、認証ライブラリをNextAuth.jsからBetter Authへ移行した理由について書きます。

## 🎯 移行のきっかけ

NextAuth.js（現Auth.js）は、Next.jsで認証を実装する際のデファクトスタンダードです。私も最初はNextAuth.jsを使っていました。

移行を決めたきっかけは、2025年9月に発表された大きなニュースでした。

### Auth.jsチームがBetter Authに合流

2025年9月、Auth.js（旧NextAuth.js）の開発チームがBetter Authに合流することが発表されました。

https://www.better-auth.com/blog/authjs-joins-better-auth

Auth.jsは今後もセキュリティパッチや緊急対応は継続されますが、新規プロジェクトにはBetter Authの使用が推奨されています。

この発表を見て、今後の開発方針を考えると早めに移行した方が良いと判断しました。

## 🔑 Better Authの特徴

Better Authは、TypeScriptファーストで設計された認証ライブラリです。

### 豊富な機能

Better Authには、様々な認証機能がプラグインとして用意されています。

- **メール・パスワード認証**
- **ソーシャルログイン**（Google、GitHub、X など）
- **二要素認証（2FA）**
- **組織・チーム管理**
- **マジックリンク認証**
- **パスキー対応**

必要な機能をプラグインとして追加できるため、シンプルな構成から始めて、必要に応じて拡張できます。

### フレームワーク非依存

Better AuthはNext.jsに限らず、Nuxt、SvelteKit、Hono、Expressなど様々なフレームワークで動作します。

私はAPIをHonoで実装しているため、フレームワーク非依存という点も魅力でした。

### Drizzle ORMとの統合

Better AuthはDrizzle ORMと直接統合できます。私のプロジェクトではDrizzle ORMを使っているため、認証テーブルも同じ方法で管理できるのは便利です。

## 🔄 認証の選択肢

Next.js + Supabase構成での認証には、いくつかの選択肢があります。

### フルマネージドサービス

**Auth0、Clerk、Kinde** などのフルマネージドサービスは、認証機能をすべて外部サービスに任せる選択肢です。

**メリット:**
- セットアップが簡単
- セキュリティの専門家がメンテナンス
- 豊富な機能がすぐ使える

**デメリット:**
- 無料枠はあるが、ユーザー数に応じてコストが増加
- 外部サービスへの依存度が高い
- カスタマイズの自由度が限られる

フルマネージドサービスは、セキュリティや運用を任せられる安心感がありますが、長期的なコストと依存度を考慮して、今回は選択肢から外しました。

### Supabase Authの特徴

SupabaseにはSupabase Authという認証機能が組み込まれています。Supabaseを使っているなら、そちらを使う選択肢もあります。

**メリット:**
- Supabaseに組み込まれているため、追加設定が少ない
- RLS（Row Level Security）との連携が簡単
- Supabase Studioから認証情報を管理できる

**デメリット:**
- Supabaseに依存する（将来的な移行が難しくなる）
- カスタマイズの自由度が限られる
- 認証ロジックがSupabase側にあるため、把握しにくい

### Better Authの特徴

Better Authは自分のコードで認証ロジックを管理できるライブラリです。

**メリット:**
- フレームワーク・DB非依存（移行しやすい）
- カスタマイズの自由度が高い
- 認証ロジックがコードで管理できる
- プラグインで機能を拡張できる

**デメリット:**
- 初期設定が必要
- Supabase RLSとの連携は自前で実装

### 私がBetter Authを選んだ理由

| 観点 | Supabase Auth | Better Auth |
|------|---------------|-------------|
| 依存度 | Supabaseに強く依存 | DB・フレームワーク非依存 |
| カスタマイズ | 限定的 | 高い自由度 |
| 認証ロジック | Supabase側 | 自分のコードで管理 |
| 将来の移行 | 難しい | 容易 |

私がBetter Authを選んだ主な理由は、**将来の選択肢を残しておきたかった**からです。

Supabaseは素晴らしいサービスですが、認証までSupabaseに依存すると、将来的にDBを移行したくなった場合の影響が大きくなります。認証ロジックを自分のコードで管理することで、インフラの選択肢を柔軟に保てます。

また、認証テーブルをDrizzle ORMで管理することで、アプリケーション全体のスキーマを統一的に扱えるのも利点でした。

## 📦 移行の概要

### 移行前の構成

```
認証: NextAuth.js
DB: Prisma Adapter → Supabase
```

### 移行後の構成

```
認証: Better Auth
DB: Drizzle Adapter → Supabase
```

### 基本的なセットアップ

Better Authの基本的なセットアップはシンプルです。

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/db"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
})
```

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/client"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

export const { signIn, signOut, useSession } = authClient
```

詳細な実装方法は、公式ドキュメントが充実しています。

https://www.better-auth.com/docs

## 💡 移行時の注意点

### 既存ユーザーのデータ移行

NextAuth.jsとBetter Authではテーブル構造が異なるため、既存ユーザーのデータ移行が必要です。

Better Authの公式ドキュメントに、Auth.js（NextAuth.js）からの移行ガイドがあります。

https://www.better-auth.com/docs/guides/next-auth-migration-guide

### 再ログインが必要

セッション管理の方式が異なるため、移行後は既存ユーザーの再ログインが必要です。

私の場合はリリース前の移行だったので、特に影響はありませんでした。リリース後に移行する場合は、ユーザーに再ログインを求めることになる点を考慮してください。

## ✅ まとめ

NextAuth.jsからBetter Authへ移行した主な理由をまとめます。

**移行を決めた理由:**
- Auth.js開発チームがBetter Authに合流（今後の開発方針として有望）
- 機能が豊富（2FA、組織管理、パスキーなど）
- フレームワーク非依存（Honoとの統合が容易）
- Drizzle ORMとの統合

**注意点:**
- 既存ユーザーのデータ移行が必要
- 再ログインが必要

Better Authはまだ比較的新しいライブラリですが、Auth.jsチームの合流により、今後の発展が期待できます。

明日は「App Routerのディレクトリ設計」について解説します。

---

**シリーズの他の記事**

- 12/8: DBマイグレーション運用術：開発・本番環境を安全に管理する方法
- 12/10: App Routerのディレクトリ設計：Next.jsプロジェクトの構成術
