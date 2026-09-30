// BRIEF.md §2 の素材。ゲーム本体のファイルをコピーせず、リポジトリルートからの相対パスで参照する。
// （webpackのimportなので、レンダー時に使われるファイルだけがバンドルされる。本体側のファイルは一切変更しない）

// タイトルロゴ（配信版）
import titleLogo from "../../../public/assets/ui/title/mq0_title_logo.png";
import titleLogoSource from "../../../assets/title/ChatGPT Image 2026年9月13日 05_31_34.png";

// マップ
import startingPlaceNight from "../../../assets/maps/starting_place/background.png";
import worldMap from "../../../assets/maps/world_map/background.png";
import bieSplash from "../../../assets/maps/bie_village/entry_splash.png";
import rainlandTownSplash from "../../../assets/maps/rainland_castle_town/entry_splash.png";
import zabonSplash from "../../../assets/maps/zabon_village/entry_splash.png";
import majinCaveSplash from "../../../assets/maps/majin_cave_1/entry_splash.png";
import iwayamaCaveSplash from "../../../assets/maps/iwayama_cave_1/entry_splash.png";
import startingTown from "../../../assets/maps/starting_town/background.png";
import hiddenVillage from "../../../assets/maps/hidden_village/background.png";

// キャラクター
import tarosaStanding from "../../../assets/characters/portraits/tarosa_standing.png";
import mireiBack from "../../../assets/characters/reference/reference/ミレイ/霧深き山里の紫髪魔導士.png";
import protagonistWalk from "../../../assets/characters/playable/protagonist_walk.png";
import tarosaWalk from "../../../assets/characters/playable/tarosa_walk.png";
import mireiWalk from "../../../assets/characters/playable/mirei_walk.png";
import protagonistFront from "../../../assets/characters/reference/reference/主人公/正面1.png";
// 2026-09-27 ユーザー指定: C03 の主人公はこの立ち絵（透過PNG）を使う
import protagonistProfile from "../../../assets/characters/reference/profiles/主人公.png";

// モンスター
import majinSheet from "../../../assets/monsters/majin_cave/monster_majin_dungeon.png";
import purin from "../../../assets/monsters/majin_cave/monster_purin.png";
import koakuma from "../../../assets/monsters/majin_cave/monster_koakuma.png";
import snowBomb from "../../../assets/monsters/majin_cave/monster_snow_bomb.png";
import tamagoGhost from "../../../assets/monsters/majin_cave/monster_tamago_ghost.png";
import erimakiHebi from "../../../assets/monsters/majin_cave/monster_erimaki_hebi.png";
import daija from "../../../assets/monsters/majin_cave/monster_daija.png";

export const IMG = {
  titleLogo,
  titleLogoSource,
  startingPlaceNight,
  worldMap,
  bieSplash,
  rainlandTownSplash,
  zabonSplash,
  majinCaveSplash,
  iwayamaCaveSplash,
  startingTown,
  hiddenVillage,
  tarosaStanding,
  mireiBack,
  protagonistWalk,
  tarosaWalk,
  mireiWalk,
  protagonistFront,
  protagonistProfile,
  majinSheet,
  purin,
  koakuma,
  snowBomb,
  tamagoGhost,
  erimakiHebi,
  daija,
} as const;

// 歩行ドットのシート仕様（docs/ASSET_INDEX.md: 3列×4行 / 行=down,left,right,up）
export const WALK_SHEET = {
  protagonist: { src: protagonistWalk, cellW: 54, cellH: 70 },
  tarosa: { src: tarosaWalk, cellW: 44, cellH: 70 },
  mirei: { src: mireiWalk, cellW: 54, cellH: 70 },
} as const;

// BGM候補（§6）は Step 3 で選定後にここへ追加する。
