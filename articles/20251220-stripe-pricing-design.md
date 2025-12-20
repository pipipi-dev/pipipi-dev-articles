---
title: "Stripeで実装する段階的課金：個人開発のマネタイズ設計"
emoji: "💰"
type: "tech"
topics: ["stripe", "nextjs", "saas", "billing"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の20日目の記事です。

昨日の記事では「セキュリティ対策」について書きました。この記事では、Stripeを使った段階的課金の設計と実装について紹介します。

:::message
この記事で紹介する内容は、私が個人プロダクトで採用した方法です。ベストプラクティスというより、個人開発者としての試行錯誤の記録として読んでいただければ幸いです。
:::

## 🤔 個人開発のマネタイズを考える

個人開発でサービスを作るとき、マネタイズは避けて通れない課題です。

無料で提供し続けるのは現実的ではありません。サーバー代、ドメイン代、API利用料など、運用コストは確実にかかります。持続可能なサービスにするには収益が必要です。

### なぜStripeを選んだか

決済サービスはいくつかありますが、私はStripeを選びました。

- **ドキュメントが充実している**: 公式ドキュメントが詳しく、実装で困ることが少ない
- **テスト環境が使いやすい**: 本番と同じ機能をテスト用APIキーで試せる
- **複雑な処理を任せられる**: 解約、プラン変更、請求書発行などを自前で実装しなくていい

個人開発では「自分で実装しない」選択が大切です。決済は特にミスが許されない領域なので、信頼できるサービスに任せることにしました。

## 🎯 料金プランの設計

料金プランを考えるとき、意識したのは**段階的な価値提供**です。

### 設計で意識したこと

**1. 無料プランでも十分使える**

無料プランでも基本機能は使えるようにしました。「使ってみたら物足りない」ではなく「使ってみたら便利だった、もっと使いたい」と思ってもらうのが狙いです。

まずは無料で価値を体験してもらい、もっと使いたいと思った人が有料プランを検討する、という流れを意識しました。

**2. 価格差に理由がある**

上位プランほど、作成できるページ数、ストレージ容量、チームメンバー数など、明確な価値の差を設けました。「なぜこの価格なのか」が説明できることが大切です。

**3. 運用コストを意識した機能制限**

AI機能やAPI利用は上位プランでのみ利用可能にしました。これらは利用量に応じてコストがかかるため、無料ユーザーに開放すると運用コストが膨らんでしまいます。

### プラン制限の型定義

各プランで「何がどこまで使えるか」を型で定義しています。

```typescript
interface PlanLimits {
  maxPages: number;         // 作成できるページ数
  maxTables: number;        // 作成できるテーブル数
  maxStorageMB: number;     // ストレージ容量（MB）
  maxTeamMembers: number;   // チームメンバー数
  maxApiCallsPerMonth: number;  // 月間API呼び出し回数
  hasApiAccess: boolean;    // API利用可能か
  hasAiFeatures: boolean;   // AI機能利用可能か
}
```

この型に基づいて、プランごとの制限値を設定します。ユーザーが操作するたびに、現在のプランの制限をチェックする仕組みです。

## 🧩 Stripeの実装

### Checkoutセッションの作成

ユーザーが「アップグレード」ボタンを押したときの流れです。

1. サーバー側でStripeの「Checkoutセッション」を作成する
2. Stripeがホストする決済画面のURLを返す
3. ユーザーをそのURLにリダイレクトする

ポイントは、**カード情報を自分のサーバーで扱わない**ことです。Stripeの画面に遷移させることで、セキュリティリスクを大幅に減らせます。

```typescript
// app/api/billing/create-checkout/route.ts
export async function POST(request: Request) {
  const { priceId, planType } = await request.json();
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: '認証が必要です' }, { status: 401 });
  }

  // Stripeの顧客を取得または作成
  const customer = await getOrCreateCustomer(session.user.id);

  // Checkoutセッションを作成
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    mode: 'subscription',  // サブスクリプション課金
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/billing/success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/billing/cancel`,
    metadata: { userId: session.user.id, planType },  // 後で使う情報
  });

  return Response.json({ url: checkoutSession.url });
}
```

`metadata`にユーザーIDを含めているのがポイントです。決済完了時にWebhookで受け取り、どのユーザーの課金かを特定できます。

### Webhookでサブスクリプションを管理

決済が完了したら、データベースを更新する必要があります。でも、決済完了はStripeの画面で起きるので、自分のサーバーは直接知ることができません。

ここで使うのが**Webhook**です。Stripeは決済完了などのイベントが発生すると、事前に登録したURLにHTTPリクエストを送ってくれます。

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  // 署名を検証（Stripeからの正規のリクエストか確認）
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  // イベントの種類に応じて処理を分岐
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
  }

  return Response.json({ received: true });
}
```

署名検証（`constructEvent`）は必須です。これを怠ると、悪意ある第三者が偽のリクエストを送ってくる可能性があります。

`checkout.session.completed`イベントを受け取ったら、データベースにサブスクリプション情報を保存します。

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // metadataからユーザー情報を取得
  const { userId, planType } = session.metadata!;

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // データベースに保存
  await db.insert(subscriptions).values({
    userId,
    planType,
    status: 'active',
    subscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  });
}
```

### カスタマーポータル

解約やプラン変更は、**Stripeのカスタマーポータル**に任せています。

```typescript
export async function createCustomerPortalSession(userId: string, returnUrl: string) {
  const subscription = await getSubscription(userId);

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.customerId,
    return_url: returnUrl,  // ポータルから戻るURL
  });

  return portalSession.url;
}
```

カスタマーポータルでは、以下のことがすべてできます。

- プラン変更（アップグレード/ダウングレード）
- 支払い方法の変更
- 請求書の確認
- 解約手続き

これらを自前で実装すると、「日割り計算はどうする？」「解約後の残り期間は？」など、考慮すべきエッジケースが多くなります。Stripeに任せることで、実装コストを大幅に削減できました。

## 💡 実装のポイント

### プラン制限のチェック

ユーザーが操作するたびに、プランの制限をチェックします。

```typescript
export async function checkPlanLimit(
  userId: string,
  resource: 'pages' | 'tables' | 'storage',
  currentCount: number
): Promise<{ allowed: boolean; limit: number }> {
  const subscription = await getSubscription(userId);
  const limits = getPlanLimits(subscription?.planType ?? 'free');

  const limitMap = {
    pages: limits.maxPages,
    tables: limits.maxTables,
    storage: limits.maxStorageMB,
  };

  return {
    allowed: currentCount < limitMap[resource],
    limit: limitMap[resource],
  };
}
```

使用例として、ページ作成時のチェックはこのようになります。

```typescript
export async function createPage(userId: string, data: PageData) {
  const pageCount = await getPageCount(userId);
  const check = await checkPlanLimit(userId, 'pages', pageCount);

  if (!check.allowed) {
    throw new Error('ページ数の上限に達しました');
  }

  return await db.insert(pages).values({ ...data, userId });
}
```

上限に達したら、アップグレードを促すUIを表示するようにしています。

### Webhookの冪等性

同じイベントが複数回送られることがあります。ネットワークの問題でStripeが再送するためです。

冪等性（べきとうせい）とは「同じ処理を何度実行しても結果が変わらない」という性質です。Webhookでは、同じリクエストが来ても問題なく処理できるようにしておく必要があります。

```typescript
await db
  .insert(subscriptions)
  .values(subscriptionData)
  .onConflictDoUpdate({
    target: subscriptions.subscriptionId,
    set: subscriptionData,
  });
```

`subscriptionId`をユニークキーにして、すでに存在する場合は更新になるようにしました。これで重複登録を防げます。

### テスト環境の活用

Stripeには本番環境とテスト環境があります。APIキーを切り替えるだけで使い分けられます。

```bash
# 開発環境
STRIPE_SECRET_KEY=sk_test_...

# 本番環境
STRIPE_SECRET_KEY=sk_live_...
```

テスト環境ではテスト用のカード番号（`4242 4242 4242 4242`など）で決済フローを試せます。実際の課金は発生しないので、安心して開発できます。

## ✅ まとめ

Stripeを使った段階的課金について、私の考え方と実装のポイントを紹介しました。

| ポイント | 内容 |
|---------|------|
| 料金設計 | 無料でも使える、価格差に理由がある |
| Checkout | Stripeのホスト型決済画面を利用 |
| Webhook | イベント駆動でDBを更新、署名検証は必須 |
| カスタマーポータル | 解約・変更はStripeに任せる |
| テスト環境 | 安心して決済フローを試せる |

個人開発では、決済周りに時間をかけすぎないことも大切です。Stripeのドキュメントは充実しているので、公式を読みながら実装を進めることをおすすめします。

https://docs.stripe.com/

明日は「ユーザーの動きを可視化する：GA4とMicrosoft Clarityの設定」について解説します。

---

**シリーズの他の記事**

- 12/19: 2025年12月のReact脆弱性で考える：個人開発のセキュリティ対策
- 12/21: ユーザーの動きを可視化する：GA4とMicrosoft Clarityの設定
