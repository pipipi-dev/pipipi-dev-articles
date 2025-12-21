---
title: "Visualizing User Behavior: Setting Up GA4 and Microsoft Clarity"
emoji: "📊"
type: "tech"
topics: ["nextjs", "googleanalytics", "clarity", "analytics"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This article is Day 21 of the **[Solo SaaS Development Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday I wrote about implementing tiered pricing with Stripe. Today, I'll cover setting up Google Analytics 4 and Microsoft Clarity to visualize user behavior.

## 🤔 Why Analytics Matter

Once you launch a service, you naturally want to know how it's being used:

- Which pages are most viewed?
- Where do users drop off?
- Which buttons get clicked?

Without this data, you can't make informed decisions about improvements. Instead of relying on gut feelings, I wanted to make data-driven decisions. That's why I implemented analytics tools.

### Tool Selection

I use three tools in combination:

| Tool | Purpose | Features |
|------|---------|----------|
| Google Analytics 4 | Traffic analysis | User count, page views, traffic sources |
| Microsoft Clarity | Behavior visualization | Heatmaps, session recordings |
| Search Console | SEO analysis | Search keywords, rankings |

All three are free. While GA4 alone provides basic analysis, combining it with Clarity reveals the "why" behind the numbers.

## 📈 Setting Up Google Analytics 4

### Component Implementation

In Next.js, we use `next/script` to load the GA4 script:

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

By specifying `strategy="afterInteractive"`, the script runs without blocking page load, preserving user experience while tracking.

### Adding to Layout

Load the component in your root layout. Check for the environment variable to ensure it only runs in production:

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

### Sending Custom Events

For tracking specific actions like button clicks, use custom events:

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

// Usage examples
trackEvent('button_click', { button_name: 'signup' });
trackEvent('content_view', { content_id: '123' });
```

## 🎥 Setting Up Microsoft Clarity

Clarity visualizes user behavior through heatmaps and session recordings. While GA4 tells you "what happened," Clarity shows you "why it happened."

### Component Implementation

Similar to GA4, load it using `next/script`:

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

### User Identification

To identify logged-in users, use Clarity's API:

```typescript
export function identifyClarityUser(userId: string) {
  if (typeof window !== 'undefined' && 'clarity' in window) {
    (window as Window & { clarity: (...args: unknown[]) => void }).clarity(
      'identify',
      userId
    );
  }
}

// Set tags for segmentation
export function setClarityTag(key: string, value: string) {
  if (typeof window !== 'undefined' && 'clarity' in window) {
    (window as Window & { clarity: (...args: unknown[]) => void }).clarity(
      'set',
      key,
      value
    );
  }
}

// Usage examples
identifyClarityUser('user_123');
setClarityTag('plan', 'premium');
```

By setting tags per plan, you can analyze differences in behavior between free and paid users.

## 🔍 Setting Up Search Console

### Foundation for SEO Analysis

Search Console analyzes your performance in Google search:

- What keywords are users searching for?
- How many times did you appear in search results?
- What's your click-through rate?

Unlike GA4 and Clarity, it shows user behavior *before* they reach your site.

### Ownership Verification

To use Search Console, you need to verify site ownership. The HTML tag method is the simplest:

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  verification: {
    google: 'your-verification-code',
  },
};
```

This outputs a `<meta name="google-site-verification">` tag. Just click the verify button in the Search Console dashboard to complete setup.

Note that unlike GA4 and Clarity, data takes 1-2 days to appear. Make it a habit to check regularly.

## 🔗 Tool Integration

Connecting the three tools enables deeper analysis.

### GA4 and Search Console Integration

Link Search Console from the GA4 admin panel to combine search queries with on-site behavior analysis.

This allows analysis like "Which pages do users who came from this search keyword view most?"

### GA4 and Clarity Integration

Enable "Google Analytics integration" in Clarity settings to link GA4 sessions with Clarity recordings.

When GA4 shows a page with high bounce rate, you can watch the Clarity recordings for that page to understand why.

## 💡 Implementation Tips

### Enable Only in Production

Development traffic creates noise in your data. Use environment variables to enable analytics only in production:

```bash
# .env.local (development)
# Don't set these

# Vercel environment variables (production)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_CLARITY_PROJECT_ID=xxxxxxxxxx
```

If the environment variable isn't set, the component renders nothing.

### Data Reflection Timing

| Tool | Reflection Time |
|------|-----------------|
| GA4 | Real-time |
| Clarity | Real-time |
| Search Console | 1-2 days |

GA4 and Clarity data is immediately available, but Search Console takes time. I check SEO data the next day.

### CSP Configuration

If you have Content Security Policy (CSP) configured, you need to allow the analytics domains:

```typescript
// middleware.ts
const cspHeader = `
  script-src 'self' https://www.googletagmanager.com https://*.clarity.ms;
  connect-src 'self' https://www.google-analytics.com https://*.clarity.ms;
`;
```

Forgetting this will block the analytics scripts.

## ✅ Summary

I covered setting up three analytics tools:

| Tool | Purpose |
|------|---------|
| GA4 | Traffic analysis, detailed tracking with custom events |
| Clarity | Visualize behavior with heatmaps and session recordings |
| Search Console | SEO analysis with search keywords and rankings |

Key implementation points: enable only in production, don't forget CSP settings, and integrate the tools together.

For solo development, you don't need to track every metric. Start with "which pages are most viewed" and "where users drop off," then add more tracking as needed.

Tomorrow I'll cover building a multi-tenant SaaS as a solo developer.

---

**Other Articles in This Series**

- Day 20: Tiered Pricing with Stripe: Monetization for Solo Developers
- Day 22: Building Multi-tenant SaaS as a Solo Developer
