# No.01「はじまりのばしょ」昼 Tiledマップ 実装結果

最終更新: 2026-09-15 JST

## 範囲

No.01「はじまりのばしょ」**昼版**を、Tiled Map Editorで1タイル単位に編集できる実マップとして新規作成した。既存のNo.01夜版(`StartingPlaceScene.ts`のGraphics DEV_PLACEHOLDER)、No.02以降、Field、戦闘、既存テストは一切変更していない。

## 作業前調査

- `tiled/extensions/mq0/`(MQ0標準Layer/Object/Property規約とValidator)と`tiled/maps/mq0_test_map.tmj`(規約確認用テストマップ、Phaserからは未読込)は既存。実マップはこれまで0件だった。
- Phaser側にTiled読み込みコードは存在しない(`grep`で`load.tilemapTiled`等ゼロ件)。MQ0本編マップは引き続き`src/config/maps.ts`のTypeScriptオブジェクトでデータ駆動。
- **屋外用タイルセットの実ファイルが存在しない**ことを確認した。`docs/ASSET_INDEX.md`/`docs/IMAGE_SPEC.md`が正本とする`assets/maps/tilesets/tileset_base.png`/`tileset_extra.png`はREADY_TO_IMPORT表記のままファイル自体が無い。`assets/maps/reference/interiors_tilesets/`の15枚は名称に反し1536×1024の1枚絵(内装参考画像)で、切り出し可能なタイル格子ではなく屋内用途のため今回と無関係。
- この状態をユーザーへ報告し、「DEV_PLACEHOLDER色タイルで作成」を選択してもらった上で着手した(既存のGraphics DEV_PLACEHOLDER方針と同じ考え方)。

## Layer / Object規約

既存の`tiled/extensions/mq0/config.mjs`の規約をそのまま使用し、独自規約は新設していない。

- Layer: `Reference`(Image, 空のまま) / `Ground` / `Terrain` / `Buildings`(空) / `Collision` / `Events`(Object)。
- Object種別: `playerSpawn` / `exit` / `event`。`npc` / `treasure`はNo.01が「主人公が焚き火で目覚めるイベント専用マップ」で対象が無いため未配置(Validate Mapでは推奨WARNのみ、FAILにはならない)。
- Map Custom Properties: `mq0MapId=map_01_starting_place`(既存コードの`src/config/maps.ts`の`MAP_ID`と同一)、`mq0MapName=no01_starting_place_day`、`mq0MapType=event`、`mq0Chapter=opening_day`、`mq0RequirementFile=docs/MAP_FLOW_SPEC.md`。

## マップサイズ / タイル

- 48 × 36 タイル、32×32px、マップ全体 1536×1152px(4:3。Field/タイトル等、既存の4:3方針に合わせた)。
- ユーザー指定の目安(45×34〜48×36)の上限を採用。

## 使用タイルセット(DEV_PLACEHOLDER)

`tiled/tilesets/mq0_dev_placeholder_outdoor.tsj` + `assets/maps/tilesets/dev_placeholder_outdoor_tileset.png`(192×96、6列×3行、32px、17種+空1枠)。単色塗り+簡易アイコン(木=緑丸+幹、崖=斜線、水=波線、橋=板目、焚き火=炎アイコン等)のみで、正式イラストは新規生成していない。各タイルに`mq0Label`(名称)と`mq0Blocking`(bool)のCustom Propertyを付与し、Tiled上でホバーすると用途が分かるようにした。

タイル一覧: `grass_base` / `grass_variant` / `path_dirt` / `path_dirt_edge` / `tree_canopy`(block) / `bush_low` / `rock_boulder`(block) / `cliff_face`(block) / `water`(block) / `water_edge`(block) / `bridge_wood` / `waterfall`(block) / `campfire_marker` / `flower_patch` / `log_stump` / `torch_marker` / `collision_solid_marker`(Collision Layer専用、半透明赤)。

## 構図(参考画像 `no01_day_reference_6398a59b13.png` の雰囲気を反映、複製はしていない)

- 四方を密度の高い森で囲み、境界の深さを固定シード乱数の有界ランダムウォークで揺らして不定形にした(単純な四角形にしていない)。北の入口帯だけ意図的に浅くして通路を確保。
- 北中央(x=22〜27付近)に幅6タイルの通路を確保し、左右1本ずつ松明を配置。将来の別マップ接続点の候補としてのみ設置(`targetMap`/`targetSpawn`は空文字のまま)。
- 中央〜左側に大きな草地の広場。中心よりやや左(タイル16,19)に焚き火を配置し、主人公スポーン(18,20)は焚き火の正面ではなく斜め脇に置いた。
- 焚き火から北の通路、および東の橋へ分岐する土の道を、直線ではなく緩い蛇行(座標を手動で複数のウェイポイントとして指定)で敷設。主要ルートは幅3タイル(中心±1)を確保。
- 右側に縦方向の川(行ごとに軽くウォブルさせ、直線的すぎないようにした)。北端は崖からの滝、橋(y=16〜17)で東側の小さな草地へ渡れる。橋の先、東端の森にも幅4行の切れ目を用意し「東側出口」候補とした。
- 崖は森だけで囲まず、西側に岩・崖の小さな露出(部分的な崖表現)を追加。既存タイルセットが無いため、崖・岩は色分けされたDEV_PLACEHOLDERアイコンで表現し、不足素材として本書末尾に明記する。
- 低木・花・切り株・草むらのバリエーションを、均等な格子ではなく手動で選んだ座標+小さなクラスタ状の乱数オフセットで散らした。

## PlayerSpawn / 出口 / イベント位置(Events Layer)

| Object | 種別 | 座標(px, 左上基準) | 備考 |
|---|---|---|---|
| `spawn_starting_place_day` | playerSpawn | (584, 648) | タイル(18,20)中心。焚き火(16,19)の斜め脇 |
| `exit_north` | exit | (704, 0), 幅192×高さ8 | 北通路の切れ目上端。`targetMap`/`targetSpawn`は空文字(未接続) |
| `exit_east` | exit | (1440, 448), 幅8×高さ128 | 橋の先、東端の森の切れ目。`targetMap`/`targetSpawn`は空文字(未接続) |
| `event_campfire` | event | (512, 608), 32×32 | 焚き火イベント起点候補。会話・演出接続は今回実装していない |

## Collision方式

既存Tiled規約(`config.mjs`)がCollisionを専用Tile Layerとして定義しているため、その方式をそのまま使用した(Object形状等の独自方式は新設していない)。Terrain上のblockingタイル(木・岩・崖・水・水際・滝)のセルへ`collision_solid_marker`を機械的に重ね、加えてマップ外周1マスは北通路/東出口の切れ目を除き無条件でCollisionを敷いている。橋・低木・花・切り株・松明・焚き火マーカーは歩行可能。

## 歩行検証(自動BFS)

生成スクリプトでCollisionグリッド上のBFSを実行し、以下を確認した(結果は全てTrue)。

- スポーン → 北通路の切れ目
- スポーン → 橋
- スポーン → 橋の東側の草地

## Tiled構造検証

`node tools/mq0-map-ai/build-review-package.js --map tiled/maps/mq0_map01_starting_place_day.tmj`(既存Local Bridge CLI、AIは呼ばない)を実行。

```
Validation
  Errors: 0
  Warnings: 2   (npc missing / treasure missing — 対象なしのため未配置、想定通り)
```

必須(FAIL対象)は全てPASS: マップ/タイルサイズ、Ground/Collision/Events Layer、playerSpawn/exit Object、mq0MapId/mq0MapName/mq0MapType。推奨(WARN対象)のTerrain/Buildings LayerもOK。

追加で独自スクリプトによりTMJ/TSJの構造的な整合性を確認した。

- 全Tile Layerの`data`長が`width*height`(1728)と一致。
- 使用GIDが全て`1〜17`の範囲内(無効GIDなし)。
- `.tmj`→`.tsj`(相対パス`../tilesets/...`)、`.tsj`→画像(相対パス`../../assets/...`)が両方とも実ファイルに解決する。
- 全Objectがマップ範囲内。

## Phaserでの読み込みについて(重要な制約)

**このマップはまだPhaserから読み込まれない。** `tiled/extensions/mq0/README.md`に明記されている通り、MQ0本編はまだTiledでマップを作っておらず、Phaser側のTiled Loader/Scene接続は別Phaseの作業として残っている。今回の作業は「Tiledで開いて1タイル単位に編集できる実マップを用意する」ところまでで、既存のNo.01夜版Scene(`StartingPlaceScene.ts`)や通常起動フローには一切触れていない。`npm run dev`の通常起動・既存テストへの影響が無いことは以下で確認済み。

## 検証結果

- `npm test`: **93/93 PASS**(既存と同数。今回はTiled/アセットのみの追加でsrc/testsは無変更)。
- `npm run typecheck`: PASS。
- `npm run build`: PASS。
- 通常起動(`http://127.0.0.1:5173/`): タイトル→メニュー→既存フローに変化なし(src/未変更のため回帰なし)。
- Tiled自体でのGUI起動確認は今回のセッションでは未実施(Tiledアプリ自体がこの環境に無い)。上記Local Bridge CLIによる構造検証、および独自スクリプトによるGID/パス整合性検証で代替した。

## 参考画像からの変更点

- 構図・雰囲気(森に囲まれた焚き火の広場、北への道、東の川と橋、部分的な崖)は維持したが、タイル画像そのものは1枚絵の複製ではなく、32px単位のDEV_PLACEHOLDERタイルとして再構成した。
- 参考画像の正確な木・岩の位置関係を1:1で再現してはいない(「構図を完全コピーする必要はない」との指示に従い、MQ0の歩行グリッドとして成立する配置に変換)。
- 参考画像に無い要素として、ゲームプレイ上必要な出口(北/東)・松明2本・焚き火イベント位置を追加した。

## 不足しているタイル素材(報告)

- 屋外用の正式タイルセットそのもの(`tileset_base.png`/`tileset_extra.png`)が未着手。今回使用した17種は全てDEV_PLACEHOLDER(単色/簡易アイコン)。
- 特に「崖」「滝」「橋」の専用イラストは既存タイルセットに一切無く、色分けした平面アイコンで代用した。
- 焚き火の炎アニメーション用タイル/スプライトは無く、静止アイコン1種のみ。

## 今回やらなかったこと(指示通り)

- Phaser側へのTiled Loader実装、既存No.01夜版Sceneの置き換え。
- 正式タイルセット画像の新規生成。
- 北/東出口の接続先マップ確定(`targetMap`/`targetSpawn`は空文字のまま)。
- ミラー等、本タスクと無関係な既存コードの整理。

## 変更・追加ファイル

新規:
- `tiled/maps/mq0_map01_starting_place_day.tmj`
- `tiled/tilesets/mq0_dev_placeholder_outdoor.tsj`
- `assets/maps/tilesets/dev_placeholder_outdoor_tileset.png`
- 本書

更新:
- `tiled/maps/README.md`
- `tiled/tilesets/README.md`
- `docs/ASSET_INDEX.md`
- `assets/asset_catalog.json`

PHASE NO.01 DAY TILED MAP STATUS:
PARTIAL(Tiled編集用マップは完成。Phaser接続・正式タイルセットは別途未着手)
