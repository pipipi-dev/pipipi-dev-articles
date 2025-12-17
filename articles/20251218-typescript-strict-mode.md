---
title: "TypeScript厳密モードで発見したバグ：型安全性の実践"
emoji: "🐛"
type: "tech"
topics: ["typescript", "nextjs", "react", "biome"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の18日目の記事です。

昨日の記事では「セマンティック検索」について書きました。今日は、TypeScriptの厳密モードを既存プロジェクトに導入した経験を共有します。

## 🎯 なぜ厳密モードを導入したか

TypeScriptを使っていても、実行時エラーは起きます。

```
Cannot read property 'name' of null
undefined is not a function
```

こうしたエラーが増えてきたとき、原因を調べると共通点がありました。**型チェックが甘い箇所**で起きています。

TypeScriptはデフォルトで緩い設定になっています。厳密モードを有効にしないと、多くの問題を見逃します。

## ⚙️ 有効にしたオプション

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

### noImplicitAny

型を書かない引数は、暗黙的に`any`型になります。`any`型はどんな操作も許可するため、型チェックが機能しません。

```typescript
// noImplicitAny: false の場合
function double(value) {  // valueはany型
  return value * 2;
}

double("hello");  // コンパイルは通るが、結果はNaN
```

`noImplicitAny: true`にすると、型を書いていない引数がエラーになります。「型を書き忘れている箇所」がすぐに分かります。

### strictNullChecks

このオプションがないと、すべての型に`null`と`undefined`が暗黙的に含まれます。

```typescript
// strictNullChecks: false の場合
const user: User = getUser();  // nullが返る可能性
console.log(user.name);  // 実行時にクラッシュする可能性
```

`strictNullChecks: true`にすると、nullを返す可能性がある関数は`User | null`のように明示する必要があります。nullチェックを書かないとコンパイルエラーになるため、チェック漏れを防げます。

### 2つのオプションの効果

| オプション | 防げるエラー |
|-----------|-------------|
| `noImplicitAny` | 型が不明なまま操作してクラッシュ |
| `strictNullChecks` | null/undefinedアクセスでクラッシュ |

未使用変数のチェック（`noUnusedLocals`）はBiomeに任せました。TypeScriptは`_`プレフィックスの変数を認識しないため、分割代入で一部だけ使いたい場合に困るからです。

## 🔍 TypeScriptとBiomeの役割分担

[Biome](https://biomejs.dev/)はリンター（コード品質チェック）とフォーマッター（コード整形）を兼ねたツールです。[ESLint](https://eslint.org/)より高速で設定がシンプルなため採用しました。

チェック項目によって、TypeScriptとBiomeを使い分けています。

| チェック項目 | 担当 | 理由 |
|-------------|------|------|
| 型の整合性 | TypeScript | 型システムの本領 |
| null安全性 | TypeScript | 型レベルで検出可能 |
| 未使用変数 | Biome | `_`プレフィックス対応 |
| any型の使用 | Biome | biome-ignoreで例外管理しやすい |
| コードスタイル | Biome | フォーマットと一緒に管理 |

Biomeの設定例です。

```json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedVariables": "warn",
        "noUnusedImports": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noDoubleEquals": "error"
      }
    }
  }
}
```

`noExplicitAny`をerrorにすることで、any型の使用を厳しく制限しています。どうしても必要な場合は理由をコメントで残します。

## 🐛 厳密モードで防げるバグ

厳密モードで検出できる典型的なバグパターンを紹介します。

### 1. nullチェック漏れ

最も多いのは、nullチェックの漏れです。

```typescript
// 問題のコード
function getUserName(user: User | null) {
  return user.name; // userがnullの可能性
}
```

`strictNullChecks`を有効にすると、コンパイル時にエラーになります。

```typescript
// 修正後
function getUserName(user: User | null) {
  return user?.name ?? '名無し';
}
```

特に**リレーション先のデータ**で起きやすいパターンです。ユーザーが削除されると、関連データの`creator`がnullになります。これを考慮していないコードは実行時にクラッシュします。

### 2. オプショナルプロパティの扱い

APIレスポンスのオプショナルプロパティも見落としやすいパターンです。

```typescript
interface ApiResponse {
  data: {
    items: Item[];
    nextCursor?: string; // オプショナル
  };
}

// 問題のコード
function getNextPage(response: ApiResponse) {
  return fetch(`/api?cursor=${response.data.nextCursor}`);
  // nextCursorがundefinedだと "?cursor=undefined" になる
}
```

```typescript
// 修正後
function getNextPage(response: ApiResponse) {
  if (!response.data.nextCursor) return null;
  return fetch(`/api?cursor=${response.data.nextCursor}`);
}
```

### 3. 型定義とスキーマの不整合

リファクタリング時に起きやすいのが、型定義の更新漏れです。

```typescript
// DBスキーマを変更した
// column_name → field_name

// 型定義の更新を忘れた
interface Column {
  column_name: string; // 古い名前のまま
}
```

厳密モードなら、この型を使っている箇所すべてでエラーになります。IDE上で赤線が出るので、修正漏れに気づけます。

## 💻 IDEでの恩恵

厳密モードを有効にすると、VS Codeなどのエディタで即座に恩恵を受けられます。

### エラーがリアルタイムで分かる

問題のあるコードを書くと、エディタ上で赤い波線が表示されます。実行する前に問題に気づけるため、デバッグの時間が大幅に減ります。

### 補完が正確になる

型が明確になると、プロパティやメソッドの補完候補が正確になります。`user.`と入力したときに、`name`や`email`といった実際に存在するプロパティだけが候補に出ます。

### リファクタリングが安全になる

型定義を変更すると、影響を受けるすべての箇所にエラーが出ます。「どこを直せばいいか」を手動で探す必要がありません。

```typescript
// User型からemailを削除した場合
interface User {
  id: string;
  name: string;
  // email: string;  削除
}

// user.emailを使っている箇所すべてにエラーが出る
```

修正漏れがあればコンパイルエラーになるため、安心してコードを変更できます。

## 🚫 エラーの混入を防ぐ

エラーを修正しても、新しいコードでまた増えては意味がありません。

[Husky](https://typicode.github.io/husky/)はgitのフック（コミットやプッシュ時に自動実行されるスクリプト）を管理するツールです。pre-commitフックを設定し、コミット前に型チェックを実行するようにしました。

```bash
#!/bin/sh
# .husky/pre-commit

echo "Running type check..."
bun run type-check

if [ $? -ne 0 ]; then
  echo "TypeScript errors found. Please fix before committing."
  exit 1
fi
```

```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

TypeScriptエラーがあるとコミットが中止されます。「後で直す」が許されないので、エラーがたまりません。

## 📈 段階的な導入のコツ

既存プロジェクトに厳密モードを導入するコツをまとめます。

### 1. 少しずつ進める

大量のエラーを一気に直そうとすると心が折れます。機能開発のついでに周辺のエラーを数件ずつ直すか、新規ファイルだけ先に厳密にして徐々に置き換えていくスタイルが続けやすいです。

### 2. any型は理由を残す

どうしてもany型が必要な場合は、理由をコメントで残します。後で型定義が改善されたときに見直せます。

```typescript
// TODO: ライブラリv3で型定義が改善予定
// biome-ignore lint/suspicious/noExplicitAny: 一時的な対応
const result = someLibrary.parse(data) as any;
```

### 3. Zodで外部データを検証

[Zod](https://zod.dev/)はランタイムでデータを検証するライブラリです。スキーマを定義すると、TypeScriptの型も自動生成されます。

APIレスポンスやフォーム入力など、外部からのデータはZodで検証します。型定義とバリデーションを一箇所で管理できます。

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

// ランタイムで検証
const user = UserSchema.parse(apiResponse);
```

## ✅ まとめ

TypeScript厳密モードを既存プロジェクトに導入する際のポイントです。

| ポイント | 内容 |
|---------|------|
| 個別に有効化 | `strict: true`ではなく、効果の高いオプションだけ選ぶ |
| 役割分担 | TypeScriptとBiomeで担当を分ける |
| 段階的に修正 | 一度に全部やらず、少しずつ進める |
| 混入を防ぐ | pre-commitフックで型チェックを必須に |

本来はプロジェクト開始時から有効にしておくべき設定です。後から導入すると修正コストがかかるので、新規プロジェクトでは最初から厳密モードを有効にすることをおすすめします。

明日は「個人開発のセキュリティ対策」について解説します。

---

**シリーズの他の記事**

- 12/17: 「意味で検索」を実装する：pgvector + OpenAI Embeddings入門
- 12/19: 個人開発のセキュリティ対策：最低限やるべきこと
