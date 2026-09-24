import Phaser from "phaser";
import { readDevMapTest } from "./config/devMapTest.ts";
import { DISPLAY } from "./config/display.ts";
import { BieVillageScene } from "./scenes/BieVillageScene.ts";
import { BieVillageTestScene } from "./scenes/BieVillageTestScene.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { BattleScene } from "./scenes/BattleScene.ts";
import { FieldScene } from "./scenes/FieldScene.ts";
import { InteriorScene } from "./scenes/InteriorScene.ts";
import { JumpCardEncyclopediaScene } from "./scenes/JumpCardEncyclopediaScene.ts";
import { JumpCardGachaScene } from "./scenes/JumpCardGachaScene.ts";
import { ImageMapTestNo01Scene } from "./scenes/ImageMapTestNo01Scene.ts";
import { MapTestNo01Scene } from "./scenes/MapTestNo01Scene.ts";
import { OpeningGlitchScene } from "./scenes/OpeningGlitchScene.ts";
import { OpeningIntroScene } from "./scenes/OpeningIntroScene.ts";
import { MapSplashScene } from "./scenes/MapSplashScene.ts";
import { MajinCaveScene } from "./scenes/MajinCaveScene.ts";
import { RainlandCastle3DScene, RainlandThroneRoom3DScene } from "./scenes/RainlandCastle3DScene.ts";
import { RainlandCastleScene } from "./scenes/RainlandCastleScene.ts";
import { RainlandThroneRoomScene } from "./scenes/RainlandThroneRoomScene.ts";
import { RainlandCastleTownScene } from "./scenes/RainlandCastleTownScene.ts";
import { RainlandForest1Scene, RainlandForest2Scene } from "./scenes/RainlandForestScene.ts";
import { StartingForestScene } from "./scenes/StartingForestScene.ts";
import { StartingForestTestScene } from "./scenes/StartingForestTestScene.ts";
import { StartingPlaceScene } from "./scenes/StartingPlaceScene.ts";
import { StartingTownScene } from "./scenes/StartingTownScene.ts";
import { TitleScene } from "./scenes/TitleScene.ts";
import { WorldMapScene } from "./scenes/WorldMapScene.ts";
import { WorldMapTestScene } from "./scenes/WorldMapTestScene.ts";
import { ZabonVillageScene } from "./scenes/ZabonVillageScene.ts";
import { HiddenVillageScene } from "./scenes/HiddenVillageScene.ts";
import { IwayamaCave1Scene, IwayamaCave2Scene } from "./scenes/IwayamaCaveScene.ts";
import { IwayamaShootingScene } from "./scenes/IwayamaShootingScene.ts";
import "./style.css";

// DEV_BATTLE_TEST is isolated from normal Title → Opening → map startup.
const battleTestRequested = new URLSearchParams(window.location.search).has("battleTest");
const gachaTestRequested = new URLSearchParams(window.location.search).has("gachaTest");
const cardBookTestRequested = new URLSearchParams(window.location.search).has("cardBookTest");
const worldMapTestRequested = new URLSearchParams(window.location.search).has("worldMapTest");
// DEV_MAP_TEST (?mapTest=no01|no02|image-no01): 通常起動に接続せず、対象マップだけを確認する。
const mapTestRequested = readDevMapTest(window.location.search);
const normalScenes = [BootScene, OpeningIntroScene, TitleScene, OpeningGlitchScene, StartingPlaceScene, WorldMapScene, FieldScene, StartingTownScene, StartingForestScene, BieVillageScene, RainlandForest1Scene, RainlandForest2Scene, RainlandCastleTownScene, RainlandCastleScene, RainlandCastle3DScene, RainlandThroneRoomScene, RainlandThroneRoom3DScene, MajinCaveScene, ZabonVillageScene, HiddenVillageScene, IwayamaCave1Scene, IwayamaCave2Scene, IwayamaShootingScene, MapSplashScene, InteriorScene, BattleScene, JumpCardGachaScene, JumpCardEncyclopediaScene];

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: DISPLAY.width,
  height: DISPLAY.height,
  backgroundColor: DISPLAY.backgroundColor,
  pixelArt: true,
  roundPixels: true,
  // キーボードの受付はInputSystemに集約する。
  input: { keyboard: false },
  // BGM/SEはPhase 2の範囲外。
  audio: { noAudio: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // DEV画面テストは通常のTitle → Opening → map起動から独立させる。
  scene: battleTestRequested
    ? [BattleScene]
    : gachaTestRequested
      ? [JumpCardGachaScene]
      : cardBookTestRequested
        ? [JumpCardEncyclopediaScene]
        : worldMapTestRequested
          // ワールド地図から全ての正式ローカルマップへ移る検証用。
          ? [WorldMapTestScene, StartingPlaceScene, StartingTownScene, StartingForestScene, BieVillageScene, RainlandForest1Scene, RainlandForest2Scene, RainlandCastleTownScene, RainlandCastleScene, RainlandCastle3DScene, RainlandThroneRoomScene, RainlandThroneRoom3DScene, MajinCaveScene, ZabonVillageScene, HiddenVillageScene, IwayamaCave1Scene, IwayamaCave2Scene, IwayamaShootingScene, MapSplashScene, BattleScene]
        : mapTestRequested === "no01"
          ? [MapTestNo01Scene]
          : mapTestRequested === "no02"
            // No.02単体確認: 西端でWorldMapSceneへ、建物入口でInteriorSceneへ、NPC経由でBattleSceneへ遷移する。
            ? [StartingTownScene, WorldMapScene, InteriorScene, BattleScene]
            : mapTestRequested === "image-no01"
              // 正式No.01画像マップの北門EventはWorldMapSceneへ遷移する。
              // 最初に起動するのは配列先頭の画像マップSceneのみ。
              ? [ImageMapTestNo01Scene, WorldMapScene, StartingTownScene]
              : mapTestRequested === "starting-forest"
                // No.03ビーエのもり（内部starting_forest）単体確認: 北門でWorldMapSceneへ、ランダムエンカウントでBattleSceneへ遷移する。
                ? [StartingForestTestScene, WorldMapScene, BattleScene]
                : mapTestRequested === "bie-village"
                  // ビーエのむら単体確認: 北門でWorldMapSceneへ遷移する。
                  ? [BieVillageTestScene, WorldMapScene]
                  : mapTestRequested === "rainland-forest"
                    // レインランドのもり単体確認: 南口でWorldMapScene、北口/南口でその1⇄その2へ、ランダムエンカウントでBattleSceneへ遷移する。
                    ? [RainlandForest1Scene, RainlandForest2Scene, WorldMapScene, BattleScene]
                    : mapTestRequested === "rainland-castle-town"
                      // レインランドじょうかまち単体確認: 南門でWorldMapSceneへ(世界地図から再入場すると入場演出を挟む)、北の城門でレインランドじょうへ。
                      ? [RainlandCastleTownScene, RainlandCastleScene, RainlandCastle3DScene, RainlandThroneRoomScene, RainlandThroneRoom3DScene, WorldMapScene, MapSplashScene]
                      : mapTestRequested === "rainland-castle"
                        // レインランドじょう単体確認: 出口Eventでレインランドじょうかまちの北の城門前へ戻り、北の城門から再入場できる。
                        ? [RainlandCastleScene, RainlandCastle3DScene, RainlandCastleTownScene, RainlandThroneRoomScene, RainlandThroneRoom3DScene, WorldMapScene, MapSplashScene]
                      : mapTestRequested === "rainland-castle-3d"
                        // レインランドじょう3D(ブロック城)単体確認: V/「2D」で同じ場所の2Dへ、2DからV/「3D」で戻る。
                        ? [RainlandCastle3DScene, RainlandCastleScene, RainlandCastleTownScene, RainlandThroneRoomScene, RainlandThroneRoom3DScene, WorldMapScene, MapSplashScene]
                      : mapTestRequested === "rainland-throne-room"
                        // 王の間単体確認: 南の出口で城の王の間の扉の前へ、V/「3D」で3Dの王の間へ。
                        ? [RainlandThroneRoomScene, RainlandThroneRoom3DScene, RainlandCastleScene, RainlandCastle3DScene, RainlandCastleTownScene, WorldMapScene, MapSplashScene]
                      : mapTestRequested === "zabon-village"
                        // No.08ザボンのむら単体確認: 北口でWorldMapSceneへ(世界地図から再入場すると入場演出を挟む)。
                        ? [ZabonVillageScene, WorldMapScene, MapSplashScene]
                      : mapTestRequested === "hidden-village"
                        // No.10かくれざと単体確認: 北西の木門でWorldMapSceneへ遷移する。
                        ? [HiddenVillageScene, WorldMapScene]
                      : mapTestRequested === "iwayama-cave"
                        // No.09いわやまのどうくつ単体確認: 1F⇄2Fの階段、1Fの入口でWorldMapSceneへ(世界地図から再入場すると入場演出)、ランダムエンカウントでBattleSceneへ。
                        ? [IwayamaCave1Scene, IwayamaCave2Scene, IwayamaShootingScene, WorldMapScene, MapSplashScene, BattleScene]
                      : mapTestRequested === "iwayama-shooting"
                        // いわやまのどうくつ崩落シューティング単体確認(&shootingSection=rocks|medium|enemies|explosion|chain|collapse|wall または a〜g)。
                        // クリアすると1Fの赤い丸の場所へ戻る。
                        ? [IwayamaShootingScene, IwayamaCave1Scene, IwayamaCave2Scene, WorldMapScene, MapSplashScene, BattleScene]
                      : mapTestRequested === "majin-cave"
                        // 正式No.07（内部map_08_majin_cave）単体確認: 通常WorldMapSceneを経由・登録せず、このSceneだけを起動する。
                        ? [MajinCaveScene]
                      : normalScenes,
});

// 開発時の差し替えでCanvas・イベントリスナーを増殖させない。
if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}

// DEV_ONLY: devtoolsから起動確認するための最小フック(本番ビルドには含まれない)。
if (typeof import.meta.env !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { __game?: Phaser.Game }).__game = game;
}
