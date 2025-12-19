---
title: "2025年12月のReact脆弱性で考える：個人開発のセキュリティ対策"
emoji: "🔐"
type: "tech"
topics: ["security", "nextjs", "nodejs", "react"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の19日目の記事です。

昨日の記事では「TypeScript厳密モード」について書きました。この記事では、個人開発で私が気をつけているセキュリティ対策を紹介します。

## 🚨 2025年12月のセキュリティ事情

2025年12月、Next.js/Reactエコシステムで深刻な脆弱性が発見されました。個人開発でもセキュリティは他人事ではありません。

### React Server Componentsの脆弱性（CVE-2025-55182）

2025年12月3日、React Server Componentsにリモートコード実行の脆弱性が公開されました。深刻度を示すCVSSスコアは10.0で、これは最高値です。

https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components

- **影響範囲**: React 19.0〜19.2.0を使用するすべてのアプリケーション
- **攻撃方法**: 悪意あるHTTPリクエストでサーバー上で任意のコードを実行可能
- **対象フレームワーク**: Next.js、React Router、Waku、Parcel RSCなど

```bash
# Next.jsの場合、修正版へアップデート
npm install next@15.1.11  # 15.1.x系の場合
npm install next@15.0.7   # 15.0.x系の場合
npm install next@14.2.35  # 14.x系の場合
```

私が開発しているMemoreruでも、Vercelのデプロイ画面で警告が出て気づき、すぐにNext.js 15.5.9、React 19.2.3へアップデートしました。依存パッケージの更新を日頃から習慣にしていたため、スムーズに対応できました。

https://x.com/pipipi_dev/status/1996301018532118914

### Node.jsの複数の脆弱性

同じく2025年12月、Node.jsにも複数の脆弱性が報告されています。

https://nodejs.org/ja/blog/vulnerability/december-2025-security-releases

| 深刻度 | 件数 | 影響バージョン |
|--------|------|----------------|
| High | 3件 | v20.x, v22.x, v24.x, v25.x |
| Medium | 1件 | 同上 |
| Low | 1件 | 同上 |

修正版は2026年1月7日にリリース予定とのことです（2025年12月19日時点）。

## 🛡️ 私が実践しているセキュリティ対策

ここからは、Memoreruの開発で実際に取り入れているセキュリティ対策を紹介します。

### 1. 依存パッケージの更新

最も基本的で効果的な対策は、依存パッケージを最新に保つことです。

```bash
# 脆弱性のチェック
npm audit

# 自動修正可能な脆弱性を修正
npm audit fix

# 破壊的変更を含む場合（慎重に実行）
npm audit fix --force
```

[Dependabot](https://github.com/dependabot)や[Renovate](https://www.mend.io/renovate/)を設定すると、依存パッケージの更新を自動でPRにしてくれます。

### 2. 入力値のバリデーション

ユーザーからの入力は**すべて信用しない**という前提で実装しています。[Zod](https://zod.dev/)を使うと、バリデーションと型定義を一箇所で管理できます。

```typescript
import { z } from 'zod';

// スキーマ定義
const CreateUserSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '大文字・小文字・数字を含めてください'),
  name: z.string().min(1).max(100),
});

// バリデーション実行
const result = CreateUserSchema.safeParse(requestBody);
if (!result.success) {
  return Response.json({ error: result.error.issues }, { status: 400 });
}

// result.data は型安全
const { email, password, name } = result.data;
```

APIのクエリパラメータも同様にバリデーションしています。

```typescript
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});
```

### 3. 認証・認可の実装

認証は自前実装せず、ライブラリを使っています。Memoreruでは[Better Auth](https://www.better-auth.com/)を採用しました。[Auth.js](https://authjs.dev/)も選択肢になります。

```typescript
// 認証必須のAPIミドルウェア
export async function requireAuth(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return Response.json(
      { error: '認証が必要です' },
      { status: 401 }
    );
  }

  return session;
}
```

認可（権限チェック）も実装しています。

```typescript
// リソースの所有者チェック
const content = await db.query.contents.findFirst({
  where: (contents, { eq }) => eq(contents.id, contentId),
});

if (content?.userId !== session.user.id) {
  return Response.json(
    { error: 'このリソースにアクセスする権限がありません' },
    { status: 403 }
  );
}
```

### 4. 環境変数の管理

秘密情報は環境変数で管理し、コードへのハードコードは避けています。

```bash
# .env.local（gitignoreに含める）
DATABASE_URL="postgresql://user:password@host:5432/db"
AUTH_SECRET="ランダムな32文字以上の文字列"
STRIPE_SECRET_KEY="sk_live_..."
```

開発者向けの`.env.example`を用意して、必要な環境変数を明示します。

```bash
# .env.example（リポジトリにコミット）
DATABASE_URL="postgresql://user:password@host:5432/db"
AUTH_SECRET=""
STRIPE_SECRET_KEY=""
```

### 5. セキュリティヘッダーの設定

Next.jsの場合、`next.config.ts`でセキュリティヘッダーを設定できます。

```typescript
const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        // クリックジャッキング対策
        { key: 'X-Frame-Options', value: 'DENY' },
        // MIMEスニッフィング対策
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        // リファラー情報の制御
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // 不要な機能を無効化
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
};
```

本番環境では、HSTS（HTTP Strict Transport Security）ヘッダーも追加しています。このヘッダーを設定すると、ブラウザが自動的にHTTPSでアクセスするようになります。

```typescript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains'
}
```

### 6. CSRF対策

CSRF（Cross-Site Request Forgery）は、ユーザーが意図しないリクエストを送信させる攻撃です。たとえば、悪意あるサイトを開いただけで、ログイン中のサービスに対して勝手に操作が実行される可能性があります。

対策として、フォーム送信やAPIリクエストにはCSRFトークンを使っています。

```typescript
// トークン生成（HMAC-SHA256署名付き）
async function generateCsrfToken(userId: string): Promise<string> {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const payload = `${userId}:${timestamp}:${nonce}`;

  const signature = await signWithHmac(payload, process.env.CSRF_SECRET);
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

// トークン検証
async function validateCsrfToken(token: string, userId: string): Promise<boolean> {
  const [payloadBase64, signature] = token.split('.');
  const payload = Buffer.from(payloadBase64, 'base64').toString();
  const [tokenUserId, timestamp] = payload.split(':');

  // 署名検証
  const expectedSignature = await signWithHmac(payload, process.env.CSRF_SECRET);
  if (signature !== expectedSignature) return false;

  // 有効期限チェック（1時間）
  if (Date.now() - parseInt(timestamp) > 3600000) return false;

  // ユーザーID一致チェック
  if (tokenUserId !== userId) return false;

  return true;
}
```

### 7. SQLインジェクション対策

SQLインジェクションは、ユーザー入力を通じて不正なSQLを実行させる攻撃です。たとえば、ログインフォームに特殊な文字列を入力することで、認証をバイパスしたり、データを盗み出したりできてしまいます。

ORM（データベース操作をコードで書けるライブラリ）を正しく使っていれば基本的に安全ですが、生のSQLを書く場合はパラメータ化クエリを使うようにしています。

```typescript
// 危険: 文字列結合
const query = `SELECT * FROM users WHERE email = '${email}'`;

// 安全: パラメータ化クエリ
const query = `SELECT * FROM users WHERE email = $1`;
const result = await db.query(query, [email]);
```

[Drizzle ORM](https://orm.drizzle.team/)や[Prisma](https://www.prisma.io/)を使えば、自動的にパラメータ化されます。

```typescript
// Drizzle ORMの場合
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, email));
```

### 8. レートリミットの実装

レートリミットは、一定時間内のリクエスト数を制限する仕組みです。これにより、大量リクエストでサーバーを停止させるDoS攻撃や、パスワード総当たり攻撃を緩和できます。

シンプルな実装例です。

```typescript
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests = 100,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // 制限超過
  }

  record.count++;
  return true;
}
```

本番環境でスケールする場合は、[Upstash](https://upstash.com/)等のRedisを使った分散レートリミットも選択肢になります。

## 📋 セキュリティチェックリスト

私が確認している項目をまとめます。

| カテゴリ | チェック項目 |
|---------|-------------|
| **依存関係** | `npm audit`で脆弱性がないか |
| **依存関係** | 主要パッケージ（Next.js, React, Node.js）が最新か |
| **入力検証** | すべてのユーザー入力をバリデーションしているか |
| **認証** | 認証ライブラリを使っているか（自前実装していないか） |
| **認可** | リソースへのアクセス権限を確認しているか |
| **環境変数** | 秘密情報がコードにハードコードされていないか |
| **ヘッダー** | セキュリティヘッダーを設定しているか |
| **HTTPS** | 本番環境でHTTPSを強制しているか |
| **CSRF** | フォーム送信にCSRFトークンを使っているか |
| **SQL** | パラメータ化クエリまたはORMを使っているか |
| **API** | レートリミットを実装しているか |

## 🔔 脆弱性情報のキャッチアップ

セキュリティ情報を定期的にチェックする習慣をつけましょう。XなどのSNSで公式アカウントやセキュリティ情報を発信している開発者をフォローしておくと、重要な情報をいち早くキャッチできます。

- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security) - Next.js公式
- [React Blog](https://react.dev/blog) - React公式
- [Node.js Security Releases](https://nodejs.org/en/blog/vulnerability) - Node.js公式
- [IPA セキュリティアラート](https://www.ipa.go.jp/security/security-alert/) - 日本語での脆弱性情報

## ✅ まとめ

個人開発でも最低限のセキュリティ対策は必須です。

| 対策 | 優先度 | 理由 |
|------|--------|------|
| 依存パッケージの更新 | 最高 | 既知の脆弱性を防ぐ |
| 入力値のバリデーション | 最高 | 多くの攻撃の入口 |
| 認証・認可 | 高 | 不正アクセスを防ぐ |
| 環境変数の管理 | 高 | 情報漏洩を防ぐ |
| セキュリティヘッダー | 高 | 設定するだけで効果あり |
| CSRF対策 | 高 | 意図しない操作を防ぐ |
| SQLインジェクション対策 | 中 | ORMで自動的に対応 |
| レートリミット | 中 | 大量リクエスト攻撃を緩和 |

「あとで対策する」は危険です。最初から基本的な対策を入れておくことで、安心して開発を続けられます。

明日は「Stripeで実装する段階的課金」について解説します。

---

**シリーズの他の記事**

- 12/18: TypeScript厳密モードで発見したバグ：型安全性の実践
- 12/20: Stripeで実装する段階的課金：個人開発のマネタイズ設計
