# No.01「はじまりのばしょ」昼 正式屋外タイルセット仕様

最終更新: 2026-09-17 JST

## ステータス(v8、最新): **DONE — Path Forest v2をNo.01へ正式導入。No.01の視覚DEV_PLACEHOLDERは0件(Terrain/Trees/Props/Bridge/Path全て正式)**

2026-09-17、Ground層に最後まで残っていた`path_dirt`(140セル)を、既存の細い1タイル幅connector系を再利用せず、新規の「blob autotile」方式(full/edge×4/outer-corner×4/inner-corner×4/variant×2、計15種)で正式化した。新規タイルは既存`mq0_terrain_forest_v2.png`/`.tsj`の空きslotへ追記し、既存37タイルは無変更のまま計52タイルとした。あわせて焚き火広場の東側を拡張する美観調整も実施。No.01のGround/Terrain/Buildings層における視覚DEV_PLACEHOLDER使用は0件になった(Collision層の`collision_solid_marker`のみ、全Phase共通の非表示オーサリングマーカーとして残存、視覚アセット置換の対象外)。これでNo.01「はじまりのばしょ」昼マップの正式屋外タイルセット化(Terrain/Trees/Props/Bridge/Path)は完了。詳細は下記「§ v8: MQ0 Path Forest v2 正式化」。

## ステータス(v7、履歴): **PARTIAL — Bridge Forest v2をNo.01へ正式導入。DEV_PLACEHOLDERはpath_dirt(140セル)のみ残存**

2026-09-16、SOURCE画像 `assets/maps/tilesets/source/mq0_bridge_forest_v2_source.png` が配置されたため、「長さ可変・32pxグリッド対応の正式木橋モジュール」として正規化し、No.01の`bridge_wood`(7セル幅)を置換した。DEV_PLACEHOLDERのTerrain使用は0になったが、Ground層の`path_dirt`(140セル、terrain v2フェーズで意図的に見送り済み)のみが残存している。詳細は下記「§ v7: MQ0 Bridge Forest v2 正式化」。

## ステータス(v6、履歴): Props Forest v2をNo.01へ正式導入、焚き火広場+北入口を重点調整

2026-09-16、SOURCE画像 `assets/maps/tilesets/source/mq0_props_forest_v2_source.png` が配置されたため、Props Forest v2を正規化してNo.01へ導入した。campfire/log/signpost/torch/rock/flower/weedのDEV_PLACEHOLDERを置換し、焚き火広場と北入口を重点的に組み直した。着手前にexit_northのイベント矩形不整合も修正し、Trees Phaseを正式にCLOSEDとした。詳細は下記「§ v6: MQ0 Props Forest v2 正式化」。

以下はv4/v5(外周脱出バグ修正、Props SOURCE未着手だった時点の記録)。

## ステータス(v4、履歴): 外周脱出バグを修正、Props Forest v2はSOURCE待ちでBLOCKED(解消済み)

2026-09-15、trees v2フェーズで導入した大中小木のCollision再設計により、**外周の一部(特に北側y=0のほぼ全域)でCollisionが意図せず解除され、正式Exit以外からマップ外周へ抜けられる状態になっていた**ことをPlayerSpawnからのFlood Fill検証で発見した。原因と修正は下記「§ v4: 外周脱出バグの修正」を参照。

続けて「MQ0 Props Forest v2」の正式化に着手したが、**`assets/maps/tilesets/source/mq0_props_forest_v2_source.png`が存在しない**ため、atlas作成はBLOCKEDとした(詳細は「§ v5: Props Forest v2 — SOURCE未着手」、v6で解消)。チャット内に共有された参考画像は個別スプライトを抽出できる形式のシートではなく、完成イメージのビジュアルリファレンスとして扱っている。

## ステータス(v2、terrain): **PARTIAL — 正規化済みterrain tilesetをNo.01へ試験導入済み**

2026-09-15、「MQ0 Terrain Forest v2」ソース画像を実測・正規化し、`assets/maps/tilesets/mq0_terrain_forest_v2.png`(256×288、RGBA、32px厳密グリッド)+ `tiled/tilesets/mq0_terrain_forest_v2.tsj` を新規作成した。地形の一部(grass / water / shore / cliff / waterfall)を `mq0_map01_starting_place_day.tmj` へ試験導入し、Collision・Events・歩行ルートを維持したまま検証済み(詳細は下記「§ v2: MQ0 Terrain Forest v2 正規化パイプライン」)。**土の道(dirt path)は今回置換していない**(理由は同セクション参照)。木・低木・岩・花・切り株・松明・キャンプファイア・橋は引き続きDEV_PLACEHOLDERのまま。

以下は旧v1(`mq0_outdoor_forest_v1.png`)の判定記録(履歴として保持、無効化はしていない)。

## v1 ステータス(履歴): **BLOCKED — 受領画像はVISUAL REFERENCE、そのままの本番tileset化は不可**

2026-09-15、`assets/maps/tilesets/mq0_outdoor_forest_v1.png`(2652563 bytes、1448×1086、RGB)が配置された。中身を検証した結果、**32×32グリッドのTiled用atlasとしてそのまま切り出せる状態ではない**と判定した(詳細は下記「§ 受領画像の実用性判定」)。無理に完成扱いにせず、今回も以下は一切作成/変更していない。

- `tiled/tilesets/mq0_outdoor_forest_v1.tsj`
- `tiled/maps/mq0_map01_starting_place_day.tmj` へのGID置換・tileset参照変更

現行の `tiled/maps/mq0_map01_starting_place_day.tmj` は **DEV_PLACEHOLDERタイルセット(`mq0_dev_placeholder_outdoor`)を参照したまま変更していない**。Collision / Events(`playerSpawn` / `exit_north` / `exit_east` / `event_campfire`)/ マップサイズ(48×36、32px)/ レイヤー構成(`Reference`/`Ground`/`Terrain`/`Buildings`/`Collision`/`Events`)も無変更。

## 受領画像の実用性判定(2026-09-15)

### 測定方法
グレースケール化した行/列ごとの隣接ピクセル差分(勾配)を集計し、格子線(セル境界)の位置をピーク検出で特定した(`numpy`使用、目視でも複数箇所をズームして確認)。

### 測定結果
- **実際のセルピッチは約71〜72px**(草地/花/道/水の上部ブロックで71,70,71,72,70,71,72,70,71,72,71,70pxと非常に安定して検出)。指定の32pxはおろか、32の整数倍(64px・96pxであれば劣化なくダウンスケール可能)にも一致しない。71÷32≈2.22、72÷32≈2.25で中途半端な比率のため、32pxへ縮小するには非整数倍率のリサンプリングが必要になり、FC〜初期SFC基調で求められる「くっきりしたドット」が滲む。
- 画像は **RGBモード(アルファチャンネル無し)**。各セルに背景の草地色が焼き込まれているため、木・岩・低木のような「Terrain上に置いて下のGroundと自然に重なる」装飾タイルとしては、下地の色が完全一致しない限り継ぎ目が出る。
- 上部の草地/花/道/水ブロックは上記の通りセルピッチが安定しているが、**木・崖ブロック(y≈300〜660px)以降は間隔が不規則**(検出diffが70→110→123→140→70→62→57pxのように乱れる)。これは大中小の木のサイズ違いを1枚の絵として意図的に描いた結果でもあるが、同時に技術的な整列も崩れている。
- **崖は「まっすぐな壁」「外角」のような独立re-usableパーツではなく、ジグザグ模様が複数セルにまたがる1枚の壁画として描かれている**(ズーム確認済み)。このため単純に1マスずつ切り出しても、実際のマップ形状(このマップの崖配置は元画像の壁画パターンとは一致しない)に合わせて自由に再配置できない。崖を使うには「まっすぐな面」「外角(左右)」「上端」を独立パーツとして再制作する必要がある。
- 橋セクションは他より再利用を意識した構成(単独の柱、繰り返しに近い短い区間、フェンス単体)が見られ、比較的モジュール化しやすい部類。ただし長い橋本体はデッキ模様が区間ごとに変化する1枚絵に近く、そのままでは端/中央/端の3タイル構成として綺麗に3分割できない。

### 判定
**「視覚参考としては有用だがそのまま運用は難しい」**(実装上の注意のB案)を選択した。

根拠:
- ピッチが仕様(32px)にも、その整数倍にも一致しない → 縮小するとドットが滲み、FC〜初期SFC基調の可読性基準を満たせない。
- アルファ無し → 装飾タイルの自然な重なりが技術的に成立しない。
- 崖・長い橋が「モジュール化されたタイル部品」ではなく「1枚の壁画/連続イラスト」として描かれている → Tiledで自由に組み替えて使う本来のtileset運用と根本的に噛み合わない。

一方で、**色使い・木のサイズバリエーション・草地の濃淡・花や低木の描き分け・橋や松明のデザイン方向性は全て良好**で、次の制作(再生成 or 手直し)の強い指針になる。

### 「一部調整すれば使用可能」に踏み込まなかった理由
草地/道/水の上部ブロックだけならピッチが安定しており、切り出し+縮小自体は可能ではある。しかし縮小倍率が非整数(約0.45倍)になるため、機械的にリサイズすると輪郭が滲み、DEV_PLACEHOLDERより見た目が改善するとは限らない(むしろ「中途半端にぼやけたタイル」になるリスクが高い)。中途半端な品質のGIDをtmjへ組み込むより、**現行のDEV_PLACEHOLDERを維持し、正式画像は仕様待ちのまま次の生成/修正へ回す**方が誠実と判断した。

## 作業前確認

1. `tiled/maps/mq0_map01_starting_place_day.tmj` — 既存構造(§前フェーズ`docs/PHASE_NO01_DAY_TILED_MAP.md`)を確認、無変更で維持することにした。
2. DEV_PLACEHOLDERタイルセット(`tiled/tilesets/mq0_dev_placeholder_outdoor.tsj`) — 17種、32px、単色/簡易アイコンのみと確認。
3. `assets/maps/tilesets/` — 2026-09-15時点で `.gitkeep` / DEV_PLACEHOLDER PNG / 新規配置された `mq0_outdoor_forest_v1.png` の3件。後者の実用性判定は下記「§ 受領画像の実用性判定」を参照。
4. `docs/IMAGE_SPEC.md` — フィールドマップは「FC〜初期SFCを感じるレトロゲーム表現を基本とする」(高品質2D/アニメ調は戦闘背景・探索/イベント背景の方針であり、歩行フィールドタイルには適用しない)。
5. `docs/ASSET_INDEX.md` — 正式屋外タイルセットの正本パスは`tileset_base.png`/`tileset_extra.png`のままREADY_TO_IMPORT(未着手)。今回の`mq0_outdoor_forest_v1.png`はNo.01専用の新規タイルセットとして、これらとは別に台帳登録する前提(既存2ファイルを置き換えるものではない)。
6. Tiled側のtileset参照方式 — `.tmj`の`tilesets`配列に`{firstgid, source}`で外部`.tsj`を相対パス参照する既存方式をそのまま踏襲する(前フェーズと同じ)。
7. `docs/CREATIVE_DIRECTION.md` — No.01「物語の始まり」は「特に丁寧に描く場所」に指定されている。FC〜初期SFC基調は維持しつつ、参考画像 (`no01_day_reference_6398a59b13.png`, 1448×1086) 程度の仕上げを目指す根拠として扱う(全編一律の密度にはしない)。
8. `docs/IMAGE_SPEC.md`「AI担当」— 画像の**生成**はChatGPT側の担当、Claude Code/Codexは複数ファイル修正・参照更新・検証の担当と役割分担されている。本書はその生成担当(ChatGPT、または人間ドット絵担当)へ渡す発注仕様として作成した。

## スタイル方針

- FC〜初期SFC基調のドット絵。参考画像のような描き込みは「基調の中で丁寧に仕上げる」方向とし、戦闘背景のような塗り/グラデーション主体のイラスト調にはしない。
- 32×32pxグリッドを維持。大型オブジェクト(大木・崖・橋・滝)は複数タイルの組み合わせで表現し、1タイルへ無理に収めない。
- 配色は参考画像の「緑基調+暖色の土/木材+青緑の水」の方向性を踏襲してよいが、参考画像そのものの構図・レイアウトの直接模倣はしない(タイル単位の再利用可能な部品として設計する)。
- 影は簡易な単色/2階調程度に留め、過度な写実表現をしない(FC〜初期SFCの可読性を優先)。

## 木の重なり表現について(未決定・独断で追加していない)

参考画像は針葉樹がグリッド1マス分より背が高く、プレイヤーより手前(奥)に応じて重なって見える表現(いわゆるY-sort、または「Above」専用レイヤーでの常時手前表示)を使っている。

- 現在のTiled標準構成(`tiled/extensions/mq0/config.mjs`)に`Above`相当のレイヤーは存在しない。
- Phaser側はTiled読み込み自体が未実装のため、Y-sort/Above方式のどちらを採るかはPhaser接続を設計する別Phaseの判断が必要。
- 本書では**指示通り独断でAboveレイヤーを追加していない**。下記の木の仕様は、どちらの方式でも成立するよう「各木の最下段(根元)タイルだけが実際の足元セルを占有し、上段タイルは視覚的な重なり用」という前提で設計した。Above方式を採る場合は上段タイルをAboveレイヤーへ、採らない場合は上段タイルもTerrainレイヤーへそのまま積む(その場合、木の真上のマスも通常通りCollisionで塞ぐ)。
- 採用方式は次回Phaser接続時にユーザー判断のうえ決定してください。

## 必要タイル一覧

凡例: 歩行=◯(walkable) / ×(blocking)。「多タイル」列は1オブジェクトを構成するタイル数。

### 地面・道(単体タイル、8方向境界セットあり)
| タイルID(案) | 内容 | 歩行 | 多タイル |
|---|---|:-:|:-:|
| grass_base | 草地(基本) | ◯ | 1 |
| grass_shade_a | 草の濃淡(暗) | ◯ | 1 |
| grass_shade_b | 草の濃淡(明) | ◯ | 1 |
| grass_tuft | 草むら(装飾) | ◯ | 1 |
| dirt_path_base | 土の道(基本) | ◯ | 1 |
| path_edge_n/s/e/w | 草⇔土の境界(直線4方向) | ◯ | 4 |
| path_edge_corner_ne/nw/se/sw | 草⇔土の境界(角4方向) | ◯ | 4 |

### 植生・装飾(単体タイル)
| タイルID(案) | 内容 | 歩行 | 多タイル |
|---|---|:-:|:-:|
| bush | 低木 | ◯ | 1 |
| stump | 切り株 | ◯ | 1 |
| log_left / log_right | 倒木(横2タイル1組) | ◯ | 2 |
| rock_small | 岩(小、単体) | × | 1 |
| rock_cluster_l / rock_cluster_r | 岩(大、2タイル1組) | × | 2 |
| flower_a / flower_b | 花(色違い2種) | ◯ | 2 |
| torch | 松明 | ◯ | 1 |
| signpost | 看板 | × | 1 |
| campfire_ring | キャンプファイア(石囲い+炎) | × (中心のみ) | 1 |

### 木(3サイズ、根元のみ実際の足元セルとして扱う)
| タイルID(案) | 内容 | 歩行 | 多タイル |
|---|---|:-:|:-:|
| tree_small | 小木(1マス完結、遠景/密林向け) | × | 1 |
| tree_med_top / tree_med_base | 中木(縦2マス) | ×(baseのみ実占有) | 2 |
| tree_large_top / tree_large_mid / tree_large_base | 大木(縦3マス) | ×(baseのみ実占有) | 3 |

### 崖(直線+角、v1最小構成)
| タイルID(案) | 内容 | 歩行 | 多タイル |
|---|---|:-:|:-:|
| cliff_top_edge | 崖上端(草の縁) | × | 1 |
| cliff_face | 崖面(縦repeat) | × | 1 |
| cliff_corner_outer_l / outer_r | 崖の外角(左右) | × | 2 |
| cliff_base_shadow | 崖下端の影 | × | 1 |

内角(凹角)は今回のマップ形状では未使用のためv1では対象外(将来別マップで必要になった時点で追加)。

### 水・川岸
| タイルID(案) | 内容 | 歩行 | 多タイル |
|---|---|:-:|:-:|
| water_a / water_b | 水面(波バリエーション2種) | × | 2 |
| water_lily | 水面装飾(睡蓮等) | × | 1 |
| shore_n/s/e/w | 川岸(直線4方向) | ◯(岸側)/×(水側判定は水タイル側) | 4 |
| shore_corner_ne/nw/se/sw | 川岸(角4方向) | 同上 | 4 |

### 滝(縦3タイル1組)
| タイルID(案) | 内容 | 歩行 | 多タイル |
|---|---|:-:|:-:|
| waterfall_top / waterfall_mid / waterfall_base | 崖の切れ目から水面まで | × | 3 |

### 橋(横3〜4タイル1組、東西方向)
| タイルID(案) | 内容 | 歩行 | 多タイル |
|---|---|:-:|:-:|
| bridge_end_l / bridge_end_r | 橋の両端(欄干) | ◯ | 2 |
| bridge_deck_mid | 橋の中央板(repeat) | ◯ | 1 |
| bridge_rail_shadow | 橋の立体感用の影/側面(任意) | ◯ | 1 |

**合計タイル数: 54枚**(空きスロット込みでシート8列×7行=56スロット提案)

## 提案タイルシート配置(発注用レイアウト案)

実データは無いため、あくまで「この並びで作ってもらえると後のGID割当がしやすい」という提案。artist/生成側で並び順を変える場合は、対応表(タイルID↔スロット座標)を別途もらえれば問題ない。

```
行0: grass_base, grass_shade_a, grass_shade_b, grass_tuft, dirt_path_base, path_edge_n, path_edge_s, path_edge_e
行1: path_edge_w, path_edge_corner_ne, path_edge_corner_nw, path_edge_corner_se, path_edge_corner_sw, bush, stump, log_left
行2: log_right, rock_small, rock_cluster_l, rock_cluster_r, flower_a, flower_b, torch, signpost
行3: campfire_ring, tree_small, tree_med_top, tree_med_base, tree_large_top, tree_large_mid, tree_large_base, cliff_top_edge
行4: cliff_face, cliff_corner_outer_l, cliff_corner_outer_r, cliff_base_shadow, water_a, water_b, water_lily, shore_n
行5: shore_s, shore_e, shore_w, shore_corner_ne, shore_corner_nw, shore_corner_se, shore_corner_sw, waterfall_top
行6: waterfall_mid, waterfall_base, bridge_end_l, bridge_deck_mid, bridge_end_r, bridge_rail_shadow, (空き), (空き)
```

画像サイズ: 8列×7行×32px = **256×224px**。

## 現状維持している既存要素(今回変更していないもの)

- `tiled/maps/mq0_map01_starting_place_day.tmj` の Collision / Events(`playerSpawn` / `exit_north` / `exit_east` / `event_campfire`)/ マップサイズ / レイヤー構成。
- DEV_PLACEHOLDERタイルセット(`tiled/tilesets/mq0_dev_placeholder_outdoor.tsj` / `assets/maps/tilesets/dev_placeholder_outdoor_tileset.png`)。現行マップは引き続きこちらを参照する。
- 既存テスト(`npm test` 93件)・typecheck・build。今回はドキュメント+参考画像1枚の追加のみのため未実行(コード非変更)。

## `mq0_outdoor_forest_v1.png` を正式tileset化するために必要な修正(再生成/手直し依頼用チェックリスト)

1. **セルピッチを32pxの整数倍(推奨: 64pxまたは96px)に厳密固定**して書き出す。71〜72pxのような中途半端な値にしない。
2. **背景を透過(RGBA)にする**。特に木・岩・低木・花・切り株・倒木・松明・看板・キャンプファイアなど「Terrain上に単体で置く」タイルは、セル全体を塗りつぶさずキャラクター/オブジェクトの外形だけを描き、余白は透明にする。
3. **崖は独立パーツとして再設計する**: `cliff_top_edge`(直線)/`cliff_face`(直線、縦repeat可能)/`cliff_corner_outer_l`・`outer_r`(角)/`cliff_base_shadow`を、どの順番に並べても模様が破綻しない「repeatable」な描き方にする。1枚の壁画を後から切るのではなく、最初から1タイル=1セグメントとして描く。
4. **橋も同様に、端(左右)と中央デッキ(repeat)を独立パーツとして描く**(現行案の長い橋本体のように、区間ごとに模様が変化する1枚絵にしない)。
5. 大木・中木・小木は、宣言したセル数(小=1マス、中=縦2マス、大=縦3マス)からはみ出さないよう、各パーツの外形をセル境界内に収める。
6. 本書「§ 提案タイルシート配置」のスロット割り当て(8列×7行、54種)に沿って書き出すと、後続のGID割当がそのまま流用できる。

これらを満たした版が届き次第、`tiled/tilesets/mq0_outdoor_forest_v1.tsj` の新規作成と `mq0_map01_starting_place_day.tmj` のGID置換に進める。

## 次のステップ

1. 上記チェックリストに沿って `assets/maps/tilesets/mq0_outdoor_forest_v1.png` を再生成/手直し(担当は`docs/IMAGE_SPEC.md`の役割分担によりChatGPT、または人間ドット絵担当)。
2. 修正版が実用可能と判定でき次第、`docs/ASSET_INDEX.md` / `assets/asset_catalog.json` のstatusを`reference`から`current`(または`ready_to_import`)へ更新。
3. Claude Code / Codex側で `tiled/tilesets/mq0_outdoor_forest_v1.tsj` を新規作成し、`mq0_map01_starting_place_day.tmj` のGIDをDEV_PLACEHOLDERから正式タイルへ置換。
4. Above/Y-sortの方式をPhaser接続フェーズで決定した上で、木の上段タイルの扱いを確定。
5. Phaser側のTiled Loader実装(別Phase、未着手)。

(v1の`次のステップ`は`mq0_outdoor_forest_v1.png`自体には未着手のまま。以降は差し替えて届いた別ソース「MQ0 Terrain Forest v2」に対する新しい作業記録)

## v2: MQ0 Terrain Forest v2 正規化パイプライン(2026-09-15)

### 対象ファイル
- SOURCE(原本、直接上書き禁止): `assets/maps/tilesets/source/mq0_terrain_forest_v2_source.png`(配置時は`assets/maps/tilesets/`直下だったため`source/`へ移動)
- 正規化済みatlas: `assets/maps/tilesets/mq0_terrain_forest_v2.png`
- Tiled tileset定義: `tiled/tilesets/mq0_terrain_forest_v2.tsj`
- テストマップ: `tiled/maps/mq0_terrain_forest_v2_test.tmj`
- 参考: 同時に配置された `4617a7ac-...png`(木/低木/切り株シート、chroma-key背景)と `d2f81ed0-...png`(日本語見出し付きプレビュー、`MQO Terrain Forest v2`)は**今回のterrain専用atlasには使用していない**(前者は別tileset用の木材料、後者はラベル入りプレビューで本番画像の要件=見出し/文字/枠なしに反する)。前者は木tileset制作時に、後者は区画確認の参考として残置。

### Step 1: SOURCE画像実測結果
- サイズ: 1448×1086、RGB(アルファ無し)。
- グレースケール勾配のピーク検出により、**16列×12行、1セル正確に90.5×90.5px**(1448÷16=90.5、1086÷12=90.5、両方ぴったり割り切れる)という精密なグリッドであることを確認。90.5pxは32の整数倍ではないが、グリッド自体は境界が完全に一致する精密なものだった(v1の71〜72pxのような曖昧なピッチではない)。
- UI見出し・文字・枠線の混入なし(そのプレビュー版は別ファイル`d2f81ed0-...png`)。
- 崖(row7-10)は「まっすぐな面」1セル(row8,col0)を4連続で並べて継ぎ目を検証した結果、**完全にシームレスに反復可能**と確認(v1は隣接セル同士が一致しない1枚絵だったため不可)。一方、row9等の別セルは反復時に段差が出ることを確認し不採用。
- 道(row0-3, col8-15)の各セルについて、セル境界の4辺(N/S/E/W)沿いにサンプリングして接続方向を測定。直線・十字は明確に確認できたが、角(コーナー)は「くの字」というより丸みを帯びたアーチ/フック形状で、厳密なL字接続ではないことが判明(テストマップで目視確認、下記参照)。

### Step 2: import-ready画像の作成方法
各タイルを個別にcrop(90.5×90.5、または1×2構成物は90.5×181)→個別にLANCZOSでresize(32×32または32×64)→透明32の倍数キャンバスへ配置、という手順を徹底し、**画像全体の一括resizeは行っていない**。方角違いの道の角(nw)・道の端(s)・岸(shore_n/s/e/w)・崖の縦向き面は、実際に採取した1枚を回転/反転して導出し、その旨をtile propertiesと本書に明記した(新規に描き起こした素材ではなく、実ピクセルの幾何変換)。

### 採用タイル(37種、256×288、8列×9行のうち37スロット使用)
| グループ | 内容 | 枚数 |
|---|---|---:|
| grass | grass_base / grass_variant_a・b / sparse_grass / grass_flower_white・yellow | 6 |
| path | straight_v・h / cross / corner_ne・se・sw・nw(nwは180°回転で導出) / end_n・e・w・s(sは180°回転で導出) / patch_a・b | 13 |
| water | water_a・b / water_lily_a・b / water_foam_ring | 5 |
| shore | shore_n・s・e・w(nから回転で導出) / shore_corner_a・b(1×2、bは180°回転) | 6 |
| cliff | cliff_face(反復検証済み) / cliff_face_vertical(90°回転、簡易代用) / cliff_top_cap | 3 |
| waterfall | waterfall_top・middle・bottom・foam | 4 |

各タイルに `mq0Label`(名称)・`mq0Blocking`(bool)のCustom Propertyを設定した。**既存のDEV_PLACEHOLDERタイルセットと同じproperty schemaをそのまま踏襲**しており、新しいキー(`terrainType`等)は増やしていない。

### 不採用/対象外にした素材
- **「Terrain rocks / small terrain decoration」(要求項目9)はこのSOURCE画像に存在しない**。12行すべてを確認したが、独立した岩・小物のセルは無かった(水面の睡蓮・泡リングのみ)。無理に別ファイル(v1やtree sheet)から流用せず、今回は採用を見送った。次のterrain更新、または別tilesetでの追加が必要。
- 道のT字接合(T-junction)は接続検出が不安定だったため採用を見送った(誤った接続を出荷するより欠落として報告する方を選んだ)。
- 崖の外角・内角(outer/inner corner)は専用パーツが無く、直面タイルを90°回転した簡易代用(`cliff_face_vertical`)のみ。方向が変わる箇所で完全に継ぎ目が消えるわけではない(テストマップで軽微な段差を確認)。

### Step 3: TSJ
`tiled/tilesets/mq0_terrain_forest_v2.tsj`: `tilewidth`/`tileheight`=32、`columns`=8、`tilecount`=72(8×9、うち37スロットに実データ、残りは空)、`imagewidth`=256、`imageheight`=288、`image`は相対パス `../../assets/maps/tilesets/mq0_terrain_forest_v2.png`。存在しないtile idは参照していない。

### Step 4: テストマップ
`tiled/maps/mq0_terrain_forest_v2_test.tmj`(14×12)に、草地バリエーション・道の直線/十字/端/角・水たまりと岸(直線4方向+1×2コーナー)・崖の直線+開始キャップ+縦向き面・滝の縦連結、を1画面に配置して目視確認した。

結果:
- 道の直線・十字・端は**完全にシームレスに接続**(1タイル幅の道として設計通り機能)。
- 水たまりと岸(直線4方向)は自然に接続。1×2の岸コーナーモジュールも、2つのGID(上半分・下半分)として正しく2セルに配置すれば問題なく表示される(1つのGIDでは32×32分しか描画されないため、実装時は2セル分の配置が必要)。
- 崖の直線repeatは完全に継ぎ目なし。ただし直線→縦向き面(90°回転)の切り替え地点では軽微な段差が残る(コーナー専用パーツが無いため)。
- 滝はtop→middle→bottom→foamの縦連結が自然。

### Step 5: No.01への試験導入(地形のみ)
`mq0_map01_starting_place_day.tmj` の `tilesets` 配列へ `mq0_terrain_forest_v2.tsj` を第2エントリとして追加(`firstgid=19`、既存DEV_PLACEHOLDERの`firstgid=1`/`tilecount=18`はそのまま)。既存の.tmjへ直接GIDを書き換える前に`.bak`を保存し、置換後にBFS・validatorで確認してから確定した。

**実際に置換した内訳(全て自動集計、目視と一致確認済み)**:
- Ground: `grass_base`(1555)+`grass_variant`(33)=**1588セルを新tilesetへ置換**。
- Ground: `path_dirt`(140セル)は**今回0セル置換**(理由: 下記「道を置換しなかった理由」)。
- Terrain: `water`(140)+`water_edge`(67)+`waterfall`(30)+`cliff_face`(15)=**252セルを新tilesetへ置換**。
- Terrain: `tree_canopy`(435)/`bush_low`(16)/`torch_marker`(2)/`bridge_wood`(14)/`flower_patch`(5)/`rock_boulder`(4)/`campfire_marker`(1)/`log_stump`(3)=**480セルはDEV_PLACEHOLDERのまま**(今回対象外の指示通り)。

#### 道を置換しなかった理由
現在のNo.01の土の道は、ウェイポイント沿いに幅3タイル(中心±1)でGraphics的に塗り潰した「太い帯」であり、新tilesetの道パーツは「1タイル幅の道が上下左右どちらに接続するか」を表す細い接続用オートタイルとして作られている。太い帯の内部・斜め境界のセルにこの接続タイルを機械的に当てはめたところ、**大部分のセルが「角」判定になり、草の三角形が市松模様状に浮くという明確な破綻(seam)が実際に発生した**(スクリーンショットで確認、採用せず)。「見た目だけ整っていてもGIDが壊れていたりグリッドが不正なら採用しない」という方針に従い、対象を「上下のみ、または左右のみに隣接する明確な直線」だけに絞ったところ、この太い帯の中には該当セルが実質存在しなかった(0件)。そのため今回、土の道はDEV_PLACEHOLDERのまま維持している。**細い1タイル道であれば正しく機能することはテストマップで確認済み**なので、今後「太い道専用の塗り潰しタイル」を別途source側へ発注するか、道の設計自体を1タイル幅の接続式に変更するかのどちらかで対応可能。

### 維持したもの(確認済み、無変更)
- Collisionレイヤーのデータそのもの(今回のスクリプトはCollisionレイヤーに一切書き込んでいない)。
- Events: `playerSpawn`(spawn_starting_place_day)/ `exit_north` / `exit_east` / `event_campfire`、座標・プロパティとも無変更。
- マップサイズ(48×36)・レイヤー構成(Reference/Ground/Terrain/Buildings/Collision/Events)。

### Step 6: 検証結果
- PNG寸法: 256×288、32の整数倍(256%32=0, 288%32=0)。
- alpha: RGBA(mode確認済み)。
- TSJ: columns/tilecount/imagewidth/imageheightとも画像の実測値と一致。
- invalid GID: 0件(全レイヤーの全GIDがどちらかのtileset範囲内、独自スクリプトで確認)。
- missing path: 0件(`.tmj`→`.tsj`→PNGの相対パスが両方とも実ファイルに解決)。
- `node tools/mq0-map-ai/build-review-package.js --map tiled/maps/mq0_map01_starting_place_day.tmj`: **Errors 0**、Warning 2件(npc/treasure未配置、既存と同じ、対象外のため想定通り)。タイルセット読み込み「2件」を確認(DEV_PLACEHOLDER+新tileset)。
- Events維持確認: playerSpawn 1件・exit 2件・event 1件、座標・プロパティとも変更前と一致。
- BFS(独自スクリプト): spawn→北出口の切れ目=True、spawn→橋=True、spawn→橋の東側=True。
- `npm test`: 93/93 PASS(コード非変更のため既存回帰なし)。
- `npm run typecheck`: PASS。
- `npm run build`: PASS(バンドル内容も変化なし、Tiledアセットはビルド対象外のため無影響)。
- Tiledアプリ自体でのGUI起動確認は本セッション環境に無いため未実施(上記CLI検証と独自スクリプトで代替)。

### 画像プレビュー
- 完成atlas: `mq0_terrain_forest_v2.png`(送付済み)
- テストマップ: `mq0_terrain_forest_v2_test.tmj`のレンダリング(送付済み)
- No.01適用結果: クリーン版・Collisionオーバーレイ版の2種(送付済み)

### 今後必要なこと(terrain v2時点)
1. **土の道**: 太い道専用の塗り潰しタイル(接続不要、ベタ塗り+柔らかい縁)を追加発注するか、道の設計を1タイル幅の接続式へ変更する。
2. **岩・地形装飾(項目9)**: 今回のsourceに無いため、次のterrain更新または別tilesetで追加。
3. **崖の外角・内角**: 専用パーツが無いため、方向が変わる崖には引き続き簡易代用(90°回転)を使うか、専用パーツを追加発注する。
4. **T字路**: 接続検出が不安定だったため見送り。必要なら専用パーツを目視選定して追加。
5. Above/Y-sortの方式は引き続き未決定(Phaser接続フェーズの判断事項)。
6. Phaser側のTiled Loader実装は別Phase、未着手のまま。

## v3: MQ0 Trees Forest v2 正式化(2026-09-15)

### 異常ファイルの整理
セッション開始時、`assets/maps/tilesets/assetsmapstilesetsmq0_terrain_forest_v3.png`という、パス区切りが欠落した名前のファイルが存在した。実測(PNG 1448×1086 RGBA、sha256`a8fe5de7...`)の結果、直前フェーズで確認済みの木/低木シート(旧`4617a7ac-6275-4dc2-aa8d-2eaa89e79222.png`と同一サイズ、同一時刻に生成)と一致すると判断し、`assets/maps/tilesets/source/mq0_trees_forest_v2_source.png`へ移動した。

さらに調査の過程で、`assets/maps/tilesets/mq0_trees_forest_v2.png`という、**今回作るはずだった正式パスに既に別のファイルが存在する**ことも発見した。実測の結果、これも1448×1086だが**本物のアルファ透過**(chroma-keyではない)を持ち、大中小の針葉樹・切り株・花付き低木などがこちらの方が整理された配置で含まれていた。ユーザー指示にない発見のため削除・上書きせず、`assets/maps/tilesets/source/mq0_trees_forest_v2_organized_source.png`として保存した。sha256が異なる(重複ではない)ことを確認済み。

**今回はこの「整理版」の方をSOURCEとして採用した**(アルファ品質・構成の両面でより優れていたため)。もう一方(`mq0_trees_forest_v2_source.png`)は保持しているが今回は未使用。

### Step 1: SOURCE解析
- サイズ1448×1086、RGBA(本物のアルファ、chroma-key由来の緑色が低アルファ値で残存)。
- 均一グリッドではなく、**サイズの異なる個別スプライトが並んだシート**(大木・中木・小木・切り株・低木を可変サイズで配置)と判明したため、`scipy.ndimage`による連結成分分析でオブジェクト単位のbounding boxを抽出(60個検出)。
- 検出したbboxを目視で分類し、大木2本(w≈300-320、h≈390)・中木2本(w≈120-140、h≈180-200)・小木2本(w≈110-120、h≈150-170)・切り株2個・低木6種(小2、通常1、花付き3)を採用対象として選定。
- 「岩・小物装飾」は今回のtrees専用sourceの対象外(terrain側で既に不採用と判定済み)。
- chroma-key残留を確認: 低〜中アルファ値のピクセルに純粋な`(0,255,0)`が残っていることを検出(白背景合成でのテストで実際に緑の斑点として視認)。

### Step 2: import-ready atlas作成
- 各スプライトを個別にbounding box + 4pxパディングでcrop → 最大の連結成分だけを残して周辺の浮遊debrisを除去 → **premultiplied alphaでのLANCZOS resize**(RGBをアルファで先に重み付けしてから縮小し、除算で戻す)でchroma-key残留色がにじまないようにした → 低アルファ(<16)を完全透明へスナップ → 半透明帯には「アルファに応じたgreen spill抑制」(不透明ピクセルは無変更、半透明ピクセルのみG成分をmax(R,B)へ寄せる)を適用。
- 白・グレー・草地色の3種の背景でテストレンダリングし、浮遊した緑の斑点が消えたことを目視確認(スクリーンショットで比較済み)。
- 木は指定通り1セルに収めず、**大木3×4セル(96×128px)・中木2×3セル(64×96px)・小木2×2セル(64×64px)**で構成。低木・切り株は1×1または2×2。
- 出力: `assets/maps/tilesets/mq0_trees_forest_v2.png`(256×384、RGBA、32の整数倍)。

### 採用tiles一覧(14種、8列×12行のグリッドに配置)
| ラベル | セルサイズ | Collision(下から) |
|---|---|---|
| conifer_large_01 / 02 | 3×4 | 最下段1行 |
| conifer_medium_01 / 02 | 2×3 | 最下段1行 |
| conifer_small_01 / 02 | 2×2 | 最下段1行 |
| stump_01 / 02 | 1×1 | なし |
| bush_small_01 / 02 | 1×1 | なし |
| bush_medium_01 | 2×2 | なし |
| bush_flower_01 / 02 / 03 | 2×2 | なし |

各セルに既存と同じ`mq0Label`/`mq0Blocking`のみを設定(新しいproperty schemaは増やしていない)。

### Tree Stamp(独自システムを追加していない)
大型木を配置しやすくする「Stamp/Template」を調査した結果、**Tiled標準のTile Palette上で複数タイルをドラッグ選択しそのままスタンプとして使う機能**で十分と判断した。各木は8列グリッド内で連続した矩形ブロックとして配置しているため、Tiledで開けばそのまま複数セル選択→スタンプ登録が可能。独自のスタンプ管理システムやカスタムpropertyは追加していない。

### Collision設計
「樹冠→Collisionなし、幹・根元→Collisionあり」を徹底し、木の最下段1行のみをtsjの`mq0Blocking=true`とした(3×4の大木でも下部1行のみ)。低木は今回選定した6種すべてが装飾サイズのため全て歩行可能(`mq0Blocking=false`)とし、「large_bush→collision」のケースは今回のサイズ選定では発生しなかった。Collision Tile Layer方式は維持し、視覚タイルと同一レイヤーに統合していない。

### 表示順(Above/Foreground)について
既存の`tiled/extensions/mq0/config.mjs`の標準レイヤー(Reference/Ground/Terrain/Buildings/Collision/Events)を確認した。`Above`相当のレイヤーは存在しない。樹冠を主人公より前面に出すY-sort的表現は魅力的だが、**今回は独断でAboveレイヤーを追加していない**。理由:
- Phaser側にTiled Loader自体が無く、レイヤーを追加しても現時点で使い道がない。
- Y-sort(動的な前後判定)とAbove(常に手前固定)は設計思想が異なり、どちらを採るかはPhaser接続時のレンダリング設計に関わる判断で、Tiled側だけで決めるべきではない。
- 今回のCollision設計(幹のみ歩行不可、樹冠は視覚的に主人公の後ろにあるだけで実際は同じZ)でも、実用上大きな破綻はない(木の裏に隠れて見えなくなる状況は今回のマップ密度では稀)。

引き続きPhaser接続フェーズでの決定事項として保留する。

### No.01への配置
DEV_PLACEHOLDERの`tree_canopy`(435セル)・`bush_low`(16セル)が占めていた領域を対象に、**1セル→多セルの単純置換ではなく**、以下の手順で再設計した。

1. 対象領域(451セル)を特定(既存のtree_canopy/bush_low領域そのもの。他の地形・Path・橋・イベント周辺は除外)。
2. 領域内のセルを固定シードでシャッフルし、各アンカーについて大/中/小木(木は加重ランダム、小中木をやや優先)を試行。すでに他の木に使われたセル、Path、橋、Spawn/焚き火の周囲1マスとは重ならないことを確認して配置。
3. 低木も同様に、小/中/花付きをランダムに試行して配置。
4. 配置できなかった残りのセルは通常の草地に戻した(密な壁ではなく、自然な隙間ができる)。
5. Collisionは対象領域を一旦クリアしてから、実際に配置された木の最下段行のみへ再設定。

**結果**: 82本の木(437セル、うち大木・中木・小木混在)+ 12個の低木を配置(元の435+16アンカーのうち451領域を437+残りセルでほぼ再利用)。外周は密度を保ちつつ、木のサイズ差により完全な均一配置ではなく自然な隙間が生じている(参考画像でも木同士が隙間なく1px単位で埋まってはいないため、意図的にこのままとした)。焚き火周辺・主経路・橋周辺には木を配置せず視界と歩行を確保。北の通路は既存の松明2本のすぐ外側に木が来る形で自然に絞られている。

木・低木以外(campfire・log_stump・signpost・torch_marker・bridge_wood・flower_patch・rock_boulder)は指示通り一切変更していない。

### Step 4: Test Map
`tiled/maps/mq0_trees_forest_v2_test.tmj`(16×14)に、small/medium/large tree・stump×2・bush各種・32×32プレイヤースケールマーカー・意図的に重なる森クラスタ(大木+中木+小木の canopy overlap)を配置。Collisionオーバーレイで、重なった木々でも各木の最下段行だけが正しくblockingになることを確認した。`node tools/mq0-map-ai/build-review-package.js`はErrors 0(playerSpawn/exitのdummyオブジェクトを追加して整合させた)。

### Step 6: 検証結果
- PNG: `mq0_trees_forest_v2.png` 256×384、RGBA、32の整数倍。
- 透過確認: chroma-key残留をpremultiplied alpha resize + green spill抑制で対処し、白/グレー/草地背景でのテストレンダリングにより浮遊debrisと目立つ緑フリンジが解消されたことを確認。
- TSJ: columns=8、tilecount=96、imagewidth/imageheightとも実測値と一致。
- 独自スクリプトによるGID/パス整合性チェック: invalid GID 0件、missing path 0件(3種のtileset全てが正しく解決)。
- `node tools/mq0-map-ai/build-review-package.js --map tiled/maps/mq0_map01_starting_place_day.tmj`: Errors 0、Warning 2件(npc/treasure、既存と同じ)。
- Events(playerSpawn / exit_north / exit_east / event_campfire)は座標・プロパティとも変更前と完全一致。
- BFS: spawn→北出口の切れ目=True、spawn→橋=True、spawn→橋の東側=True。
- `npm test` 93/93 PASS、`npm run typecheck` PASS、`npm run build` PASS。

### Before / After
`no01_before_after.png`(送付済み)で、DEV_PLACEHOLDERの単調な暗緑色の四角形が並んだ「マップエディタの仮画面」から、大きさの異なる針葉樹・花付き低木・切り株が自然に混在する森へ変わったことを比較できる。

### 残課題(trees v2時点)
1. 森の密度: 大木のfootprintが元の1タイル幅の輪郭と完全には一致しないため、境界の一部にやや広めの隙間が生じている箇所がある。追加の「隙間埋め」パス(小木・低木を優先配置)で密度をさらに上げる余地がある。
2. Above/Y-sortは引き続き未決定。
3. `mq0_trees_forest_v2_source.png`(chroma-key版、今回未使用)は保持しているが未使用のまま。将来別素材が必要になった際の予備として残す。
4. campfire・log・signpost・torch・bridge・その他propsの正式tileset化は次回以降。
5. Phaser側のTiled Loader実装は別Phase、未着手のまま。

## v4: 外周脱出バグの修正(2026-09-15)

### 検証方法
PlayerSpawnから4方向BFS(Flood Fill)を実行し、到達可能な全セルのうち、マップ外周リング(x=0, x=47, y=0, y=35)に属するものだけを抽出した。

### 発見した問題
修正前の状態で外周リングを走査したところ、**北側(y=0)のx=0〜34がほぼ全域到達可能**という重大な不具合を検出した(本来は北ゲートの通路幅分だけが開いているはず)。原因はtrees v2フェーズの木配置スクリプトにある。木の再配置にあたり「DEV_PLACEHOLDERのtree_canopy/bush_low領域だったセル」のCollisionを一旦クリアしてから、実際に配置された木の最下段行にだけ再設定する処理を行ったが、この「対象領域」に**マップ最外周(y=0の森・x=0の森など)も含まれていた**ため、旧世代の生成スクリプトが持っていた「マップ外周は北ゲート以外無条件でCollision」という保証が、木の再配置によって上書き消去されてしまっていた。

### 修正内容(Collision Layerのみ)
見た目(Ground/Terrain)は一切変更せず、Collisionレイヤーのみへ以下を再適用した。

- y=0(北端): Groundが実際の道タイル(`path_dirt`または`path_*`)であるセルを除き、全て強制的にCollisionを設定。
- y=35(南端): 出口が無いため全セルを強制的にCollisionに設定。
- x=0(西端)・x=47(東端): 全セルを強制的にCollisionに設定(`exit_east`マーカーは元々x=45付近の内側にあり、東端そのものへは繋がっていない設計だったため、東端を塞いでもマーカーの意味は変わらない)。

99セルを補強した。

### 修正後の検証結果
- Flood Fillで到達可能な外周セルは **`(23,0)` `(24,0)` `(25,0)` の3セルのみ**(北ゲートの通路そのもの)。他の外周セルへは一切到達不可能であることを確認した。
- BFS: spawn→北ゲート付近=True、spawn→橋=True、spawn→exit_east付近=True(いずれも変化なし)。
- `node tools/mq0-map-ai/build-review-package.js`: Errors 0(変化なし)。
- `npm test` 93/93 PASS、`npm run typecheck` PASS、`npm run build` PASS。

### 備考
`exit_north`のObject矩形(x:25〜31)と実際に歩行可能な北ゲート(x:23〜25)は完全には一致していない(x=25のみ重複)。これは今回発生した問題ではなく、より前のフェーズで設定された座標のズレであり、Eventsは「完全維持」の対象のため今回は座標を変更していない。将来、正式なNo.16マップ等へ接続する際に見直すことを推奨する。

## v5: MQ0 Props Forest v2 — SOURCE未着手(2026-09-15、BLOCKED)

### 確認結果
`assets/maps/tilesets/source/mq0_props_forest_v2_source.png` は**存在しない**。リポジトリ全体を検索したが、それらしい新規画像ファイルも見つからなかった。

チャットメッセージ内に共有された参考画像(焚き火広場の完成イメージ)は、個別スプライトを抽出できる「タイルシート」ではなく、**構図・雰囲気を伝えるための完成想定図(1枚の合成済みシーン)**と判断した。これまでのterrain v2 / trees v2と同様、この種の完成想定図から個別オブジェクトを正確に切り出すことは技術的に無理があり(遠近・影・重なりが合成済みのため)、無理に切り出して「捏造」扱いにしないという方針を維持する。

### 今回の対応
- `assets/maps/tilesets/mq0_props_forest_v2.png` / `tiled/tilesets/mq0_props_forest_v2.tsj` / `tiled/maps/mq0_props_forest_v2_test.tmj` は**作成していない**。
- `mq0_map01_starting_place_day.tmj` のcampfire・log・signpost・torch・rock・flower・weedは**引き続きDEV_PLACEHOLDERのまま**(無変更)。
- ユーザー指示に含まれていた詳細仕様(1×1候補: small rock/flower/weeds/small stone/torch、1×2候補: log/signpost、2×2候補: campfire/large rock、campfire_01の丁寧な扱い、Collision方針等)は、**そのまま発注仕様として有効**なので、SOURCE画像が届き次第この仕様に沿って正規化パイプラインを実行する。

### 次のステップ
1. `assets/maps/tilesets/source/mq0_props_forest_v2_source.png` を配置(ChatGPT生成、または人間ドット絵担当)。個別オブジェクトが分離して並んだ「タイルシート」形式であること(1枚の完成シーンではなく)。
2. 配置後、Pillow等でsize/alpha/sprite bounds/chroma-key残留/object separationを実測し、実用性を判定。
3. 実用可能と判定できれば、terrain v2 / trees v2と同じ手法(個別crop→denoise→premultiplied alpha resize→32の整数倍canvasへ配置)で`mq0_props_forest_v2.png`を生成。
4. Test Map作成→検証→No.01のcampfire/log/signpost/torch/rock/flower/weedを置換。
5. 今回のBFS外周脱出テストと同じ検証を、props配置後にも再実施する。

## v6: MQ0 Props Forest v2 正式化(2026-09-16)

### 事前修正: exit_north矩形の不整合(Trees PhaseをCLOSEに)
歩行可能な北ゲートは`x=23〜25, y=0`の3セルだが、`exit_north`のイベント矩形は`x=800px(タイル25)〜992px(タイル30)`とズレていた。name/type/targetMap/propertiesは変更せず、矩形の`x`/`width`のみ`x=736px(タイル23)`・`width=96px(3タイル)`へ修正し、3セルどこを通っても発火できるようにした。修正後、Flood Fillで到達可能な外周セルが北ゲート3セルのみであること、`spawn→north`のBFSがTrueであることを確認し、Trees PhaseをCLOSEDとした。

### SOURCE解析結果
`assets/maps/tilesets/source/mq0_props_forest_v2_source.png`: 1448×1086、**RGBA・本物の透過**(chroma-key残留なし、trees v2のような緑スピル問題はほぼ無い)。54個の独立したスプライトが十分な余白を空けて配置されており、`scipy`の連結成分分析で全て個別に検出できた。alphaヒストグラムでは内部が概ね200〜254(完全な255ではないがほぼ不透明)、境界に低〜中アルファのソフトエッジがあることを確認。

### 採用したprops一覧(27種)
| カテゴリ | 採用 | セルサイズ |
|---|---|---|
| CAMPFIRE | campfire_lit_01, campfire_unlit_01 | 2×2 |
| TORCH | torch_lit_01, torch_unlit_01, **torch_lit_01_compact(追加)** | 1×2(compactのみ1×1) |
| LOG | log_horizontal_01/02/03, log_vertical_01 | 2×1(horizontal) / 1×2(vertical) |
| SIGN | signpost_01(矢印型), signpost_02(板型) | 1×2 |
| STUMP | stump_large_01, stump_small_01 | 2×2 |
| ROCK | rock_large_01/02, rock_medium_01/02, rock_small_01/02, small_stones_01 | 3×2(large) / 2×2(medium) / 1×1(small・stones) |
| FLOWER | flower_white_01, flower_yellow_01, flower_pink_01 | 1×1 |
| WEED | weed_01/02/03, weed_flower_01 | 1×1 |

`torch_lit_01_compact`はユーザー仕様にない追加タイルである。北入口右側の柱位置(後述)が、trees v2で既に配置済みの木と2段(1×2)では必ず衝突することが判明したため、「木を動かさない」を優先し、同じtorch_lit_01の絵をそのまま1×1へ収めた代替を用意した。

### 不採用sprite
- 類似する複数の小型花/低木バリエーション(flower_white/yellow/pink各2種目、小型grass数種)は、指定の「最低限」リストを満たした上で品質・見分けやすさを優先し、今回は採用しなかった(atlasには余地があるため将来追加は容易)。
- 小石クラスタの別バリエーション2種(box25, box26)は`small_stones_01`と役割が重複するため不採用。

### atlasサイズ / tilecount
`assets/maps/tilesets/mq0_props_forest_v2.png`: **256×608、RGBA**(32の整数倍)。`tiled/tilesets/mq0_props_forest_v2.tsj`: columns=8、tilecount=152(実データ27オブジェクト分、62 tile property定義)。

### Collision方針(実装結果)
| Props | Collision |
|---|---|
| campfire(2×2) | 最下段2セルのみ(足元) |
| log(2×1 / 1×2) | 見た目のfootprint全体 |
| signpost(1×2) | 最下段1セル(支柱)のみ |
| torch(1×2 / compact) | 最下段1セルのみ |
| stump(2×2) | 最下段2セル(根元)のみ |
| rock_large / medium | footprint全体 |
| rock_small / small_stones | Collisionなし |
| flower / weed | Collisionなし |

いずれも既存Collision Tile Layer方式のまま(視覚タイルと同一レイヤーへ統合していない)。property schemaは既存の`mq0Label`/`mq0Blocking`のみ。

### Test Map
`tiled/maps/mq0_props_forest_v2_test.tmj`(18×16)でcampfire lit/unlit・torch lit/unlit・log全種・signpost両方・stump両方・rock全サイズ・small_stones・flower全色・weed全種+32×32プレイヤーマーカーを一覧配置し、Collisionオーバーレイで方針通りの結果を確認した。`node tools/mq0-map-ai/build-review-package.js`はErrors 0。

### No.01への正式導入(置換数・内訳)
DEV_PLACEHOLDERの`campfire_marker`(1)・`log_stump`(3)・`torch_marker`(2)・`rock_boulder`(4)・`flower_patch`(5)、計**15セル**を対象に、単純GID置換ではなく**23個の新規props配置**で再構成した(1個のDEV markerが複数の新props、または逆に複数markerが1つの構図へ統合されるケースがあるため件数は一致しない)。置換対象でなくなった旧マーカーセル(移動した2本のtorch_markerの元位置など)も明示的にクリアした。Terrain v2 / Trees v2 / Collisionの既存意味・Bridgeは一切変更していない。

### 焚き火広場の変更内容
中心の`campfire_lit_01`(2×2、event_campfireの位置(16,19)を右下セルに含む形で(15,18)に配置)を軸に、非対称に構成:
- 東: `log_horizontal_01`(ベンチ)
- 西: `log_horizontal_02`(ベンチ)、`log_vertical_01`、`stump_small_01`(座れる切り株)
- 北: `rock_small_01`(小岩アクセント)、`weed_02`、`flower_white_01`+`weed_01`(小さな花クラスタ)

PlayerSpawn(18,20)・event_campfire(16,19)の座標・機能は無変更。Spawn周辺には十分な歩行スペースを残している(南・東側は開けたまま)。

### 北入口の変更内容
`torch_marker`だった(21,2)・(28,2)を、**trees v2で既に配置済みの木と衝突しない位置**へ再配置した。

- 左: `torch_lit_01`(1×2)を(22,1)に配置(元の(21,2)から1マス移動、フルサイズの松明)。
- 右: 元の(28,2)付近はrow1・row2とも広範囲が木で埋まっており、1×2の松明が入る隙間がx=42(ゲートから17マス)まで存在しなかった。**木を動かさない**方針を優先し、row1だけが空いていた(30,1)へ`torch_lit_01_compact`(1×1)を配置した。

結果として左右の距離は非対称(ゲート左端から1マス／右端から5マス)になったが、これはtrees v2フェーズで既に確定した木の配置を変更しない制約から生じたものであり、「左右完全対称になりすぎない」という要件そのものは満たしている。北への歩行ルート(ゲート3セル)は一切塞いでいない。

### Rocks配置
大岩1個(`rock_large_01`、3×2、東側の開けた場所(24,17)に単独配置)・小岩/小石4箇所(西側の崖クラスタ周辺、隙間に収まるサイズを個別選定)のみとし、大岩の大量配置はしていない。

### Flowers / weeds
既存の`flower_patch`5箇所を基点に、単独ではなく2種セットの小さなクラスタとして配置(例: 黄花+weed、白花+weed)。主要な道(Ground=path_dirt)の上には配置していない。

### Step 7: 検証結果
- PNG: RGBA、256×608、32の整数倍。透過背景確認済み(白/グレー/草地背景でのテストで問題なし、trees v2のような緑スピルは今回のsourceでは検出されず)。
- TSJ: columns/tilecount/imagewidth/imageheightとも実測値と一致。
- 独自スクリプトによるGID/パス整合性チェック: invalid GID 0件、missing path 0件(4種のtilesetすべてが正しく解決)。
- `node tools/mq0-map-ai/build-review-package.js --map tiled/maps/mq0_map01_starting_place_day.tmj`: Errors 0、Warning 2件(npc/treasure、既存と同じ)。
- Events(playerSpawn / exit_north / exit_east / event_campfire)は座標・プロパティとも維持(exit_northの矩形修正を除く。修正内容は上記の通りname/type/targetMap/propertiesは無変更)。
- PlayerSpawnからのFlood Fill: 到達可能な外周セルは北ゲート3セルのみ(他は一切到達不可)。
- BFS: spawn→north=True、spawn→bridge=True、spawn→east=True。
- `npm test` 101/101 PASS(このセッション中に無関係な並行作業で増えた5件を含む、全て既存分含め成功)、`npm run typecheck` PASS、`npm run build` PASS。

### Before / After
`no01_props_before_after.png`(送付済み)と焚き火広場の拡大プレビュー(`no01_campfire_closeup.png`、送付済み)で、灰色の四角形マーカーが並ぶだけだった状態から、実際の焚き火・丸太・切り株・松明・岩・花が非対称に配置された「本編で使える画面」へ変わったことを比較できる。

### 残っているDEV_PLACEHOLDER
- **Bridge**(`bridge_wood`、14セル): 今回対象外。次Phase「MQ0 Bridge Forest v2」で正式化予定。
- 土の道(`path_dirt`): terrain v2フェーズで見送ったまま(太い道用の塗り潰しタイルが必要、詳細は該当セクション参照)。
- 岩の地形装飾(cliffと区別されたterrain側の小岩): terrain v2のsourceに無かったため引き続き未着手(props側のrock/small_stonesとは別カテゴリ)。

### 次Phase
**MQ0 Bridge Forest v2**。現在の`bridge_wood`(DEV_PLACEHOLDER、14セルの単純な板敷き)を、川を跨ぐ立体的な木橋として正式化する。

## v7: MQ0 Bridge Forest v2 正式化(2026-09-16)

### SOURCE解析結果
`assets/maps/tilesets/source/mq0_bridge_forest_v2_source.png`: 1448×1086、**本物のRGBA透過**(chroma-key残留なし)。30個の独立したパーツを`scipy`連結成分分析で検出。terrain/trees/propsと異なり、**純粋な真上からの俯瞰ではなく、やや角度をつけた「近い側の欄干を立てて見せる」古典的トップダウンRPGの橋表現**であることを確認した(AI生成のため32×32基準という前提は置かず、実測ベースで判断)。

主な発見:
- 横向き橋の欄干パネル(左端キャップ+斜め支柱、中央繰り返し用パネル×3種、右端キャップ)が明確に分離されている(box0=左端、box1=右端、box2/3/4=中央候補)。
- 中央パネルは幅263px前後の中に板が7枚並ぶ構造で、板1枚あたり約31px(≒32px)とほぼグリッド単位に一致することを確認。
- 縦向き橋(南北方向)用と思われる、両側の欄干+床板を同時に描いた「梯子状」の縦長パーツも4種存在するが、対応する上端/下端キャップが見当たらないため、無理に採用しなかった。
- 独立した支柱(円柱)・T字形の中間支持ブラケットも複数種確認。

### 今回の最重要方針: モジュール式(実装結果)
**完成済みの長い橋を1枚絵として使わず**、`bridge_h_left` + `bridge_h_center_01`/`02`の反復 + `bridge_h_right`の3〜4パーツで、任意の長さ(2タイル以上、1タイル刻み)の横向き橋を構成できる構造にした。

- `bridge_h_left` / `bridge_h_right`: **1×2セル**(32×64px)。欄干+斜め支柱つきの端部キャップ。指定例は1×2だったが、当初2×2で試作したところ「3セル」という最小要求(左+右のみで2タイル)を満たせなくなったため、1×2へ修正した(64px版は見た目に余裕があったが、32px版でも斜め支柱は視認できる品質だったため採用)。
- `bridge_h_center_01` / `02`: **1×2セル**(32×64px)。中央パネルの板部分(端の支柱を避けた中央スライス、約64px幅の原寸)を1タイル幅へ圧縮抽出。

### Seam検証
- `bridge_h_center_01`単体を5回横に並べても板目・手摺・影に不連続なし(`bridge_repeat_2plank.png`で確認)。
- `bridge_h_center_01`と`02`を任意の順序(01,01,02,02,01,02)で混在させても継ぎ目が破綻しないことを確認(`bridge_repeat_mixed.png`)。**したがって01/02の交互配置は必須ではなく、どちらを何個どの順で使っても良い**(今回のNo.01適用では単純に交互配置を採用)。
- 実際に生成したatlasから左(1)+中央(5)+右(1)=7タイルを組んで最終確認し、完全にシームレスであることを確認(`bridge_7tile_test.png`)。

### 採用したbridge parts(6種)
| パーツ | セルサイズ | Collision | 出典 |
|---|---|---|---|
| bridge_h_left | 1×2 | なし(歩行可能) | src box0 |
| bridge_h_right | 1×2 | なし | src box1(box0のミラー) |
| bridge_h_center_01 | 1×2 | なし | src box2 中央スライス |
| bridge_h_center_02 | 1×2 | なし | src box3 中央スライス |
| bridge_post_01 | 1×2 | 最下段1セル | src box11 |
| bridge_post_02 | 1×2 | 最下段1セル | src box17 |

### 不採用parts
- 縦向き橋(bridge_v_top/center/bottom): 中央の床板パーツ(4種)は品質良好だが、**対応する上端/下端の専用キャップが見当たらず**、無理に既存中央パーツを両端に流用すると継ぎ目のない橋の「終わり方」が不自然になるため、今回は見送った。No.01で必要なのは横向き橋のみという方針とも一致する。
- X字/太枠の欄干バリエーション(box5-8、4種): 採用した欄干(縦板パターン)とは意匠が異なり、混在させると横向き橋の見た目が不統一になるため不採用。
- 追加の支柱バリエーション(box9,10,12-16,18-20)・トレッスル(構台)ブラケット(box25,26)・小型post断片(box27-29): 「最低限」を満たすpost 2種で十分と判断し、見分けやすさを優先して不採用。将来、装飾用の追加バリエーションとして採用可能。

### atlasサイズ / tilecount
`assets/maps/tilesets/mq0_bridge_forest_v2.png`: **256×128、RGBA**(32の整数倍)。`tiled/tilesets/mq0_bridge_forest_v2.tsj`: columns=8、tilecount=32(実データ6オブジェクト分)。

### TSJ / Collision方針
tilewidth/tileheight=32。property schemaは既存の`mq0Label`/`mq0Blocking`のみ(新schema無し)。橋床(left/center/right)は歩行可能、支柱(post)は最下段1セルのみ歩行不可。**水は既存Collisionのまま変更していない**(橋のfootprintだけに歩行可能を限定し、川Collisionの削除は一切行っていない)。

### Test Map
`tiled/maps/mq0_bridge_forest_v2_test.tmj`(24×40)に、terrain v2の水/岸/草を使って幅5タイルの川を3本用意し、それぞれに**3タイル橋(左+中央1+右)・5タイル橋(左+中央3+右)・7タイル橋(左+中央5+右)**を設置。center反復だけで橋の長さを変更できることを実証した(1本目の3タイル橋は意図的に川幅5に対して橋幅3のため川の一部が未架橋のままだが、これは検証用マップの設計上の仕様であり、実際のNo.01では川幅と橋幅を一致させている)。32×32プレイヤーマーカーとpost 2種の展示も含む。Collisionオーバーレイで橋のみ歩行可能、水は全面Collisionのままであることを確認した。`node tools/mq0-map-ai/build-review-package.js`はErrors 0。

### No.01への正式導入
既存の`bridge_wood`(x=37〜43、y=16-17、7タイル幅×2行)を実測し、**その位置・幅を完全に維持したまま**、`bridge_h_left`(x=37) + `bridge_h_center_01/02`交互×5(x=38〜42) + `bridge_h_right`(x=43)へ機械的に置換した。Terrain v2の川の形状(shore_s/water×5/shore_sが橋の幅と正確に一致することを事前に確認済み)・Trees v2・Props v2・既存Collisionの意味は一切変更していない。

### 橋周辺の仕上げ
現在の橋位置・西側の道→橋入口、東側の橋出口→草地の接続は、trees v2 / props v2フェーズで既に整った状態(西側に伸びる主経路、東側に小さな草地とexit_eastへの導線)を保っていたため、**追加のprops配置は行わなかった**(既存で十分に自然だったため、主経路を狭めるリスクを避けた)。

### exit_eastとの整合性確認
`exit_east`(x=1440〜1448px=タイル45、y=448〜576px=タイル14〜18)を実測したところ、この列は4行すべてPlayerSpawnから到達可能な歩行可能セルであり、**North Exitのようなズレは存在しなかった**。指示通り「不整合がなければ変更不要」の原則に従い、`exit_east`のname/type/targetMap/properties/矩形いずれも変更していない。

### 外周Flood Fill / 水への横抜けテスト
- PlayerSpawnからのFlood Fill: 到達可能な外周セルは北ゲート3セルのみ(変化なし)。
- **橋のCollisionを追加/変更した領域内で、到達可能なセル集合(1110セル)の中に水セルが1つも含まれないことを確認**(「spawn→水セルへの到達」を全水セルに対して総当たりで検証、結果0件)。これにより、橋の途中から南北の水面へ抜けることは構造的に不可能であることを証明した。
- 橋の西端(37,16)・東端(43,16)がともに同じ到達可能集合に含まれることを確認(橋を渡って反対側へ行ける)。

### BFS
| 検証 | 結果 |
|---|---|
| spawn → north | True |
| spawn → bridge西端 | True |
| bridge西端 → bridge東端 | True(同一到達集合) |
| bridge東端 → east | True |
| spawn → east | True |
| bridge中央 → 水(南北) | False(水セルは到達可能集合に一切含まれない) |

### DEV_PLACEHOLDER残数スキャン(全種類)
Terrain/Buildingsレイヤーは**0件**(bridge_wood置換によりゼロ化達成)。Ground層に**`path_dirt`が140セル**残存。これはterrain v2フェーズ(前々回)で、太い帯状の道に細い接続式オートタイルを当てると草が市松模様に浮く破綻が実際に確認されたため、意図的に見送った既知の残課題であり、今回のBridge Phaseの範囲外(理由は`docs/PHASE_NO01_OUTDOOR_TILESET_SPEC.md`のterrain v2セクションに詳述済み)。

### Events維持確認
`playerSpawn`(584,648)・`exit_north`(736,0,96×8、前回修正済みのまま)・`exit_east`(1440,448,8×128、今回変更なし)・`event_campfire`(512,608,32×32)、全て座標・プロパティとも無変更。

### 検証結果
- PNG: RGBA、256×128、32の整数倍。透過背景確認済み。
- TSJ: columns/tilecount/imagewidth/imageheightとも実測値と一致。
- 独自GID/パス整合性チェック: invalid GID 0件、missing path 0件(5種のtilesetすべてが正しく解決)。
- `node tools/mq0-map-ai/build-review-package.js --map tiled/maps/mq0_map01_starting_place_day.tmj`: Errors 0、Warning 2件(npc/treasure、既存と同じ)。
- `npm test` 101/101 PASS、`npm run typecheck` PASS、`npm run build` PASS。

### Before / After
`no01_bridge_before_after.png`(送付済み)で、板目だけの平坦なDEV_PLACEHOLDER橋から、両端に欄干・斜め支柱を備えた正式な木橋へ変わったことを比較できる。

### 残課題
1. **土の道(`path_dirt`、140セル)**: terrain v2フェーズからの既知の残課題(太い道用の専用塗り潰しタイルが必要)。
2. 縦向き橋: 対応する上端/下端キャップ素材が無いため未着手。将来別素材が届いた際に追加。
3. Above/Y-sortは引き続き未決定(Phaser接続フェーズの判断事項)。
4. Phaser側のTiled Loader実装は別Phase、未着手のまま。
5. 岩の地形装飾(terrain側、cliipとは別カテゴリ)は未着手のまま。

## v8: MQ0 Path Forest v2 正式化(2026-09-17)

### 既存path_dirtの解析結果
`.tmj`のGround層を直接読み込み、140セルの`path_dirt`(DEV_PLACEHOLDER local id 2、GID=3)の座標分布を解析した。
- x範囲15〜38、y範囲0〜21。焚き火広場(x≈15-18,y≈18-21)から北へ伸び、y≈9-13付近で北ゲート方向(x=23-25,y=0-4)と東の橋方向(x≈17-38,y≈12-17)へ分岐するY字型。
- 幅は各行の連続run長で判定: ほとんどの区間が3〜4タイル幅、Y字分岐部のみ最大12タイル幅、北ゲート直前と焚き火広場直前は3タイル幅へ収束。
- **隣接判定(4近傍+斜め4近傍)で全140セルを分類した結果、1タイル幅のpinch(南北 or 東西の対辺が同時に非pathになるケース)や孤立/半島セル(3方向以上が非path)は0件**。既存の道形状は最初から「blob autotile」で綺麗に表現できる形をしていたことが確認できた。

### 今回の最重要方針の遵守: 細い1タイル幅connectorの不使用
既存の`path_straight_h/v`・`path_corner_ne/nw/se/sw`・`path_cross`・`path_end_n/s/e/w`・`path_patch_a/b`(terrain v2フェーズで作成済みだが1タイル幅の道専用)は**一切使用しなかった**。これらをそのまま太い道へ適用すると草が市松模様に浮く既知の破綻があるため(terrain v2フェーズで確認済み)、新たに「blob autotile」(面を塗りつぶす方式)を設計した。

### 新規タイル: blob autotile 15種
| ラベル | 意味 | 個数(No.01適用後) |
|---|---|---|
| dirt_full | 四方向とも道に囲まれた内部セル | 24 |
| dirt_edge_n/s/e/w | 1方向のみ草に接する縁 | 44(内訳: w12, s11, n9, e12) |
| dirt_corner_ne/nw/se/sw | 隣接2方向が同時に草(凸の外角) | 32(内訳: nw9, ne8, se8, sw7) |
| dirt_inner_ne/nw/se/sw | 四方向は道だが斜め1方向だけ草が食い込む(凹の内角) | 28(内訳: nw8, ne7, se7, sw6) |
| dirt_variant_01/02 | dirt_fullの色調+ノイズ違いバリエーション(単調さ回避) | 12(内訳: 7, 5) |

**生成方法(新規SOURCE画像は使用せず、既存の承認済みテクスチャの機械的合成のみ)**:
1. 既存`path_cross`タイルの中心12×12pxを純粋な土サンプルとして切り出し、32×32へタイル敷き詰めて`dirt_full`のベースを作成。
2. 既存`grass_base`を草の参照テクスチャとして使用。
3. 各方向/角について、距離関数または半平面関数から0/1マスクを生成し、8×8の乱数ノイズを重ねてガウスぼかし(`ImageFilter.GaussianBlur`)を適用することで、境界が直線的でない自然なマスクを作成(`noisy_mask()`)。
4. `Image.composite(dirt, grass, mask)`でブレンドし、15種を生成。
5. variantはdirt_fullに軽い色調ティント(±4%)とスペックル状ノイズを加えたもの。

全15タイルの分類が幾何学的に正しいことを、緑/赤チャンネルの草判定ヒューリスティック(top/bottom/left/right各8pxバンド、または四隅10×10領域のサンプリング)でプログラム的に検証済み(目視の低解像度サムネイルでは`dirt_edge_n`と`dirt_edge_s`の判別が付きにくかったため、数値検証で誤認を防いだ)。

### 格納先: 既存mq0_terrain_forest_v2への追記(新規tileset不作成)
`mq0_terrain_forest_v2.tsj`(8×9=72slot)の空きslot(35個)を確認し、ユーザー指示どおり**既存atlasへ追記する方式を採用**(新規`mq0_path_forest_v2`は作成していない)。既存37タイルの画像データ・tiles配列エントリは一切変更していない(追記前にPNG/TSJともにバックアップを取得のうえ確認)。atlasサイズは256×288のまま、計52タイルになった。

### No.01への正式適用: 140セルの機械的置換
上記の隣接判定分類関数を140セルへ適用し、全セルを対応GIDへ機械的に置換した。分類結果: dirt_full 24 / edge 44 / outer-corner 32 / inner-corner 28 / variant 12(variantはdirt_fullの一部をハッシュ値で約30%置き換え)= 合計140。フォールバック処理(1タイル幅pinchや孤立セル向け)は分類の結果1件も発生しなかった。

### 美観調整: 焚き火広場の東側拡張(唯一のレイアウト変更)
適用直後のレンダリングを確認したところ、広場は焚き火(16,19)へ向かう2〜3タイル幅の通路が突き当たって終わる形状で、「開けた広場」というより「行き止まりの細い道」に見えた。既存15タイルの再配置のみで、PlayerSpawn(18,20)を含む東側4セル((18,18)(18,19)(18,20)(18,21))を追加でdirt化し、隣接する既存9セルを再分類(dirt_edge_e→dirt_full等)することで、焚き火を囲む約4タイル幅の開けた空間にした。**新規アセットは一切追加していない**。PlayerSpawn/event_campfireの座標・幅・高さ・プロパティは無変更(Ground層のタイル変更はEventsに一切影響しない)。

### Test Map
`tiled/maps/mq0_path_forest_v2_test.tmj`(25×22)を新規作成。2タイル幅の直線→3タイル幅への拡幅→90度カーブ→緩やかな蛇行(width 3)→narrow(2タイル)→plazaブロブ(円形、半径3)→`mq0_bridge_forest_v2.tsj`の`bridge_h_left`との継ぎ目、を1枚のマップで実証。`node tools/mq0-map-ai/build-review-package.js`はErrors 0(ダミーの`exit_test`オブジェクトを他のtest map群と同じパターンで追加)。

### DEV_PLACEHOLDER残数スキャン(全レイヤー・全種類)
Ground/Terrain/Buildingsレイヤーの視覚タイルGID(1〜18)使用は**0件**。Collision層の`collision_solid_marker`(local id 16、GID 17)のみ546セル残存するが、これはterrain v2フェーズ以来全Phase共通で使われてきた**Collision層専用の非表示オーサリングマーカー**であり(Collision層自体がゲーム内で描画されない判定専用レイヤー)、視覚アセットの正式化対象ではないため、今回もあえて置換していない。

### Events維持確認
`playerSpawn`(584,648)・`exit_north`(736,0,96×8)・`exit_east`(1440,448,8×128)・`event_campfire`(512,608,32×32)、全て座標・プロパティとも無変更。

### Collision / Flood Fill 再検証
- PlayerSpawnからのFlood Fill到達可能セル: 1110セル(変化なし)。
- 外周(x=0, x=47, y=0, y=35)で到達可能なセルは北ゲート3セル((23,0)(24,0)(25,0))のみ。**違法な外周脱出0件**。
- `exit_east`は物理的な地図端(x=47)ではなくx=45の内側トリガーであることを再確認(前フェーズまでの検証スクリプトがW-1決め打ちだった誤りを本フェーズで修正し、x/width基準の正しい判定に直した)。真の東端列(x=47)は全行Collisionソリッドで、隙間0件。
- 水セル(water_a/b/waterfall_*)への到達可能セルは0件(橋以外から川へ立ち入れない)。

### BFS
| 検証 | 結果 |
|---|---|
| spawn → north gate | True |
| spawn → 焚き火広場周辺 | True |
| spawn → bridge西端 | True |
| bridge西端 → bridge東端 | True |
| spawn → east | True |

### 最終美観パス(5項目レビュー)
1. **外周の森**: 大中小の松の混在・切り株/低木による不規則さが既にあり、明確な大穴や機械的な規則配置は見られなかったため、変更なし(観察のみ)。
2. **焚き火広場**: 上記の東側拡張により、「主役の見せ場」として読める開けた空間になった。丸太・切り株・岩・花は既存配置のまま(過度な追加装飾はしていない)。PlayerSpawnは広場内の視認しやすい位置を維持。
3. **北入口**: 松明2本に挟まれた道が北ゲートへ向けて自然に細くなっており、視線誘導は良好(変更なし)。
4. **川/橋**: 川岸が直線的な点は視覚的に把握しているが、Terrain v2は前Phaseまでの正式成果として維持する方針のため、川の形状自体は変更していない(観察を記録するに留める)。道→橋の接続部は道の縁(x=36)から即座にshore(x=37)へつながり、隙間・不自然な段差は無い。
5. **道**: 幅は場所により2〜4タイルで変化し、直線的な区間はなく、境界はノイズ処理済みの柔らかい草との遷移になっている(変更なし)。

### 検証結果
- 独自GID/パス整合性チェック: invalid GID 0件、missing path 0件(5種のtilesetすべてが正しく解決)。
- `node tools/mq0-map-ai/build-review-package.js --map tiled/maps/mq0_map01_starting_place_day.tmj`: Errors 0、Warnings 2件(npc/treasure、既存と同じ、無関係)。
- `npm test` 101/101 PASS、`npm run typecheck` PASS、`npm run build` PASS。

### Before / After
`no01_path_before_after.png`(送付済み)で、平坦な単色矩形のDEV_PLACEHOLDER土の道から、幅が自然に変化しY字分岐を持つ有機的な土の道へ変わったことを比較できる。焚き火広場のクローズアップ・北入口のクローズアップ・橋接続部のクローズアップ・Collisionオーバーレイも送付済み。

### 残課題
1. Phaser側のTiled Loader実装は別Phase、未着手のまま(**次Phaseとして着手予定**)。
2. 縦向き橋・岩の地形装飾(terrain側)は引き続き未着手(v7から持ち越し、今回の範囲外)。
3. Above/Y-sortは引き続き未決定(Phaser接続フェーズの判断事項)。
4. 川岸の直線的な形状はTerrain v2の正式成果として維持しており、今回は変更していない(将来、川の再設計が必要になった場合は別途判断)。

PHASE NO.01 OUTDOOR TILESET SPEC STATUS:
DONE(terrain v2 + trees v2 + props v2 + bridge v2 + path v2の全てをNo.01へ導入。No.01の視覚DEV_PLACEHOLDERは0件。Phaser接続は次Phase)
