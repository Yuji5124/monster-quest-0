# No.01「はじまりのばしょ」昼 Tiled → Phaser接続(DEV最小実装)

最終更新: 2026-09-17 JST

## ステータス: **PARTIAL(DEV専用) — `?mapTest=no01`でTiled No.01昼マップの表示・歩行・Collision・Events検出を実証。通常起動には未接続**

`docs/PHASE_NO01_OUTDOOR_TILESET_SPEC.md`で正式化が完了した`tiled/maps/mq0_map01_starting_place_day.tmj`を、Phaser 3.90.0上で実際に読み込み・表示し、主人公がCollision付きで歩行し、Tiled Object Layer(Events)を検出できることを、DEV専用URL(`?mapTest=no01`)経由で実証した。通常のTitle→Opening→StartingPlace起動、No.01夜版(`StartingPlaceScene`)、`src/config/maps.ts`のマップ遷移データは一切変更していない。

## 前Phaseの正式CLOSE確認

着手前に、`tiled/maps/mq0_map01_starting_place_day.tmj`の全レイヤー・全GIDを再スキャンした。

- Ground/Terrain/Buildingsの視覚タイル(GID 1〜18、DEV_PLACEHOLDER範囲)使用: **0件**。
- Collision層の`collision_solid_marker`(GID 17)のみ546セル残存。これは全Phase共通のCollision層専用オーサリングマーカーであり(Collision層自体はゲーム内で描画されない判定専用レイヤー)、視覚アセット置換の対象外として過去のPhaseから一貫して扱ってきたもの。
- `tiled/maps/mq0_path_forest_v2_test.tmj`のvalidatorも実行し、Errors 0(既存の要求仕様と同じWARN2件のみ)を確認。

これにより、**No.01「はじまりのばしょ」昼の正式屋外タイルセット化(Terrain/Trees/Props/Bridge/Path)およびPath Test Mapは正式にCLOSEDとする**。

## Step 1: 既存実装の調査結果

- `src/main.ts`: `?battleTest=`/`?gachaTest=`/`?cardBookTest=`と同じ「URLパラメータでシーン配列を丸ごと差し替える」DEV分離パターンが既存。`normalScenes`配列(Boot→Title→OpeningGlitch→StartingPlace→Field→StartingTown→Interior→Battle→...)は無変更のまま、`mapTestRequested`分岐を追加した。
- `src/scenes/BootScene.ts`: `preload()`を持たず、`TitleScene`へ即座に委譲するだけ。中央集権的なアセットマニフェストは存在せず、**各Sceneが自分のpreload()で必要な画像を個別にload**する設計(`TitleScene`/`FieldScene`/`JumpCardGachaScene`/`BattleScene`で確認)。
- `src/scenes/StartingPlaceScene.ts`(No.01夜、DEV_PLACEHOLDER): Graphics(`add.graphics`で地面・焚き火を矩形描画)+ Arcade Physics(Player用Dynamic Body、地面外周用Static Body)構成。TiledもTilemapも使用していない。**このPhaseでは一切変更していない**。
- `src/scenes/FieldScene.ts`: 表示サイズ(960×720)より大きい世界(1920×1440)を`configureMapCamera`で追従表示し、`Player`(矩形DEV主人公)+ `physics.add.collider`によるDEV_PLACEHOLDER_COLLISION矩形群、`createExitZone`によるexit判定という、**今回のMapTestNo01Sceneの直接のテンプレート**となる既存パターン。
- `src/entities/Player.ts` / `src/config/player.ts`: 30×42pxのグレー矩形、Arcade Dynamic Body、4方向移動、moveSpeed=180px/s(旧320×240基準60px/秒×SCALE_FACTOR=3)。**既存のまま完全に再利用**、新規移動システムは作成していない。
- `src/config/field.ts`のFIELD_REFERENCE: `new URL("../../assets/maps/...", import.meta.url).href`でpublic/を経由せず`assets/`直下の画像をViteでそのまま配信する既存パターンを確認。**tileset画像はこのパターンをそのまま踏襲**。
- `src/config/display.ts`: 内部解像度960×720、SCALE_FACTOR=3という**別の座標系**。Tiledの32pxグリッド・1536×1152pxワールドとは無関係な数値のため、Player自体のサイズ/速度はそのまま(既存DEVキャラ)、カメラのビューポート(960×720)だけがTiledワールドを覗く窓として機能する。
- `src/scenes/OpeningGlitchScene.ts`: `this.scene.start("StartingPlaceScene")`で終わる。**このPhaseでは変更していない**。

## Step 2: Tiled Loaderの実装方式

### 課題: Phaserは「外部tileset参照」を読めない
`node_modules/phaser/src/tilemaps/parsers/tiled/ParseTilesets.js`を実際に確認したところ、`{firstgid, source}`形式の外部tileset参照は`console.warn('External tilesets unsupported. Use Embed Tileset and re-export')`で**警告のうえサイレントに無視される**(該当tilesetがロードされず、そのGID範囲のタイルは表示されない)。tiled/配下は複数マップで`.tsj`を共有するため意図的に外部参照のままにしており、Tiled側の運用は変えられない。

### 採用した方式: ビルド時マージ
`tools/mq0-map-ai/sync-map-for-phaser.js`(新規、CommonJS)を追加した。

```
node tools/mq0-map-ai/sync-map-for-phaser.js
# または
npm run sync:maps
```

このスクリプトは`tiled/maps/*.tmj`を読み、`{firstgid, source}`の各tileset参照を、参照先`.tsj`の全フィールド(`name`/`image`/`imagewidth`/`imageheight`/`tiles`等)で置き換えた**自己完結Tiled JSON**を生成し、`public/assets/maps/mq0_map01_starting_place_day.json`へ書き出す。

- `tiled/`配下は引き続きTiled Map Editorでの編集用の**唯一の正本**。
- `public/assets/maps/*.json`は**生成物**であり手編集しない(ファイル冒頭にコメントは書けないため、本ドキュメントとスクリプト自身のコメントで明記)。
- 二重管理を防ぐため、`tests/mapPhaserSync.test.mjs`が`npm test`の一部として「`public/`の内容が今の`tiled/`から生成される内容と完全一致するか」を毎回検証する(**ズレたら`npm test`が落ちる**、これが実質的な同期ガード)。`predev`/`prebuild`への自動フック化はしていない(通常のdev/buildコマンドの失敗要因を増やしたくないため、DEV機能の範囲内で完結させた)。

### tileset画像(PNG)の配信
PNG自体はpublic/へコピーしない。`src/config/field.ts`のFIELD_REFERENCEと同じ`new URL("../../assets/maps/tilesets/xxx.png", import.meta.url).href`パターンで、`assets/maps/tilesets/`の実ファイルをViteが直接配信する。

**注意(実装中に踏んだ罠)**: `new URL()`の引数にテンプレートリテラル変数(`` `...${fileName}` ``)を使うと、Viteが静的解析できずに`assets/maps/tilesets/`ディレクトリ**全体**(未使用の`mq0_outdoor_forest_v1.png`や巨大な参考画像も含む)を安全側でビルドにバンドルしてしまう不具合を実際に`npm run build`の出力で確認した。5つのURLを1行ずつ完全なリテラル文字列で書くことで解消し、`dist/assets/`には実際に使う4枚(dev_placeholder用は1568byteのためVite既定の4KB以下自動inline対象になりファイルとしては出力されない)のみが含まれることを確認した。

### 実装ファイル
- `tools/mq0-map-ai/sync-map-for-phaser.js`(新規): マージスクリプト本体。`buildMergedMap`/`syncMap`/`MAPS_TO_SYNC`をexport。
- `package.json`: `"sync:maps": "node tools/mq0-map-ai/sync-map-for-phaser.js"`を追加。
- `public/assets/maps/mq0_map01_starting_place_day.json`(生成物、コミット対象)。
- `src/config/mapTest.ts`(新規): tilemap key/path、5tilesetのname/key/url、表示対象レイヤー名を定義。
- `src/scenes/MapTestNo01Scene.ts`(新規): 本体のDEV Scene。

## Step 3: DEV専用URL

`?mapTest=no01`のみを見る。`src/main.ts`に既存の`battleTestRequested`/`gachaTestRequested`/`cardBookTestRequested`と並列で`mapTestRequested`を追加し、真の場合のみ`scene: [MapTestNo01Scene]`へ丸ごと差し替える。パラメータが無い場合は`normalScenes`(通常起動)がそのまま使われ、**一切分岐前と同じ**。

```
http://localhost:5173/?mapTest=no01
http://localhost:5173/?mapTest=no01&collisionDebug=1   # Collision Layerを半透明赤で可視化
```

## Step 4: レイヤー表示

Tiledの`Reference`/`Ground`/`Terrain`/`Buildings`/`Collision`/`Events`をそのまま解釈した。

- `Ground`→`Terrain`→`Buildings`の順に`map.createLayer(name, tilesets, 0, 0)`で描画(Tiledのレイヤー順をそのまま踏襲)。**Buildings層は現状0セルで空**(全ての木/岩/花/campfire/log/torch/橋は`Terrain`層に配置されている、Props v2/Bridge v2 Phaseの実装通り)。
- `Collision`層は`createLayer`はするが`setVisible(false)`で非表示、判定にのみ使用。`collisionDebug=1`の時だけ`setVisible(true)`にする(**新規デバッグ描画は追加していない**。既存の半透明赤い`collision_solid_marker`をそのまま見せるだけ)。
- `Reference`層(imagelayer、`image`が空文字列)は**一切createしていない**(Phaserにはimage layerを自動生成するAPIは無く、明示的にcreateしない限り何も描画されないため、単に呼ばないだけで済んだ)。

## 木/Buildings描画順について

Trees v2/Props v2/Bridge v2は全て`Terrain`層に配置されており、`Buildings`層は空(0セル)。したがって「BuildingsだけでBuildings"層"の見た目が成立するか」という問いはこの案件では該当しない。

**主人公のY-sortは実装していない**(ユーザー指示通り)。`Player.visual`に`setDepth(1000)`を設定し、主人公が常に地形・木・Propsより手前に描画されるようにした。このため、**主人公が樹冠より奥(北側)にいる場面でも樹冠より手前に見える**という既知の見た目の不整合がある。Above/depth sortの本格対応は次Phase候補として記録するに留める(Y-sort未実装は元々のTrees v2 Phaseから持ち越しの既知事項)。

## Step 5: PlayerSpawn

`map.getObjectLayer("Events")`から`type === "playerSpawn"`のオブジェクト(`spawn_starting_place_day`、Tiled座標はpx単位、top-left基準の16×16矩形、x=584,y=648)を検索し、**矩形の中心点**(592, 656)へスポーンさせた。ハードコードされた座標は無い。

Tiled側にfacingプロパティが存在しないため、"焚き火のそばで目覚める"想定でfacing="down"を既定値とした(仕様上の空白を埋める実装判断であり、要相談ならOPENING_SPEC側で正式化されたい)。

## Step 6: 主人公移動

`src/entities/Player.ts` / `src/systems/PlayerMovement.ts` / `src/systems/InputSystem.ts`を**無変更のまま再利用**。新しい移動システムは作成していない。主人公spriteも既存のグレー矩形(DEV_PLACEHOLDER)のまま。

## Step 7: Collision

`Collision`層を`TilemapLayer`として作成し、以下で歩行不可判定を構築した:

```ts
const solidMarkerGid = findGidByLabel(tilesets, "collision_solid_marker"); // tileset定義から動的に解決
collisionLayer.setCollision(solidMarkerGid);
this.physics.add.collider(this.player.body, collisionLayer);
```

### 実装中に発見・修正した2つのバグ

1. **`setCollisionByExclusion([0])`は誤り**。Phaserは空セル(Tiledの空GID=0)を内部で`index = -1`のTileとして表現する(`ParseTileLayers.js`で確認)。`[0]`だけを除外指定すると、実際に存在する`index=-1`の空セルまで「0ではない」として巻き込まれ、**レイヤー全体が実質的に隙間なくCollision化**してしまう(かつ、隣接する全セルが「衝突する」と判定されるため`CalculateFacesWithin`が内部の面を全て無効化し、結果として**どこにも実際の押し戻しが発生しない**という分かりにくい壊れ方になる)。ブラウザで`game.step()`を手動実行して主人公を北端まで動かしても止まらないことに気づき、Phaserソースを直接確認して原因を特定した。`mq0Label === "collision_solid_marker"`のGIDを`tileset.tileProperties`から動的に求めて`setCollision(gid)`する方式に変更して解消した。
2. **`physics.world.setBounds()`の設定漏れ**。既定のArcade world boundsはゲームキャンバスサイズ(960×720)のままで、実際のTiledワールド(1536×1152)より小さかった。`this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)`を追加して解消(`FieldScene`と同じパターン)。

### ブラウザでの実地検証結果(すべて`?mapTest=no01`、`game.step()`を手動で複数フレーム進めて確認、詳細は「実ブラウザ確認」節)
- 木の幹・campfire/logの足元Collision: 阻止を確認(spawnの真北にある焚き火足元のlogに阻まれることを確認)。
- 川(橋以外): 阻止を確認(橋から離れた地点で川へ進入できないことを確認)。
- 外周: 阻止を確認(西側の森で地図端(x=0)まで到達できないことを確認)。
- 橋: 通行可能を確認(橋の2タイル分のデッキ中心(y=544)を通って西岸から東岸まで実際に横断できた)。
- **既知の制約**: DEV主人公のBody(30×42px)は32pxの1タイルより高いため、橋の欄干行(y=15/18)にかかる高さ(y=530付近)で歩くと欄干の柱セルに軽く接触してブロックされることがある。デッキの中心線(y≈544)を通れば問題なく渡れる。正式主人公spriteサイズ確定後に見直すべき既知事項として記録する。

Collision Layer自体はゲーム画面に描画されない(`collisionDebug=1`の時のみ`setVisible(true)`)。

## Step 9: Events読み取り

`map.getObjectLayer("Events").objects`から`playerSpawn`/`exit_north`/`exit_east`/`event_campfire`の4件を発見できることを、シーン起動時のconsole.logで確認した:

```
[DEV_MAP_TEST] No.01 day map loaded: 48x36 tiles, 1536x1152px, spawn=(592,656),
events=[spawn_starting_place_day{id="spawn_starting_place_day"},
exit_north{id="exit_north", targetMap="", targetSpawn=""},
exit_east{id="exit_east", targetMap="", targetSpawn=""},
event_campfire{eventId="event_campfire"}]
```

Tiled Object Propertiesも(name/type/valueの配列から)読み取り、ログに含めている。`exit_north`/`exit_east`の`targetMap`/`targetSpawn`は現状空文字列(本編接続は次Phase以降)。

`exit_north`/`exit_east`/`event_campfire`にはそれぞれ`createExitZone`(既存の`MapTransition.ts`ヘルパー、視覚マーカー付きStatic Body)による重なり判定ゾーンを設置し、`physics.world.overlap()`を毎フレームチェックして**進入時にのみ**(連続フレームでの重複ログを避けるためedge-trigger方式で)ログ出力する:

```
[DEV_MAP_TEST] EVENT ZONE detected: exit_north (id="exit_north", targetMap="", targetSpawn="")
[DEV_MAP_TEST] EVENT ZONE detected: exit_east (id="exit_east", targetMap="", targetSpawn="")
[DEV_MAP_TEST] EVENT ZONE detected: event_campfire (eventId="event_campfire")
```

本番のexit遷移・campfire本イベントは実装していない(ログ確認のみ、指示通り)。既存No.01↔Field↔No.02の導線(`src/config/maps.ts`)は無変更。

## Step 10: 表示確認

`?mapTest=no01`で、grass/土の道/木/props/橋/川/崖/滝/焚き火広場/北入口の全てが欠落なく表示されることを確認した(スクリーンショット参照、Missing texture・ピンク/黒タイルなし)。

## 回帰防止の確認

- `http://localhost:5173/`(パラメータ無し)を実際にブラウザで開き、コンソールエラー0件を確認(Phaserのfade-in等はブラウザpaneが背景化されるとrequestAnimationFrameがブラウザ側で完全停止する既知の挙動があり、画面自体の動きは自動テストでは確認しづらいが、エラーは一切出ていない)。
- `src/main.ts`の変更は既存の3つのDEV分岐パターンと全く同じ形の追加のみで、`normalScenes`配列・`DISPLAY`設定・他のScene実装は無変更。
- `src/config/maps.ts`・`StartingPlaceScene.ts`・`OpeningGlitchScene.ts`・`FieldScene.ts`は本Phaseで一切編集していない。

## 実ブラウザ確認で使った検証方法(重要な学び)

このBrowserペインは(ユーザーへ表示されていない間)Chromeの背景タブ扱いとなり、`requestAnimationFrame`が完全に停止する(`document.hidden=true`)。このため通常の「キー入力→スクリーンショットで移動を確認」という手順では**Phaserのゲームループ自体が一切進行せず**、移動もCollisionも検証できなかった(最初はこれが原因だと分からず、バグを疑って調査した)。

対策として、DEV_ONLYのdevtoolsフック(`window.__mapTestNo01 = { scene, player, map }`、`MapTestNo01Scene.create()`末尾)を使い、`scene.game.step(time, delta)`を**手動で連続呼び出し**することで、rAFに依存せずゲームループを直接駆動して検証した。この方法で移動・Collision・Event検出のすべてを実際のPhaserコードパス(rAFではなく`Game.step()`を直接叩くだけで、それ以外の処理は本番と全く同じ)で確認できた。

## 検証結果

- `npm test`: 112/112 PASS(既存101 + 新規11: `tests/mapTiledSchema.test.mjs` 7件、`tests/mapPhaserSync.test.mjs` 3件、TiledSchemaの一部を再カウント含む)。
- `npm run typecheck`: PASS。
- `npm run build`: PASS(tileset PNGの過剰バンドル問題を修正済み)。
- ブラウザ実機確認(`?mapTest=no01`、`?mapTest=no01&collisionDebug=1`): マップ表示・4方向歩行・木/水/外周Collision・橋通行・4Events検出・Collision Layerの表示/非表示切替、すべて確認、コンソールエラー0件。
- 通常起動(`/`)の回帰確認: コンソールエラー0件。

## 未実装事項(次Phase以降)

1. 本番exit遷移(`exit_north`/`exit_east`を`src/config/maps.ts`のマップ遷移へ接続)。
2. campfire本イベント(会話・演出)。
3. Y-sort / Above layer(樹冠と主人公の前後関係)。
4. 正式主人公sprite(現在は既存DEV矩形のまま)。橋の欄干での軽微な引っかかりは、正式spriteのサイズ確定時に合わせて見直す。
5. `?mapTest=no01`から通常のTitle→Opening導線への統合(いつ・どうNo.01夜版と統合するかはOPENING_SPEC側の判断)。
6. NPC(No.01には元々NPC無し、対象外)。
