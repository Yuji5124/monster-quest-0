# Monster Quest 0 Assets

このディレクトリは『モンスタークエスト0 ～幻の冒険の書～』のゲーム用画像アセット置き場です。

最終更新: 2026-09-09 19:22 JST

## 命名ルール
- ファイル名は半角英数字 + `_` の `snake_case`
- 日本語、空白、括弧、`final`、`最新版`、`v2` などは使わない
- 明確な別案のみ `_alt` を使用する
- バージョン管理はGitで行い、同用途のファイル名は原則固定
- 透過が必要な素材はPNG
- Phaser側ではこのパスを正として参照する

## 正式フォルダ構成

```text
assets/
├─ _inbox/
├─ title/
│  ├─ logo_main_transparent.png
│  └─ title_background.png
├─ characters/
│  ├─ playable/
│  │  ├─ hero_walk.png
│  │  ├─ tarosa_walk.png
│  │  └─ mirei_walk.png
│  ├─ support/
│  │  └─ watabe_walk.png
│  └─ npc/
│     ├─ npc_01.png
│     ├─ ...
│     └─ npc_10.png
├─ monsters/
│  ├─ battle/
│  └─ source/
├─ maps/
│  ├─ tilesets/
│  │  ├─ tileset_base.png
│  │  └─ tileset_extra.png
│  └─ reference/
│     └─ world_map_reference.png
├─ battle/
│  └─ backgrounds/
│     ├─ battle_bg_grassland.png
│     ├─ battle_bg_forest.png
│     ├─ battle_bg_cave.png
│     ├─ battle_bg_castle_town.png
│     ├─ battle_bg_snowfield.png
│     ├─ battle_bg_desert_ruins.png
│     ├─ battle_bg_dungeon.png
│     ├─ battle_bg_dungeon_alt.png
│     ├─ battle_bg_boss.png
│     └─ battle_bg_boss_alt.png
├─ ui/
│  ├─ ui_common.png
│  └─ ui_card_gacha.png
├─ cards/
│  ├─ full/
│  └─ art/
└─ promo/
   ├─ poster_retro_rpg.png
   ├─ package_front.png
   └─ package_back.png
```

## キャラクター区分
- 主要パーティ: 主人公・タロサ・ミレイ
- `support/`: 主要パーティ外のイベント参加・特殊参加キャラクター
- `npc/`: 村人・町人などの通常NPC

## ジャンカード命名
全45枚。番号を必ず3桁で先頭につける。

- 完成カード: `cards/full/card_001_<name>.png` ～ `card_045_<name>.png`
- 中央絵の透過素材: `cards/art/card_art_001_<name>.png` ～ `card_art_045_<name>.png`
- 公開時に伏せるカードでも内部ファイル名は実装用名称を使用し、表示名だけ `？？？` にする

## モンスター命名
全25体。

- 実装用: `monsters/battle/monster_01_<name>.png` ～ `monster_25_<name>.png`
- 原資料・カード抽出元など: `monsters/source/`

## 運用
1. 新規画像は必要に応じて `assets/_inbox/` に仮置きする
2. `docs/ASSET_INDEX.md` で正式名を確認する
3. 正式フォルダへ配置する
4. `assets/asset_catalog.json` を同期する
5. PNG本体の存在確認後に `IN_GITHUB` とする

AI実装時は、まず `docs/ASSET_INDEX.md` と `docs/IMAGE_SPEC.md` を読む。
