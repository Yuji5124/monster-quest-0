# モンスタークエスト0 仕様書インデックス

最終更新: 2026-09-10 23:46 JST

このファイルはAI・人間が仕様を読むための入口。

## 最優先
1. `PROJECT_STATUS.md` — 現在地点と最新固定値
2. `GAME_SPEC.md` — ゲーム全体仕様
3. `CREATIVE_DIRECTION.md` — 作品の作り込み密度・元設定への敬意
4. `AI_EXECUTION_PROTOCOL.md` — AIの作業手順

## 実装契約
- `PHASER_ARCHITECTURE.md` — Scene / System責務
- `DATA_CONTRACTS.md` — JSONデータ形式
- `EVENT_SYSTEM_SPEC.md` — NPC / 宝箱 / ボス / 加入イベント
- `NAMING_CONVENTIONS.md` — ID / ファイル名 / レイヤー名
- `REPO_STRUCTURE.md` — 推奨フォルダ構成
- `PERFORMANCE_BUDGET.md` — Web / iPhone性能基準
- `DEFINITION_OF_DONE.md` — 完成判定
- `QA_SPEC.md` — テスト基準
- `TBD_REGISTRY.md` — 未確定事項

## ゲーム内容
- `NPC_SPEC.md` — NPC会話と現在の進捗
- `CARD_SPEC.md` — ジャンカード45枚
- `GLITCH_SPEC.md` — 終盤異常演出
- `IMAGE_SPEC.md` — 画像制作方針
- `ASSET_INDEX.md` — 正式アセット名・状態

## 進捗
- `CONTENT_MATRIX.md` — 地域・システムの進捗
- `ROADMAP.md` — 実装順

## アセット側
- `../assets/README.md`
- `../assets/asset_catalog.json`

## AI専用入口
- `../CLAUDE.md` — Claude Code
- `../AGENTS.md` — Codex / その他AI

## 読み方
### Claude Code / Phaser Game Agentで実装
`PROJECT_STATUS` → `GAME_SPEC` → `CREATIVE_DIRECTION` → `AI_EXECUTION_PROTOCOL` → `PHASER_ARCHITECTURE` → `DATA_CONTRACTS` → 対象SPEC → `ASSET_INDEX` → `TBD_REGISTRY` → `DEFINITION_OF_DONE`

### Codexでレビュー
上記 + `QA_SPEC` + `PERFORMANCE_BUDGET`

### NPC会話制作
`PROJECT_STATUS` → `CREATIVE_DIRECTION` → `NPC_SPEC` → `TBD_REGISTRY`

### 画像追加
`PROJECT_STATUS` → `IMAGE_SPEC` → `ASSET_INDEX` → `assets/asset_catalog.json`

## 仕様の優先順位
1. 日付が新しいユーザー確定仕様
2. `PROJECT_STATUS.md`
3. 各最新SPEC
4. 実装コード
5. 古い試作HTML / コメント

古い約1時間仕様、ジャンカード20枚、RPGJS中心、ASRS利用、「ふっかつのじゅもん」は現行仕様として使わない。
