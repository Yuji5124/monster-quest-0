# Monster Quest 0 Assets

このディレクトリは『モンスタークエスト0 ～幻の冒険の書～』のゲーム用画像アセット置き場です。

## 命名ルール
- ファイル名は半角英数字 + `_` の `snake_case`
- 日本語、空白、括弧、`final`、`最新版`、`v2` などは使わない
- バージョン管理はGitで行い、ファイル名は原則固定
- 透過が必要な素材はPNG
- Phaser側ではこのパスを正として参照する

## 正式フォルダ構成

```text
assets/
├─ title/
│  ├─ logo_main_transparent.png
│  └─ title_background.png
├─ characters/
│  ├─ playable/
│  │  ├─ hero_walk.png
│  │  ├─ tarosa_walk.png
│  │  ├─ mirei_walk.png
│  │  └─ watabe_walk.png
│  └─ npc/
│     ├─ npc_01.png
│     ├─ npc_02.png
│     ├─ npc_03.png
│     ├─ npc_04.png
│     ├─ npc_05.png
│     ├─ npc_06.png
│     ├─ npc_07.png
│     ├─ npc_08.png
│     ├─ npc_09.png
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
│     └─ battle_bg_snowfield.png
├─ ui/
│  └─ ui_common.png
├─ cards/
│  ├─ full/
│  └─ art/
└─ promo/
   ├─ poster_retro_rpg.png
   ├─ package_front.png
   └─ package_back.png
```

## ジャンカード命名
全45枚。番号を必ず3桁で先頭につける。

- 完成カード: `cards/full/card_001_<name>.png` ～ `card_045_<name>.png`
- 中央絵の透過素材: `cards/art/card_art_001_<name>.png` ～ `card_art_045_<name>.png`
- 公開時に伏せるカードでも内部ファイル名は実装用名称を使用し、表示名だけ `？？？` にする

## 運用
画像を追加・差し替えしたら `docs/ASSET_INDEX.md` のステータスも更新する。
AI実装時は、まず `docs/ASSET_INDEX.md` と `docs/IMAGE_SPEC.md` を読む。
