import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

// 背景はユーザー提供の「ザボンのむら　新.png」(CURRENT)、collision.pngはtools/build_zabon_village_collision.pyが生成する。
const ZABON_VILLAGE: RainlandMapPackage = {
  mapId: "map_zabon_village",
  keyPrefix: "image-map.zabon-village",
  label: "ザボンのむら",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/zabon_village/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/zabon_village/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/zabon_village/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/zabon_village/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/zabon_village/objects.json", import.meta.url).toString(),
};

/**
 * No.08「ザボンのむら」(タロサの故郷、狩人の村)。共通の画像マップSceneへ村のパッケージを渡すだけの薄いScene。
 * 世界地図から入る際の入場演出(ザボンのむら_イメージ.png)は`config/mapSplash.ts`で定義し、遷移側(MapTransition)が挟む。
 * NPC・会話・店・建物内部は docs/NPC_SPEC.md で人数・構成が再検討中のため未実装(follow-up)。戦闘なし。
 */
export class ZabonVillageScene extends RainlandImageMapScene {
  constructor() {
    super("ZabonVillageScene", ZABON_VILLAGE);
  }
}
