import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

// 背景はユーザー提供の城内背景(CURRENT)、collision.pngはtools/build_rainland_castle_collision.pyが生成する。
// 背景を差し替える場合は assets/maps/rainland_castle/ の画像とmap.jsonを差し替えるだけでよく、このファイルは変更しない。
export const RAINLAND_CASTLE_PACKAGE: RainlandMapPackage = {
  mapId: "map_05_rainland_castle",
  keyPrefix: "image-map.rainland-castle",
  label: "レインランドじょう",
  defaultSpawnId: "fromCastleTown",
  manifestPath: new URL("../../assets/maps/rainland_castle/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/rainland_castle/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/rainland_castle/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/rainland_castle/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/rainland_castle/objects.json", import.meta.url).toString(),
  // 2026-09-23: V/画面の「3D」ボタンで、同じ場所・同じ向きのままブロック城(RainlandCastle3DScene)へ切り替えられる。
  alternateViewSceneKey: "RainlandCastle3DScene",
};

/**
 * No.05「レインランドじょう」(通常の2D RPG方式)。共通のレインランド画像マップSceneへ城のパッケージを渡すだけの薄いSceneで、
 * 歩行・Collision・NPC会話・Event・出入口は他の画像マップと同じ仕組みを使う。
 *
 * 正式な導線: レインランドじょうかまちの北の城門(events.json)→ このScene(spawn: fromCastleTown)。
 * 出口(events.json)→ レインランドじょうかまちの北の城門前(spawn: fromCastle)。世界地図にはこの城を直接載せない。
 *
 * 2026-09-23: ブロック城(3D)はRainlandCastle3DSceneとして実装済み。2Dが既定で、V/「3D」ボタンでいつでも切り替えられる。
 * 以下は、将来3Dを既定にする(城内を常にブロック城にする)場合の差し替え点:
 *   - 入口の約束は「MapId(map_05_rainland_castle) + spawnId(fromCastleTown)」と「出口Eventで町の城門前へ戻る」だけ。
 *     町の北門Eventは`MAPS[..].sceneKey`経由で遷移するため、このSceneを直接知らない。
 *   - よって差し替えは、新Sceneを作って main.ts に登録し、config/maps.ts の sceneKey を切り替えるだけで済む。
 *   - NPC・台詞・イベントIDはデータ(maps.ts / dialogues.ts / events.json)側にあり、新Sceneからも読める。
 */
export class RainlandCastleScene extends RainlandImageMapScene {
  constructor() {
    super("RainlandCastleScene", RAINLAND_CASTLE_PACKAGE);
  }
}

