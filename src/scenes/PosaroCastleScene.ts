import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

// The user-supplied boss-hall image is the walkable background. The exterior illustration is
// shown only by the world-map entry splash, so neither source asset is redrawn or repurposed.
const POSARO_CASTLE: RainlandMapPackage = {
  mapId: "map_posaro_castle",
  keyPrefix: "image-map.posaro-castle",
  label: "ポサロ城",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/posaro_castle/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/posaro_castle/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/posaro_castle/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/posaro_castle/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/posaro_castle/objects.json", import.meta.url).toString(),
};

/**
 * No.14「ポサロ城」。世界地図から南の大階段に入り、同じ階段から戻る画像マップ。
 * 現在は出入りと探索用の歩行領域だけを実装する。バクラー戦、ゆうしゃのけん、NPC、
 * 会話、BGMは仕様が未確定のため追加しない。
 */
export class PosaroCastleScene extends RainlandImageMapScene {
  constructor() {
    super("PosaroCastleScene", POSARO_CASTLE);
  }
}
