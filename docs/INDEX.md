# モンスタークエスト0 仕様書インデックス

最終更新: 2026-09-12 JST

このファイルはAI・人間が仕様を読むための入口。

## 最優先
1. `PROJECT_STATUS.md` — 現在地点と最新固定値
2. `GAME_SPEC.md` — ゲーム全体仕様
3. `CREATIVE_DIRECTION.md` — 作り込み密度・二重構造・元設定への敬意
4. `OPENING_SPEC.md` — 約5秒異常 → **No.01 はじまりのばしょ**
5. `STORY_FLOW.md` — 物語全体 / 「もういちど」 / 真エンディング
6. `MAP_FLOW_SPEC.md` — **正式No.01〜No.20**
7. `AI_EXECUTION_PROTOCOL.md` — AIの作業手順

## ストーリー・世界
- `OPENING_SPEC.md` — タイトルからNo.01〜No.02への導入
- `STORY_FLOW.md` — 元NPC主人公 / 複数世界断片 / 裏ワザ / エンディング
- `MAP_FLOW_SPEC.md` — No.01〜20、No.01再訪、No.20再戦
- `NPC_SPEC.md` — NPC会話方針
- `GLITCH_SPEC.md` — 導入異常 / 終盤 / 「もういちど」

## 戦闘・成長・データ
- `BATTLE_SPEC.md` — コマンド戦闘、だいヒット、オロチゾンビ裏ボス
- `CHARACTER_GROWTH.md` — 男性主人公 / タロサ / ミレイ / わたべ
- `MAGIC_SPEC.md` — 魔法
- `MONSTER_SPEC.md` — 25体、公開ネタバレ、裏ボス
- `ITEM_EQUIPMENT_SPEC.md` — アイテム・装備
- `CARD_SPEC.md` — ジャンカード45枚、序盤の秘密示唆禁止
- `SAVE_FLAG_SPEC.md` — セーブ / 「もういちど」状態保持

## UI・音・画像
- `UI_INPUT_SPEC.md`
- `AUDIO_SPEC.md`
- `IMAGE_SPEC.md`
- `ASSET_INDEX.md`

## 実装契約
- `PHASER_ARCHITECTURE.md`
- `DATA_CONTRACTS.md`
- `EVENT_SYSTEM_SPEC.md`
- `NAMING_CONVENTIONS.md`
- `REPO_STRUCTURE.md`
- `PERFORMANCE_BUDGET.md`
- `DEFINITION_OF_DONE.md`
- `QA_SPEC.md`
- `TBD_REGISTRY.md`
- `CHANGE_CONTROL.md`

## 進捗
- `CURRENT_WORK.md`
- `CONTENT_MATRIX.md`
- `ROADMAP.md`

## アセット側
- `../assets/README.md`
- `../assets/asset_catalog.json`
- No.02内部設計: `../assets/maps/data/no02_start_town_interiors.json`

## AI専用入口
- `../CLAUDE.md`
- `../AGENTS.md`

## 読み方
### Claude Code / Phaser Game Agent
`PROJECT_STATUS` → `GAME_SPEC` → `CREATIVE_DIRECTION` → `OPENING_SPEC` → `STORY_FLOW` → `MAP_FLOW_SPEC` → 対象SPEC → `SAVE_FLAG_SPEC`（進行に関係する場合）→ `TBD_REGISTRY` → `DEFINITION_OF_DONE`

### Codex
上記 + `QA_SPEC` + `PERFORMANCE_BUDGET`

### 終盤 / 裏ワザ実装
`PROJECT_STATUS` → `STORY_FLOW` → `BATTLE_SPEC` → `MONSTER_SPEC` → `GLITCH_SPEC` → `SAVE_FLAG_SPEC` → `MAP_FLOW_SPEC` → `TBD_REGISTRY`

### ジャンカード
`PROJECT_STATUS` → `CARD_SPEC` → `SAVE_FLAG_SPEC` → `ASSET_INDEX`

## 仕様の優先順位
1. 日付が新しいユーザー確定仕様
2. `PROJECT_STATUS.md`
3. 各最新SPEC
4. 実装コード
5. 古い試作HTML / コメント / 旧プロモ

現行仕様として使わない:
- 約1時間仕様
- ジャンカード20枚 / 40枚
- RPGJS中心
- ASRS利用
- 「ふっかつのじゅもん」
- 起動直後の偽セーブ消失
- 旧女性勇者風主人公
- 旧マップ番号（旧No.18 はじまりのばしょ等）
- ジャンカードの秘密を序盤から本編へ前面化する旧案
