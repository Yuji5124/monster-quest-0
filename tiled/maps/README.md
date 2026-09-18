# tiled/maps/

> **legacy / reference**: このフォルダは既存Tiled実装の`.tmx`/`.tmj`を保持する。新規ローカルマップの正本は [docs/MAP_SYSTEM.md](../../docs/MAP_SYSTEM.md) の背景画像 + Collision / Event / Object方式であり、Tiledは今後のメイン制作ツールではない。

MQ0の既存`.tmx`/`.tmj`マップ本体を置く場所。

- `mq0_test_map.tmj`: MQ0標準構造(Layer/Object/Property規約)を確定するためのテスト専用マップ。Phaserからは読み込まない。
- `mq0_map01_starting_place_day.tmj`(2026-09-15追加、2026-09-17更新): No.01「はじまりのばしょ」昼版のTiled編集用マップ。詳細・既知の制約は [`docs/PHASE_NO01_DAY_TILED_MAP.md`](../../docs/PHASE_NO01_DAY_TILED_MAP.md)、地形tileset置換の詳細は [`docs/PHASE_NO01_OUTDOOR_TILESET_SPEC.md`](../../docs/PHASE_NO01_OUTDOOR_TILESET_SPEC.md) を参照。
  - 2026-09-17、`?mapTest=no01`のDEV専用URLからPhaser 3で実際に読み込めるようになった(`src/scenes/MapTestNo01Scene.ts`)。`node tools/mq0-map-ai/sync-map-for-phaser.js`(`npm run sync:maps`)でtileset外部参照を解決した自己完結JSONを`public/assets/maps/`へ生成して読み込む（このJSON自体は生成物、`tiled/`は**既存No.01 Tiledマップに限る**編集用正本）。詳細: [`docs/PHASE_NO01_TILED_PHASER_INTEGRATION.md`](../../docs/PHASE_NO01_TILED_PHASER_INTEGRATION.md)。
  - 2026-09-17、**通常のTitle→Opening→StartingPlace導線でも読み込まれるようになった**(`StartingPlaceScene.ts`がGraphics DEV_PLACEHOLDER地形描画をこのTiledマップの表示へ置換、Tiled読み込みは`src/systems/TiledMapRuntime.ts`でDEV/本番共通化)。exit_north/exit_eastの本番遷移接続はまだ行っていない(検出のみ)。詳細: [`docs/PHASE_NO01_STARTING_PLACE_TILED_PRODUCTION.md`](../../docs/PHASE_NO01_STARTING_PLACE_TILED_PRODUCTION.md)。
  - タイルセットは5種類を併用: `tiled/tilesets/mq0_terrain_forest_v2.tsj`(正式地形、grass/water/shore/cliff/waterfall/土の道)+ `tiled/tilesets/mq0_trees_forest_v2.tsj`(正式tree/bush)+ `tiled/tilesets/mq0_props_forest_v2.tsj`(正式campfire/log/signpost/torch/stump/rock/flower/weed)+ `tiled/tilesets/mq0_bridge_forest_v2.tsj`(正式木橋)+ `tiled/tilesets/mq0_dev_placeholder_outdoor.tsj`(2026-09-17時点でGround/Terrain/Buildingsの視覚タイル使用は0件。Collision層の`collision_solid_marker`のみ全Phase共通のオーサリングマーカーとして残存)。`docs/ASSET_INDEX.md`が正本とする`tileset_base.png`/`tileset_extra.png`(未着手)を代替するものではない。
  - 2026-09-17、No.01の`path_dirt`(140セル)を正式化し、**No.01の視覚DEV_PLACEHOLDERは0件**になった(Terrain/Trees/Props/Bridge/Pathの全カテゴリが正式成果)。
- `mq0_terrain_forest_v2_test.tmj`(2026-09-15追加): `mq0_terrain_forest_v2.tsj`単体の接続確認用テストマップ(14×12)。Phaserからは読み込まない。
- `mq0_trees_forest_v2_test.tmj`(2026-09-15追加): `mq0_trees_forest_v2.tsj`単体の確認用テストマップ(16×14、small/medium/large tree・bush・stump・重なる森クラスタ・プレイヤースケールマーカー)。Phaserからは読み込まない。
- `mq0_props_forest_v2_test.tmj`(2026-09-16追加): `mq0_props_forest_v2.tsj`単体の確認用テストマップ(18×16、campfire lit/unlit・log全種・signpost・torch・stump・rock全サイズ・flower・weed・プレイヤースケールマーカー)。Phaserからは読み込まない。
- `mq0_bridge_forest_v2_test.tmj`(2026-09-16追加): `mq0_bridge_forest_v2.tsj`単体の確認用テストマップ(24×40、3本の川に3/5/7タイル橋をそれぞれ設置しcenter反復による長さ可変を実証、post 2種、プレイヤースケールマーカー)。Phaserからは読み込まない。
- `mq0_path_forest_v2_test.tmj`(2026-09-17追加): `mq0_terrain_forest_v2.tsj`の土の道blob-autotile15種単体の確認用テストマップ(25×22、2/3タイル幅の直線・90度カーブ・緩やかな蛇行・narrow→wide・小さなplazaブロブ・`mq0_bridge_forest_v2.tsj`の橋端との継ぎ目を1枚で実証)。Phaserからは読み込まない。
- MQ0のマップは引き続き [`src/config/maps.ts`](../../src/config/maps.ts) のTypeScriptオブジェクトとしてデータ駆動でも管理されている(Phaser側の実装はこちらが正)。Tiled形式は今回、編集用マップの用意までで、Phaser接続は別Phase。
- 新しい `.tmx` / `.tmj` を追加する際は、`docs/MAP_FLOW_SPEC.md` の正式No.01〜No.20の番号・名称と一致させること。
- 存在しないファイルを存在する前提で参照しない([`docs/ASSET_INDEX.md`](../../docs/ASSET_INDEX.md)と同じ方針)。
