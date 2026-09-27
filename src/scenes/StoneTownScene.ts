import { STONE_TOWN_ENTRY } from "../config/stoneTown.ts";
import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

// 背景は歩行用の見下ろし画像が未提供のためDEV_PLACEHOLDER(tools/build_stone_town_assets.pyが背景とcollision.pngを同じレイアウトから生成)。
// 入場演出はユーザー提供の「いしのまち_イメージ.png」(assets/maps/stone_town/entry_splash.png、無加工コピー)を使う。
const STONE_TOWN: RainlandMapPackage = {
  mapId: "map_stone_town",
  keyPrefix: "image-map.stone-town",
  label: "いしのまち",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/stone_town/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/stone_town/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/stone_town/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/stone_town/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/stone_town/objects.json", import.meta.url).toString(),
  entryNarration: STONE_TOWN_ENTRY,
};

/**
 * No.18「いしのまち」。町の人も動物も生活の途中で石になった、静かなイベント町。
 * 南門から入り、広場・パンや・井戸と水路の橋で石像の「のこった声」を集め、広場の石像が目覚めると北の階段をふさぐ
 * 石の壁が崩れ、奥の老人の石像から次の目的地の手がかりを聞ける。出入口はどちらも世界地図(南門=入口、北門=奥の出口)。
 * 戦闘・店・NPC会話は無い。石像・石の壁・広場の石像は共通の画像マップSceneのImageMapStoryLayerが扱う。
 */
export class StoneTownScene extends RainlandImageMapScene {
  constructor() {
    super("StoneTownScene", STONE_TOWN);
  }
}
