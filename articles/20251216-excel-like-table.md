---
title: "ノーコードでExcelライクなテーブル作成：ドラッグ＆ドロップUIの実装"
emoji: "🧩"
type: "tech"
topics: ["react", "typescript", "dndkit", "nextjs"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の16日目の記事です。

昨日の記事では「無限スクロールの落とし穴」について書きました。今日は、ドラッグ＆ドロップでカラムを並び替えられるExcelライクなテーブルUIの実装について解説します。

## 🎯 実現したい機能

NotionやAirtableのような、ユーザーが自由にカラムを操作できるテーブルを作ります。

- セルをクリックして直接編集（インライン編集）
- ドラッグ＆ドロップでカラムの順序を変更
- テーブル内の行を並び替え
- カラム幅のリサイズ

非エンジニアでも直感的に使えることを目指しました。この記事では、これらを実現するための設計判断と実装パターンを紹介します。

## ⚙️ ライブラリ選定

### テーブル基盤：react-spreadsheet

テーブルUIのライブラリはいくつか選択肢があります。

| ライブラリ | 特徴 |
|-----------|------|
| AG Grid | 高機能・大規模向け・商用ライセンスあり |
| TanStack Table | ヘッドレス・自由度高い・UI構築が必要 |
| react-spreadsheet | 軽量・Excel風・カスタマイズ容易 |

今回は[react-spreadsheet](https://github.com/iddan/react-spreadsheet)を採用しました。決め手は**DataEditor/DataViewerパターン**です。セルの「表示」と「編集」を別コンポーネントで定義でき、データ型ごとに異なるUIを実装しやすい設計になっています。

AG Gridは高機能ですが、カスタムセルエディタの実装がやや複雑でした。TanStack Tableはヘッドレスなので自由度は高いですが、UIを一から構築する必要があります。react-spreadsheetは「ちょうどいい」バランスでした。

### ドラッグ＆ドロップ：dnd-kit

ドラッグ＆ドロップには[@dnd-kit](https://github.com/clauderic/dnd-kit)を使いました。

react-beautiful-dndも有名ですが、メンテナンスが停滞気味です。dnd-kitはReact 18のConcurrent Modeに対応しており、TypeScriptの型定義も充実しています。アクセシビリティ（キーボード操作）のサポートも組み込まれているため、将来的な拡張も見据えて選定しました。

## ✏️ インライン編集の設計

### なぜインライン編集が必要か

従来の「編集ボタンを押してモーダルを開く」UIは、1件ずつの編集には適していますが、複数のセルを連続して編集する場合はストレスになります。Excelのように「セルをクリックしてその場で編集」できれば、ユーザーの操作効率は大きく向上します。

### DataEditor/DataViewerパターン

react-spreadsheetでは、各セルに「表示用」と「編集用」のコンポーネントを割り当てます。

```tsx
// 表示用：セルをクリックする前の状態
const TextViewer: DataViewerComponent<TextCell> = ({ cell }) => {
  return <span className="px-2">{cell?.value ?? ''}</span>;
};

// 編集用：セルをクリックした後の状態
const TextEditor: DataEditorComponent<TextCell> = ({ cell, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 編集モードに入ったら自動でフォーカス＆全選択
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={cell?.value ?? ''}
      onChange={(e) => onChange({ ...cell, value: e.target.value })}
    />
  );
};
```

このパターンの利点は、データ型ごとに最適なUIを提供できることです。テキストなら入力欄、日付ならカレンダーピッカー、選択肢ならドロップダウンと、それぞれに適したエディタを実装できます。

### ドロップダウンの注意点

ドロップダウン（セレクトボックス）を実装する際、よくある問題があります。メニューがテーブルの`overflow: hidden`に隠れてしまうのです。

解決策は、メニューをbodyに直接描画することです。

```tsx
<Select
  menuPortalTarget={document.body}
  styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
  // ...
/>
```

`menuPortalTarget={document.body}`を指定すると、メニューがテーブルのDOM階層から外れ、他の要素に隠れなくなります。

## 🐧 カラム順序の並び替え

### 設計画面での並び替え

テーブルのカラム順序は、設計画面（フィールドデザイナー）で変更できるようにしました。ここではdnd-kitを使っています。

実装のポイントは**誤操作の防止**です。

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
);
```

`distance: 8`を指定すると、8ピクセル以上ドラッグしないとドラッグが開始されません。これがないと、クリックしただけでドラッグが始まり、意図しない並び替えが発生してしまいます。

もう一つのポイントは**ドラッグハンドルの限定**です。

```tsx
<div ref={setNodeRef} style={style} {...attributes}>
  {/* listenersはハンドルにのみ適用 */}
  <button {...listeners} className="cursor-grab">
    <GripVertical />
  </button>
  <span>{item.name}</span>
  <button onClick={onEdit}>編集</button>
</div>
```

`listeners`をドラッグハンドル（グリップアイコン）にのみ適用することで、「編集」ボタンなど他の要素をクリックしてもドラッグが始まりません。アイテム全体をドラッグ可能にすると、他の操作と競合しやすくなります。

## 🐰 テーブル行の並び替え

### 楽観的UI更新

テーブル内の行もドラッグで並び替えられるようにしました。ここで重要なのは**楽観的UI更新**です。

```tsx
const handleDrop = async (targetIndex: number) => {
  // 1. まず画面を即座に更新（楽観的更新）
  const reordered = [...localRows];
  const [dragged] = reordered.splice(draggedIndex, 1);
  reordered.splice(targetIndex, 0, dragged);
  setLocalRows(reordered);

  // 2. その後サーバーに保存
  await saveReorder(reordered);
};
```

ドラッグ完了と同時に画面上の順序が変わり、サーバーへの保存はバックグラウンドで行います。ユーザーは待たされることなく、次の操作に移れます。

### 未保存状態の警告

並び替えた後、保存せずにページを離れようとした場合は警告を表示します。

```tsx
useEffect(() => {
  if (!hasUnsavedChanges) return;

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '変更が保存されていません';
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

これにより、うっかりページを閉じてしまっても、データの損失を防げます。

## 🐙 カラム幅のリサイズ

### localStorageで永続化

ユーザーが調整したカラム幅は、次回アクセス時も反映されたほうが使いやすいと考えました。サーバーに保存する方法もありますが、カラム幅はユーザーの好みであり、頻繁に変更されるものなので、localStorageに保存しました。

```tsx
const useColumnWidths = (tableId: string) => {
  const storageKey = `table_widths_${tableId}`;

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });

  // 幅が変わるたびにlocalStorageを更新
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(widths));
  }, [widths, storageKey]);

  return { widths, setWidths };
};
```

テーブルごとに異なるキーで保存することで、複数のテーブルを使い分けても設定が混ざりません。

### 最小幅の制限

リサイズ時は最小幅を設定しておくと、カラムが潰れて見えなくなる問題を防げます。

```tsx
const handleResize = (columnId: string, newWidth: number) => {
  const clampedWidth = Math.max(50, newWidth); // 最小50px
  setWidths(prev => ({ ...prev, [columnId]: clampedWidth }));
};
```

## ✅ まとめ

ExcelライクなテーブルUIを実装する際のポイントをまとめました。

| 課題 | 解決策 |
|------|--------|
| データ型ごとに異なる編集UI | DataEditor/DataViewerパターン |
| ドロップダウンが隠れる | menuPortalTarget={document.body} |
| クリックでドラッグが誤発動 | activationConstraint: { distance: 8 } |
| 他のボタンとドラッグの競合 | ドラッグハンドルにlistenersを限定 |
| 並び替え中の待ち時間 | 楽観的UI更新 |
| 未保存での離脱 | beforeunloadで警告 |
| カラム幅の永続化 | localStorage |

ノーコードツールのUIは、「動く」だけでなく「迷わず使える」ことが重要です。誤操作の防止、即座のフィードバック、状態の保持など、細部の積み重ねがユーザー体験を決めます。

明日は「pgvector + OpenAI Embeddingsで意味検索を実装する」について解説します。

---

**シリーズの他の記事**

- 12/15: 無限スクロール × Zustand × React 19：非同期の落とし穴
- 12/17: 「意味で検索」を実装する：pgvector + OpenAI Embeddings入門
