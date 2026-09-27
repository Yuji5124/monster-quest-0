import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

// 背景はユーザー提供の「コタンカイムのどうくつ1〜3.png」の無加工コピー(CURRENT)。
// collision.pngはtools/build_kotankaim_cave_collision.pyが生成する。
const KOTANKAIM_CAVE_1: RainlandMapPackage = {
  mapId: "map_kotankaim_cave_1",
  keyPrefix: "image-map.kotankaim-cave-1",
  label: "コタンカイムの洞窟（1）",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/kotankaim_cave_1/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/kotankaim_cave_1/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/kotankaim_cave_1/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/kotankaim_cave_1/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/kotankaim_cave_1/objects.json", import.meta.url).toString(),
};

const KOTANKAIM_CAVE_2: RainlandMapPackage = {
  mapId: "map_kotankaim_cave_2",
  keyPrefix: "image-map.kotankaim-cave-2",
  label: "コタンカイムの洞窟（2）",
  defaultSpawnId: "fromCave1",
  manifestPath: new URL("../../assets/maps/kotankaim_cave_2/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/kotankaim_cave_2/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/kotankaim_cave_2/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/kotankaim_cave_2/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/kotankaim_cave_2/objects.json", import.meta.url).toString(),
};

const KOTANKAIM_CAVE_3: RainlandMapPackage = {
  mapId: "map_kotankaim_cave_3",
  keyPrefix: "image-map.kotankaim-cave-3",
  label: "コタンカイムの洞窟（3）",
  defaultSpawnId: "fromCave2",
  manifestPath: new URL("../../assets/maps/kotankaim_cave_3/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/kotankaim_cave_3/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/kotankaim_cave_3/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/kotankaim_cave_3/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/kotankaim_cave_3/objects.json", import.meta.url).toString(),
};

/**
 * No.13「コタンカイムの洞窟」(1)。世界地図から南の通路で入る(入場演出は`config/mapSplash.ts`)。
 * 西の石段→西の台地→北の岩棚→木の橋→中央の島→東の橋を通って、右上の扉で(2)へ。
 */
export class KotankaimCave1Scene extends RainlandImageMapScene {
  constructor() {
    super("KotankaimCave1Scene", KOTANKAIM_CAVE_1);
  }
}

/** No.13「コタンカイムの洞窟」(2)。南の石段で(1)へ戻り、左上の扉で(3)へ。 */
export class KotankaimCave2Scene extends RainlandImageMapScene {
  constructor() {
    super("KotankaimCave2Scene", KOTANKAIM_CAVE_2);
  }
}

/**
 * No.13「コタンカイムの洞窟」(3)。南の石段で(2)へ戻る。北の魔法陣はゆうしゃのたての場所だが、
 * 入手演出・条件はTBDのため未実装(魔法陣ではDEVメッセージだけを出す)。戦闘・NPCなし。
 */
export class KotankaimCave3Scene extends RainlandImageMapScene {
  constructor() {
    super("KotankaimCave3Scene", KOTANKAIM_CAVE_3);
  }
}
