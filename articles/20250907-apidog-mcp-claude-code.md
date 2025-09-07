---
title: "Apidog MCP × Claude Code でAPI開発を効率化する実践ガイド"
emoji: "⚡"
type: "tech"
topics: ["apidog", "mcp", "claudecode", "api"]
published: true
platforms:
  qiita: true
  devto: false
---

## 🎯 この記事の概要

**解決する問題**
- API実装とドキュメントがいつの間にか食い違っている
- 手動での仕様管理が面倒で、更新を忘れがち
- チーム開発でAPI仕様の最新版がどれか分からない

**対象読者**
- REST API開発をしている方
- OpenAPI・Swagger仕様を使っている方
- Claude Code等のAI開発ツールを使っている方

**前提知識**
- REST APIの基本
- OpenAPI仕様の概要
- 基本的なコマンドライン操作

## 📊 結論・要点

**🔧 実現できること**
- API仕様と実装コードの自動同期
- 仕様変更時の関連コード自動更新
- チーム全体での仕様共有の簡素化

**⚡ 開発の変化**
- 仕様を先に作る習慣が自然に身につく
- 手動での同期作業がなくなる
- 新しいメンバーでも最新仕様をすぐに把握

**🛠️ 使用技術**
- **Apidog**: ブラウザでAPI設計・テストができるサービス
- **MCP (Model Context Protocol)**: AIツール連携の仕組み
- **Claude Code**: MCP対応のAI開発環境

## 🤔 よくあるAPI開発の悩み

### あるある話
- 実装は最新だけど、ドキュメントが古いまま
- 仕様変更したのに、関連する箇所の更新を忘れる
- 新しいメンバーが「どの仕様が正しいの？」と困る
- レビュー時に「これ仕様書と違うよね？」という指摘

### 新しいアプローチ

**🔄 効率的な開発サイクル**

1. **仕様変更** (Apidog)
2. **AI自動実装** (Claude Code)
3. **テスト**
4. **修正点のフィードバック** ⤴️ 1に戻る

**メリット**
- **仕様が先**: Apidogで先に仕様を作る流れになる
- **リアルタイム反映**: 変更がすぐに開発環境に反映される
- **AI支援**: 仕様に沿ったコードをAIが生成
- **同期の自動化**: 実装とドキュメントのズレが起きにくい

## 📸 Apidogでできること

※画面のテーマカラーは設定で変更可能です

**Requestパラメータの設定**
![Todo API Requestパラメータ設定画面](https://raw.githubusercontent.com/pipipi-dev/pipipi-dev-articles/main/images/20250907-01-apidog-request-params.png)

*パラメータの型、必須/任意、説明をフォームで直感的に編集*

**Responseの定義**
![Todo API Response定義画面](https://raw.githubusercontent.com/pipipi-dev/pipipi-dev-articles/main/images/20250907-02-apidog-response-definition.png)

*レスポンス形式をJSONスキーマで詳細に定義、例も自動生成*

**リクエストコードサンプル**
![Todo API リクエストコードサンプル画面](https://raw.githubusercontent.com/pipipi-dev/pipipi-dev-articles/main/images/20250907-03-apidog-code-samples.png)

*JavaScript、Python、cURLなど複数言語のサンプルコードを自動生成*

## 🛠️ セットアップ手順

### 1. Apidogアカウント作成

1. [Apidog](https://apidog.com/jp/)でアカウント作成
2. 新しいプロジェクト作成

### 2. アクセストークン取得

```
アカウント情報 → APIアクセスToken → 「+ 新規」ボタン
名前: Claude-Code-Integration（任意）
期限: 無期限（または日付指定）
```

### 3. Claude Code設定

:::message
**注意**: MCPサーバー名の命名規則

Claude Codeでは、MCPサーバー名は小文字・ハイフン区切りが推奨されています。

❌ スペースを含む名前:
```json
"API specification": { ... }
```

✅ 小文字・ハイフン区切りの名前:
```json
"apidog": { ... }
```

適切でない名前だと接続エラーになる場合があります。
:::

**設定ファイル例**

```json
// ~/.claude.json に追記
{
  "mcpServers": {
    "apidog": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "apidog-mcp-server@latest",
        "--project-id=YOUR_PROJECT_ID"
      ],
      "env": {
        "APIDOG_ACCESS_TOKEN": "YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```

### 4. 動作確認

```bash
# Claude Codeを再起動後、動作確認
# Claude Code内でMCPサーバーの接続確認
# （実際のAPIアクセス方法はMCPサーバーの実装によります）
```

うまくいけば、作成したAPIの一覧が表示されます。

※APIが1つも作成されていない場合は、簡単なAPIを作成してから確認してください（例：GET /api/todos）。

### （オプション）ローカルファイルでのテスト

手元にOpenAPI仕様書がある場合のテスト方法：

```json
{
  "mcpServers": {
    "apidog": {
      "command": "npx",
      "args": [
        "apidog-mcp-server@latest",
        "--oas=/path/to/openapi.json"
      ]
    }
  }
}
```

## 🔄 開発フロー

### 人間の役割：Apidogでの仕様作成

**1. 仕様をブラウザで作成**
- フォームに入力するだけでAPI仕様ができる
- パラメータやレスポンスも画面で設定
- リアルタイムでプレビュー確認

**2. ブラウザでテスト**
- 作った仕様をその場でテスト実行
- モックサーバーで動作確認
- レスポンス例も自動で作成

**3. チームで共有**
- リアルタイムで変更を同期
- 複数バージョンの管理
- チーム権限の設定が可能

### AIの役割：Claude Codeでの実装

**1. 最新仕様を自動で取得**

Claude CodeがMCPサーバー経由で最新のAPI仕様を自動取得し、それを基にコードを生成します。

**2. 仕様に合わせてコード生成**

```typescript
// Apidog仕様から自動生成
interface CreateUserRequest {
  email: string;
  password: string;
  profile: {
    firstName: string;
    lastName: string;
    preferences?: UserPreferences;
  };
}

// 仕様通りの実装も生成
async function createUser(
  request: CreateUserRequest
): Promise<CreateUserResponse> {
  // バリデーション、DB操作、レスポンス整形
  // すべて仕様に基づいて生成
}
```

**3. 仕様に基づく実装支援**

API仕様を参照しながら、仕様に沿った実装をAIが支援してくれます。

## 💰 料金プランについて

**個人開発者におすすめ**

- **無料プラン**: 個人でのAPI開発・テストには十分
  - コア機能全般（4ユーザーまで利用可能）
  - フルAPIクライアント対応
  - Mock/テスト基本機能一式
  - 無制限テスト（コレクション）実行
  - ドキュメント基本機能（閲覧数無制限）
  - クレジットカード不要、利用期限なし

- **有料プラン**: チーム開発や本格運用時
  - **Basic**: 高度な共同作業とチーム管理が必要なスタートアップ/小規模チーム向け
  - **Professional**: 高度な共同作業・詳細管理・優先サポートが必要な成長企業向け
  - **Enterprise**: 企業向けセキュリティ・カスタマイズ・プレミアムサポートが必要な大規模組織向け

**✅ まずは無料プランで試して、チーム規模や要件に応じて有料プランへ**

詳細は[Apidog料金プラン](https://apidog.com/jp/pricing/)をご確認ください。

## 📈 想定される効果

### 導入前後の変化

**Before：従来の開発**

```
仕様検討 → 実装 → 手動テスト → ドキュメント作成
   ↓         ↓        ↓           ↓
 迷いがち   ミス多い   面倒       忘れる
```

- 1つの機能追加に半日〜1日
- 途中で仕様変更してやり直し発生
- ドキュメント更新をよく忘れる

**After：Apidog MCP使用後**

```
Apidog設計 → MCP実装 → 自動テスト → 勝手に同期
     ↓          ↓         ↓         ↓
   30分       15分       5分      即座
```

- 1つの機能追加を1時間程度に短縮可能
- 型安全により実装ミスを大幅削減
- ドキュメント更新作業が不要に

### 期待できる効果

**🎯 開発体験の改善**
- 「どっちが正しい仕様？」で悩む時間が削減
- 過去の自分が書いた仕様もすぐに確認可能
- 仕様を参照した実装により整合性を保持

**⚡ 作業効率の向上**
- API設計から実装まで一気通貫で実行可能
- 型定義を手で書く作業が不要に
- テストコードも仕様から自動生成

**🔒 品質の安定**
- 人的ミスによる不具合を大幅削減
- 仕様に基づいた一貫性のある実装
- 型安全によるバリデーション強化

## 💡 導入時のポイントと今後の展望

### 段階的導入のススメ
小さなAPIから始めて、仕様を先に作る習慣を身につけることが重要です。いきなりチーム全体で始めるより、個人で慣れてから展開する方がうまくいきます。

### セキュリティ面の注意
アクセストークンが記載された設定ファイル（~/.claude.json）をGitにコミットしないよう注意してください。

### 今後期待したいこと
MCPエコシステムの拡大により、より多くのツールやサービスとの連携が進むことで、API開発のワークフロー全体がさらに効率化されることを期待します。

## 📝 まとめ

### この記事で紹介したこと

✅ **問題解決**: API仕様と実装の食い違いを防ぐ方法
✅ **具体的手順**: 実際に試せるセットアップ手順
✅ **現実的な効果**: 理論ではなく実体験ベースの効果
✅ **注意点**: 導入時に気をつけるポイント

### 始めるまでのステップ

1. **Apidogでアカウント作成**
2. **簡単なAPIを1つ作成**
3. **Claude Code MCP設定**
4. **実際に動かしてみる**

### 最後に

「API仕様と実装の食い違い」は、多くの開発者が日常的に困っている問題だと思います。

Apidog MCP × Claude Codeは、この面倒な問題をシンプルに解決してくれるツールです。特に、チーム開発で「どの仕様が最新？」「実装と仕様書どっちが正しい？」のようなやり取りが多い方には、かなり効果を実感できると思います。

気になった方は、まず簡単なAPIを1つ作るところから試してみてください。

## 📚 参考リンク

**公式ドキュメント**
- [Apidog公式サイト](https://apidog.com/jp/)
- [Claude Code](https://claude.ai/code)
- [MCP仕様](https://modelcontextprotocol.io/)

**関連情報**
- [OpenAPI 3.1仕様](https://spec.openapis.org/oas/v3.1.0)
- [REST API設計ガイド](https://github.com/microsoft/api-guidelines)
