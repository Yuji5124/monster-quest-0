# Monster Quest 0 Asset Index

最終更新: 2026-09-18 JST

このファイルを画像アセットの正式台帳とする。Phaser Game Agent / Codex / Claude Code は画像を探す前にこのファイルを確認する。

## ステータス
- `CURRENT`: 現在ユーザーが正式採用した素材。Git追跡・コミット済みかは別途確認する。
- `READY_TO_IMPORT`: ChatGPTプロジェクト側で作成済み。GitHubへPNG本体を入れる対象。
- `IN_GITHUB`: GitHubにPNG本体を配置済み。
- `REFERENCE`: 実装用ではなく資料・参考画像。
- `NEEDS_REVIEW`: 正式採用前に確認が必要。
- `SUPERSEDED`: 旧仕様に基づくため現行ゲームではそのまま使用しない。

## 1. タイトル・ロゴ
| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/title/ChatGPT Image 2026年9月13日 05_31_34.png` | Phase 5.5でユーザー正式採用。1672×941 / RGBA透過。元画像を保持 | CURRENT |
| `assets/promo/reference/mq0_promo_026_6d80d17943.png` | Phase 2で採用した旧ロゴ（1983×793）。Phase 5.5で差し替え、元画像を保持 | SUPERSEDED |
| `public/assets/ui/title/mq0_title_logo.png` | 新CURRENTタイトルの配信用コピー。既存の相対参照パスを維持 | CURRENT |
| `assets/title/logo_main_transparent.png` | 旧予定パス。ファイル未作成のため上記promo_026を正式採用に切り替え | SUPERSEDED |
| `assets/maps/reference/world/mq0_world_map_022_94f19bddfe.png` | 2026-09-13にユーザー正式採用したタイトル背景（城門前の広場）。元は世界地図REFERENCE群の1枚。1448×1086、元画像を保持 | CURRENT |
| `public/assets/ui/title/mq0_title_background.png` | 上記のPhaser実行時配信用コピー | CURRENT |
| `assets/title/title_background.png` | 旧予定パス。ファイル未作成のため上記を正式採用に切り替え | SUPERSEDED |

※「誰も知らないゲーム、やってみる？」はサブタイトルではなく広告・紹介用コピーとして扱う。

## 2. 主要パーティ
主要パーティは主人公・タロサ・ミレイの3人。

| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/characters/playable/hero_walk.png` | **旧女性勇者風主人公 歩行スプライト** | **SUPERSEDED** |
| `assets/characters/playable/protagonist_walk.png` | **最新男性主人公 歩行スプライト** | **NEEDS_REVIEW / 新規制作対象** |
| `assets/characters/playable/tarosa_walk.png` | タロサ 歩行スプライト | READY_TO_IMPORT |
| `assets/characters/playable/mirei_walk.png` | ミレイ 歩行スプライト | READY_TO_IMPORT |

### 主人公素材の重要注意
現行主人公は、別のモンスタークエスト作品／別バージョン世界で本来NPCだった男性。
旧 `hero_walk.png` は女性勇者風デザインに基づくため、現行主人公として実装しない。
新しい正式主人公素材が確定するまでは、AIが旧素材を自動採用してはいけない。

## 3. 補助・イベントキャラクター
| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/characters/support/watabe_walk.png` | わたべ 歩行スプライト | READY_TO_IMPORT |

## 4. NPC
| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/characters/npc/npc_01.png` ～ `npc_10.png` | NPC基本10体 | READY_TO_IMPORT |

NPCに固有名が付いた時点で `npc_01` 等から意味のある名前へ1回だけ変更してよい。
地域別会話設計は `docs/NPC_SPEC.md` を参照する。

## 5. マップ背景・legacyタイル

新規ローカルマップの正本は `assets/maps/<mapId>/background.png` とする。対応する編集可能な `collision.png`（白=歩行可能、黒=歩行不可）とEvent / Objectデータを同じマップパッケージで管理する。詳細は `docs/MAP_SYSTEM.md` を正とする。

| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/maps/starting_place/background.png` | 背景画像マップ方式のNo.01最小検証用、1536×1024のオリジナル背景。正式昼夜背景ではない | DEV_PLACEHOLDER |
| `assets/maps/starting_place/collision.png` | 上記と同寸法の二値Collision Mask（白=歩行可能、黒=歩行不可）。人間が修正するための検証用データ | DEV_PLACEHOLDER |
| `assets/maps/world_map/background.png` | ポイント選択式ワールドマップ用のCURRENTオリジナル高解像度背景。1448×1086・4:3。実行時はLINEARで縮小表示 | CURRENT |

以下のtileset、Tiled編集用マップ、Tiled向けに正規化した画像は、既存No.01実装のために保持するlegacy / reference資産である。これらを削除・改名しないが、新規マップの背景制作をタイルベースへ固定しない。
| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/maps/tilesets/tileset_base.png` | MQ0基本タイルセット | READY_TO_IMPORT |
| `assets/maps/tilesets/tileset_extra.png` | MQ0追加タイルセット | READY_TO_IMPORT |
| `assets/maps/reference/world/mq0_world_map_001_4813475e07.png` | Phase 8.6指定画像。1448×1086 RGB。Vite経由のDEV_REFERENCE_BACKGROUNDとして使用、CURRENTへ昇格しない | REFERENCE |
| `assets/maps/tilesets/dev_placeholder_outdoor_tileset.png` | 2026-09-15追加。No.01昼のTiledマップ(`tiled/maps/mq0_map01_starting_place_day.tmj`)専用のDEV_PLACEHOLDERタイルセット(192×96、32px単色/簡易アイコン17種)。上記`tileset_base.png`/`tileset_extra.png`(正式・未着手)の代替ではなく、正式タイルセット確定後に置換される前提 | PLACEHOLDER |
| `assets/maps/tilesets/mq0_outdoor_forest_v1.png` | 2026-09-15追加。正式屋外タイルセットの一次生成版(1448×1086)。検証の結果、実セルピッチが約71〜72px(32pxの整数倍でない)、アルファ無し、崖/長い橋が1枚絵で独立タイル化できていないため、**そのままの本番tileset化は不可**と判定。方向性の参考として保持し、GID化は未実施。詳細・修正チェックリスト: `PHASE_NO01_OUTDOOR_TILESET_SPEC.md` | REFERENCE |
| `assets/maps/tilesets/source/mq0_terrain_forest_v2_source.png` | 2026-09-15追加。「MQ0 Terrain Forest v2」の原本(1448×1086、16×12グリッド、1セル90.5px)。直接編集・上書き禁止のSOURCE。以下の正規化画像の出所 | SOURCE |
| `assets/maps/tilesets/mq0_terrain_forest_v2.png` | 2026-09-15追加、2026-09-17更新。上記SOURCEから37タイルを個別crop/resizeして正規化した32×32 import-ready atlas(256×288、RGBA)。grass/water/shore/cliff/waterfallをカバー。2026-09-17、既存37タイルは無変更のまま、空き slot へ「土の道 blob-autotile」15種(dirt_full/dirt_edge_n・s・e・w/dirt_corner_ne・nw・se・sw/dirt_inner_ne・nw・se・sw/dirt_variant_01・02、grass_baseとpath_crossから合成)を追記し、計52タイル(256×288のまま、新規GID追加のみ)。No.01昼マップへgrass・water・shore・cliff・waterfall・土の道の全てを正式導入済み(旧DEV_PLACEHOLDER `path_dirt` は0)。対応tileset定義: `tiled/tilesets/mq0_terrain_forest_v2.tsj`。旧来の細い1タイル幅connector系(`path_straight_*`/`path_corner_*`/`path_cross`/`path_end_*`/`path_patch_*`)は未使用のまま保持(削除はしていない) | CURRENT |
| `assets/maps/tilesets/source/mq0_trees_forest_v2_source.png` / `mq0_trees_forest_v2_organized_source.png` | 2026-09-15追加。木/低木/切り株のSOURCE候補2種(前者はchroma-key版、後者は本物のアルファを持つ整理版)。後者を採用。詳細な発見経緯は`PHASE_NO01_OUTDOOR_TILESET_SPEC.md`参照 | SOURCE |
| `assets/maps/tilesets/mq0_trees_forest_v2.png` | 2026-09-15追加。整理版SOURCEから14種(大中小の針葉樹・切り株・低木)を個別crop/denoise/premultiplied resizeで正規化した32×32セル単位のimport-ready atlas(256×384、RGBA)。木は1セルに収めず3×4/2×3/2×2のマルチセル構成。No.01昼マップのtree_canopy/bush_lowを置換済み。対応tileset定義: `tiled/tilesets/mq0_trees_forest_v2.tsj` | CURRENT |
| `assets/maps/tilesets/source/mq0_props_forest_v2_source.png` | 2026-09-16追加。「MQ0 Props Forest v2」の原本(1448×1086、本物の透過、54スプライト)。直接編集・Tiled登録禁止のSOURCE | SOURCE |
| `assets/maps/tilesets/mq0_props_forest_v2.png` | 2026-09-16追加。上記SOURCEから27種(campfire/torch/log/signpost/stump/rock/flower/weed)を個別crop/denoise/premultiplied resizeで正規化した32×32セル単位のimport-ready atlas(256×608、RGBA)。No.01昼マップの該当DEV_PLACEHOLDERを置換し、焚き火広場・北入口を重点調整済み。対応tileset定義: `tiled/tilesets/mq0_props_forest_v2.tsj` | CURRENT |
| `assets/maps/tilesets/source/mq0_bridge_forest_v2_source.png` | 2026-09-16追加。「MQ0 Bridge Forest v2」の原本(1448×1086、本物の透過、30パーツ)。直接編集・Tiled登録禁止のSOURCE | SOURCE |
| `assets/maps/tilesets/mq0_bridge_forest_v2.png` | 2026-09-16追加。上記SOURCEから6種(bridge_h_left/right・center_01/02・post×2)を個別crop/denoise/premultiplied resizeで正規化した、長さ可変(1タイル刻み、2タイル以上)のモジュール式木橋atlas(256×128、RGBA)。No.01昼マップの`bridge_wood`(7タイル)を同位置・同幅で置換済み。対応tileset定義: `tiled/tilesets/mq0_bridge_forest_v2.tsj` | CURRENT |

旧台帳は `モンスタークエスト0 ワールドマップ.png` → `world_map_reference.png` と記載していたが、後者のパスはPhase 8.6監査時に存在しなかった。今回の指定実在画像へ台帳参照を修正し、原本のコピー・移動・削除は行わない。

### はじまりのばしょ
No.01「はじまりのばしょ」は夜版／昼版を用意する。
新規制作では高解像度背景画像とCollision Maskを用意し、夜版／昼版の差分は背景画像・Object・Eventの必要な差分として管理する。
焚き火のアニメーション／光表現が不足する場合は追加対象とする。
昼版のTiled編集用マップ(DEV_PLACEHOLDERタイルセット使用)を2026-09-15に追加。詳細: `PHASE_NO01_DAY_TILED_MAP.md`。

2026-09-13 Phase 4監査: No.01夜版・焚き火の正式画像は未確定。夜のキャンプ場参考画像 `assets/maps/reference/world/mq0_world_map_011_a3fa47cf82.png` はREFERENCEのまま不使用。表示確認はPhaser GraphicsのPLACEHOLDERで行い、正式素材台帳には登録しない。詳細: `PHASE4_STARTING_PLACE.md`。

### Phase 5.5 No.01構図REFERENCE

| パス | 用途 | 状態 |
|---|---|---|
| `assets/maps/reference/starting_place/no01_location_reference_9d4209d80a.png` | 添付1: フォトリアルなロケーション・空間構成 | REFERENCE |
| `assets/maps/reference/starting_place/no01_night_reference_1b51bbe29b.png` | 添付2: 夜のドット風マップイメージ | REFERENCE |
| `assets/maps/reference/starting_place/no01_day_reference_6398a59b13.png` | 添付3: 同一構図の昼のドット風マップイメージ | REFERENCE |

正式ゲーム背景は引き続きTBD。3枚とも背景としてロードせず、FC〜初期SFC風へ再設計する際の参考資料とする。現行表示はDEV_PLACEHOLDER、昼版は未実装。構図基準は `OPENING_SPEC.md` §5、作業記録は `PHASE5_5_VISUAL_BASELINE.md`。

## 6. 戦闘背景
現在の正式方針は、**ドットキャラクターと高品質な2D JRPG／アニメ背景を組み合わせる**こと。背景はゲーム組み込み用として、敵・UIの視認性を優先する。

| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/battle/backgrounds/battle_bg_grassland.png` | 草原 | READY_TO_IMPORT |
| `assets/battle/backgrounds/battle_bg_forest.png` | 森 | READY_TO_IMPORT |
| `assets/battle/backgrounds/battle_bg_forest_alt.png` | 森・別案 | READY_TO_IMPORT |
| `assets/battle/backgrounds/battle_bg_cave.png` | 洞窟 | READY_TO_IMPORT |
| `assets/battle/backgrounds/battle_bg_castle_town.png` | 城・城下町周辺 | READY_TO_IMPORT |
| `assets/battle/backgrounds/battle_bg_snowfield.png` | 雪原 | READY_TO_IMPORT |
| `assets/battle/backgrounds/battle_bg_desert_ruins.png` | 砂漠・遺跡 | READY_TO_IMPORT |
| `assets/battle/backgrounds/battle_bg_dungeon.png` | ダンジョン | READY_TO_IMPORT |
| `assets/battle/backgrounds/battle_bg_dungeon_alt.png` | ダンジョン別案 | READY_TO_IMPORT |
| `assets/battle/backgrounds/battle_bg_boss.png` | ボス戦 | READY_TO_IMPORT |
| `assets/battle/backgrounds/battle_bg_boss_alt.png` | ボス戦別案 | READY_TO_IMPORT |

背景密度の基準は `docs/IMAGE_SPEC.md` を正とする。

## 7. UI
### デーマス戦で使用する実在素材（2026-09-14）

| パス | 用途・根拠 | 状態 |
|---|---|---|
| `assets/monsters/source/portraits/mq0_monster_030_54c4041dec.png` | 名前入りカード`mq0_monster_card_125_d31ea2686f.png`と紹介画像`mq0_promo_019_5c43550724.png`で外見を照合。カード枠・文字を含まない透過単体画像を戦闘へ使用 | REFERENCE / 今回のゲーム表示用に選択 |
| `assets/battle/backgrounds/reference/mq0_battle_bg_008_c44a414baf.png` | 元名「幽冥玉座の魔界アリーナ」。既存ボス戦背景を再利用。No.16の正式内部背景確定ではない | REFERENCE / DEV戦闘用 |

元画像を加工・複製せず、`src/data/monsters.ts`のVite URLから読む。台帳上の未配置`battle_bg_boss.png`等とは区別する。

| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/ui/ui_common.png` | MQ0共通UI | READY_TO_IMPORT |
| `assets/ui/ui_card_gacha.png` | ジャンカードガチャ画面参考/実装素材 | REFERENCE |

確認済み旧ファイル名: `モンスタークエスト0 ガチャ画面.png` → `ui_card_gacha.png`

## 8. ジャンカード
正式総数は45枚。ジャンカードは独立したサブゲームとして楽しめる構成で、本編攻略必須にはしない。

### 完成カード
`assets/cards/full/card_001_<name>.png` ～ `assets/cards/full/card_045_<name>.png`

### 中央絵・透過素材
`assets/cards/art/card_art_001_<name>.png` ～ `assets/cards/art/card_art_045_<name>.png`

確認済み画像:
| 旧ファイル名 | 正式名案 | 状態 |
|---|---|---|
| `Tamago Ghost Retro RPG Card.png` | `assets/cards/full/card_002_tamago_ghost.png` | READY_TO_IMPORT |
| `Retro Pudding Explosion Skill Card.png` | `assets/cards/full/card_skill_pudding_explosion.png` | READY_TO_IMPORT / 番号確認待ち |

公開用ではネタバレカード名を `？？？` にしてよい。内部ID・内部ファイル名は実装上の正式名を維持する。

## 9. モンスター画像
正式総数は25体。

推奨命名:
- `assets/monsters/battle/monster_01_<name>.png`
- `assets/monsters/battle/monster_02_<name>.png`
- ...
- `assets/monsters/battle/monster_25_<name>.png`

公開用では終盤ネタバレ対象を名前・姿とも伏せる。内部資料では正式名を保持する。
中央絵抽出などの原資料は `assets/monsters/source/` に分離し、ゲーム実装用画像と混在させない。

## 10. 宣伝・パッケージ資料
| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/promo/poster_retro_rpg.png` | レトロRPG広告・ポスター | REFERENCE |
| `assets/promo/package_front.png` | パッケージ表面 | READY_TO_IMPORT |
| `assets/promo/package_back.png` | パッケージ裏面・45枚ヒント対応 | READY_TO_IMPORT |

パッケージ裏面の「たびのあいことば」ヒントは45枚対応を正とする。
確認済み旧ファイル名: `Monster Quest 0 Retro RPG Poster(2).png` → `poster_retro_rpg.png`

## 11. ファイル命名禁止例
- `画像1.png`
- `主人公 最新.png`
- `final_final2.png`
- `Monster Quest 0 Retro RPG Poster(2).png`

## 12. Phaser用キー命名
ファイルパスと別にPhaserのasset keyはドット区切りを推奨する。

例:
- `char.protagonist.walk`
- `char.tarosa.walk`
- `char.mirei.walk`
- `char.watabe.walk`
- `battle.bg.grassland`
- `battle.bg.forest`
- `battle.bg.forest_alt`
- `battle.bg.desert_ruins`
- `battle.bg.dungeon`
- `battle.bg.dungeon_alt`
- `battle.bg.boss`
- `battle.bg.boss_alt`
- `ui.common`
- `card.002.tamago_ghost`

旧 `char.hero.walk` は現行主人公へ使用しない。

## 13. 今後の追加手順
1. 新しい画像を作る
2. この台帳で正式パスを決める
3. PNG本体をそのパスへ配置する
4. `READY_TO_IMPORT` を `IN_GITHUB` に変更する
5. `assets/asset_catalog.json` を同期する
6. Phaser側でパスを直書きせず、asset manifest経由で読み込む

> 注意: ChatGPTプロジェクト内で生成された画像と、GitHubリポジトリ上のバイナリ画像は別管理。PNG本体がGitHubに入ったことを確認するまで `IN_GITHUB` にしない。

## 14. Image library allocation

2026-09-12時点のImage本体425件は、内容に応じて以下へ割り振り済みです。

- `assets/characters/reference/`
- `assets/monsters/source/`
- `assets/cards/source/`
- `assets/maps/reference/`
- `assets/battle/backgrounds/reference/`
- `assets/audio/source/`
- `assets/promo/reference/`
- `assets/ui/reference/`
- `assets/misc/reference/`

元ライブラリの監査台帳は `assets/misc/reference/monster_quest0_image_library_20260912/` に残しています。
重複予備はデスクトップのImageマスター側`duplicates/`に保持しています。
