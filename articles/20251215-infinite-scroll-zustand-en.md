---
title: "Infinite Scroll with Zustand and React 19: Async Pitfalls"
emoji: "🌀"
type: "tech"
topics: ["react", "zustand", "nextjs", "typescript"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This article is Day 15 of the **[Solo SaaS Development - Design, Implementation, and Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday's article covered "Mobile-First Design." This article explains the pitfalls I encountered when implementing infinite scroll with Zustand and React 19, along with their solutions.

## 🎯 What is Infinite Scroll?

Infinite scroll is a mechanism that automatically loads the next content when a user approaches the bottom of the page. It's a familiar UI pattern from X and Instagram.

Compared to traditional pagination (clicking a "Next" button), it offers a more seamless user experience. However, implementation comes with unexpected pitfalls.

For Memoreru, my indie project, I had the following requirements:

- Switch between three scopes (public, team, private) plus bookmarks view
- Maintain independent pagination state for each view
- Display initial data with SSR and load more on the client

It seems simple, but I encountered various issues when actually building it. This article shares that experience.

## ⚙️ Libraries and Architecture

### Delegating Scroll Detection to a Library

For implementing infinite scroll, I used a library called `react-infinite-scroll-component`. It automates scroll position detection and loading state management.

```tsx
<InfiniteScroll
  dataLength={items.length}    // Current item count
  next={loadMore}              // Function to load more
  hasMore={hasMore}            // Whether more data exists
  loader={<LoadingSpinner />}  // Loading display
  scrollThreshold={0.6}        // Trigger at 60% scroll
>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</InfiniteScroll>
```

You could implement IntersectionObserver yourself, but handling scroll container detection and edge cases is surprisingly tedious. By delegating to a proven library, you can focus on essential feature development.

`scrollThreshold` specifies "at what percentage of scrolling should we load the next page." Setting it to around 0.6 (60%) starts loading before the user reaches the bottom, making wait times less noticeable.

### Managing Multiple Scopes with Zustand

I chose Zustand for state management. Each view (three scopes plus bookmarks) needs to maintain "item list," "current page," "has more data," and "is loading."

```tsx
interface ContentStore {
  // Items for each scope
  publicItems: ContentItem[];
  privateItems: ContentItem[];
  teamItems: ContentItem[];
  bookmarkItems: ContentItem[];

  // Pagination state (per scope)
  pagination: {
    public: { page: number; hasMore: boolean };
    private: { page: number; hasMore: boolean };
    team: { page: number; hasMore: boolean };
    bookmarks: { page: number; hasMore: boolean };
  };

  // Loading state (per scope)
  loadingState: {
    public: boolean;
    private: boolean;
    team: boolean;
    bookmarks: boolean;
  };
}
```

I chose Zustand because it's lighter than Redux with less boilerplate, yet more flexible than React Context for splitting state. Since each scope's state is preserved when switching tabs, users don't need to reload when they return.

## 🚨 Pitfall 1: Same Data Displayed Twice

### Root Cause

The first problem I encountered was duplicate items appearing while scrolling.

Investigation revealed that the API response contained items that had already been fetched. This can happen when data is added or deleted during pagination offset calculation.

For example, if a new item is added after fetching page 1, the beginning of page 2 will contain the last item from page 1.

### Solution: ID-Based Duplicate Check

As a countermeasure, I implemented ID-based duplicate filtering before adding items.

```tsx
const loadMoreItems = useCallback(async () => {
  const newItems = await fetchNextPage();

  setItems(prev => {
    // Manage existing IDs with a Set
    const existingIds = new Set(prev.map(item => item.id));
    // Filter out duplicates before adding
    const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
    return [...prev, ...uniqueNewItems];
  });
}, []);
```

The key is using `Set`. The array's `includes` method slows down proportionally to the number of elements, but Set's `has` method searches in nearly constant time. This difference matters when handling hundreds of items in infinite scroll.

## 🚨 Pitfall 2: Data Order Gets Scrambled

### Root Cause

The next issue I encountered was data order getting scrambled when scrolling quickly.

This is a phenomenon called a Race Condition. Network requests don't necessarily complete in the order they were issued.

```
Page 1 request starts
↓
Page 2 request starts (fast scrolling)
↓
Page 2 response arrives (completes first)
↓
Page 1 response arrives (completes later)
```

In this case, page 1 data gets appended after page 2 data.

### Solution: Track Loading State with Ref

React state (useState) updates asynchronously, so you can't accurately determine "is it currently loading?" Instead, use a Ref that can be referenced synchronously.

```tsx
const loadingRef = useRef<boolean>(false);

const loadMore = useCallback(async () => {
  // Do nothing if already loading
  if (loadingRef.current) return;
  loadingRef.current = true;

  try {
    const newItems = await fetchNextPage();
    // Process data...
  } finally {
    loadingRef.current = false;
  }
}, []);
```

You still need useState's `loading` state for UI display, but the key is using Ref to determine "is it okay to issue a request?" Since Ref updates synchronously, it reliably prevents duplicate requests even with consecutive scroll events.

## 🚨 Pitfall 3: SSR Data Disappears

### Root Cause

I was fetching initial data with Next.js SSR, but the data would sometimes disappear after client-side hydration completed.

Investigation revealed that the client-side API request returned an empty response, overwriting the 10 items fetched via SSR with 0 items.

This can happen when SSR and client make requests with different API conditions (authentication state, filter conditions, etc.).

### Solution: Protect SSR Data

Manage a flag for whether SSR data has been loaded, and skip overwriting when "SSR data exists" and "API returns empty response."

```tsx
const fetchData = useCallback(async () => {
  const items = await fetch(apiUrl).then(res => res.json());

  // Don't overwrite if SSR data exists and API returns empty
  if (store.isSSRDataLoaded && store.items.length > 0 && items.length === 0) {
    console.warn('Blocked overwriting SSR data');
    return;
  }

  updateStore(items);
}, []);
```

Ideally, SSR and client should call the API with the same conditions, but authentication state synchronization can be tricky. Adding defensive code provides peace of mind.

## ⚛️ React 19 Considerations

The three issues above can occur with infinite scroll in general, but there are also React 19-specific considerations.

In React 19, state updates are batched more aggressively. This usually contributes to performance improvements, but can cause unexpected issues when coordinating Zustand with React state.

When updating React's local state immediately followed by updating Zustand's store, batching may reorder them. In such cases, use `flushSync` from `react-dom` to execute synchronously.

```tsx
import { flushSync } from 'react-dom';

const updateItems = useCallback((newItems) => {
  let mergedItems;

  flushSync(() => {
    setLocalState(prev => {
      mergedItems = [...prev, ...newItems];
      return mergedItems;
    });
  });

  // At this point, setLocalState has definitely completed
  updateZustandStore(mergedItems);
}, []);
```

`flushSync` shouldn't be overused, but it's effective when you need to strictly synchronize multiple state stores.

## 📊 Performance Optimizations

### Suppressing Re-renders with useShallow

When retrieving multiple values from a Zustand store, re-renders occur even for unrelated value changes. Using `useShallow` triggers re-renders only when specified properties change.

```tsx
import { useShallow } from 'zustand/react/shallow';

// Bad: pagination recalculates when publicItems changes
const store = useContentStore();

// Good: subscribe only to needed properties
const { items, hasMore } = useContentStore(
  useShallow(state => ({
    items: state.publicItems,
    hasMore: state.pagination.public.hasMore,
  }))
);
```

Since infinite scroll handles large amounts of items, suppressing unnecessary re-renders is important.

### Auto-Load Until Screen is Filled

If no scrollbar appears on initial display, users can't scroll and the next page won't load. This happens with large monitors or when item height is small.

I added a mechanism using ResizeObserver to automatically continue loading until the screen is filled.

```tsx
useEffect(() => {
  const checkScrollbar = () => {
    const hasScrollbar =
      document.documentElement.scrollHeight > window.innerHeight;

    // Load if no scrollbar and more data exists
    if (!hasScrollbar && hasMore) {
      loadMore();
    }
  };

  const timer = setTimeout(checkScrollbar, 300);
  const observer = new ResizeObserver(checkScrollbar);
  observer.observe(document.body);

  return () => {
    clearTimeout(timer);
    observer.disconnect();
  };
}, [hasMore, loadMore]);
```

ResizeObserver also detects layout changes like sidebar open/close and triggers additional loading.

## 🔧 Consolidating into a Custom Hook

I created a `usePagination` hook that consolidates these processes. The same logic can be reused across different screens.

```tsx
export function usePagination({ items, scope, loadMoreData, pagination }) {
  const loadedItems = items || [];
  const hasMore = pagination?.hasMore || false;

  const loadMore = useCallback(() => {
    if (!loadMoreData || !hasMore) return;
    loadMoreData(scope);
  }, [loadMoreData, scope, hasMore]);

  // Auto-load to fill screen (useEffect above)
  // ...

  return { loadedItems, hasMore, loadMore };
}
```

## ✅ Summary

This article explained the pitfalls and solutions when implementing infinite scroll with Zustand and React 19.

| Problem | Cause | Solution |
|---------|-------|----------|
| Duplicate data | Pagination offset shift | Filter with Set |
| Order scrambled | Race condition | Track loading with Ref |
| SSR data loss | Overwritten by empty response | Protect with flag |
| React 19 batching | Update order reversal | Synchronize with flushSync |

Infinite scroll is more complex than it looks. Especially when multiple data sources and SSR are involved, the edge cases to consider multiply. I hope this article helps those facing similar challenges.

Tomorrow's article will cover "Creating Excel-like Tables with No-Code."

---

**Other Articles in This Series**

- Day 14: Designing Mobile-First UX: Responsive Design in Practice
- Day 16: Creating Excel-like Tables with No-Code: Implementing Drag & Drop UI
