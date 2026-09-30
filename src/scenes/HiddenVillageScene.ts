import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";
import { STORY_FLAGS } from "../config/storyFlags.ts";

const HIDDEN_VILLAGE: RainlandMapPackage = {
  mapId: "map_hidden_village",
  keyPrefix: "image-map.hidden-village",
  label: "かくれざと",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/hidden_village/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/hidden_village/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/hidden_village/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/hidden_village/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/hidden_village/objects.json", import.meta.url).toString(),
  entryNarration: {
    flag: STORY_FLAGS.hiddenVillageVisited,
    requiredFlag: STORY_FLAGS.iwayamaCaveCleared,
    delayMs: 240,
    pages: [
      "山あいに　ひっそりと　ある\\nかくれざとへ　たどりついた。",
      "水の音だけが　谷に\\nやわらかく　ひびいている。",
    ],
  },
};

/**
 * No.10「かくれざと」。ユーザー提供の背景と、No.02と同じ村人歩行シートを使う画像マップ。
 * ミレイとの出会い・みずうみの古城への導線は別の本編イベントとして扱い、ここでは先取りしない。
 */
export class HiddenVillageScene extends RainlandImageMapScene {
  constructor() {
    super("HiddenVillageScene", HIDDEN_VILLAGE);
  }
}
