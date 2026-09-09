# モンスタークエスト0 画像制作仕様

最終更新: 2026-09-09 19:22 JST

## 基本方針
- 実ゲームで使う完成版アセットを優先する。
- 1980年代後半～1990年代初頭の日本製レトロRPG感を基礎にしつつ、既存作品の背景・構図・タイル・配色を直接模倣しない。
- 現在の戦闘背景は、単純なFC風より一段きれいで、ゲーム画面として見栄えするレトロRPG背景へ方針転換済み。
- キャラクター・モンスター・カード中央絵は必要に応じて背景透明PNG。
- 公開用画像では終盤ボスなどのネタバレ対象を伏せる。

## 正式な管理先
- 画像の正式ファイル名・配置先・状態: `docs/ASSET_INDEX.md`
- フォルダ構成・命名ルール: `assets/README.md`
- Phaser/AI向け機械可読一覧: `assets/asset_catalog.json`

## 命名
- 半角英数字 + `_` の snake_case。
- 日本語、空白、括弧、`final`、`最新版`、`v2` は使わない。
- 別案は用途が明確な場合のみ `_alt` を使用する。
- 差し替え時も同用途なら同じファイル名を維持し、履歴はGitで管理する。

## キャラクター
### 主要パーティ
主要パーティは主人公・タロサ・ミレイの3人。
- `assets/characters/playable/hero_walk.png`
- `assets/characters/playable/tarosa_walk.png`
- `assets/characters/playable/mirei_walk.png`

### 補助・イベントキャラクター
- `assets/characters/support/watabe_walk.png`

### NPC
- `assets/characters/npc/npc_01.png` ～ `npc_10.png`

## タイル・マップ
- `assets/maps/tilesets/tileset_base.png`
- `assets/maps/tilesets/tileset_extra.png`
- `assets/maps/reference/world_map_reference.png`

## 戦闘背景
### 基本セット
- `assets/battle/backgrounds/battle_bg_grassland.png`
- `assets/battle/backgrounds/battle_bg_forest.png`
- `assets/battle/backgrounds/battle_bg_cave.png`
- `assets/battle/backgrounds/battle_bg_castle_town.png`
- `assets/battle/backgrounds/battle_bg_snowfield.png`
- `assets/battle/backgrounds/battle_bg_desert_ruins.png`

### ダンジョン・ボス
- `assets/battle/backgrounds/battle_bg_dungeon.png`
- `assets/battle/backgrounds/battle_bg_dungeon_alt.png`
- `assets/battle/backgrounds/battle_bg_boss.png`
- `assets/battle/backgrounds/battle_bg_boss_alt.png`

### 背景制作ルール
- 戦闘画面専用。イメージイラストではなくゲーム組み込み前提。
- 敵キャラクターとUIを載せる中央～下部の視認性を確保する。
- 過剰な描き込みで敵シルエットを埋没させない。
- 16bit風に豪華にしすぎず、レトロRPGらしい整理された画面密度を保つ。
- 同一エリアの背景は配色・地形の方向性を統一する。

## UI
- `assets/ui/ui_common.png`
- `assets/ui/ui_card_gacha.png`

## タイトル・宣伝
- `assets/title/logo_main_transparent.png`
- `assets/title/title_background.png`
- `assets/promo/poster_retro_rpg.png`
- `assets/promo/package_front.png`
- `assets/promo/package_back.png`

正式サブタイトルは「～幻の冒険の書～」。
「誰も知らないゲーム、やってみる？」は広告・紹介用コピーとして扱う。

## モンスター
- 正式総数は25体。
- 実装用: `assets/monsters/battle/monster_01_<name>.png` ～ `monster_25_<name>.png`
- 原資料: `assets/monsters/source/`
- 公開用資料では終盤ネタバレ対象の姿・名前を掲載しない。

## ジャンカード
- 正式総数は45枚。
- 完成カード: `assets/cards/full/card_001_<name>.png` ～ `card_045_<name>.png`
- 中央絵透過素材: `assets/cards/art/card_art_001_<name>.png` ～ `card_art_045_<name>.png`
- カード中央絵抽出では、元カードのデザイン・色・表情・装備・模様を維持し、勝手な描き足しをしない。
- ネタバレカードは公開時に `？？？` 表記を使用できる。

## 実装
- Phaser 3をゲーム実装の中心とする。
- Phaserコードへ画像パスを大量に直書きしない。
- preload / asset manifestへ集約する。
- 画像差し替えだけで更新できる構成を優先する。

## AI担当
- ChatGPT: 画像仕様、生成、正式命名。
- Phaser Game Agent: Phaser実装の基本担当。
- Codex / Claude Code: 複数ファイル修正、参照パス更新、検証。
