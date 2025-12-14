---
title: "モバイルファーストで最適なUXを考える：レスポンシブ設計の実践"
emoji: "📱"
type: "tech"
topics: ["nextjs", "tailwindcss", "responsive", "mobile"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の14日目の記事です。

昨日の記事では「Vercel最適化」について書きました。この記事では、モバイルファーストで設計するレスポンシブUIの実践について解説します。

## 🎯 なぜモバイルファーストか

SaaSにはデスクトップ前提のものもありますが、私が個人開発しているMemoreruではデスクトップでもモバイルでも快適に使えることを目指しました。移動中にスマホでメモを確認したり、PCでじっくり編集したり、シーンに応じて使い分けられるようにしたかったからです。

モバイルファーストで設計するメリットは以下の通りです。

- **制約から始める**: 小さい画面で表示を整理することで、コンパクトな設計が身につく
- **拡張しやすい**: モバイル→デスクトップへの拡張は、逆より自然
- **パフォーマンス意識**: モバイル環境を想定すると、軽量な実装を心がけるようになる

## ⚙️ ブレークポイントの設計

### Tailwindのmdブレークポイントを活用

Tailwind CSSでは`md`が768pxに対応しています。この768pxを主要な境界として、モバイルとデスクトップを切り替えています。

```tsx
// モバイル版：md未満で表示
<div className="md:hidden">
  <MobileSidebar />
  <BottomTabBar />
</div>

// デスクトップ版：md以上で表示
<div className="hidden md:block">
  <LeftSidebar />
  <TopNavigation />
</div>
```

この設計の理由は以下の通りです。

- 768pxはタブレットとスマートフォンの境界として一般的
- iPadの縦向き（768px）はデスクトップUIで表示
- 多くのユーザーが慣れているブレークポイント

### グリッドの動的調整

コンテンツの表示列数は、画面幅だけでなくサイドバーの開閉状態によっても変化します。

```tsx
const gridCols = areBothSidebarsClosed
  ? 'grid-cols-1 sm:grid-cols-5 3xl:grid-cols-7'
  : 'grid-cols-1 sm:grid-cols-4 3xl:grid-cols-6';
```

サイドバーが閉じているときは表示領域が広いので列数を増やし、開いているときは減らします。単純な画面幅だけでなく、実際の表示領域に応じて最適化しています。

## 📱 モバイル専用コンポーネント

### ボトムタブバー

モバイルでは、画面下部に固定のタブバーを配置しています。

```tsx
// BottomTabBar.tsx
<nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
  <div className="flex items-center justify-around pb-safe">
    <TabButton icon={Star} label="ブックマーク" />
    <TabButton icon={Globe} label="パブリック" />
    <TabButton icon={Users} label="チーム" />
    <TabButton icon={Lock} label="プライベート" />
  </div>
</nav>
```

ポイントは以下の通りです。

- `md:hidden`でデスクトップでは非表示
- `pb-safe`でiOSのセーフエリアに対応
- 主要な4つの機能にワンタップでアクセス可能

### スライドインドロワー

ハンバーガーメニューをタップすると、左からスライドインするドロワーが表示されます。

```tsx
// MobileSidebar.tsx
<aside className={`
  fixed left-0 top-0 z-50 h-full w-80
  transition-transform duration-300 ease-in-out
  ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  md:hidden
`}>
  {/* ナビゲーションコンテンツ */}
</aside>

{/* オーバーレイ */}
<div className={`
  fixed inset-0 z-40 bg-black
  transition-opacity duration-300
  ${isOpen ? 'opacity-50' : 'pointer-events-none opacity-0'}
`} onClick={onClose} />
```

アニメーションには`translate-x`と`transition`を組み合わせ、ネイティブアプリのような滑らかな動きを実現しています。

## 👆 タッチ操作への対応

### スワイプジェスチャー

画面左端からの右スワイプでドロワーを開く、ドロワー表示中の左スワイプで閉じる、というネイティブアプリでおなじみの操作を実装しています。

```tsx
// AppLayout.tsx
const minSwipeDistance = 50;
const leftEdgeThreshold = 150;

const handleTouchEnd = () => {
  const deltaX = touchEndX - touchStartX;
  const isRightSwipe = deltaX > minSwipeDistance;
  const isLeftSwipe = deltaX < -minSwipeDistance;
  const isFromLeftEdge = touchStartX < leftEdgeThreshold;

  // 左端からの右スワイプ: ナビゲーション開く
  if (isRightSwipe && isFromLeftEdge) {
    setIsSidebarOpen(true);
  }

  // ナビゲーション開時の左スワイプ: 閉じる
  if (isSidebarOpen && isLeftSwipe) {
    setIsSidebarOpen(false);
  }
};
```

スワイプ距離の閾値（50px）と、左端の検知範囲（150px）を適切に設定することで、意図しない操作を防ぎつつ、自然な操作感を実現しています。

### ハプティックフィードバック

タップ時に軽い振動を返すことで、操作の確実性を高めています。

```tsx
// haptic.ts
export function vibrateLight() {
  // 注意: navigator.vibrate は iOS Safari では非対応
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);  // 10msの軽いバイブレーション
  }
}

// 使用例
<button onClick={() => {
  vibrateLight();
  handleAction();
}}>
```

振動時間は10msと短く設定し、煩わしくない程度のフィードバックにしています。なお、`navigator.vibrate`はAndroidでのみ動作し、iOSでは効果がありません。

## 🔄 モバイル判定の実装

### window.innerWidthによる判定

コンポーネント内でモバイルかどうかを判定する必要がある場合は、`window.innerWidth`を使用します。

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

リサイズイベントをリッスンすることで、ウィンドウサイズの変更にも対応できます。

### Contextでのグローバル管理

複数のコンポーネントで同じ判定を使う場合は、Contextで一元管理します。

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

これにより、各コンポーネントで同じロジックを繰り返す必要がなくなります。

### Hydration対策

Next.jsのSSR（サーバーサイドレンダリング）では、サーバー側で最初にHTMLを生成します。このとき`window`オブジェクトは存在しません。その後、クライアント側でJavaScriptが実行される際（Hydration）に、サーバーとクライアントで異なる値が生成されるとエラーになります。

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

マウント後にのみインタラクティブなコンポーネントを表示することで、Hydrationのミスマッチを防いでいます。

## 📐 デバイス特性への対応

### レスポンシブ画像

Next.jsの`Image`コンポーネントでは、`sizes`属性で画面幅に応じた画像サイズを指定できます。

```tsx
<Image
  src={item.thumbnail_url}
  alt={item.title}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, 300px"
/>
```

モバイルでは画面幅いっぱい、デスクトップでは300pxの画像を読み込みます。不要に大きな画像を読み込まないことで、通信量とレンダリング時間を削減できます。

### SafeArea対応

iPhoneのノッチやホームインジケーターがある領域を避けるため、SafeAreaに対応しています。

```typescript
// tailwind.config.ts
padding: {
  'safe': 'env(safe-area-inset-bottom)',
}

// 使用例
<div className="pb-safe">
  <BottomTabBar />
</div>
```

`env(safe-area-inset-bottom)`を使うことで、デバイスごとに適切なパディングが自動的に適用されます。

## 🎉 実装の効果

モバイルファースト設計を実践した結果をまとめます。

| 項目 | Before | After |
|------|--------|-------|
| ナビゲーション | デスクトップ前提のサイドバー | ボトムタブ＋ドロワー |
| 操作感 | クリック前提 | スワイプ＋タップ対応 |
| レイアウト | 固定幅 | 画面幅に応じて動的調整 |
| 画像読み込み | 一律サイズ | デバイスに応じたサイズ |

## ✅ まとめ

モバイルファーストでレスポンシブUIを設計する実践について解説しました。

**設計のポイント:**
- `md: 768px`を境界として、モバイルとデスクトップを切り替え
- ボトムタブバーとドロワーでモバイルナビゲーションを構築
- スワイプとハプティックフィードバックでネイティブライクな操作感

**実装のポイント:**
- `md:hidden`と`hidden md:block`でデバイス別表示を制御
- Contextでモバイル判定をグローバル管理
- SafeAreaとsizes属性でデバイス特性に対応

モバイルファーストは、制約の中から本質的なUXを見つけるアプローチです。小さい画面で使いやすいUIは、大きい画面でも使いやすいUIになります。

明日は「無限スクロール × Zustand × React 19」について解説します。

---

**シリーズの他の記事**

- 12/13: Vercel最適化：ビルド時間短縮とレスポンス改善の実践
- 12/15: 無限スクロール × Zustand × React 19：非同期の落とし穴
