---
title: "Why I Migrated from MPA to SPA: App Router Refactoring in Practice"
emoji: "🐹"
type: "tech"
topics: ["nextjs", "AppRouter", "SPA", "zustand"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This is Day 11 of **[Building SaaS Solo - Design, Implementation, and Operation Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday I wrote about "App Router Directory Design." Today I'll explain why I migrated from MPA to SPA and the specific implementation details.

## 📝 Terminology Used in This Article

- **MPA (Multi Page Application)**: A method where the entire page reloads and fetches HTML from the server on each navigation
- **SPA (Single Page Application)**: A method where JavaScript handles page transitions after initial load without full page reloads
- **Client-side Navigation**: A method where the browser updates the URL and fetches only the necessary data to update the page

## 🎯 Why I Migrated to SPA

When I first adopted App Router, I used an MPA-like architecture to maximize the benefits of Server Components. On each page navigation, HTML was generated on the server and a new page was displayed.

However, as development progressed, the following issues emerged.

### Issues with MPA-like Architecture

**1. Navigation Menu Reloading**

I had a navigation menu in the sidebar, but it reloaded on every page transition. The expanded state was reset, and there was momentary flickering, degrading the user experience.

**2. Scroll Position Reset**

When scrolling through a list page, navigating to a detail page, and returning, the scroll position returned to the top. Filter conditions were also reset, requiring reconfiguration.

**3. Flickering During Transitions**

Since the entire page was re-rendered on each navigation, the layout would momentarily break or loading states became noticeable.

## 🔧 What SPA Migration Achieved

### 1. Scroll Position Restoration

When returning from a detail page to a list, the original scroll position is restored.

```typescript
// useScrollRestoration.ts
const SCROLL_CACHE_KEY = 'app_scroll_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export function useScrollRestoration() {
  // Save scroll position
  const saveScroll = useCallback(() => {
    const cache = {
      scrollY: window.scrollY,
      pathname: window.location.pathname,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(SCROLL_CACHE_KEY, JSON.stringify(cache));
  }, []);

  // Restore scroll position
  const restoreScroll = useCallback(() => {
    const stored = sessionStorage.getItem(SCROLL_CACHE_KEY);
    if (!stored) return;

    const cache = JSON.parse(stored);

    // Check expiry
    if (Date.now() - cache.timestamp > CACHE_EXPIRY) {
      sessionStorage.removeItem(SCROLL_CACHE_KEY);
      return;
    }

    // Restore if same path
    if (cache.pathname === window.location.pathname) {
      window.scrollTo(0, cache.scrollY);
    }
  }, []);

  return { saveScroll, restoreScroll };
}
```

### 2. Filter State URL Sync

Filter and sort conditions are saved to URL parameters and synced with browser history. I use a library called nuqs for this. nuqs lets you treat URL parameters as React state.

https://nuqs.dev/

```typescript
// useListFilters.ts
import { parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';

export const listFilterParsers = {
  category: parseAsString,
  tag: parseAsString,
  sort: parseAsStringEnum(['newest', 'oldest', 'popular'] as const)
    .withDefault('newest'),
  search: parseAsString,
};

export function useListFilters() {
  return useQueryStates(listFilterParsers, {
    history: 'push',   // Add to browser history
    shallow: true,     // No server refetch
  });
}
```

This generates URLs like:

```
/articles?category=tech&sort=popular&search=Next.js
```

Copy and share the URL to display the list with the same filter state.

## 📦 State Management Design

For the SPA migration, I organized the state management.

### Managing Global State with Zustand

Zustand is a simple and lightweight state management library. It requires less setup than Redux and doesn't need Provider wrapping, making it easy to adopt.

https://zustand.docs.pmnd.rs/

List data and loading states are centrally managed with Zustand.

```typescript
// articleStore.ts
import { create } from 'zustand';

interface Article {
  id: string;
  title: string;
  category: string;
  createdAt: string;
}

interface ArticleStore {
  // Article list
  articles: Article[];
  setArticles: (articles: Article[]) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useArticleStore = create<ArticleStore>(set => ({
  articles: [],
  setArticles: (articles) => set({ articles }),
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}));
```

### Using URL as Single Source of Truth

Filter conditions use URL parameters as the Single Source of Truth.

```typescript
// FilterContext.tsx
export function FilterProvider({ children }: { children: ReactNode }) {
  // Get filter state from URL (nuqs)
  const [filters, setFilters] = useListFilters();

  // Derived state is computed from URL
  const hasActiveFilters = useMemo(() => {
    return !!(filters.category || filters.tag || filters.search);
  }, [filters]);

  return (
    <FilterContext.Provider value={{ filters, setFilters, hasActiveFilters }}>
      {children}
    </FilterContext.Provider>
  );
}
```

## 🖥️ Layout Layer Considerations

For SPA migration, it's important to avoid data fetching in the layout layer.

### Before: Data Fetching in Layout

```tsx
// ❌ Data is refetched on every page transition
function MainLayout({ children }: { children: ReactNode }) {
  const { data, isLoading } = useArticles();  // Fetching data here

  return (
    <div className="flex">
      <Sidebar articles={data} isLoading={isLoading} />
      <main>{children}</main>
    </div>
  );
}
```

### After: Layout Only References Store

```tsx
// ✅ Layout layer only references Zustand state
function MainLayout({ children }: { children: ReactNode }) {
  // Get state from Zustand (no data fetching)
  const articles = useArticleStore(state => state.articles);
  const isLoading = useArticleStore(state => state.isLoading);

  return (
    <div className="flex">
      <Sidebar articles={articles} isLoading={isLoading} />
      <main>{children}</main>
    </div>
  );
}
```

Data fetching is done in each page component, and results are saved to Zustand. The layout layer only references that state, so no refetching occurs on page transitions.

## 🔀 Client-side Navigation

Client-side navigation is implemented using Next.js's `useRouter`.

```typescript
// useSPANavigation.ts
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export const useSPANavigation = () => {
  const router = useRouter();

  const navigateTo = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  const navigateBack = useCallback(() => {
    router.back();
  }, [router]);

  return { navigateTo, navigateBack };
};
```

Using `router.push()` changes the URL without reloading the entire page, updating only the necessary components.

## 🎯 Migration Tips

### 1. Migrate Gradually

Rather than aiming for a complete SPA from the start, I migrated gradually from screens where issues were most apparent.

- Phase 1: Navigation menu state persistence
- Phase 2: List↔Detail scroll restoration
- Phase 3: Filter condition URL sync

### 2. Maintain SSR Benefits

Even after SPA migration, initial display is done with SSR. Leveraging App Router's Server Components, initial display is fast, and subsequent navigation is handled client-side.

### 3. Be Conscious of Persistence

Scroll position, filter conditions, menu expanded state, etc.—states you want to restore should be properly persisted.

| State | Storage | Reason |
|-------|---------|--------|
| Filter conditions | URL | Shareable, history sync |
| Scroll position | sessionStorage | Restore within tab |
| Menu expanded state | localStorage | Persist as user setting |
| Display format | localStorage | Persist as user setting |

## ✅ Summary

Here's what the MPA to SPA migration achieved.

**Solved Issues:**
- Navigation menu reloading → State persistence with Zustand
- Scroll position reset → Restoration with sessionStorage
- Filter condition reset → Persistence with URL parameters
- Flickering during transitions → Client-side navigation

**Design Points:**
- Manage global state with Zustand
- Use URL as single source of truth
- Avoid data fetching in layout layer
- Maintain SSR benefits

By achieving SPA-like experience while using App Router, I was able to combine the benefits of Server Components with client-side comfort.

Tomorrow I'll explain "From Next.js Route Handler to Hono."

---

**Other Articles in This Series**

- Day 10: App Router Directory Design: Next.js Project Structure Patterns
- Day 12: From Next.js Route Handler to Hono: Why API Design Became Easier
