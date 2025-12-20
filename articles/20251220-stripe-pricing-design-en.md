---
title: "Tiered Pricing with Stripe: Monetization for Solo Developers"
emoji: "💰"
type: "tech"
topics: ["stripe", "nextjs", "saas", "billing"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This article is part of the **[Solo SaaS Development Advent Calendar 2025](https://adventar.org/calendars/12615)** (Day 20).

Yesterday I wrote about "Security Practices." In this article, I'll share how I designed and implemented tiered pricing with Stripe.

:::message
The content in this article reflects the approach I adopted for my personal product. Rather than best practices, please read this as a record of trial and error from a solo developer.
:::

## 🤔 Thinking About Monetization for Solo Projects

When building a service as a solo developer, monetization is an unavoidable challenge.

Providing a service for free indefinitely isn't realistic. Server costs, domain fees, API usage charges—operational costs are guaranteed. Revenue is necessary for a sustainable service.

### Why I Chose Stripe

There are several payment services available, but I chose Stripe.

- **Comprehensive documentation**: The official docs are detailed, so implementation rarely gets stuck
- **Easy-to-use test environment**: You can test with test API keys using the same features as production
- **Complex processes handled for you**: No need to implement cancellation, plan changes, or invoice generation yourself

In solo development, choosing "not to implement it yourself" is important. Payment processing is an area where mistakes are especially unforgivable, so I decided to entrust it to a reliable service.

## 🎯 Designing the Pricing Plan

When designing the pricing plan, I focused on **tiered value delivery**.

### Design Considerations

**1. The free plan should be fully usable**

I made sure the free plan includes usable core features. The goal is not "I tried it but it wasn't enough," but rather "I tried it and it was useful, I want to use it more."

I aimed to let users experience value for free first, then have those who want more consider paid plans.

**2. Price differences have reasons**

Higher-tier plans have clear value differentiators: more pages, more storage, more team members. It's important to be able to explain "why this price."

**3. Feature restrictions based on operational costs**

AI features and API access are only available on higher-tier plans. These incur costs based on usage, so opening them to free users would inflate operational costs.

### Type Definition for Plan Limits

I define "what can be used and to what extent" for each plan using types.

```typescript
interface PlanLimits {
  maxPages: number;         // Number of pages that can be created
  maxTables: number;        // Number of tables that can be created
  maxStorageMB: number;     // Storage capacity (MB)
  maxTeamMembers: number;   // Number of team members
  maxApiCallsPerMonth: number;  // Monthly API call limit
  hasApiAccess: boolean;    // API access available
  hasAiFeatures: boolean;   // AI features available
}
```

Based on this type, I set limit values for each plan. The system checks the current plan's limits whenever a user performs an action.

## 🧩 Stripe Implementation

### Creating a Checkout Session

Here's the flow when a user clicks the "Upgrade" button:

1. Create a Stripe "Checkout Session" on the server side
2. Return the URL of the Stripe-hosted payment page
3. Redirect the user to that URL

The key point is **not handling card information on your own server**. By redirecting to Stripe's page, you significantly reduce security risks.

```typescript
// app/api/billing/create-checkout/route.ts
export async function POST(request: Request) {
  const { priceId, planType } = await request.json();
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Get or create Stripe customer
  const customer = await getOrCreateCustomer(session.user.id);

  // Create Checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    mode: 'subscription',  // Subscription billing
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/billing/success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/billing/cancel`,
    metadata: { userId: session.user.id, planType },  // For later use
  });

  return Response.json({ url: checkoutSession.url });
}
```

The key is including the user ID in `metadata`. When the payment completes, we receive it via Webhook to identify which user made the payment.

### Managing Subscriptions with Webhooks

When a payment completes, we need to update the database. But since the payment completion happens on Stripe's page, our server doesn't know about it directly.

This is where **Webhooks** come in. When events like payment completion occur, Stripe sends HTTP requests to a pre-registered URL.

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  // Verify signature (confirm it's a legitimate request from Stripe)
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  // Branch processing based on event type
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

Signature verification (`constructEvent`) is essential. Without it, malicious third parties could send fake requests.

When we receive a `checkout.session.completed` event, we save the subscription information to the database.

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Get user info from metadata
  const { userId, planType } = session.metadata!;

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Save to database
  await db.insert(subscriptions).values({
    userId,
    planType,
    status: 'active',
    subscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  });
}
```

### Customer Portal

I leave cancellation and plan changes to **Stripe's Customer Portal**.

```typescript
export async function createCustomerPortalSession(userId: string, returnUrl: string) {
  const subscription = await getSubscription(userId);

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.customerId,
    return_url: returnUrl,  // URL to return to from portal
  });

  return portalSession.url;
}
```

The Customer Portal handles everything:

- Plan changes (upgrade/downgrade)
- Payment method changes
- Invoice viewing
- Cancellation

Implementing these yourself means dealing with many edge cases: "How to handle prorated billing?" "What about remaining time after cancellation?" By leaving it to Stripe, I significantly reduced implementation costs.

## 💡 Implementation Tips

### Checking Plan Limits

Check plan limits whenever a user performs an action.

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

Here's an example of checking when creating a page:

```typescript
export async function createPage(userId: string, data: PageData) {
  const pageCount = await getPageCount(userId);
  const check = await checkPlanLimit(userId, 'pages', pageCount);

  if (!check.allowed) {
    throw new Error('Page limit reached');
  }

  return await db.insert(pages).values({ ...data, userId });
}
```

When the limit is reached, I display a UI prompting an upgrade.

### Webhook Idempotency

The same event may be sent multiple times. This happens because Stripe resends due to network issues.

Idempotency means "the result doesn't change no matter how many times you execute the same process." For Webhooks, you need to handle the same request coming in without issues.

```typescript
await db
  .insert(subscriptions)
  .values(subscriptionData)
  .onConflictDoUpdate({
    target: subscriptions.subscriptionId,
    set: subscriptionData,
  });
```

By making `subscriptionId` a unique key, existing records get updated rather than duplicated. This prevents duplicate registrations.

### Using the Test Environment

Stripe has production and test environments. You can switch between them just by changing API keys.

```bash
# Development
STRIPE_SECRET_KEY=sk_test_...

# Production
STRIPE_SECRET_KEY=sk_live_...
```

In the test environment, you can try the payment flow with test card numbers (like `4242 4242 4242 4242`). No actual charges occur, so you can develop with confidence.

## ✅ Summary

I've shared my approach and implementation points for tiered pricing with Stripe.

| Point | Content |
|-------|---------|
| Pricing design | Free plan is usable, price differences have reasons |
| Checkout | Use Stripe's hosted payment page |
| Webhook | Event-driven DB updates, signature verification is essential |
| Customer Portal | Leave cancellation and changes to Stripe |
| Test environment | Safely test payment flows |

In solo development, it's also important not to spend too much time on payment processing. Stripe's documentation is comprehensive, so I recommend implementing while reading the official docs.

https://docs.stripe.com/

Tomorrow I'll cover "Visualizing User Behavior: Setting Up GA4 and Microsoft Clarity."

---

**Other articles in this series**

- 12/19: What the React 2025 Vulnerability Taught Me About Solo Dev Security
- 12/21: Visualizing User Behavior: Setting Up GA4 and Microsoft Clarity
