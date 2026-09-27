import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { ImageMapBossSprite, RainlandMapPackage } from "./RainlandForestScene.ts";

// User-provided 4-column × 3-row sheet. The calm top row is the field idle;
// BattleScene retains its existing battle-specific Demas combat asset.
const DEMAS_FIELD_SPRITE: ImageMapBossSprite = {
  key: "image-map.demas-tower.boss.demas",
  path: new URL("../../assets/monsters/battle/デマスのモンスターアニメーションスプライトシート (1).png", import.meta.url).toString(),
  frameWidth: 313,
  frameHeight: 418,
  idleFrames: [0, 1, 2, 3],
  frameRate: 4,
  displayWidth: 180,
  displayHeight: 240,
};

const DEMAS_TOWER_1: RainlandMapPackage = {
  mapId: "map_demas_tower_1",
  keyPrefix: "image-map.demas-tower-1",
  label: "デーマスのとう（1F）",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/demas_tower_1/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/demas_tower_1/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/demas_tower_1/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/demas_tower_1/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/demas_tower_1/objects.json", import.meta.url).toString(),
};

const DEMAS_TOWER_2: RainlandMapPackage = {
  mapId: "map_demas_tower_2",
  keyPrefix: "image-map.demas-tower-2",
  label: "デーマスのとう（2F）",
  defaultSpawnId: "fromTower1F",
  manifestPath: new URL("../../assets/maps/demas_tower_2/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/demas_tower_2/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/demas_tower_2/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/demas_tower_2/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/demas_tower_2/objects.json", import.meta.url).toString(),
};

const DEMAS_TOWER_3: RainlandMapPackage = {
  mapId: "map_demas_tower_3",
  keyPrefix: "image-map.demas-tower-3",
  label: "デーマスのとう（3F）",
  defaultSpawnId: "fromTower2F",
  manifestPath: new URL("../../assets/maps/demas_tower_3/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/demas_tower_3/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/demas_tower_3/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/demas_tower_3/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/demas_tower_3/objects.json", import.meta.url).toString(),
  bossSprites: { demas: DEMAS_FIELD_SPRITE },
};

/** No.16 デーマスのとう。3階の中央にいるデーマスだけがBattleSceneへ接続される。 */
export class DemasTower1Scene extends RainlandImageMapScene {
  constructor() {
    super("DemasTower1Scene", DEMAS_TOWER_1);
  }
}

export class DemasTower2Scene extends RainlandImageMapScene {
  constructor() {
    super("DemasTower2Scene", DEMAS_TOWER_2);
  }
}

export class DemasTower3Scene extends RainlandImageMapScene {
  constructor() {
    super("DemasTower3Scene", DEMAS_TOWER_3);
  }
}
