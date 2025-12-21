---
title: "ユーザーの動きを可視化する：GA4とMicrosoft Clarityの設定"
emoji: "📊"
type: "tech"
topics: ["nextjs", "googleanalytics", "clarity", "analytics"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の21日目の記事です。

昨日の記事では「Stripeを使った段階的課金」について書きました。この記事では、ユーザー行動の可視化ツールであるGoogle Analytics 4とMicrosoft Clarityの導入について紹介します。

## 🤔 なぜアクセス解析が必要か

サービスを公開したら、次に気になるのは「どれくらい使われているか」です。

- どのページがよく見られているか
- ユーザーはどこで離脱しているか
- どのボタンがクリックされているか

これらを把握しないと、改善の方向性が見えません。「なんとなく良くなった気がする」ではなく、データに基づいて判断したい。そこでアクセス解析ツールを導入しました。

### ツールの選定

私は3つのツールを組み合わせています。

| ツール | 役割 | 特徴 |
|-------|------|------|
| Google Analytics 4 | トラフィック分析 | ユーザー数、ページビュー、流入経路 |
| Microsoft Clarity | 行動の可視化 | ヒートマップ、セッション録画 |
| Search Console | SEO分析 | 検索キーワード、表示順位 |

3つとも無料で利用できます。GA4だけでも基本的な分析はできますが、Clarityを併用すると「なぜそうなるのか」が見えてきます。

## 📈 Google Analytics 4の設定

### コンポーネントの実装

Next.jsでは、`next/script`を使ってGA4のスクリプトを読み込みます。

```typescript
// components/analytics/GoogleAnalytics.tsx
'use client';

import Script from 'next/script';

interface GoogleAnalyticsProps {
  measurementId: string;
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
```

`strategy="afterInteractive"`を指定することで、ページの読み込みをブロックせずにスクリプトを実行します。ユーザー体験を損なわずに計測できます。

### レイアウトへの配置

ルートレイアウトでコンポーネントを読み込みます。本番環境でのみ動作するよう、環境変数のチェックを入れています。

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html>
      <body>
        {children}
        {gaMeasurementId && <GoogleAnalytics measurementId={gaMeasurementId} />}
      </body>
    </html>
  );
}
```

### カスタムイベントの送信

ボタンクリックなど、特定の操作を計測したい場合はカスタムイベントを使います。

```typescript
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, string | number | boolean>
) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as Window & { gtag: (...args: unknown[]) => void }).gtag(
      'event',
      eventName,
      eventParams
    );
  }
}

// 使用例
trackEvent('button_click', { button_name: 'signup' });
trackEvent('content_view', { content_id: '123' });
```

## 🎥 Microsoft Clarityの設定

Clarityは、ヒートマップとセッション録画でユーザー行動を可視化するツールです。GA4が「何が起きたか」を教えてくれるのに対し、Clarityは「なぜ起きたか」を見せてくれます。

### コンポーネントの実装

GA4と同様に、`next/script`で読み込みます。

```typescript
// components/analytics/MicrosoftClarity.tsx
'use client';

import Script from 'next/script';

interface MicrosoftClarityProps {
  projectId: string;
}

export function MicrosoftClarity({ projectId }: MicrosoftClarityProps) {
  if (!projectId) {
    return null;
  }

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${projectId}");
      `}
    </Script>
  );
}
```

### ユーザーの識別

ログインユーザーを識別したい場合は、ClarityのAPIを使います。

```typescript
export function identifyClarityUser(userId: string) {
  if (typeof window !== 'undefined' && 'clarity' in window) {
    (window as Window & { clarity: (...args: unknown[]) => void }).clarity(
      'identify',
      userId
    );
  }
}

// セグメント用のタグを設定
export function setClarityTag(key: string, value: string) {
  if (typeof window !== 'undefined' && 'clarity' in window) {
    (window as Window & { clarity: (...args: unknown[]) => void }).clarity(
      'set',
      key,
      value
    );
  }
}

// 使用例
identifyClarityUser('user_123');
setClarityTag('plan', 'premium');
```

プランごとにタグを設定しておくと、「無料ユーザーと有料ユーザーで行動が違うか」といった分析ができます。

## 🔍 Search Consoleの設定

### SEO分析の基盤

Search Consoleは、Google検索でのパフォーマンスを分析するツールです。

- どんなキーワードで検索されているか
- 検索結果に何回表示されたか
- クリック率はどれくらいか

GA4やClarityとは異なり、サイトに来る「前」の行動が分かります。

### 所有権の確認

Search Consoleを使うには、サイトの所有権を確認する必要があります。いくつかの方法がありますが、HTMLタグが簡単です。

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  verification: {
    google: 'your-verification-code',
  },
};
```

これで`<meta name="google-site-verification">`タグが出力されます。Search Consoleの管理画面で確認ボタンを押せば完了です。

なお、GA4やClarityと違い、データの反映まで1〜2日かかります。定期的にチェックする習慣をつけるとよいでしょう。

## 🔗 ツール間の連携

3つのツールは連携させることで、より深い分析ができます。

### GA4とSearch Consoleの連携

GA4の管理画面から「Search Consoleのリンク」を設定すると、検索クエリとサイト内行動を統合して分析できます。

「この検索キーワードで来たユーザーは、どのページをよく見ているか」といった分析が可能になります。

### GA4とClarityの連携

Clarityの設定画面から「Google アナリティクスの統合」を有効にすると、GA4のセッションとClarityの録画を紐付けられます。

GA4で「離脱率が高いページ」を見つけたら、Clarityでそのページの録画を確認する、という使い方ができます。

## 💡 実装のポイント

### 本番環境のみで有効化

開発中のアクセスが計測されると、データがノイズになります。環境変数を使って、本番環境でのみ有効化します。

```bash
# .env.local（開発環境）
# 設定しない

# Vercel環境変数（本番環境）
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_CLARITY_PROJECT_ID=xxxxxxxxxx
```

環境変数が設定されていなければ、コンポーネントは何もレンダリングしません。

### データ反映のタイミング

| ツール | 反映タイミング |
|-------|--------------|
| GA4 | リアルタイム |
| Clarity | リアルタイム |
| Search Console | 1〜2日後 |

GA4とClarityはすぐに確認できますが、Search Consoleは反映に時間がかかります。SEO分析は翌日以降に確認するようにしています。

### CSPの設定

Content Security Policy（CSP）を設定している場合、解析ツールのドメインを許可する必要があります。

```typescript
// middleware.ts
const cspHeader = `
  script-src 'self' https://www.googletagmanager.com https://*.clarity.ms;
  connect-src 'self' https://www.google-analytics.com https://*.clarity.ms;
`;
```

これを忘れると、解析スクリプトがブロックされて計測できません。

## ✅ まとめ

3つの解析ツールの導入について紹介しました。

| ツール | 役割 |
|--------|------|
| GA4 | トラフィック分析、カスタムイベントで詳細計測 |
| Clarity | ヒートマップとセッション録画で行動を可視化 |
| Search Console | 検索キーワードと表示順位でSEO分析 |

実装のポイントとして、本番環境のみで有効化すること、CSPの設定を忘れないこと、ツール間を連携させることが大切です。

個人開発では、すべての指標を追う必要はありません。まずは「どのページがよく見られているか」「どこで離脱しているか」から始めて、必要に応じて計測を増やしていくのがおすすめです。

明日は「個人開発でマルチテナントSaaSを作る」について解説します。

---

**シリーズの他の記事**

- 12/20: Stripeで実装する段階的課金：個人開発のマネタイズ設計
- 12/22: 個人開発でマルチテナントSaaSを作る：エンタープライズ品質への挑戦
