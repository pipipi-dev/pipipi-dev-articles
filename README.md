# pipipi-dev の技術記事 📝

pipipi-dev が執筆する技術記事を管理するリポジトリです。

[![GitHub Actions](https://github.com/pipipi-dev/pipipi-dev-articles/workflows/Multi%20Platform%20Publisher/badge.svg)](https://github.com/pipipi-dev/pipipi-dev-articles/actions)

## 🚀 マルチプラットフォーム投稿システム

このリポジトリは [Multi Platform Publisher](https://github.com/pipipi-dev/multi-platform-publisher) をベースに構築されています。Zenn、Qiita、Dev.toへの自動投稿システムが実装されており、一度記事を書くだけで複数のプラットフォームに同時公開できます。

- **オリジナルリポジトリ**: [multi-platform-publisher](https://github.com/pipipi-dev/multi-platform-publisher) - システムの詳細説明とセットアップガイド
- **活用方法**: 記事を書いてGitHubにプッシュするだけで、設定したプラットフォームに自動公開されます

## 📂 構成

```
pipipi-dev-articles/
├── articles/          # 📝 技術記事（Markdown形式）
│   └── *.md          # 各記事ファイル
├── images/           # 🖼️ 記事用画像
│   └── *.png/jpg     # 画像ファイル
├── scripts/          # 🛠️ 変換・投稿スクリプト
│   ├── convert-articles.js  # 記事変換処理
│   └── publish-articles.js  # API投稿処理
├── config/           # ⚙️ 設定ファイル
│   └── published-articles.json  # 投稿済み記事の管理
├── .github/          # 🤖 GitHub設定
│   └── workflows/
│       └── publish.yml  # 自動投稿ワークフロー
├── package.json      # 📦 依存関係とコマンド定義
├── package-lock.json # 📦 依存関係のロックファイル
└── .gitignore        # 📝 Git除外設定
```