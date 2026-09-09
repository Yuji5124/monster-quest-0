# Monster Quest 0 ～幻の冒険の書～

『Monster Quest 0 ～幻の冒険の書～』開発リポジトリ。

## 目標
- FC後期〜初期SFCを思わせる2Dドット絵コマンドRPG
- 想定プレイ時間：約5時間
- Webブラウザで遊べることを優先し、iPhone Safariでも快適に遊べる構成を目指す
- AI実装80% / 人間による視覚調整20%を基本方針とする

## 開発方針
- ゲームエンジン：Phaser
- AI制作基盤：Phaser Game Agent
- メイン実装：Claude Code
- レビュー / デバッグ：Codex
- 仕様整理 / 画像制作 / プロンプト設計：ChatGPT
- Astraは量産フェーズで必要に応じて使用
- ASRSは使用しない
- 独自RPGエンジン、独自マップエディタは作らない

## 仕様書
最初に `docs/PROJECT_OVERVIEW.md` と `docs/DECISIONS.md` を読むこと。

主な仕様：
- `docs/GAME_SPEC.md`
- `docs/CARD_SPEC.md`
- `docs/IMAGE_SPEC.md`
- `docs/CHARACTERS.md`
- `docs/MONSTERS.md`
- `docs/MAP_SPEC.md`
- `docs/BATTLE_SPEC.md`
- `docs/DEV_WORKFLOW.md`

## AI作業ルール
- Claude Code：`CLAUDE.md`
- Codex / その他エージェント：`AGENTS.md`

## 公開情報の注意
終盤ボスや終盤の真相など、ネタバレになる情報は公開用ドキュメントでは伏せる。内部実装で必要な場合も、公開画面・広告・紹介素材には出さない。
