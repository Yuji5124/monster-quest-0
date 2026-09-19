import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

// 背景・Collisionは現在DEV_PLACEHOLDER(map.jsonのassetStatus、tools/build_rainland_castle_placeholder.pyが生成する単色レイアウト)。
// 正式な城内背景が届いたら assets/maps/rainland_castle/ の画像とmap.jsonを差し替えるだけでよく、このファイルは変更しない。
const CASTLE: RainlandMapPackage = {
  mapId: "map_05_rainland_castle",
  keyPrefix: "image-map.rainland-castle",
  label: "レインランドじょう",
  defaultSpawnId: "fromCastleTown",
  manifestPath: new URL("../../assets/maps/rainland_castle/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/rainland_castle/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/rainland_castle/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/rainland_castle/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/rainland_castle/objects.json", import.meta.url).toString(),
};

/**
 * No.05「レインランドじょう」(通常の2D RPG方式)。共通のレインランド画像マップSceneへ城のパッケージを渡すだけの薄いSceneで、
 * 歩行・Collision・NPC会話・Event・出入口は他の画像マップと同じ仕組みを使う。
 *
 * 正式な導線: レインランドじょうかまちの北の城門(events.json)→ このScene(spawn: fromCastleTown)。
 * 出口(events.json)→ レインランドじょうかまちの北の城門前(spawn: fromCastle)。世界地図にはこの城を直接載せない。
 *
 * 将来、城内だけをブロック構成の特殊な城(Voxel)へ切り替える場合の差し替え点:
 *   - 入口の約束は「MapId(map_05_rainland_castle) + spawnId(fromCastleTown)」と「出口Eventで町の城門前へ戻る」だけ。
 *     町の北門Eventは`MAPS[..].sceneKey`経由で遷移するため、このSceneを直接知らない。
 *   - よって差し替えは、新Sceneを作って main.ts に登録し、config/maps.ts の sceneKey を切り替えるだけで済む。
 *   - NPC・台詞・イベントIDはデータ(maps.ts / dialogues.ts / events.json)側にあり、新Sceneからも読める。
 */
export class RainlandCastleScene extends RainlandImageMapScene {
  constructor() {
    super("RainlandCastleScene", CASTLE);
  }
}
