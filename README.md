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

## まず読む
AI・開発者ともに最初に以下を確認する。

1. `docs/INDEX.md`
2. `docs/PROJECT_OVERVIEW.md`
3. `docs/DECISIONS.md`
4. `docs/DEV_WORKFLOW.md`

## ゲーム仕様
- `docs/GAME_SPEC.md`
- `docs/STORY_SPEC.md`
- `docs/CHARACTERS.md`
- `docs/NPC_SPEC.md`
- `docs/MONSTERS.md`
- `docs/BATTLE_SPEC.md`
- `docs/MAGIC_SPEC.md`
- `docs/ITEM_SPEC.md`
- `docs/CARD_SPEC.md`
- `docs/GLITCH_SPEC.md`

## マップ・素材・音
- `docs/MAP_SPEC.md`
- `docs/IMAGE_SPEC.md`
- `docs/ASSET_MANIFEST.md`
- `docs/AUDIO_SPEC.md`

## 実装・品質
- `docs/MOBILE_SPEC.md`
- `docs/SAVE_SPEC.md`
- `docs/ROADMAP.md`
- `docs/QA_SPEC.md`

## AI作業ルール
- Claude Code：`CLAUDE.md`
- Codex / その他エージェント：`AGENTS.md`

## 現在の制作方針
基本素材5セット（主要3人歩行、基本タイル、NPC基本10体、モンスター素材、共通UI）は制作済み扱いとし、以後は実装80%へ比重を移す。

まずVertical Sliceとして、

タイトル → はじまりのまち → フィールド → ザコ戦 → レベルアップ → 小ダンジョン → ボス → セーブ / ロード → iPhone Safari確認

を一本につなげる。

## 公開情報の注意
終盤ボスや終盤の真相、謎の答えなど、ネタバレになる情報は公開用ドキュメントでは伏せる。内部実装で必要な場合も、公開画面・広告・紹介素材には出さない。
