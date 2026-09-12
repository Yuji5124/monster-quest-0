# Monster Quest 0 Asset Index

最終更新: 2026-09-13 JST

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
| `assets/title/title_background.png` | タイトル背景 | NEEDS_REVIEW |

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

## 5. マップ・タイル
| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/maps/tilesets/tileset_base.png` | MQ0基本タイルセット | READY_TO_IMPORT |
| `assets/maps/tilesets/tileset_extra.png` | MQ0追加タイルセット | READY_TO_IMPORT |
| `assets/maps/reference/world_map_reference.png` | ワールドマップ参考画像 | REFERENCE |

確認済み旧ファイル名: `モンスタークエスト0 ワールドマップ.png` → `world_map_reference.png`

### はじまりのばしょ
No.01「はじまりのばしょ」は夜版／昼版を用意する。
必要素材は実装方式に応じて、既存タイルセット + ライティング／色調差分、または専用マップ差分で管理する。
焚き火のアニメーション／光表現が不足する場合は追加対象とする。

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
