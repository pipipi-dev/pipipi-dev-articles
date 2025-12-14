---
title: "Designing Mobile-First UX: Responsive Design in Practice"
emoji: "📱"
type: "tech"
topics: ["nextjs", "tailwindcss", "responsive", "mobile"]
published: false
platforms:
  qiita: false
  zenn: false
  devto: true
---

This article is Day 14 of the **[Solo SaaS Development - Design, Implementation, and Operations Advent Calendar 2025](https://adventar.org/calendars/12615)**.

Yesterday's article covered "Vercel Optimization." This article explains the practical implementation of mobile-first responsive UI design.

## 🎯 Why Mobile-First?

While some SaaS products are designed primarily for desktop, for Memoreru, my indie project, I aimed to make it comfortable to use on both desktop and mobile. I wanted users to be able to check notes on their phone while commuting, or edit in depth on their PC—switching between devices based on the situation.

Here are the benefits of mobile-first design:

- **Start with constraints**: Organizing layouts for small screens develops compact design skills
- **Easier to scale up**: Expanding from mobile to desktop is more natural than the reverse
- **Performance awareness**: Designing for mobile environments encourages lightweight implementations

## ⚙️ Breakpoint Design

### Leveraging Tailwind's md Breakpoint

In Tailwind CSS, `md` corresponds to 768px. I use this 768px as the primary boundary to switch between mobile and desktop layouts.

```tsx
// Mobile version: displayed below md
<div className="md:hidden">
  <MobileSidebar />
  <BottomTabBar />
</div>

// Desktop version: displayed at md and above
<div className="hidden md:block">
  <LeftSidebar />
  <TopNavigation />
</div>
```

The reasons for this design:

- 768px is a common boundary between tablets and smartphones
- iPad in portrait orientation (768px) displays the desktop UI
- A breakpoint that most users are familiar with

### Dynamic Grid Adjustment

The number of content columns changes not only based on screen width but also on sidebar open/close state.

```tsx
const gridCols = areBothSidebarsClosed
  ? 'grid-cols-1 sm:grid-cols-5 3xl:grid-cols-7'
  : 'grid-cols-1 sm:grid-cols-4 3xl:grid-cols-6';
```

When sidebars are closed, the display area is wider, so we increase the column count; when open, we decrease it. This optimizes based on actual display area, not just screen width.

## 📱 Mobile-Specific Components

### Bottom Tab Bar

On mobile, I place a fixed tab bar at the bottom of the screen.

```tsx
// BottomTabBar.tsx
<nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
  <div className="flex items-center justify-around pb-safe">
    <TabButton icon={Star} label="Bookmarks" />
    <TabButton icon={Globe} label="Public" />
    <TabButton icon={Users} label="Team" />
    <TabButton icon={Lock} label="Private" />
  </div>
</nav>
```

Key points:

- `md:hidden` hides it on desktop
- `pb-safe` handles iOS safe areas
- One-tap access to four main features

### Slide-in Drawer

Tapping the hamburger menu displays a drawer that slides in from the left.

```tsx
// MobileSidebar.tsx
<aside className={`
  fixed left-0 top-0 z-50 h-full w-80
  transition-transform duration-300 ease-in-out
  ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  md:hidden
`}>
  {/* Navigation content */}
</aside>

{/* Overlay */}
<div className={`
  fixed inset-0 z-40 bg-black
  transition-opacity duration-300
  ${isOpen ? 'opacity-50' : 'pointer-events-none opacity-0'}
`} onClick={onClose} />
```

Combining `translate-x` with `transition` achieves smooth native app-like motion.

## 👆 Touch Interaction Support

### Swipe Gestures

I implemented native app-style interactions: swipe right from the left edge to open the drawer, swipe left while the drawer is open to close it.

```tsx
// AppLayout.tsx
const minSwipeDistance = 50;
const leftEdgeThreshold = 150;

const handleTouchEnd = () => {
  const deltaX = touchEndX - touchStartX;
  const isRightSwipe = deltaX > minSwipeDistance;
  const isLeftSwipe = deltaX < -minSwipeDistance;
  const isFromLeftEdge = touchStartX < leftEdgeThreshold;

  // Right swipe from left edge: open navigation
  if (isRightSwipe && isFromLeftEdge) {
    setIsSidebarOpen(true);
  }

  // Left swipe while navigation is open: close it
  if (isSidebarOpen && isLeftSwipe) {
    setIsSidebarOpen(false);
  }
};
```

By setting appropriate thresholds for swipe distance (50px) and left edge detection range (150px), we prevent unintended actions while maintaining natural interaction.

### Haptic Feedback

Providing light vibration on tap enhances the certainty of interaction.

```tsx
// haptic.ts
export function vibrateLight() {
  // Note: navigator.vibrate is not supported on iOS Safari
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);  // 10ms light vibration
  }
}

// Usage example
<button onClick={() => {
  vibrateLight();
  handleAction();
}}>
```

The vibration duration is set to a short 10ms to provide feedback without being annoying. Note that `navigator.vibrate` only works on Android and has no effect on iOS.

## 🔄 Mobile Detection Implementation

### Detection with window.innerWidth

When you need to determine if the device is mobile within a component, use `window.innerWidth`.

```tsx
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };

  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

By listening to resize events, we can respond to window size changes.

### Global Management with Context

When multiple components need the same detection, centralize it with Context.

```tsx
// UIStateContext.tsx
const UIStateContext = createContext<UIState | null>(null);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <UIStateContext.Provider value={{ isMobile }}>
      {children}
    </UIStateContext.Provider>
  );
}
```

This eliminates the need to repeat the same logic in each component.

### Hydration Handling

In Next.js SSR (Server-Side Rendering), HTML is first generated on the server side. At this point, the `window` object doesn't exist. When JavaScript executes on the client side afterward (Hydration), generating different values between server and client causes errors.

```tsx
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true);
}, []);

if (!isMounted) {
  return <LoadingPlaceholder />;
}

return <InteractiveComponent isMobile={isMobile} />;
```

By only displaying interactive components after mounting, we prevent Hydration mismatches.

## 📐 Device-Specific Adaptations

### Responsive Images

Next.js's `Image` component lets you specify image sizes based on screen width using the `sizes` attribute.

```tsx
<Image
  src={item.thumbnail_url}
  alt={item.title}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, 300px"
/>
```

On mobile, it loads full-width images; on desktop, 300px images. By not loading unnecessarily large images, we reduce bandwidth usage and rendering time.

### SafeArea Support

To avoid iPhone notch and home indicator areas, I've added SafeArea support.

```typescript
// tailwind.config.ts
padding: {
  'safe': 'env(safe-area-inset-bottom)',
}

// Usage example
<div className="pb-safe">
  <BottomTabBar />
</div>
```

Using `env(safe-area-inset-bottom)` automatically applies appropriate padding for each device.

## 🎉 Implementation Results

Here's a summary of the results from implementing mobile-first design:

| Item | Before | After |
|------|--------|-------|
| Navigation | Desktop-centric sidebar | Bottom tabs + drawer |
| Interaction | Click-based | Swipe + tap support |
| Layout | Fixed width | Dynamic based on screen width |
| Image loading | Uniform size | Device-appropriate sizes |

## ✅ Summary

This article covered practical mobile-first responsive UI design.

**Design Points:**
- Use `md: 768px` as the boundary to switch between mobile and desktop
- Build mobile navigation with bottom tab bar and drawer
- Achieve native-like feel with swipe and haptic feedback

**Implementation Points:**
- Control device-specific display with `md:hidden` and `hidden md:block`
- Manage mobile detection globally with Context
- Handle device characteristics with SafeArea and sizes attribute

Mobile-first is an approach to finding essential UX within constraints. A UI that's easy to use on a small screen will also be easy to use on a large screen.

Tomorrow's article will cover "Infinite Scroll with Zustand and React 19."

---

**Other Articles in This Series**

- Day 13: Vercel Optimization: Reducing Build Time and Improving Response
- Day 15: Infinite Scroll with Zustand and React 19: Async Pitfalls
