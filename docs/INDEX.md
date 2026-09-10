# モンスタークエスト0 仕様書インデックス

最終更新: 2026-09-11 JST

このファイルはAI・人間が仕様を読むための入口。

## 最優先
1. `PROJECT_STATUS.md` — 現在地点と最新固定値
2. `GAME_SPEC.md` — ゲーム全体仕様
3. `CREATIVE_DIRECTION.md` — 作品の作り込み密度・元設定への敬意
4. `STORY_FLOW.md` — 物語の時間軸・前半〜終盤の大枠
5. `AI_EXECUTION_PROTOCOL.md` — AIの作業手順

## ストーリー・世界
- `OPENING_SPEC.md` — タイトルからはじまりのまちまで
- `STORY_FLOW.md` — 物語全体の進行
- `MAP_FLOW_SPEC.md` — 地域・ダンジョン・接続・進行条件
- `NPC_SPEC.md` — NPC会話方針と地域テーマ
- `GLITCH_SPEC.md` — 終盤異常演出

## 戦闘・成長・データ
- `BATTLE_SPEC.md` — コマンド戦闘、だいヒット、ボス攻略
- `CHARACTER_GROWTH.md` — 主人公・タロサ・ミレイ・わたべの成長
- `MAGIC_SPEC.md` — 魔法名称、効果、原作情報との区別、習得管理
- `MONSTER_SPEC.md` — 25体モンスターの管理・ネタバレ方針
- `ITEM_EQUIPMENT_SPEC.md` — アイテム・装備
- `CARD_SPEC.md` — ジャンカード45枚
- `SAVE_FLAG_SPEC.md` — セーブ・ストーリー進行フラグ

## UI・音・画像
- `UI_INPUT_SPEC.md` — UI、キーボード、タッチ、iPhone操作
- `AUDIO_SPEC.md` — BGM01〜08、SE、AudioSystem
- `IMAGE_SPEC.md` — 画像制作方針
- `ASSET_INDEX.md` — 正式アセット名・状態

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
- `CHANGE_CONTROL.md` — 仕様変更管理

## 進捗
- `CURRENT_WORK.md` — 今やる作業
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
`PROJECT_STATUS` → `GAME_SPEC` → `CREATIVE_DIRECTION` → `STORY_FLOW` → 作業対象SPEC → `AI_EXECUTION_PROTOCOL` → `PHASER_ARCHITECTURE` → `DATA_CONTRACTS` → `ASSET_INDEX` → `TBD_REGISTRY` → `DEFINITION_OF_DONE`

### Codexでレビュー
上記 + `QA_SPEC` + `PERFORMANCE_BUDGET` + `SAVE_FLAG_SPEC`

### ストーリー / マップ制作
`PROJECT_STATUS` → `CREATIVE_DIRECTION` → `STORY_FLOW` → `OPENING_SPEC` または `MAP_FLOW_SPEC` → `TBD_REGISTRY`

### NPC会話制作
`PROJECT_STATUS` → `STORY_FLOW` → `MAP_FLOW_SPEC` → `NPC_SPEC` → `TBD_REGISTRY`

### 戦闘・敵・成長
`PROJECT_STATUS` → `BATTLE_SPEC` → `CHARACTER_GROWTH` → `MAGIC_SPEC` → `MONSTER_SPEC` → `ITEM_EQUIPMENT_SPEC` → `TBD_REGISTRY`

### 画像追加
`PROJECT_STATUS` → `IMAGE_SPEC` → `ASSET_INDEX` → `assets/asset_catalog.json`

## 仕様の優先順位
1. 日付が新しいユーザー確定仕様
2. `PROJECT_STATUS.md`
3. 各最新SPEC
4. 実装コード
5. 古い試作HTML / コメント

古い約1時間仕様、ジャンカード20枚、RPGJS中心、ASRS利用、「ふっかつのじゅもん」、序盤の偽セーブ消失、大人数NPC案は現行仕様として使わない。
