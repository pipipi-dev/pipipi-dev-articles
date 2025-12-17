---
title: "「意味で検索」を実装する：pgvector + OpenAI Embeddings入門"
emoji: "🔮"
type: "tech"
topics: ["postgresql", "openai", "typescript", "nextjs"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の17日目の記事です。

昨日の記事では「ExcelライクなテーブルUI」について書きました。今日は、キーワードではなく「意味」で検索するセマンティック検索の実装について解説します。

## 🎯 セマンティック検索とは

従来のキーワード検索は、検索語と完全一致（または部分一致）するドキュメントを探します。「鶏肉 レシピ」で検索すると、その文字列を含むドキュメントだけがヒットします。

セマンティック検索は違います。「簡単に作れる晩ごはん」で検索すると、「時短レシピ」や「作り置きおかず」といった、キーワードは含まないが意味的に関連するドキュメントも見つかります。

これを実現するのが**ベクトル検索**です。

### ベクトルとは

ベクトルとは、簡単に言えば「数値の配列」です。

```
"時短レシピ" → [0.023, -0.041, 0.018, ..., 0.056]
```

イメージしやすいように、地図で例えてみます。東京駅の位置は「緯度35.68、経度139.76」という2つの数値で表せます。この数値を見れば、品川駅（35.63, 139.74）より横浜駅（35.46, 139.62）のほうが「遠い」とわかります。

ベクトル検索はこれと同じ考え方です。テキストを「意味の空間における座標」に変換します。似た意味のテキストは近い座標になるので、数値を比較するだけで「意味が近い」と判定できます。

このテキストから座標への変換を「埋め込み（Embedding）」と呼びます。たとえば「時短レシピ」と「簡単に作れる料理」は、人間が見れば同じ意味だとわかります。埋め込みを使うと、これらは近い座標に変換され、コンピュータでも「意味が近い」と判定できるようになります。

## ⚙️ 技術スタックとセットアップ

| 役割 | 技術 |
|------|------|
| ベクトル生成 | OpenAI Embeddings API |
| ベクトル保存・検索 | PostgreSQL + pgvector |
| ORM | Drizzle ORM |

ベクトルデータベースには専用サービス（Pinecone、Weaviate等）もありますが、pgvectorを選びました。既存のPostgreSQLに追加でき、SQLで扱え、Supabaseでも使えるためです。

### pgvectorの有効化

Supabaseならダッシュボードから、または以下のSQLで有効化できます。

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### テーブル設計

ベクトルを保存するテーブルを作成します。

```sql
CREATE TABLE search_vectors (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,        -- どのコンテンツのベクトルか
  text_content TEXT NOT NULL,      -- 元のテキスト
  embedding vector(1536) NOT NULL  -- ベクトル（1536個の数値）
);
```

`vector(1536)`はベクトルを格納する列です。OpenAIのモデルが出力する数値の個数に合わせています。

## 🔧 実装

### ベクトルの生成

テキストをベクトルに変換するには、OpenAIのEmbeddings APIを使います。

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });

  return response.data[0].embedding;
}
```

テキストを渡すと、数値の配列が返ってきます。この配列がテキストの「意味」を表しています。

### 長文の分割

ブログ記事のような長いテキストは、そのまま埋め込むと問題があります。APIには一度に処理できる文字数に上限があり、長いテキストを1つのベクトルにすると検索精度が落ちます。

そこで、長いテキストは「段落」や「一定の文字数」で分割してから埋め込みます。

```typescript
function chunkText(text: string, chunkSize = 500): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}
```

分割することで「この記事の○○について書かれた部分」のように、ピンポイントで検索できるようになります。

### ベクトルの保存

生成したベクトルはデータベースに保存します。コンテンツを登録・更新するタイミングで、テキストをベクトル化して保存しておきます。

```typescript
async function saveEmbedding(contentId: string, text: string) {
  const embedding = await generateEmbedding(text);
  const vectorString = `[${embedding.join(',')}]`;

  await db.execute(sql`
    INSERT INTO search_vectors (id, content_id, text_content, embedding)
    VALUES (${crypto.randomUUID()}, ${contentId}, ${text}, ${vectorString}::vector)
  `);
}
```

コンテンツが更新されたら、古いベクトルを削除してから新しいベクトルを保存します。

```typescript
async function updateEmbeddings(contentId: string, chunks: string[]) {
  // 既存のベクトルを削除
  await db.execute(sql`
    DELETE FROM search_vectors WHERE content_id = ${contentId}
  `);

  // 新しいベクトルを保存
  for (const chunk of chunks) {
    await saveEmbedding(contentId, chunk);
  }
}
```

### 類似検索

検索の流れはシンプルです。ユーザーの検索キーワードをベクトルに変換し、データベースに保存されているベクトルと比較して、似ているものを上位から返します。

```typescript
async function searchSimilar(queryText: string, limit = 10) {
  const queryVector = await generateEmbedding(queryText);
  const vectorString = `[${queryVector.join(',')}]`;

  const results = await db.execute(sql`
    SELECT content_id, text_content
    FROM search_vectors
    ORDER BY embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `);

  return results;
}
```

`<=>`がpgvectorの「近さを比較する演算子」です。これだけで、意味の近いドキュメントが見つかります。

### 全体の流れ

**事前準備（コンテンツ登録時）**

1. テキストをOpenAI APIに送信
2. 返ってきたベクトルをDBに保存

**検索時**

1. 検索ワードをOpenAI APIでベクトル化
2. DBのベクトルと比較し、近いものを返す

つまり、「テキスト→ベクトル」の変換を事前に済ませておき、検索時はベクトル同士を比較するだけです。だから高速に「意味で検索」ができます。

## 🎨 精度を上げる工夫

### タイトルと本文を別々に埋め込む

記事全体を1つのベクトルにするより、「タイトル」「本文の各段落」のように分けて埋め込むと精度が上がります。ユーザーは「タイトルっぽいキーワード」で検索することが多いため、タイトルだけのベクトルがあれば、短い検索キーワードでもマッチしやすくなります。

### キーワード検索と組み合わせる

セマンティック検索は万能ではありません。「Next.js 15」のようなバージョン番号や、「Supabase」のようなサービス名は、意味ではなく文字列そのもので検索したい場面があります。

従来のキーワード検索とセマンティック検索を両方使う「ハイブリッド検索」が有効です。

- **セマンティック検索**: 「認証機能の作り方」→ ログイン関連の記事がヒット
- **キーワード検索**: 「Supabase」→ その単語を含む記事がヒット

両方の結果を合わせることで、取りこぼしを減らせます。

### インデックスで高速化

データ量が増えてくると、毎回すべてのベクトルと比較するのは遅くなります。pgvectorではベクトル用のインデックスを追加することで検索を高速化できます。

数千件を超えたら検索速度を計測し、遅くなってきたらインデックスを追加します。最初から追加しても問題ありませんが、データが少ないうちは効果が薄いです。

## 💰 コストについて

Embeddings APIのコストは非常に安価です。

| 処理 | コスト目安 |
|------|-----------|
| 1000文字を埋め込む | 約0.003円 |
| 1万件の記事を埋め込む | 数百円程度 |

ChatGPTのAPIとは異なり、Embeddings APIは単純な数値変換のためコストが低く抑えられています。個人開発でも導入しやすい価格帯です。

## ✅ まとめ

セマンティック検索の実装ポイントをまとめます。

| 課題 | 解決策 |
|------|--------|
| テキストを数値化 | OpenAI Embeddings API |
| ベクトルの保存と検索 | PostgreSQL + pgvector |
| 長文の処理 | 分割してから埋め込む |
| 検索精度の向上 | タイトル・本文を別々に埋め込む |
| パフォーマンス | インデックスを追加 |

「意味で検索」ができると、ユーザーはキーワードを正確に覚えていなくても、関連するドキュメントを見つけられるようになります。情報量が増えるほど、この体験の価値は高まります。

明日は「TypeScript厳密モードで発見したバグ」について解説します。

---

**シリーズの他の記事**

- 12/16: ノーコードでExcelライクなテーブル作成：ドラッグ＆ドロップUIの実装
- 12/18: TypeScript厳密モードで発見したバグ：型安全性の実践
