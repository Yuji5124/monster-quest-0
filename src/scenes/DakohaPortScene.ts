import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

// 背景はユーザー提供の「港町ダコハ.png」(CURRENT)、collision.pngはtools/build_dakoha_port_collision.pyが生成する。
const DAKOHA_PORT: RainlandMapPackage = {
  mapId: "map_dakoha_port",
  keyPrefix: "image-map.dakoha-port",
  label: "港町ダコハ",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/dakoha_port/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/dakoha_port/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/dakoha_port/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/dakoha_port/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/dakoha_port/objects.json", import.meta.url).toString(),
};

/**
 * No.12「港町ダコハ」(港・交易・人と物と噂の町)。共通の画像マップSceneへ町のパッケージを渡すだけの薄いScene。
 * 世界地図から入る際の入場演出(港町ダコハ_イメージ.png)は`config/mapSplash.ts`で定義し、遷移側(MapTransition)が挟む。
 * 陸側の北門(画像上端中央のアーチ)が唯一の出入口。NPC・会話・店・船・デーマスの噂は未実装(follow-up)。戦闘なし。
 */
export class DakohaPortScene extends RainlandImageMapScene {
  constructor() {
    super("DakohaPortScene", DAKOHA_PORT);
  }
}
