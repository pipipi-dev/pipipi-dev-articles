---
title: "Gitブランチ戦略：個人開発で実践するワークフロー"
emoji: "🌿"
type: "tech"
topics: ["個人開発", "Git", "GitHub", "Vercel"]
published: true
platforms:
  qiita: true
  zenn: true
  devto: false
---

この記事は、**[ひとりで作るSaaS - 設計・実装・運用の記録 Advent Calendar 2025](https://adventar.org/calendars/12615)** の5日目の記事です。

昨日の記事では「個人開発のドキュメント戦略」について書きました。今日は、個人開発におけるGitブランチ戦略について書きます。

## 🎯 個人開発のGit運用で考えるべきこと

チーム開発では、Git-flowやGitHub Flowなど確立されたブランチ戦略があります。しかし、個人開発では状況が異なります。

**個人開発の特徴:**
- 開発者は自分一人（コンフリクトが起きにくい）
- レビュアーがいない（セルフレビューが基本）
- 素早く改善サイクルを回したい（手続きは最小限にしたい）

一方で、以下の課題もあります。

- 本番環境を壊したくない
- 変更履歴を追いやすくしたい
- AIエージェント（Claude Code）と協働する際のルールが必要

これらを踏まえて、私が個人開発しているMemoreruでは以下のブランチ戦略を採用しています。

## 📂 Git Worktreeで並列開発

Git Worktreeを使うと、複数のディレクトリでそれぞれ別のブランチを同時に開けます。通常のブランチ切り替えと違い、ローカルに物理的なフォルダが分かれるため、それぞれの場所で別々のClaude Codeセッションを起動できます。

### なぜGit Worktreeか

一番の理由は、**Claude Codeで並列開発ができる**からです。

たとえば「検索機能のリファクタリング」と「決済機能の実装」という2つの大きなタスクがあるとします。それぞれ別のWorktreeを作成し、別々のClaude Codeセッションで進めます。

```
~/my-project/           # develop ブランチ（メインの作業場所）
~/my-project-search/    # feature/search-refactor（検索機能）
~/my-project-payment/   # feature/payment（決済機能）
```

ポイントは、**セッションごとに会話の文脈が分かれる**ことです。

検索機能のセッションでは検索に関する議論が蓄積され、決済機能のセッションでは決済に関する議論が蓄積されます。文脈が混ざらないので、それぞれのタスクに集中した会話ができます。

```
セッション1（検索機能）: 「このクエリの最適化について...」
セッション2（決済機能）: 「Stripeのwebhook処理について...」
→ 互いに干渉せず、それぞれの文脈で深い議論ができる
```

個人開発でも、AIエージェントを活用すれば「擬似的なチーム開発」が可能になります。Git Worktreeはその基盤として非常に有効です。

**その他のメリット:**
- ブランチ切り替えのたびにサーバー再起動が不要
- stash → checkout → pop の手間がない
- 「今どのブランチにいるか」を常に意識する必要がない

### セットアップ方法

並列作業が必要になったときに、featureブランチ用のWorktreeを追加します。

```bash
# メインのリポジトリ（develop）
cd ~/my-project
git branch  # developにいることを確認

# featureブランチを作成してWorktreeを追加
git worktree add ../my-project-feature1 -b feature/ui-refactor
```

これで`~/my-project-feature1`ディレクトリが作成され、`feature/ui-refactor`ブランチがチェックアウトされます。

### 作業完了後のクリーンアップ

featureブランチをdevelopにマージしたら、Worktreeを削除します。

```bash
# Worktreeを削除
git worktree remove ../my-project-feature1

# ブランチも削除（マージ済みなら）
git branch -d feature/ui-refactor
```

## 🔄 ブランチ運用ルール

### 基本の流れ

```
feature → develop → main（本番）→ Vercel自動デプロイ
```

1. **日常の開発**: `my-project`（develop）で作業
2. **並列作業**: featureブランチをWorktreeで作成し、Claude Codeで並列開発
3. **マージ**: feature → develop へPR、または直接マージ
4. **本番デプロイ**: develop → main へPR → Vercelが自動デプロイ

### コミットルール

```bash
# ✅ 機能単位でコミット
git commit -m "feat: ユーザープロフィール編集機能を追加"
git commit -m "fix: ログイン時のエラーハンドリングを修正"

# ❌ 複数機能を一括コミット
git commit -m "いろいろ修正"
```

**ポイント:**
- 機能単位でコミット（複数機能の一括変更禁止）
- プレフィックスを使用（feat, fix, docs, refactor等）
- 動作確認してからコミット

### やってはいけないこと

```bash
# ❌ mainへの直接push
git push origin main  # 禁止！

# ✅ 必ずdevelop → PR → mainの流れ
git push origin develop
# → GitHub上でPRを作成
```

mainへの直接pushは、本番環境を壊すリスクがあるため禁止しています。

## 🤖 AIエージェントとの協働ルール

Claude Codeで開発する際は、以下のルールを`CLAUDE.md`に明記しています。

```markdown
## Git運用

### ブランチ戦略（Git Worktree）
- **日常の開発**: `~/my-project` (develop) で作業
- **並列作業**: featureブランチをWorktreeで作成
- **本番デプロイ**: GitHub上でPR作成 → merge → Vercel自動デプロイ

### コミット・プッシュルール
- **機能単位コミット**: 複数機能の一括変更禁止
- **mainへの直接push厳禁**: 必ずdevelop → PR → mainの流れ
- **動作確認必須**: コミット前に画面で動作確認
- **ユーザー確認後のコミット実行**: 勝手にコミットしない
```

特に重要なのは「**勝手にコミットしない**」というルールです。AIが良かれと思って自動コミットすると、意図しない変更が入る可能性があります。コミットは必ず人間が確認してから実行します。

## 📋 Vercelとの連携

Vercelは、GitHubリポジトリと連携して自動デプロイを行います。

### ブランチとデプロイ環境の対応

| ブランチ | デプロイ先 | URL |
|---------|----------|-----|
| main | Production | example.com |
| develop | Preview | develop-xxx.vercel.app |

PRを作成すると、Preview環境に自動デプロイされます。本番反映前に確認できるので便利です。

### ドキュメント更新時のスキップ

ドキュメントだけの更新でデプロイを走らせたくない場合は、コミットメッセージに`[skip ci]`を含めます。

```bash
git commit -m "docs: READMEを更新 [skip ci]"
```

## 💡 実践Tips

### Tip 1: プルリクエストのテンプレート

`.github/pull_request_template.md`を用意しておくと、PRの品質が安定します。

```markdown
## 概要
<!-- 何を変更したか -->

## 変更内容
-

## テスト確認
- [ ] ローカルで動作確認済み
- [ ] Preview環境で確認済み

## 備考
```

### Tip 2: ブランチ保護ルール

GitHub上でmainブランチを保護すると、直接pushを防げます。

**Settings → Branches → Branch protection rules:**
- Require a pull request before merging
- Require status checks to pass before merging

個人開発でも設定しておくと、うっかりミスを防げます。

### Tip 3: Worktreeの一覧確認

現在のWorktreeを確認するには以下のコマンドを使います。

```bash
git worktree list
# ~/my-project           abcd123 [develop]
# ~/my-project-feature1  efgh456 [feature/ui-refactor]
```

不要になったWorktreeは`git worktree remove`で削除しましょう。

## ✅ まとめ

Memoreruでの実践から得た学びをまとめます。

**うまくいっていること:**
- Git Worktreeでfeatureブランチを並列管理し、Claude Codeで擬似チーム開発
- develop → PR → mainの流れで本番を保護
- CLAUDE.mdでAIエージェントにルールを伝達

**注意が必要なこと:**
- 個人開発でも油断すると本番を壊す
- AIに任せきりにせず、コミットは人間が確認
- 使い終わったWorktreeは忘れずに削除

個人開発だからといってGit運用を適当にすると、後で困ることになります。最低限のルールを決めておくことをおすすめします。

明日は「Supabaseでスキーマ設計：テーブル分割と正規化の実践」について解説します。

---

**シリーズの他の記事**

- 12/4: 個人開発のドキュメント戦略：設計書・思考ログの使い分け
- 12/6: Supabaseでスキーマ設計：テーブル分割と正規化の実践
