import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

// 王の間(2026-09-23)。背景はユーザー提供の`レインランドじょう_城内2.png`(CURRENT)、collision.pngは
// tools/build_rainland_throne_room_collision.pyが生成する。城の北の扉(王の間の扉)から入り、南の出口で城へ戻る。
export const RAINLAND_THRONE_ROOM_PACKAGE: RainlandMapPackage = {
  mapId: "map_rainland_throne_room",
  keyPrefix: "image-map.rainland-throne-room",
  label: "レインランドじょう  おうのま",
  defaultSpawnId: "fromCastle",
  manifestPath: new URL("../../assets/maps/rainland_throne_room/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/rainland_throne_room/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/rainland_throne_room/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/rainland_throne_room/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/rainland_throne_room/objects.json", import.meta.url).toString(),
  alternateViewSceneKey: "RainlandThroneRoom3DScene",
};

/** 王の間(2D)。城と同じ共通の画像マップScene。V/「3D」で同じ場所のまま3Dの王の間へ切り替えられる。 */
export class RainlandThroneRoomScene extends RainlandImageMapScene {
  constructor() {
    super("RainlandThroneRoomScene", RAINLAND_THRONE_ROOM_PACKAGE);
  }
}
