# MQ0 30秒ティザー v6.0（Remotion）

- **正本**: 「統合マスタープロンプト v6.0」（カット順・字幕・文章）。Phase 0調査報告は素材・技術の参考資料。
- 字幕本文は v6.0 原文のまま（`src/data/timeline.json`）。調整は改行・大きさ・位置・出現タイミングのみ。
- ゲーム本体（`src/` `docs/` `assets/` `public/` 等）と前回プロモ（`promo/trailer_30s_first_half/`）は**読み取り専用**。素材は複製せず相対パスで参照する。
- 仕上がり: 1920×1080 / 30fps / 900フレーム / H.264 / **音声トラックなし**。

## 現在の段階: アニマティック（Phase 1-1）

確認用MP4: `review/mq0_teaser_v6_animatic.mp4`。VFXは CSS/SVG の軽量版で、本番ではVISUAL EFFECT LIBRARY 366のGLSL（031/039/049/176/203）へ置き換える想定。

| CUT | 秒 | 主な素材（すべて実在ファイル） | 【予告専用の誇張】 |
|---|---|---|---|
| 01 | 0–4 | `assets/maps/starting_place/background.png`（夜）、`assets/characters/reference/reference/主人公/うしろ1.png` | 火の粉 |
| 02 | 4–8 | `assets/maps/world_map/background.png` ＋ `destinations.json` の地点座標、`starting_town`・`starting_forest` 背景、前回録画 `cap_bie` | 地図を走る光 |
| 03 | 8–12 | 世界地図 → `rainland_castle_town/entry_splash.png` → 新録 `cap_castle3d_pc` → 新録 `cap_throne3d_pc`（王の間3D） | 地図に開く穴（世界地図に城の絵がないための代替） |
| 04 | 12–16 | 新録 `cap_majin_boss_pc`（No.07 10F 実画面）、`assets/monsters/majin_cave/monster_majin_dungeon.png` | まじんの巨大化・枠外への飛び出し（ゲームでは未実装: `docs/BATTLE_SPEC.md` §9.1） |
| 05 | 16–20 | `zabon_village/entry_splash.png`、`assets/characters/portraits/tarosa_archery_report.png` | 放たれる矢 |
| 06 | 20–25 | 前回録画 `cap_shoot_chain` / `cap_shoot_wall`（タロサが前で矢を撃ち主人公が続く実画面）、`iwayama_cave_1/entry_splash.png` | 手前の3D岩・砕ける岩・最後の大岩 |
| 07 | 25–28 | `iwayama_cave_1/entry_splash.png`（暗転） | 小さな光（CUT01と同じ揺れ方 `flicker()`。正体は示さない） |
| 08 | 28–30 | `public/assets/ui/title/mq0_title_logo.png` | — |

## 使い方

```bash
npm install
npm run studio            # プレビュー
npm run render:animatic   # out/mq0_teaser_v6_animatic.mp4（音声なし）
bash scripts/qa.sh out/mq0_teaser_v6_animatic.mp4   # 仕様・黒画面・フリーズ検査
```

GPUのないLinuxでは `--browser-executable=<chromium headless_shell> --gl=swangle` を付ける（Windowsは既定のままで可）。

## ゲーム画面の撮り直し（PC向け）

`capture/record_stepped.mjs`（台本は `capture/clips_stepped.mjs`）。

- ゲーム本体の `npm run dev` を起動し、Playwrightの使い捨てブラウザで操作する。ゲームのファイルは変更しない。
- **フレーム送り録画**: Phaserのループを止め（`game.loop.sleep()`）、1/30秒ずつ `game.step()` で進めて毎コマ撮る。GPUがなくても3Dが正しい30fpsで撮れる。
- **スマホ用タッチボタンを非表示**（`capture/lib/pageHelpers.js`: 対話可能な円とそのラベル）。3D城・王の間では操作説明とミニマップ（HUD）も隠す。
- まじん戦（`cap_majin_boss_pc`）は戦闘UIの枠を「大きさの物差し」に使うため、HUDは残している。

前回録画のうち CUT02/06 で使う `cap_bie`・`cap_shoot_*` は、もともとタッチボタンが映っていない（縦シューティングはタッチ端末でのみボタンを出す）。
