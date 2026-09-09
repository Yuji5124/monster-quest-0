# Monster Quest 0 仕様書インデックス

更新日: 2026-09-09

このファイルはAIエージェントが仕様を読むための入口とする。

## 0. AIが最初に読む順序
1. `PROJECT_OVERVIEW.md` — プロジェクト全体像
2. `DECISIONS.md` — 最新の確定事項。矛盾時は最優先
3. `TBD_REGISTRY.md` — AIが勝手に確定してはいけない未確定事項
4. `AI_EXECUTION_PROTOCOL.md` — AIの作業開始〜完了報告ルール
5. `DEV_WORKFLOW.md` — 制作方法・AI分担
6. `PHASER_ARCHITECTURE.md` — Phaser実装責務
7. `DATA_CONTRACTS.md` — JSON / ID / データ契約
8. 作業対象の専門仕様書
9. `DEFINITION_OF_DONE.md` — 完成判定
10. `QA_SPEC.md` — 検証

## 1. プロジェクト管理
- `PROJECT_OVERVIEW.md` — プロジェクト全体像
- `DECISIONS.md` — 最新確定事項
- `TBD_REGISTRY.md` — 未確定事項
- `CHANGE_CONTROL.md` — 仕様変更・旧仕様管理
- `CONTENT_MATRIX.md` — 確定 / 制作済み / GitHub配置 / 実装 / QA / 視覚調整の状態
- `ROADMAP.md` — 実装順序

## 2. AI・開発規約
- `AI_EXECUTION_PROTOCOL.md` — AI作業プロトコル
- `DEV_WORKFLOW.md` — AI80% / 視覚調整20%の標準フロー
- `REPO_STRUCTURE.md` — リポジトリ構成
- `PHASER_ARCHITECTURE.md` — Scene / System責務
- `DATA_CONTRACTS.md` — データ形式
- `NAMING_CONVENTIONS.md` — ID / ファイル / flag命名
- `EVENT_SYSTEM_SPEC.md` — 共通イベント方式
- `DEFINITION_OF_DONE.md` — 完成条件
- `PERFORMANCE_BUDGET.md` — モバイル性能基準

## 3. ゲーム仕様
- `GAME_SPEC.md` — ゲーム全体
- `STORY_SPEC.md` — 公開可能なストーリー方針
- `CHARACTERS.md` — 主要キャラクター
- `NPC_SPEC.md` — NPC設計
- `MONSTERS.md` — モンスター方針
- `BATTLE_SPEC.md` — 戦闘
- `MAGIC_SPEC.md` — 魔法
- `ITEM_SPEC.md` — アイテム・装備
- `CARD_SPEC.md` — ジャンカード
- `GLITCH_SPEC.md` — 終盤の制御された異常演出

## 4. マップ・表示・素材
- `MAP_SPEC.md` — マップ設計
- `IMAGE_SPEC.md` — 画像制作
- `ASSET_MANIFEST.md` — 素材の有無・配置状況
- `AUDIO_SPEC.md` — BGM / SE
- `MOBILE_SPEC.md` — iPhone / モバイル
- `SAVE_SPEC.md` — セーブ / ロード

## 5. 開発・品質
- `ROADMAP.md` — 実装順序
- `DEFINITION_OF_DONE.md` — 機能 / マップ / Vertical Slice / RC完成条件
- `QA_SPEC.md` — テスト基準
- `PERFORMANCE_BUDGET.md` — パフォーマンス確認

## 6. AI向けルール
リポジトリ直下：
- `../CLAUDE.md` — Claude Code
- `../AGENTS.md` — Codex / その他AI

## 7. Source of Truth
仕様が食い違う場合：
1. `DECISIONS.md`
2. 各専門仕様書
3. `PROJECT_OVERVIEW.md`
4. `CONTENT_MATRIX.md` の状態
5. 実装コード
6. 古いコメント・過去資料

詳細は `CHANGE_CONTROL.md`。

## 8. 未確定値
`TBD` / `null` / `未確定` は、AIが自由に正式値を埋めてよいという意味ではない。
実装上の仮値が必要な場合は仮値であることを明示し、確定仕様と混同しない。
未確定事項の集中管理は `TBD_REGISTRY.md` を使用する。

## 9. 公開リポジトリ注意
重大な終盤ネタバレ、真相、謎の答え、隠しボスの真名・姿は記載しない。
公開用表示と内部実装情報を混同しない。
