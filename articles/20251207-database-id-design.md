---
title: "データベースのID設計：ID方式の選択と主キーの考え方"
emoji: "🔑"
type: "tech"
topics: ["個人開発", "Supabase", "PostgreSQL", "データベース"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**ひとりでつくるSaaS - 設計・実装・運用の記録 Advent Calendar 2025** の7日目の記事です。

昨日の記事では「Supabaseでスキーマ設計」について書きました。この記事では、データベースのID設計について解説します。

## 🎯 ID設計で考えるべきこと

データベースの主キー（ID）選びは、意外と奥が深いテーマです。フレームワークによってはデフォルトが決まっていますが、自分で選択する場面も多くあります。なお、PostgreSQLでは連番はSERIAL型（内部的にはSEQUENCE）で実現されます。

UUIDやCUID2などのID方式は、タイムスタンプやランダム値を組み合わせることで、中央管理なしに一意なIDを生成できます。これにより、分散システムでもIDの重複を気にせずデータを作成できます。

ID設計を検討する際、以下の動画が非常に参考になりました。ID選定の判断軸が整理されており、おすすめです。

https://www.youtube.com/watch?v=pmqRaEcDxl4

この記事では、動画の内容も参考にしつつ、私が個人開発で実際にどのような判断をしたかを紹介します。

## 📊 主なID方式の比較

代表的なID方式を比較します。

| 方式 | 長さ | 時系列ソート | PostgreSQL | 特徴 |
|------|------|-------------|------------|------|
| 連番（SERIAL/SEQUENCE） | 最大19桁 | ○（実質的） | ネイティブ | シンプル、推測されやすい |
| UUID v4 | 36文字 | × | ネイティブ | 標準的、ランダム |
| UUID v7 | 36文字 | ○ | UUID型で保存可 | 時系列ソート可能 |
| ULID | 26文字 | ○ | text型 | 読みやすい文字セット |
| CUID2 | 24文字〜 | × | text型 | 短い、セキュア |
| NanoID | 21文字〜 | × | text型 | 最短、高速 |

### 選択の判断軸

1. **URLにIDを露出させるか？** → 露出させるなら連番は避ける
2. **時系列ソートが必要か？** → 必要ならUUID v7、ULID
3. **書き込みパフォーマンスが重要か？** → 大量データならシーケンシャルなID
4. **IDの短さが重要か？** → URLで使うならNanoID、CUID2

## 🔧 個人プロダクトでの採用方針

私が開発しているMemoreruでは、用途に応じてIDを使い分けています。

### 基本方針：CUID2を採用

コンテンツID（ページ、テーブル、ダッシュボードなど）にはCUID2を採用しました。

**CUID2を選んだ理由：**

- **短い**: 24文字（UUID v4は36文字）
- **URL安全**: ハイフンなし、小文字英数字のみ
- **ダブルクリックで選択可能**: ハイフンがないので全体を選択できる
- **セキュア**: SHA-3ベースで推測困難

```typescript
// id-generator.ts
import { init } from '@paralleldrive/cuid2';

// 24文字固定で初期化
const createCuid = init({ length: 24 });

export function generateContentId(): string {
  return createCuid();
}
// 例: "clhqr8x9z0001abc123def45"
```

### 例外：バルク処理が多いテーブルにはUUID v7

テーブルコンテンツの行データ（table_rows）など、大量のデータを一括挿入する可能性があるテーブルにはUUID v7を採用しました。

**UUID v7を選んだ理由：**

- **インサート性能**: 時系列順のIDはB-treeインデックスの効率が良い
- **PostgreSQLネイティブ**: UUID型として保存可能
- **RFC標準**: RFC 9562（2024年策定）に準拠

```typescript
import { v7 as uuidv7 } from 'uuid';

export function generateRowId(): string {
  return uuidv7();
}
// 例: "018c1234-5678-7abc-9def-0123456789ab"
```

### 使い分けの基準

| 用途 | ID方式 | 理由 |
|------|--------|------|
| コンテンツID | CUID2 | URLで使う、短さ重視 |
| テーブルコンテンツ行ID | UUID v7 | バルク処理、パフォーマンス重視 |
| ユーザーID | Better Authが生成 | 認証ライブラリに委任 |

## 🔑 複合主キーの設計

主キーの設計には「単一主キー」と「複合主キー」の選択もあります。

特にマルチテナントSaaS（1つのシステムで複数の顧客のデータを管理するサービス）では、複合主キーを採用することでデータの分離と検索効率を両立できます。

### 単一主キー vs 複合主キー

```sql
-- 単一主キー
CREATE TABLE contents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  ...
);

-- 複合主キー
CREATE TABLE contents (
  tenant_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  ...
  PRIMARY KEY (tenant_id, content_id)
);
```

### 複合主キーのメリット

1. **インデックス効率**: テナント内検索が高速（インデックスの先頭がtenant_id）
2. **データ分離**: テナントをまたいだデータアクセスを防止
3. **一意性の保証**: tenant_idとcontent_idの組み合わせで一意性を担保

### Drizzle ORMでの定義

```typescript
import { primaryKey, text } from 'drizzle-orm/pg-core';

export const contents = appContent.table(
  'contents',
  {
    tenant_id: text('tenant_id').notNull(),
    content_id: text('content_id').notNull(),
    title: text('title').notNull(),
    // ...
  },
  table => ({
    pk: primaryKey({ columns: [table.tenant_id, table.content_id] }),
  })
);
```

## 💡 実践Tips

### ID検証関数を用意する

不正なIDによるエラーを防ぐため、検証関数を用意しておくと便利です。

```typescript
export function validateCuid2(id: string): void {
  const cuid2Regex = /^[a-z0-9]{24}$/;
  if (!cuid2Regex.test(id)) {
    throw new Error('Invalid CUID2 format');
  }
}

export function validateUuidV7(id: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error('Invalid UUID v7 format');
  }
}
```

## ✅ まとめ

ID設計から得た学びをまとめます。

**うまくいっていること:**
- CUID2で短く扱いやすいURLを実現
- UUID v7でバルク処理のパフォーマンスを確保
- 複合主キーでマルチテナントのデータ分離を実現

**注意が必要なこと:**
- 最適なIDは要件によって異なる（唯一の正解はない）
- 既存データからの移行は慎重に計画する
- 認証ライブラリなど外部依存がある場合は、そのID形式に合わせる

動画でも結論として述べられていたように、最適なIDはプロジェクトの要件によって異なります。自分のユースケースに合わせて選ぶことが大切です。

明日は「DBマイグレーション運用術：安全に変更を重ねる方法」について解説します。

---

**シリーズの他の記事**

- 12/6: Supabaseでスキーマ設計：テーブル分割と正規化の実践
- 12/8: DBマイグレーション運用術：安全に変更を重ねる方法
