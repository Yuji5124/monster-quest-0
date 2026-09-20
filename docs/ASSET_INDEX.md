# Monster Quest 0 Asset Index

最終更新: 2026-09-20 JST

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
| `assets/title/opening_memories/memory_01.png` | 起動直後のオープニング「思い出の回想」1/6枚目。1672×941。ユーザー提供の`assets/title/reference/A.png`の無加工バイト一致コピー(元画像は保持) | CURRENT |
| `assets/title/opening_memories/memory_02.png` | 起動直後のオープニング「思い出の回想」2/6枚目。1672×941。ユーザー提供の`assets/title/reference/B.png`の無加工バイト一致コピー(元画像は保持) | CURRENT |
| `assets/title/opening_memories/memory_03.png` | 起動直後のオープニング「思い出の回想」3/6枚目。1672×941。ユーザー提供の`assets/title/reference/D.png`の無加工バイト一致コピー(元画像は保持) | CURRENT |
| `assets/title/opening_memories/memory_04.png` | 起動直後のオープニング「思い出の回想」4/6枚目。1672×941。ユーザー提供の`assets/title/reference/E.png`の無加工バイト一致コピー(元画像は保持) | CURRENT |
| `assets/title/opening_memories/memory_05.png` | 起動直後のオープニング「思い出の回想」5/6枚目。1672×941。ユーザー提供の`assets/title/reference/F.png`の無加工バイト一致コピー(元画像は保持) | CURRENT |
| `assets/title/opening_memories/memory_06.png` | 起動直後のオープニング「思い出の回想」6/6枚目。1672×941。ユーザー提供の`assets/title/reference/G.png`の無加工バイト一致コピー(元画像は保持) | CURRENT |
| `assets/title/reference/{A,B,D,E,F,G}.png` | 上記の元画像(REFERENCE)。回想の並びはA→B→D→E→F→G。C.pngは存在しない | REFERENCE |

### ジャンカードガチャ演出

| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/title/reference/I.png` | ユーザー指定のジャンコインでレバーを回す画。1093×1439。ジャンカードの排出前演出で直接ロードする | CURRENT |
| `assets/title/reference/H.png` | ユーザー指定のジャンコイン投入画。1024×1536。上記に続く排出前演出で直接ロードする | CURRENT |

※「誰も知らないゲーム、やってみる？」はサブタイトルではなく広告・紹介用コピーとして扱う。

## 2. 主要パーティ
主要パーティは主人公・タロサ・ミレイの3人。

| 正式パス | 内容 | 状態 |
|---|---|---|
| `assets/characters/playable/hero_walk.png` | **旧女性勇者風主人公 歩行スプライト** | **SUPERSEDED** |
| `assets/characters/playable/protagonist_walk.png` | **最新男性主人公 歩行スプライト** | **CURRENT** |
| `assets/characters/playable/tarosa_walk.png` | タロサ 歩行スプライト | CURRENT |
| `assets/characters/playable/mirei_walk.png` | ミレイ 歩行スプライト | CURRENT |

### 主人公素材の重要注意
現行主人公は、別のモンスタークエスト作品／別バージョン世界で本来NPCだった男性。
旧 `hero_walk.png` は女性勇者風デザインに基づくため、現行主人公として実装しない。

### 2026-09-19 主人公歩行スプライトCURRENT化

ユーザーが `assets/characters/reference/reference/主人公/` へ12枚(正面/うしろ/右/左 × 3フレーム、1254×1254 RGBA)の歩行ポーズ参考画像を追加し、これを正式主人公として採用するよう指示した。`tools/build_protagonist_sheet.py` で以下の手順により `assets/characters/playable/protagonist_walk.png` へ変換し、CURRENTへ昇格した。

- 各フレームをアルファ値でタイトクロップ
- 12枚の中央値の高さへ拡大縮小して揃える
- 事前乗算アルファでの高品質リサイズ(縁の黒フリンジを防止)により、キャラクター高さ64pxへ縮小
- 足元の接地ラインを揃えた54×70セルへ配置し、3列(フレーム1-3)×4行(下/左/右/上)のシートを生成

Phaser側は `src/config/protagonistSprite.ts`(グリッド・フレーム番号・Arcade Body offset定義)と `src/systems/CharacterWalkSprite.ts`(preload/アニメーション登録の汎用ヘルパー、`src/config/characterWalkSprite.ts`のグリッド計算を共有)経由で読み込み、`src/entities/Player.ts` が単色Rectangleから本Spriteへ置き換わった。当たり判定サイズ(30×42)は変更せず、足元中心に揃えている。歩行アニメーションは各方向3フレームのyoyoループ、frameRate 7。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/characters/reference/reference/主人公/*.png` | ユーザー提供の歩行ポーズ参考(12枚)。削除・上書きしない | REFERENCE |
| `assets/characters/playable/protagonist_walk.png` | 上記から生成したCURRENT歩行スプライトシート(162×280、54×70セル) | CURRENT |

正式キャラクターデザイン(青いバンダナ・金髪・赤いマント・金の鎧)自体はユーザー提供のREFERENCEを正としており、AIが独自にデザインし直していない。ただし正式な移動速度・当たり判定寸法・アニメーション速度(frameRate)は引き続きTBDで、Phase 5のTEMP_TEST_VALUEを流用している。

#### 2026-09-19 追記: ノイズ起因の1フレーム肥大化を修正

ユーザーからスクリーンショットで「左歩行2枚目だけ他より一回り大きい」と指摘を受けて調査した結果、`alpha_trim`が生のアルファ値(1以上ならすべて)でbboxを取っていたため、参考画像の多くに散在する肉眼でほぼ見えないノイズ状の点(生成過程由来と思われる、キャンバス全体にまばらに残る極小alpha値のピクセル)まで「内容」とみなし、実際のキャラクター範囲よりはるかに大きいbboxを検出していたと判明した(例: 正面1.pngは生アルファでのbbox 1146×1202だが、alpha≥128でのbboxは621×928)。たまたま左3.pngだけノイズがほぼ無く、他の11枚の"水増しされた"中央値に合わせて正しく拡大された結果、相対的にひとりだけ大きく見えていた。`tools/character_walk_sheet.py`の`alpha_trim`をalpha≥128の閾値でbboxを検出してからクロップする方式に修正し(クロップ自体は元の非閾値アルファを保持するため、実際の縁のアンチエイリアスは失われない)、主人公・タロサとも再生成した。結果、シートサイズは主人公70×70→**54×70**、タロサ78×70→**44×70**セルへ変化(キャラクター本体の見かけの幅がノイズ水増し分小さくなり、より正確な等身大になった)。

### 2026-09-19 タロサ歩行スプライトCURRENT化

同じ日、ユーザーが `assets/characters/reference/reference/タロサ/` へタロサの12枚(正面/うしろ/右/左 × 3フレーム)を追加し、正式採用するよう指示した。`tools/build_tarosa_sheet.py`(主人公と同じパイプラインを`tools/character_walk_sheet.py`として共通化したもの)で `assets/characters/playable/tarosa_walk.png`(44×70セル、キャラクター高さ64pxで主人公と揃える)を生成した。

タロサは操作キャラではなくパーティfollower(`src/systems/PartyFollowers.ts`)のため、Arcade Bodyを持たない前提で`src/config/tarosaSprite.ts`にはbodyOffsetを定義していない。followerは主人公の移動軌跡(`PartyTrail`)を一定距離遅れて辿るだけの表示専用のため、直前フレームから位置が動いたかどうかで歩行アニメ/直立フレームを切り替えている。ミレイ(`mirei_walk.png`)は参考画像未提供のため、引き続き単色Rectangleのフォールバック(`FOLLOWER_APPEARANCE`)のまま。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/characters/reference/reference/タロサ/*.png` | ユーザー提供の歩行ポーズ参考(12枚)。削除・上書きしない | REFERENCE |
| `assets/characters/playable/tarosa_walk.png` | 上記から生成したCURRENT歩行スプライトシート(132×280、44×70セル) | CURRENT |

タロサの正式キャラクターデザイン(青い髪・エルフ耳・弓と矢筒・緑のスカーフ)は`CHARACTER_GROWTH.md`確定事項の「弓を使用」と整合する。

#### 2026-09-19 追記: 横移動時にタロサが浮いて見える問題を修正

ユーザーから「横になるとタロサがズレる」と指摘を受けて調査した結果、`PartyFollowers.ts`が`PartyTrail`の記録座標(主人公の`body.center`、Arcade Bodyのため足元寄りでスプライト原点より約11px下)を、タロサのSprite原点(フレーム中心)へそのまま`setPosition`していたのが原因と判明した。単色Rectangle時代はRectangle自身の原点=body中心相当だったため問題が起きなかったが、Spriteでは原点とbody中心相当点がズレるため、縦移動では追従距離(42px)に紛れて目立たず、横一列に並ぶと約11pxのズレが視認できていた。`src/config/characterWalkSprite.ts`に`bodyCenterOffset()`を追加し、`PartyFollowers.ts`が各followerの見た目のズレを打ち消してから配置するよう修正(Rectangleはオフセット0のまま)。修正後、主人公とタロサの足元ラインが横移動時も完全に一致することを確認した。

### 2026-09-19 ミレイ歩行スプライトCURRENT化

同じ日、ユーザーが `assets/characters/reference/reference/ミレイ/` へミレイの12枚(正面/うしろ/右/左 × 3フレーム)を追加し、正式採用するよう指示した。`tools/build_mirei_sheet.py`(同じく`tools/character_walk_sheet.py`を共有)で `assets/characters/playable/mirei_walk.png`(54×70セル、キャラクター高さ64pxで主人公・タロサと揃える)を生成した。`PartyFollowers.ts`のDEV_PARTY_PLACEHOLDER_SPRITE(単色Rectangle、`FOLLOWER_APPEARANCE`)をこのSpriteへ置き換え、タロサと同じく動いているかどうかで歩行アニメ/直立フレームを切り替えている。

`左3.png`のみ透過なし(黒背景がそのまま焼き込まれた不透明画像)だったため、色類似度によるフラッドフィル再構成を試したが、背景色がキャラクター自身の黒縁と同色で見分けられず、縁が消えて色だけの間延びした見た目になる問題が判明した。信頼性を優先し、`tools/character_walk_sheet.py`の`alpha_trim`は透過なしフレームを検出すると`OpaqueReferenceFrameError`を送出して明示的に止まるようにし、`build_mirei_sheet.py`側で該当スロットを`左1.png`の複製に差し替えている(左方向は2ポーズの歩行サイクルになる)。透過つきの`左3.png`を再提供いただければ差し替え可能。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/characters/reference/reference/ミレイ/*.png` | ユーザー提供の歩行ポーズ参考(12枚、うち左3.pngは透過なしのため未使用)。削除・上書きしない | REFERENCE |
| `assets/characters/playable/mirei_walk.png` | 上記から生成したCURRENT歩行スプライトシート(162×280、54×70セル) | CURRENT |

ミレイの正式キャラクターデザイン(紫髪・紫目・白と金のフード付きローブ)は`GAME_SPEC.md`の「レインランドの姫」設定と矛盾しない。

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
| `assets/maps/starting_place/background.png` | No.01通常Sceneが読むCURRENTの1448×1086高解像度BACKGROUND（**夜版**、オープニングの舞台）。`assets/maps/reference/reference/はじまりのばしょ_夜.png`の無加工コピー（原本は削除・上書きしない）。LINEARフィルタで表示する。2026-09-19に旧1536×1024の昼景（城門・木橋）から差し替え、旧画像はgit履歴(e26d6bf)に残る | CURRENT |
| `assets/maps/starting_place/collision.png` | 上記と同寸法のCURRENT二値Collision Mask（白=歩行可能、黒=歩行不可）。草地・土の道をHSV色閾値で抽出→北の小道と石段を追加→焚き火の輪・丸太・切り株・崖縁の柵を除外→8pxの安全マージン→16pxセル格子でspawnから4方向に繋がらない飛び地を除去して生成。昼版画像と同一構図のため昼版へも流用できる。人間が修正でき、実行時は生成済みマスクだけを読む | CURRENT |
| `assets/maps/world_map/background.png` | ポイント選択式ワールドマップ用のCURRENTオリジナル高解像度背景。1448×1086・4:3。実行時はLINEARで縮小表示 | CURRENT |
| `assets/maps/starting_forest/background.png` | はじまりのもり用CURRENTの1536×1024高解像度BACKGROUND。`assets/maps/reference/reference/はじまりのもり.png`の無加工コピー（原本は削除・上書きしない） | CURRENT |
| `assets/maps/starting_forest/collision.png` | 上記と同寸法のCURRENT二値Collision Mask（白=歩行可能、黒=歩行不可）。背景のHSV色閾値で道を抽出→最大連結成分のみ採用→プレイヤー幅分だけ膨張→南の木戸・北の石アーチまで到達させて生成。人間が上書き修正できる通常のPNG | CURRENT |
| `assets/maps/bie_village/background.png` | No.03ビーエのむら用CURRENTの1536×1024高解像度BACKGROUND。`assets/maps/reference/reference/ビーエのむら.png`の無加工コピー（原本は削除・上書きしない） | CURRENT |
| `assets/maps/bie_village/collision.png` | 上記と同寸法のCURRENT二値Collision Mask（白=歩行可能、黒=歩行不可）。広場・石畳・土の道をHSV色閾値で抽出し、建物6棟＋井戸/かまど状の構造物の敷地を個別に除外、川を除外したうえでプレイヤー幅分だけ膨張して生成。北門のみを世界地図への唯一の出入口とする | CURRENT |
| `assets/maps/starting_town/background.png` | No.02はじまりのまち用CURRENTの1448×1086高解像度BACKGROUND。`assets/maps/reference/reference/はじまりのまち.png`の無加工コピー（原本は削除・上書きしない） | CURRENT |
| `assets/maps/starting_town/collision.png` | 上記と同寸法のCURRENT二値Collision Mask（白=歩行可能、黒=歩行不可）。噴水広場・石畳・土の道をHSV色閾値で抽出し、建物5棟の敷地を個別に除外（各建物の出入口だけ帯状に歩行可能を残す）、噴水・花壇・川を除外したうえでプレイヤー幅分だけ膨張して生成。西端のみを世界地図への正式出入口とする | CURRENT |

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

CURRENTのNo.01夜背景は `assets/maps/starting_place/background.png` として画像マップ方式でロードする（下記「はじまりのばしょ（画像マップ）」参照）。上記3枚は引き続きREFERENCEである。構図基準は `OPENING_SPEC.md` §5、作業記録は `PHASE5_5_VISUAL_BASELINE.md`。

### はじまりのばしょ（画像マップ）

2026-09-19、ユーザー指示によりNo.01の背景を新しい夜版画像へ差し替えた。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/maps/reference/reference/はじまりのばしょ_夜.png` | ユーザー提供のSOURCE原画（夜、1448×1086）。削除・上書き・再描画はしない | REFERENCE |
| `assets/maps/reference/reference/はじまりのばしょ.png` | ユーザー提供のSOURCE原画（昼／夕景、1448×1086）。夜版と画素単位で同一構図。昼版への切替は未実装(TBD) | REFERENCE |
| `assets/maps/starting_place/background.png` | 夜版原画の無加工コピー。StartingPlaceSceneがLINEARフィルタで表示するCURRENT背景 | CURRENT |
| `assets/maps/starting_place/collision.png` | 上記用のCURRENT二値Collision Mask（昼版にも流用可） | CURRENT |

### はじまりのもり

2026-09-18追加。No.01「はじまりのばしょ」と同じBACKGROUND/COLLISION/EVENT/OBJECT画像マップ方式を流用した追加フィールド。正式No.01〜No.20の番号は持たない（`MAP_FLOW_SPEC.md` 参照）。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/maps/reference/reference/はじまりのもり.png` | ユーザー提供のSOURCE原画（1536×1024）。削除・上書き・再描画はしない | REFERENCE |
| `assets/maps/starting_forest/background.png` | 上記の無加工コピー。StartingForestSceneがLINEARフィルタで表示するCURRENT背景 | CURRENT |
| `assets/maps/starting_forest/collision.png` | 背景から自動生成したCURRENT二値Collision Mask（南の木戸から北の石アーチまで続く道を歩行可能とし、木・岩・池・崖は歩行不可） | CURRENT |

Collisionの作り方: 背景をHSV変換し、道の色域（H≈33〜52°, S≈0.28〜0.62, V≥0.45）で二値化→最大連結成分だけを採用（柵・丸太・岩の同系色ノイズを除去）→プレイヤー幅（30px）に対して十分な余裕を持たせるため半径20pxで膨張→形状を滑らかにする軽いクロージング→南端・北端の画像外周まで到達させる、という手順で生成した。最終的な白黒はPNGとして保存されており、以後は人間が直接ピクセルを描画・削除して修正できる（実行時にAI画像解析は行わない、`MAP_SYSTEM.md` §5準拠）。

### レインランドのもり

2026-09-19追加。はじまりのもりと同じ追加フィールド（正式No.01〜No.20の番号なし）。同一エリアの2画面で、No.01と同じ画像マップ方式を流用する（`MAP_FLOW_SPEC.md` §4.10）。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/maps/reference/reference/レインランドのもり　その１.png` | ユーザー提供のSOURCE原画（1448×1086）。削除・上書き・再描画はしない | REFERENCE |
| `assets/maps/reference/reference/レインランドのもり　その2.png` | ユーザー提供のSOURCE原画（1448×1086）。削除・上書き・再描画はしない | REFERENCE |
| `assets/maps/rainland_forest_1/background.png` | その１原画の無加工コピー。`RainlandForest1Scene`がLINEARフィルタで表示するCURRENT背景 | CURRENT |
| `assets/maps/rainland_forest_1/collision.png` | その1用CURRENT二値Collision Mask（道・橋・木の階段・遺跡の祭壇と石段が歩行可能、水・滝・崖・森は歩行不可） | CURRENT |
| `assets/maps/rainland_forest_2/background.png` | その2原画の無加工コピー。`RainlandForest2Scene`がLINEARフィルタで表示するCURRENT背景 | CURRENT |
| `assets/maps/rainland_forest_2/collision.png` | その2用CURRENT二値Collision Mask（同上。遺跡2か所とアーチの通路、石段、橋を含む） | CURRENT |

### まじんのどうくつ

2026-09-20更新。正式No.08は32px論理グリッドの特殊Dungeon RPGへ移行。キービジュアルと旧`その1〜3`は資料として保持し、ランタイム背景・入場演出としては使用しない。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/maps/reference/reference/まじんのどうくつ.png` | ユーザー提供のキービジュアル（1448×1086）。削除・上書きせず、UI・構成・雰囲気のREFERENCEとしてのみ保持。ランタイムにはロードしない | REFERENCE |
| `assets/maps/reference/reference/mq0_majin_cave_tileset.png` / `.json` | No.08専用タイルセットのSOURCE／仕様（256×256 RGBA、32px、8×8、64セル） | REFERENCE |
| `assets/maps/majin_cave/tileset.png` / `tileset.json` | 上記のバイト一致ランタイムコピー。`MajinCaveScene`がスプライトシートとメタデータとして読む | CURRENT |
| `assets/maps/reference/reference/まじんのどうくつ_その１.png` / `その2.png` / `その3.png` | 旧画像マップ初期実装で使った洞窟内資料。新しいNo.08ランタイムは直接ロードしない | REFERENCE |
| `assets/maps/majin_cave_1/` / `majin_cave_2/` / `majin_cave_3/` | 旧3画面画像マップのパッケージ。削除せず、No.08の現行runtimeでは使用しない | SUPERSEDED |

### レインランドじょうかまち

2026-09-19追加。はじまりのもり・レインランドのもりと同じ追加フィールド（正式No.の番号なし、`MAP_FLOW_SPEC.md` §4.12）。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/maps/reference/reference/レインランドじょうかまち.png` | ユーザー提供のSOURCE原画（俯瞰の町マップ、1447×1087）。削除・上書き・再描画はしない | REFERENCE |
| `assets/maps/reference/reference/レインランドじょう_イメージ.png` | ユーザー提供のSOURCE原画（城と滝の絶景、1448×1086）。町の入場演出用で、歩行背景としては使わない。削除・上書き・再描画はしない | REFERENCE |
| `assets/maps/rainland_castle_town/background.png` | 町マップ原画の無加工コピー。`RainlandCastleTownScene`がLINEARで表示するCURRENT背景 | CURRENT |
| `assets/maps/rainland_castle_town/collision.png` | CURRENT二値Collision Mask（石畳の道・広場・石段・堀の橋が歩行可能、家・噴水・露店・堀・城壁・桟橋は歩行不可） | CURRENT |
| `assets/maps/rainland_castle_town/entry_splash.png` | 絶景画像の無加工コピー。`MapSplashScene`が世界地図からの入場時に5秒で投影するCURRENT画像 | CURRENT |

### レインランドじょう（No.05）

2026-09-19追加、2026-09-20に正式背景へ差し替え。`MAP_FLOW_SPEC.md` §4.13。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/maps/reference/reference/レインランドじょう_城内.png` | ユーザー提供のSOURCE原画（城内の俯瞰マップ、1448×1086）。削除・上書き・再描画はしない | REFERENCE |
| `assets/maps/rainland_castle/background.png` | 上記原画の無加工コピー（バイト一致）。CURRENT背景 | CURRENT |
| `assets/maps/rainland_castle/collision.png` | CURRENT二値Collision Mask。`tools/build_rainland_castle_collision.py`が背景から測った歩行領域・障害物の矩形から生成（8pxセル格子に揃え、壁より少し内側）。白=歩行可能／黒=歩行不可 | CURRENT |
| `assets/maps/reference/reference/レインランドじょう_マイクラ風.png` | ユーザー提供の参照画像（ブロック城の一人称視点、1448×1086）。歩行背景ではなく、将来のブロック城化の見た目の参照。削除・上書き・再描画はしない | REFERENCE |
| `assets/maps/reference/reference/レインランドじょう_イメージ.png` | 城の外観（町の入場演出用、上記「レインランドじょうかまち」参照）。城内の背景としては使わない | REFERENCE |

差し替え手順（背景をもう一度差し替える場合）: 新しい背景を`background.png`へ置く（原本は`assets/maps/reference/reference/`へ保存）→ `tools/build_rainland_castle_collision.py`の矩形を新しい絵に合わせて測り直し、実行して`collision.png`を作り直す（`--preview`で確認）→ `map.json`の`width`/`height`を更新（Sceneのコードは変更しない）→ `maps.ts`のspawn・NPC座標と`events.json`の座標を置き直す → `tests/rainlandCastle.test.mjs`の歩行可否の確認地点を更新する。

### ビーエのむら

2026-09-18追加。正式No.03。No.01「はじまりのばしょ」と同じBACKGROUND/COLLISION/EVENT/OBJECT画像マップ方式をそのまま流用した最初のNo.番号付き地域。NPC・会話・木こり救出イベントは `docs/NPC/02_bie_no_mura.md` が `SOURCE_DRAFT_EXISTS / REDUCING`（NPC人数・台詞本文とも未確定）のため今回は未実装。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/maps/reference/reference/ビーエのむら.png` | ユーザー提供のSOURCE原画（1536×1024、見下ろし気味の構図）。削除・上書き・再描画はしない | REFERENCE |
| `assets/maps/reference/reference/ビーエのむら_イメージ.png` | 雰囲気参考用の俯瞰パース画像（1448×1086）。ローカルマップ背景としては採用しない | REFERENCE |
| `assets/maps/bie_village/background.png` | 前者の無加工コピー。BieVillageSceneがLINEARフィルタで表示するCURRENT背景 | CURRENT |
| `assets/maps/bie_village/collision.png` | 背景から自動生成したCURRENT二値Collision Mask（広場・石畳・土の道が歩行可能、建物6棟・井戸状構造物・川・森は歩行不可） | CURRENT |

Collisionの作り方: 背景をHSV変換し、広場の石畳＋土の道の色域で二値化（道の色域は森はじまりのもりと同じ閾値、加えて低彩度・高明度の石畳を追加）→川を別途青系色閾値で除外→最大連結成分（橋の分離片は個別検出のうえ結合）を採用→建物6棟・井戸/かまど状構造物の敷地を目視確認した矩形で個別に除外→プレイヤー幅（30px）に対して余裕を持たせるため段階的に膨張（最終半径16px相当）→装飾的な低い庭石垣や木の樹冠でHSV閾値が途切れていた2箇所だけ人間が矩形パッチで接続→北門のみ画像上端まで到達させる、という手順で生成した。橋・広場を囲む道など見た目どおり自然に歩ける範囲を優先し、一本道には固定していない。最終的な白黒はPNGとして保存されており、以後は人間が直接ピクセルを描画・削除して修正できる（実行時にAI画像解析は行わない、`MAP_SYSTEM.md` §5準拠）。北門以外にも画像端まで続く道（東・南東）があるが、正式な出入口としては未接続のまま行き止まりとして残した。

### はじまりのまち

2026-09-19更新。No.02「はじまりのまち」をDEV_PLACEHOLDER表示（単色背景＋Building entityの単色矩形）からCURRENT背景画像方式へ移行した。NPC・会話・パーティ加入・戦闘イベント・建物内部（InteriorScene）接続はPhase 7〜8-Bの既存実装をそのまま再利用し、外観の描画とCollisionだけを画像マップ方式に置き換えた。

| パス | 用途 | 状態 |
|---|---|---|
| `assets/maps/reference/reference/はじまりのまち.png` | ユーザー提供のSOURCE原画（1448×1086、噴水広場を中心にした十字型の町並み）。削除・上書き・再描画はしない | REFERENCE |
| `assets/maps/reference/reference/はじまりのまち_イメージ.png` | 同寸法の別案/参考画像。ローカルマップ背景としては採用しない | REFERENCE |
| `assets/maps/starting_town/background.png` | 前者の無加工コピー。StartingTownSceneがLINEARフィルタで表示するCURRENT背景 | CURRENT |
| `assets/maps/starting_town/collision.png` | 背景から自動生成したCURRENT二値Collision Mask（噴水広場・石畳・土の道が歩行可能、建物5棟・噴水・花壇・川・森は歩行不可） | CURRENT |

**建物6→5への変更**: reference画像には教会(きょうかい)と、その手前に4棟の家（屋台風の日よけがある店＝どうぐや、井戸と薪のある家＝ぶきや、普通の家＝民家A、干し草のある家＝やどや）＝合計5棟しか描かれていない。旧DEV_PLACEHOLDER時代のデータは6棟（民家Bを含む）だったが、実在しない6棟目を維持しないとユーザーが判断し、民家B（`map_02_house_b`）と対応する内部データ・spawnを正式に削除した。`assets/maps/data/no02_start_town_interiors.json`・`src/config/interiors.ts`・`src/config/maps.ts`を同時に更新済み。

Collisionの作り方: はじまりのもり/ビーエのむらと同じ手順（HSV色閾値で広場の石畳＋土の道を抽出→川を除外→最大連結成分を採用→建物5棟の敷地を矩形で個別に除外しつつ、各建物の出入口だけ帯状に歩行可能を残す→段階的に膨張→西端が画像端まで自然に到達する箇所をそのまま西門として採用）で生成した。噴水と4つの花壇は色閾値だけで自然に除外され、追加の手作業は不要だった。壁のCollisionは背景画像のCollision Maskが担うため、旧`entities/Building.ts`（単色矩形描画＋壁セグメント計算）と`config/building.ts`は不要になり削除した。建物のドア判定（`interiorId`がある建物だけInteriorSceneへ遷移）はPhase 8-Bの`building.door`＋`createExitZone`をそのまま再利用している。

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

はじまりのもりの現在の戦闘表示は、原画を直接読む暫定接続とする。名称と出現地域は確定済みだが、最終ステータスと実装用の整理済み素材パスはTBD。

| 名称 | 現在の戦闘用参照パス | 状態 |
|---|---|---|
| たまゴースト | `assets/monsters/source/portraits/mq0_monster_001_0d78a307c8.png` | REFERENCE / はじまりのもりに出現 |
| プリン | `assets/monsters/source/portraits/mq0_monster_003_1e2e150bba.png` | REFERENCE / はじまりのもりに出現 |

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
