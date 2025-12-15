---
title: "無限スクロール × Zustand × React 19：非同期の落とし穴"
emoji: "🌀"
type: "tech"
topics: ["react", "zustand", "nextjs", "typescript"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の15日目の記事です。

昨日の記事では「モバイルファースト設計」について書きました。この記事では、無限スクロールをZustandとReact 19で実装する際に遭遇した落とし穴と、その解決策について解説します。

## 🎯 無限スクロールとは

無限スクロールは、ユーザーがページの下部に近づくと自動的に次のコンテンツを読み込む仕組みです。TwitterやInstagramでおなじみのUIパターンですね。

従来のページネーション（「次へ」ボタンを押す方式）と比べて、ユーザー体験がシームレスになるメリットがあります。一方で、実装には思わぬ落とし穴が潜んでいます。

私が個人開発しているMemoreruでは、以下のような要件がありました。

- 3つのスコープ（パブリック、チーム、プライベート）とブックマーク表示を切り替え可能
- 各表示で独立したページネーション状態を保持
- SSRで初期データを表示し、クライアントで追加読み込み

一見シンプルですが、実際に作ってみると様々な問題に直面しました。この記事では、その経験を共有します。

## ⚙️ 使用したライブラリと構成

### スクロール検出はライブラリに任せる

無限スクロールの実装には`react-infinite-scroll-component`というライブラリを使いました。スクロール位置の検出やローディング状態の管理を自動化してくれます。

```tsx
<InfiniteScroll
  dataLength={items.length}    // 現在のアイテム数
  next={loadMore}              // 次を読み込む関数
  hasMore={hasMore}            // まだデータがあるか
  loader={<LoadingSpinner />}  // 読み込み中の表示
  scrollThreshold={0.6}        // 60%スクロールで発火
>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</InfiniteScroll>
```

IntersectionObserverを自前で実装する方法もありますが、スクロールコンテナの判定やエッジケースの処理が意外と面倒です。実績のあるライブラリに任せることで、本質的な機能開発に集中できます。

`scrollThreshold`は「画面の何%をスクロールしたら次を読み込むか」を指定します。0.6（60%）くらいに設定すると、ユーザーが下に到達する前に読み込みが始まり、待ち時間を感じにくくなります。

### Zustandで複数スコープを管理

状態管理にはZustandを採用しました。各表示（3つのスコープ＋ブックマーク）それぞれに「アイテム一覧」「現在のページ」「まだデータがあるか」「読み込み中か」を保持する必要があります。

```tsx
interface ContentStore {
  // 各スコープのアイテム
  publicItems: ContentItem[];
  privateItems: ContentItem[];
  teamItems: ContentItem[];
  bookmarkItems: ContentItem[];

  // ページネーション状態（スコープごと）
  pagination: {
    public: { page: number; hasMore: boolean };
    private: { page: number; hasMore: boolean };
    team: { page: number; hasMore: boolean };
    bookmarks: { page: number; hasMore: boolean };
  };

  // ローディング状態（スコープごと）
  loadingState: {
    public: boolean;
    private: boolean;
    team: boolean;
    bookmarks: boolean;
  };
}
```

Zustandを選んだ理由は、Reduxより軽量でボイラープレートが少なく、かつReact Contextより柔軟に状態を分割できるからです。タブを切り替えても各スコープの状態が保持されるので、ユーザーが戻ってきたときに再読み込みが不要になります。

## 🚨 落とし穴1：同じデータが2回表示される

### 発生した原因

最初に遭遇した問題は、スクロールしていると同じアイテムが重複して表示されることでした。

原因を調べると、APIのレスポンスに既に取得済みのアイテムが含まれていました。これは、ページネーションのオフセット計算中にデータが追加・削除された場合に起こりえます。

例えば、1ページ目を取得した後に新しいアイテムが追加されると、2ページ目の先頭には1ページ目の最後のアイテムが含まれてしまいます。

### 解決策：IDで重複チェック

対策として、アイテムを追加する前にIDベースで重複をフィルタリングするようにしました。

```tsx
const loadMoreItems = useCallback(async () => {
  const newItems = await fetchNextPage();

  setItems(prev => {
    // 既存のIDをSetで管理
    const existingIds = new Set(prev.map(item => item.id));
    // 重複を除外して追加
    const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
    return [...prev, ...uniqueNewItems];
  });
}, []);
```

ポイントは`Set`を使うことです。配列の`includes`メソッドは要素数に比例して遅くなりますが、Setの`has`メソッドはほぼ一定時間で検索できます。数百件のアイテムを扱う無限スクロールでは、この差が効いてきます。

## 🚨 落とし穴2：データの順番がおかしくなる

### 発生した原因

次に遭遇したのは、素早くスクロールするとデータの順番がおかしくなる問題でした。

これはレース条件（Race Condition）と呼ばれる現象です。ネットワークリクエストは発行した順番で完了するとは限りません。

```
1ページ目のリクエスト開始
↓
2ページ目のリクエスト開始（スクロールが速い）
↓
2ページ目のレスポンス到着（先に完了）
↓
1ページ目のレスポンス到着（後から完了）
```

この場合、2ページ目のデータの後に1ページ目のデータが追加されてしまいます。

### 解決策：Refで読み込み中を追跡

Reactの状態（useState）は非同期で更新されるため、「今読み込み中か」を正確に判定できません。そこで、同期的に参照できるRefを使います。

```tsx
const loadingRef = useRef<boolean>(false);

const loadMore = useCallback(async () => {
  // 読み込み中なら何もしない
  if (loadingRef.current) return;
  loadingRef.current = true;

  try {
    const newItems = await fetchNextPage();
    // データの処理...
  } finally {
    loadingRef.current = false;
  }
}, []);
```

useStateの`loading`状態も画面表示には必要ですが、「リクエストを発行していいか」の判定にはRefを使うのがポイントです。Refは同期的に値が更新されるので、連続したスクロールイベントでも確実に重複リクエストを防げます。

## 🚨 落とし穴3：SSRのデータが消える

### 発生した原因

Next.jsのSSRで初期データを取得していたのですが、クライアント側でハイドレーションが完了した後、なぜかデータが消えることがありました。

調査すると、クライアント側のAPIリクエストが空のレスポンスを返し、SSRで取得した10件のデータを0件で上書きしていました。

これは、SSRとクライアントで異なるAPI条件（認証状態、フィルター条件など）でリクエストした場合に起こりえます。

### 解決策：SSRデータを保護する

SSRデータが読み込まれたかどうかのフラグを管理し、「SSRデータが存在する」かつ「APIが空レスポンス」の場合は上書きをスキップします。

```tsx
const fetchData = useCallback(async () => {
  const items = await fetch(apiUrl).then(res => res.json());

  // SSRデータが存在し、APIが空レスポンスの場合は上書きしない
  if (store.isSSRDataLoaded && store.items.length > 0 && items.length === 0) {
    console.warn('SSRデータの上書きをブロックしました');
    return;
  }

  updateStore(items);
}, []);
```

本来はSSRとクライアントで同じ条件でAPIを叩くべきですが、認証状態の同期など難しい部分もあります。防御的なコードを入れておくと安心です。

## ⚛️ React 19での注意点

ここまでの3つは無限スクロール全般で起こりうる問題ですが、React 19特有の注意点もあります。

React 19では、状態更新がより積極的にバッチ処理されるようになりました。通常はパフォーマンス向上に寄与しますが、ZustandとReactの状態を連携させる場合に思わぬ問題が起きることがあります。

Reactのローカル状態を更新した直後にZustandのストアを更新すると、バッチ処理によって順序が入れ替わる可能性があります。この場合、`react-dom`の`flushSync`で同期的に実行します。

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

  // この時点でsetLocalStateは確実に完了している
  updateZustandStore(mergedItems);
}, []);
```

`flushSync`は乱用すべきではありませんが、複数の状態ストアを厳密に同期させる必要がある場合には有効です。

## 📊 パフォーマンスの工夫

### useShallowで再レンダリングを抑制

Zustandのストアから複数の値を取得する場合、関係ない値の変更でも再レンダリングが発生します。`useShallow`を使うと、指定したプロパティの変更のみで再レンダリングされます。

```tsx
import { useShallow } from 'zustand/react/shallow';

// Bad: publicItemsが変わるとpaginationも再計算される
const store = useContentStore();

// Good: 必要なプロパティのみを購読
const { items, hasMore } = useContentStore(
  useShallow(state => ({
    items: state.publicItems,
    hasMore: state.pagination.public.hasMore,
  }))
);
```

無限スクロールでは大量のアイテムを扱うため、不要な再レンダリングの抑制は重要です。

### 画面を埋めるまで自動ロード

初期表示でスクロールバーが表示されない場合、ユーザーはスクロールできず、次のページが読み込まれません。これは画面が大きいモニターや、アイテムの高さが小さい場合に起こります。

ResizeObserverを使って、画面を埋めるまで自動的にロードを続ける仕組みを入れました。

```tsx
useEffect(() => {
  const checkScrollbar = () => {
    const hasScrollbar =
      document.documentElement.scrollHeight > window.innerHeight;

    // スクロールバーがなく、まだデータがあれば読み込み
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

サイドバーの開閉などでレイアウトが変わった場合も、ResizeObserverが検知して追加ロードを行います。

## 🔧 カスタムフックにまとめる

これらの処理をまとめた`usePagination`フックを作成しました。各画面で同じロジックを使い回せます。

```tsx
export function usePagination({ items, scope, loadMoreData, pagination }) {
  const loadedItems = items || [];
  const hasMore = pagination?.hasMore || false;

  const loadMore = useCallback(() => {
    if (!loadMoreData || !hasMore) return;
    loadMoreData(scope);
  }, [loadMoreData, scope, hasMore]);

  // 画面を埋める自動ロード（上記のuseEffect）
  // ...

  return { loadedItems, hasMore, loadMore };
}
```

## ✅ まとめ

無限スクロールをZustandとReact 19で実装する際の落とし穴と解決策を解説しました。

| 問題 | 原因 | 解決策 |
|------|------|--------|
| 重複データ | ページネーションのずれ | Setでフィルタリング |
| 順番の乱れ | レース条件 | Refで読み込み中を追跡 |
| SSRデータ消失 | 空レスポンスで上書き | フラグで保護 |
| React 19のバッチ処理 | 更新順序の入れ替わり | flushSyncで同期化 |

無限スクロールは見た目以上に複雑な機能です。特に複数のデータソースやSSRが絡むと、考慮すべきエッジケースが増えます。この記事が同じような課題に直面している方の参考になれば幸いです。

明日は「ノーコードでExcelライクなテーブル作成」について解説します。

---

**シリーズの他の記事**

- 12/14: モバイルファーストで最適なUXを考える：レスポンシブ設計の実践
- 12/16: ノーコードでExcelライクなテーブル作成：ドラッグ＆ドロップUIの実装
