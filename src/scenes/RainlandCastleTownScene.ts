import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

const CASTLE_TOWN: RainlandMapPackage = {
  mapId: "map_rainland_castle_town",
  keyPrefix: "image-map.rainland-castle-town",
  label: "レインランドじょうかまち",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/rainland_castle_town/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/rainland_castle_town/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/rainland_castle_town/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/rainland_castle_town/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/rainland_castle_town/objects.json", import.meta.url).toString(),
  // 2026-09-25: 北の城門からレインランドじょうへ入ったときは3D(ブロック城)を初期表示にする。V/「2D」でいつでも2Dへ切り替えられる。
  // 王の間から城へ戻るとき・MAPSのsceneKey(2D)は変えない。
  transferSceneOverrides: { map_05_rainland_castle: "RainlandCastle3DScene" },
};

/**
 * レインランドじょうかまち。共通のレインランド画像マップSceneに、じょうかまちのパッケージを渡すだけ。
 * 世界地図から入る際の入場演出(MapSplashScene)は`config/mapSplash.ts`で定義し、遷移側(MapTransition)が挟む。
 */
export class RainlandCastleTownScene extends RainlandImageMapScene {
  constructor() {
    super("RainlandCastleTownScene", CASTLE_TOWN);
  }
}
