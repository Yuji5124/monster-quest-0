// ゲーム本体の正式素材。複製せず、リポジトリルートからの相対パスで参照する（本体のファイルは変更しない）。
// パスは docs/ASSET_INDEX.md の CURRENT 素材。旧 hero_walk.png（SUPERSEDED）は使わない。
import titleLogo from "../../../public/assets/ui/title/mq0_title_logo.png";
import startingPlaceNight from "../../../assets/maps/starting_place/background.png";
import worldMap from "../../../assets/maps/world_map/background.png";
import startingTown from "../../../assets/maps/starting_town/background.png";
import startingForest from "../../../assets/maps/starting_forest/background.png";
import bieSplash from "../../../assets/maps/bie_village/entry_splash.png";
import rainlandForest from "../../../assets/maps/rainland_forest_1/background.png";
import castleTownSplash from "../../../assets/maps/rainland_castle_town/entry_splash.png";
import zabonSplash from "../../../assets/maps/zabon_village/entry_splash.png";
import iwayamaSplash from "../../../assets/maps/iwayama_cave_1/entry_splash.png";
import tarosaArchery from "../../../assets/characters/portraits/tarosa_archery_report.png";
import heroBack from "../../../assets/characters/reference/reference/主人公/うしろ1.png";
import majinSheet from "../../../assets/monsters/majin_cave/monster_majin_dungeon.png";

export const IMG = {
  titleLogo,
  startingPlaceNight,
  worldMap,
  startingTown,
  startingForest,
  bieSplash,
  rainlandForest,
  castleTownSplash,
  zabonSplash,
  iwayamaSplash,
  tarosaArchery,
  heroBack,
  majinSheet,
} as const;

/** 素材画像の元サイズ（1448×1086 の地図・イラスト共通） */
export const MAP_W = 1448;
export const MAP_H = 1086;

/** 世界地図の地点（assets/maps/world_map/destinations.json の x,y を 0〜1 に正規化） */
const P = (x: number, y: number) => ({ x: x / MAP_W, y: y / MAP_H });
export const WORLD_POINT = {
  no01: P(615, 745),
  no02: P(658, 592),
  no03: P(382, 517),
  no04: P(499, 620),
  no05: P(635, 311),
  no06: P(714, 160),
} as const;
