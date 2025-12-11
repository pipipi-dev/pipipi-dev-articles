---
title: "なぜMPAからSPAに移行したのか：App Routerリファクタリング実践"
emoji: "🐹"
type: "tech"
topics: ["nextjs", "AppRouter", "SPA", "zustand"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の11日目の記事です。

昨日の記事では「App Routerのディレクトリ設計」について書きました。この記事では、MPAからSPAへの移行を実践した理由と具体的な実装について解説します。

## 📝 この記事で使う用語

- **MPA（Multi Page Application）**: ページ遷移のたびにサーバーからHTMLを取得し、画面全体を再読み込みする方式
- **SPA（Single Page Application）**: 初回読み込み後はJavaScriptでページを切り替え、画面全体を再読み込みしない方式
- **クライアントサイドナビゲーション**: ブラウザ側でURLを変更し、必要なデータだけを取得してページを更新する方式

## 🎯 なぜSPAに移行したのか

App Routerを採用した当初は、Server Componentsの恩恵を最大化するため、MPA的な構成にしていました。ページ遷移のたびにサーバーでHTMLを生成し、新しいページを表示する方式です。

しかし、開発を進めるうちに以下の課題が見えてきました。

### MPA的な構成の課題

**1. ナビゲーションメニューの再読み込み**

サイドバーにナビゲーションメニューを配置していますが、ページ遷移のたびに再読み込みされていました。展開状態がリセットされたり、一瞬ちらついたりして、体験が損なわれていました。

**2. スクロール位置のリセット**

一覧画面でスクロールして詳細画面に遷移し、戻ると最初の位置に戻ってしまう。フィルタ条件もリセットされ、再度設定し直す必要がありました。

**3. 遷移時のちらつき**

ページ遷移のたびに画面全体が再描画されるため、レイアウトが一瞬崩れたり、ローディング状態が目立ったりしていました。

## 🔧 SPA移行で実現したこと

### 1. スクロール位置の復元

詳細画面から一覧に戻ったとき、元のスクロール位置を復元します。

```typescript
// useScrollRestoration.ts
const SCROLL_CACHE_KEY = 'app_scroll_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5分

export function useScrollRestoration() {
  // スクロール位置を保存
  const saveScroll = useCallback(() => {
    const cache = {
      scrollY: window.scrollY,
      pathname: window.location.pathname,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(SCROLL_CACHE_KEY, JSON.stringify(cache));
  }, []);

  // スクロール位置を復元
  const restoreScroll = useCallback(() => {
    const stored = sessionStorage.getItem(SCROLL_CACHE_KEY);
    if (!stored) return;

    const cache = JSON.parse(stored);

    // 有効期限チェック
    if (Date.now() - cache.timestamp > CACHE_EXPIRY) {
      sessionStorage.removeItem(SCROLL_CACHE_KEY);
      return;
    }

    // 同じパスなら復元
    if (cache.pathname === window.location.pathname) {
      window.scrollTo(0, cache.scrollY);
    }
  }, []);

  return { saveScroll, restoreScroll };
}
```

### 2. フィルタ状態のURL同期

フィルタやソート条件をURLパラメータに保存し、ブラウザの履歴と連携させています。ここではnuqsというライブラリを使っています。nuqsは、URLパラメータをReactの状態として扱えるライブラリです。

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
    history: 'push',   // ブラウザ履歴に追加
    shallow: true,     // サーバー再取得なし
  });
}
```

これにより、以下のようなURLが生成されます。

```
/articles?category=tech&sort=popular&search=Next.js
```

URLをコピーしてシェアすれば、同じフィルタ状態で一覧を表示できます。

## 📦 状態管理の設計

SPA化にあたり、状態管理を整理しました。

### Zustandでグローバル状態を管理

Zustandは、シンプルで軽量な状態管理ライブラリです。Reduxより設定が少なく、Providerでラップする必要もないため、手軽に導入できます。

https://zustand.docs.pmnd.rs/

一覧データやローディング状態をZustandで一元管理しています。

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
  // 記事一覧
  articles: Article[];
  setArticles: (articles: Article[]) => void;

  // ローディング状態
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

### URLを単一情報源として活用

フィルタ条件はURLパラメータを単一情報源（Single Source of Truth）としています。

```typescript
// FilterContext.tsx
export function FilterProvider({ children }: { children: ReactNode }) {
  // URLからフィルタ状態を取得（nuqs）
  const [filters, setFilters] = useListFilters();

  // 派生状態はURLから計算
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

## 🖥️ レイアウト層の工夫

SPA化で重要なのは、レイアウト層でのデータ取得を避けることです。

### Before: レイアウトでデータ取得

```tsx
// ❌ ページ遷移のたびにデータを再取得してしまう
function MainLayout({ children }: { children: ReactNode }) {
  const { data, isLoading } = useArticles();  // ここでデータ取得

  return (
    <div className="flex">
      <Sidebar articles={data} isLoading={isLoading} />
      <main>{children}</main>
    </div>
  );
}
```

### After: レイアウトはストアを参照するだけ

```tsx
// ✅ レイアウト層ではZustandの状態を参照するだけ
function MainLayout({ children }: { children: ReactNode }) {
  // Zustandから状態を取得（データ取得はしない）
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

データ取得は各ページコンポーネントで行い、結果をZustandに保存します。レイアウト層はその状態を参照するだけなので、ページ遷移時に再取得が発生しません。

## 🔀 クライアントサイドナビゲーション

Next.jsの`useRouter`を使ってクライアントサイドナビゲーションを実装しています。

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

`router.push()`を使うことで、ページ全体を再読み込みせずにURLを変更し、必要なコンポーネントだけを更新できます。

## 🎯 移行のポイント

### 1. 段階的に移行する

最初から完全なSPAを目指すのではなく、課題が顕著な画面から段階的に移行しました。

- 第1段階: ナビゲーションメニューの状態保持
- 第2段階: 一覧↔詳細のスクロール復元
- 第3段階: フィルタ条件のURL同期

### 2. SSRの恩恵は維持する

SPA化しても、初回表示はSSRで行っています。App RouterのServer Componentsを活かし、初回表示は高速に、遷移後はクライアントサイドで処理しています。

### 3. 永続化を意識する

スクロール位置、フィルタ条件、メニュー展開状態など、復元したい状態は適切に永続化します。

| 状態 | 保存先 | 理由 |
|------|--------|------|
| フィルタ条件 | URL | シェア可能、履歴連携 |
| スクロール位置 | sessionStorage | タブ内で復元 |
| メニュー展開状態 | localStorage | ユーザー設定として永続化 |
| 表示形式 | localStorage | ユーザー設定として永続化 |

## ✅ まとめ

MPAからSPAへの移行で実現したことをまとめます。

**解決した課題:**
- ナビゲーションメニューの再読み込み → Zustandで状態を保持
- スクロール位置のリセット → sessionStorageで復元
- フィルタ条件のリセット → URLパラメータで永続化
- 画面遷移時のちらつき → クライアントサイドナビゲーション

**設計のポイント:**
- Zustandでグローバル状態を管理
- URLを単一情報源として活用
- レイアウト層でのデータ取得を避ける
- SSRの恩恵は維持する

App Routerを使いながらSPA的な体験を実現することで、Server Componentsの恩恵とクライアントサイドの快適さを両立できました。

明日は「Next.js Route HandlerからHonoへ」について解説します。

---

**シリーズの他の記事**

- 12/10: App Routerのディレクトリ設計：Next.jsプロジェクトの構成術
- 12/12: Next.js Route HandlerからHonoへ：API設計が楽になった理由
