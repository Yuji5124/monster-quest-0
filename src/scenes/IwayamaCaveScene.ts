import { IWAYAMA_CAVE_RANDOM_ENCOUNTER } from "../config/encounter.ts";
import { ENCOUNTER_TABLES } from "../data/encounterTables.ts";
import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

// 1F・2F共通の距離ベースのランダムエンカウント(こあくま・エリマキヘビ・ダイジャ、TEMP_TEST_VALUE)。
const IWAYAMA_CAVE_ENCOUNTER = { table: ENCOUNTER_TABLES.iwayama_cave, config: IWAYAMA_CAVE_RANDOM_ENCOUNTER } as const;

// 背景はユーザー提供の「いわやまのどうくつ_1.png」(1F)・「いわやまのどうくつ_3.png」(2F)の無加工コピー(CURRENT)。
// collision.pngはtools/build_iwayama_cave_collision.pyが生成する。
const IWAYAMA_CAVE_1: RainlandMapPackage = {
  mapId: "map_iwayama_cave_1",
  keyPrefix: "image-map.iwayama-cave-1",
  label: "いわやまのどうくつ（1F）",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/iwayama_cave_1/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/iwayama_cave_1/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/iwayama_cave_1/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/iwayama_cave_1/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/iwayama_cave_1/objects.json", import.meta.url).toString(),
  encounter: IWAYAMA_CAVE_ENCOUNTER,
};

const IWAYAMA_CAVE_2: RainlandMapPackage = {
  mapId: "map_iwayama_cave_2",
  keyPrefix: "image-map.iwayama-cave-2",
  label: "いわやまのどうくつ（2F）",
  defaultSpawnId: "fromCaveFloor1",
  manifestPath: new URL("../../assets/maps/iwayama_cave_2/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/iwayama_cave_2/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/iwayama_cave_2/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/iwayama_cave_2/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/iwayama_cave_2/objects.json", import.meta.url).toString(),
  encounter: IWAYAMA_CAVE_ENCOUNTER,
};

/**
 * No.09「いわやまのどうくつ」1F。世界地図から入る(入場演出は`config/mapSplash.ts`)。北東の階段で2Fへ。
 * 階段手前の赤い丸(objects.jsonの`shooting`)を調べると崩落シューティング(`IwayamaShootingScene`)が始まる。
 * タロサ一時参加・ボスはTBD(SPECIAL_GAMEPLAY_SPEC.md §2)。
 */
export class IwayamaCave1Scene extends RainlandImageMapScene {
  constructor() {
    super("IwayamaCave1Scene", IWAYAMA_CAVE_1);
  }
}

/** No.09「いわやまのどうくつ」2F。南の階段で1Fへ戻る。北の階段の上(おく)はイベント予約地点。 */
export class IwayamaCave2Scene extends RainlandImageMapScene {
  constructor() {
    super("IwayamaCave2Scene", IWAYAMA_CAVE_2);
  }
}
