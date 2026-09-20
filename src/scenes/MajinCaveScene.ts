import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

const CAVE_1: RainlandMapPackage = {
  mapId: "map_08_majin_cave_1",
  keyPrefix: "image-map.majin-cave-1",
  label: "まじんのどうくつ（その1）",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/majin_cave_1/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/majin_cave_1/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/majin_cave_1/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/majin_cave_1/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/majin_cave_1/objects.json", import.meta.url).toString(),
};

const CAVE_2: RainlandMapPackage = {
  mapId: "map_08_majin_cave_2",
  keyPrefix: "image-map.majin-cave-2",
  label: "まじんのどうくつ（その2）",
  defaultSpawnId: "fromCave1",
  manifestPath: new URL("../../assets/maps/majin_cave_2/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/majin_cave_2/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/majin_cave_2/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/majin_cave_2/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/majin_cave_2/objects.json", import.meta.url).toString(),
};

const CAVE_3: RainlandMapPackage = {
  mapId: "map_08_majin_cave_3",
  keyPrefix: "image-map.majin-cave-3",
  label: "まじんのどうくつ（その3）",
  defaultSpawnId: "fromCave2",
  manifestPath: new URL("../../assets/maps/majin_cave_3/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/majin_cave_3/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/majin_cave_3/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/majin_cave_3/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/majin_cave_3/objects.json", import.meta.url).toString(),
};

/**
 * No.08「まじんのどうくつ」の3枚を連結して読み込む。ボス・NPC・出現表・BGMは未確定のため、
 * 既存の画像マップ共通Sceneだけを用いて歩行・Collision・出入口を提供する。
 */
export class MajinCave1Scene extends RainlandImageMapScene {
  constructor() {
    super("MajinCave1Scene", CAVE_1);
  }
}

export class MajinCave2Scene extends RainlandImageMapScene {
  constructor() {
    super("MajinCave2Scene", CAVE_2);
  }
}

export class MajinCave3Scene extends RainlandImageMapScene {
  constructor() {
    super("MajinCave3Scene", CAVE_3);
  }
}
