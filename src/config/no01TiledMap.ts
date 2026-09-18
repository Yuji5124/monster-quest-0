// No.01「はじまりのばしょ」正式Tiledマップの共有ランタイム定義。
// MapTestNo01Scene(?mapTest=no01)とStartingPlaceScene(本番の「はじめから」導線)の
// 両方から参照される(DEV専用ではない)。実際のロード処理は src/systems/TiledMapRuntime.ts。
//
// tiled/maps/mq0_map01_starting_place_day.tmj (編集用の正本、外部tileset参照)を
// "npm run sync:maps" (tools/mq0-map-ai/sync-map-for-phaser.js)で自己完結JSONへ変換し、
// public/assets/maps/配下へ生成する(このJSONファイル自体は生成物であり手編集しない)。
// tileset画像はassets/maps/tilesets/の実ファイルをVite経由でそのまま配信する
// (src/config/field.tsのFIELD_REFERENCEと同じ new URL(..., import.meta.url) パターン)。
export const NO01_DAY_TILEMAP_KEY = "no01.tilemap.starting_place_day";
export const NO01_DAY_TILEMAP_PATH = "assets/maps/mq0_map01_starting_place_day.json";

export interface TiledTilesetDef {
  /** Tiled tileset の "name" フィールド。Tilemap#addTilesetImage の第1引数と一致させる。 */
  readonly name: string;
  readonly key: string;
  readonly url: string;
}

// new URL()の引数は各行とも完全な文字列リテラルにする(テンプレートリテラル変数を混ぜない)。
// Viteは静的解析できないURLパターン(変数を含むもの)を検出すると、対象ディレクトリ内の
// 全ファイルを安全側でビルドにバンドルしてしまう(実際にビルド出力で確認された挙動)。
// 1entry=1リテラルにすることで、実際に使う5枚のtileset画像だけがバンドルされるようにする。
export const NO01_DAY_TILESETS: readonly TiledTilesetDef[] = [
  {
    name: "mq0_dev_placeholder_outdoor",
    key: "no01.tileset.dev_placeholder",
    url: new URL("../../assets/maps/tilesets/dev_placeholder_outdoor_tileset.png", import.meta.url).href,
  },
  {
    name: "mq0_terrain_forest_v2",
    key: "no01.tileset.terrain_forest_v2",
    url: new URL("../../assets/maps/tilesets/mq0_terrain_forest_v2.png", import.meta.url).href,
  },
  {
    name: "mq0_trees_forest_v2",
    key: "no01.tileset.trees_forest_v2",
    url: new URL("../../assets/maps/tilesets/mq0_trees_forest_v2.png", import.meta.url).href,
  },
  {
    name: "mq0_props_forest_v2",
    key: "no01.tileset.props_forest_v2",
    url: new URL("../../assets/maps/tilesets/mq0_props_forest_v2.png", import.meta.url).href,
  },
  {
    name: "mq0_bridge_forest_v2",
    key: "no01.tileset.bridge_forest_v2",
    url: new URL("../../assets/maps/tilesets/mq0_bridge_forest_v2.png", import.meta.url).href,
  },
] as const;

export const NO01_DAY_VISIBLE_LAYER_NAMES = ["Ground", "Terrain", "Buildings"] as const;
export const NO01_DAY_COLLISION_LAYER_NAME = "Collision";
export const NO01_DAY_EVENTS_LAYER_NAME = "Events";
export const NO01_DAY_COLLISION_MARKER_LABEL = "collision_solid_marker";
