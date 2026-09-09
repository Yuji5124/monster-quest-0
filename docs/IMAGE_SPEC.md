# モンスタークエスト0 画像制作仕様

最終更新: 2026-09-09

## 基本方針
- 実ゲームで使う画像を優先する。
- レトロRPG感を基礎にしつつ、既存作品の直接模倣は避ける。
- キャラクター・モンスター・カード中央絵は必要に応じて背景透明PNG。
- 公開用画像ではネタバレ対象を伏せる。

## 正式な管理先
- 画像の正式ファイル名・配置先・状態: `docs/ASSET_INDEX.md`
- フォルダ構成・命名ルール: `assets/README.md`

## 命名
- 半角英数字 + `_` の snake_case。
- 日本語、空白、括弧、`final`、`最新版`、`v2` は使わない。
- 差し替え時も同用途なら同じファイル名を維持し、履歴はGitで管理する。

## 現在の主要画像
### プレイアブル
- `assets/characters/playable/hero_walk.png`
- `assets/characters/playable/tarosa_walk.png`
- `assets/characters/playable/mirei_walk.png`
- `assets/characters/playable/watabe_walk.png`

### NPC
- `assets/characters/npc/npc_01.png` ～ `npc_10.png`

### タイル・マップ
- `assets/maps/tilesets/tileset_base.png`
- `assets/maps/tilesets/tileset_extra.png`
- `assets/maps/reference/world_map_reference.png`

### 戦闘背景
- `assets/battle/backgrounds/battle_bg_grassland.png`
- `assets/battle/backgrounds/battle_bg_forest.png`
- `assets/battle/backgrounds/battle_bg_cave.png`
- `assets/battle/backgrounds/battle_bg_castle_town.png`
- `assets/battle/backgrounds/battle_bg_snowfield.png`

### UI
- `assets/ui/ui_common.png`
- `assets/ui/ui_card_gacha.png`

### タイトル・宣伝
- `assets/title/logo_main_transparent.png`
- `assets/title/title_background.png`
- `assets/promo/poster_retro_rpg.png`
- `assets/promo/package_front.png`
- `assets/promo/package_back.png`

## モンスター
- 正式総数は25体。
- 実装用: `assets/monsters/battle/monster_01_<name>.png` ～ `monster_25_<name>.png`
- 原資料: `assets/monsters/source/`

## ジャンカード
- 正式総数は45枚。
- 完成カード: `assets/cards/full/card_001_<name>.png` ～ `card_045_<name>.png`
- 中央絵透過素材: `assets/cards/art/card_art_001_<name>.png` ～ `card_art_045_<name>.png`

## 戦闘背景の現在方針
単純なFC背景より一段きれいにしつつ、敵とUIを邪魔しないレトロRPG背景とする。草原、森、洞窟、城・城下町周辺、雪原を基本セットとする。

## 実装
- Phaserコードへ画像パスを大量に直書きしない。
- preload/manifestへ集約する。
- 画像差し替えだけで更新できる構成を優先する。

## AI担当
- ChatGPT: 画像仕様、生成、正式命名。
- Phaser Game Agent: Phaser実装の基本担当。
- Codex / Claude Code: 複数ファイル修正、参照パス更新、検証。
