# モンスタークエスト0 仕様書インデックス

最終更新: 2026-09-21 JST

このファイルはAI・人間が仕様を読むための入口。

## 最優先
1. `PROJECT_STATUS.md` — 現在地点と最新固定値
2. `GAME_SPEC.md` — ゲーム全体仕様
3. `CREATIVE_DIRECTION.md` — 作り込み密度・二重構造・元設定への敬意
4. `OPENING_SPEC.md` — 暗闇→焚き火の明転 → **No.01 はじまりのばしょ**
5. `PLAY_ORDER_SPEC.md` — **物語上の確定プレイ順。互換No.より優先**
6. `STORY_FLOW.md` — 物語全体 / 「もういちど」 / 真エンディング
7. `MAP_FLOW_SPEC.md` — **既存No.01〜20の互換管理 / 地域情報**
8. `MAP_SYSTEM.md` — **背景画像正本 / Collision生成 / 4レイヤー / ワールドマップ**
9. `SPECIAL_GAMEPLAY_SPEC.md` — **特殊ゲームプレイ / シューティング / ブロック城 / まじん巨大化 / アクション区間**
10. `AI_EXECUTION_PROTOCOL.md` — AIの作業手順

## ストーリー・世界
- `OPENING_SPEC.md` — タイトルからNo.01〜No.02への導入
- `PLAY_ORDER_SPEC.md` — P01〜P09の確定プレイ順、P10以降TBD、拠点→イベント→解放の基本ループ
- `STORY_FLOW.md` — 元NPC主人公 / 複数世界断片 / 裏ワザ / エンディング
- `MAP_FLOW_SPEC.md` — No.01〜20、No.01再訪、No.20再戦
- `MAP_SYSTEM.md` — 新規ローカルマップとワールドマップの制作・データ方針
- `SPECIAL_GAMEPLAY_SPEC.md` — 世界混線に伴うジャンル切替・特殊操作区間
- `NPC_SPEC.md` — NPC会話方針
- `GLITCH_SPEC.md` — 終盤異常 / 「もういちど」

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
- `MAP_SYSTEM.md`

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
- `PHASE_WORLD_MAP_POINT_SELECTION.md` — 高解像度背景 / 目的地選択 / 拡大 / ローカルマップ遷移（DEV）
- `PHASE_IMAGE_MAP_MINIMUM.md` — 背景画像 + Collision + Event + ObjectのNo.01最小検証（DEV）
- `PHASE_DEV_PARTY_FOLLOWERS.md` — DEV加入NPC / 3人パーティー / 経路追従 / Scene再生成
- `PHASE_DEMAS_BATTLE.md` — デーマス実戦 / 反射フック / Battle Test / NPC復帰の検証
- `PHASE_MAJIN_CAVE_DUNGEON_RPG.md` — No.08専用ターン制Dungeon RPG / 10F帰還 / DEV URL
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
`PROJECT_STATUS` → `GAME_SPEC` → `CREATIVE_DIRECTION` → `OPENING_SPEC` → `PLAY_ORDER_SPEC` → `STORY_FLOW` → `MAP_FLOW_SPEC` → `MAP_SYSTEM`（マップ作業時は必須）→ `SPECIAL_GAMEPLAY_SPEC`（特殊区間作業時は必須）→ 対象SPEC → `SAVE_FLAG_SPEC`（進行に関係する場合）→ `TBD_REGISTRY` → `DEFINITION_OF_DONE`

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
- Tiledを新規マップの正本とする方式
- ワールドマップを全面徒歩フィールドとして作る方式

## Phase別の実装・検証記録
- [Phase 1 起動基盤](PHASE1_BOOTSTRAP.md)
- [Phase 2 タイトル画面](PHASE2_TITLE.md)
- [Phase 3 冒頭異常演出](PHASE3_OPENING_GLITCH.md)
- [Phase 4 No.01夜の場面表示](PHASE4_STARTING_PLACE.md)

- [Phase 5 歩行・当たり判定](PHASE5_PLAYER_MOVEMENT.md)
- [Phase 5.5 ビジュアル基準](PHASE5_5_VISUAL_BASELINE.md)
- [Phase 6 マップ遷移](PHASE6_MAP_TRANSITIONS.md)
- [Phase 7 NPC + 会話システム](PHASE7_NPC_DIALOGUE.md)
- [Phase 8-A No.02外観](PHASE8A_STARTING_TOWN_EXTERIOR.md)
- [Phase 8-B No.02建物内部＋出入り](PHASE8B_STARTING_TOWN_INTERIORS.md)
- [Phase 8.5 フィールド導入＋主人公追従カメラ](PHASE8_5_FIELD_CAMERA.md)
- [内部解像度移行 320×240→960×720](RESOLUTION_MIGRATION_960x720.md)

- `PHASE8_6_ROUGH_FIELD.md` — 世界地図REFERENCEによる荒フィールド、仮座標・徒歩往復・Collision・回帰検証
- `PHASE_BATTLE_TEST.md` — 2体の独立DEV_BATTLE_TEST、戦闘状態・ダメージ・QA
