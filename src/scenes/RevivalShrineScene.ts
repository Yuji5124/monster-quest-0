import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

// 背景はユーザー提供の見下ろし図「ふっかつのほこら_イメージ.png」(CURRENT)、collision.pngは
// tools/build_revival_shrine_collision.pyが生成する。同名の「ふっかつのほこら.png」は絵画調の外観で、入場演出に使う。
const REVIVAL_SHRINE: RainlandMapPackage = {
  mapId: "map_revival_shrine",
  keyPrefix: "image-map.revival-shrine",
  label: "ふっかつのほこら",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/revival_shrine/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/revival_shrine/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/revival_shrine/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/revival_shrine/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/revival_shrine/objects.json", import.meta.url).toString(),
};

/**
 * No.15「ふっかつのほこら」。滝と水に囲まれた石の祭壇。共通の画像マップSceneへパッケージを渡すだけの薄いScene。
 * 世界地図から入る際の入場演出(ふっかつのほこら.png)は`config/mapSplash.ts`で定義し、遷移側(MapTransition)が挟む。
 * 南の石段が唯一の出入口。北の光る台座はゆうしゃのかんむりの場所だが、入手演出・条件・反射の薄いヒント・NPC(目安2人)は
 * TBDのため未実装(台座ではDEVメッセージだけを出す)。戦闘なし。
 */
export class RevivalShrineScene extends RainlandImageMapScene {
  constructor() {
    super("RevivalShrineScene", REVIVAL_SHRINE);
  }
}
