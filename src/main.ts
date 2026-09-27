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
import { DakohaPortScene } from "./scenes/DakohaPortScene.ts";
import { PosaroCastleScene } from "./scenes/PosaroCastleScene.ts";
import { RevivalShrineScene } from "./scenes/RevivalShrineScene.ts";
import { HiddenVillageScene } from "./scenes/HiddenVillageScene.ts";
import { IwayamaCave1Scene, IwayamaCave2Scene } from "./scenes/IwayamaCaveScene.ts";
import { DemasTower1Scene, DemasTower2Scene, DemasTower3Scene } from "./scenes/DemasTowerScene.ts";
import { KotankaimCave1Scene, KotankaimCave2Scene, KotankaimCave3Scene } from "./scenes/KotankaimCaveScene.ts";
import { IwayamaShootingScene } from "./scenes/IwayamaShootingScene.ts";
import { LakeCastle3DScene } from "./scenes/LakeCastle3DScene.ts";
import { BatorasuFortressScene } from "./scenes/BatorasuFortressScene.ts";
import { MysteriousTower1FScene, MysteriousTowerExteriorScene } from "./scenes/MysteriousTowerScene.ts";
import { SwampCaveActionScene } from "./scenes/SwampCaveActionScene.ts";
import { StoneTownScene } from "./scenes/StoneTownScene.ts";
import "./style.css";

// DEV_BATTLE_TEST is isolated from normal Title → Opening → map startup.
const battleTestRequested = new URLSearchParams(window.location.search).has("battleTest");
const gachaTestRequested = new URLSearchParams(window.location.search).has("gachaTest");
const cardBookTestRequested = new URLSearchParams(window.location.search).has("cardBookTest");
const worldMapTestRequested = new URLSearchParams(window.location.search).has("worldMapTest");
// DEV_MAP_TEST (?mapTest=no01|no02|image-no01): 通常起動に接続せず、対象マップだけを確認する。
const mapTestRequested = readDevMapTest(window.location.search);
const normalScenes = [BootScene, OpeningIntroScene, TitleScene, OpeningGlitchScene, StartingPlaceScene, WorldMapScene, FieldScene, StartingTownScene, StartingForestScene, BieVillageScene, RainlandForest1Scene, RainlandForest2Scene, RainlandCastleTownScene, RainlandCastleScene, RainlandCastle3DScene, RainlandThroneRoomScene, RainlandThroneRoom3DScene, MajinCaveScene, ZabonVillageScene, DakohaPortScene, PosaroCastleScene, RevivalShrineScene, HiddenVillageScene, IwayamaCave1Scene, IwayamaCave2Scene, IwayamaShootingScene, KotankaimCave1Scene, KotankaimCave2Scene, KotankaimCave3Scene, DemasTower1Scene, DemasTower2Scene, DemasTower3Scene, SwampCaveActionScene, MysteriousTowerExteriorScene, MysteriousTower1FScene, LakeCastle3DScene, BatorasuFortressScene, StoneTownScene, MapSplashScene, InteriorScene, BattleScene, JumpCardGachaScene, JumpCardEncyclopediaScene];

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
          ? [WorldMapTestScene, StartingPlaceScene, StartingTownScene, StartingForestScene, BieVillageScene, RainlandForest1Scene, RainlandForest2Scene, RainlandCastleTownScene, RainlandCastleScene, RainlandCastle3DScene, RainlandThroneRoomScene, RainlandThroneRoom3DScene, MajinCaveScene, ZabonVillageScene, DakohaPortScene, PosaroCastleScene, RevivalShrineScene, HiddenVillageScene, IwayamaCave1Scene, IwayamaCave2Scene, IwayamaShootingScene, KotankaimCave1Scene, KotankaimCave2Scene, KotankaimCave3Scene, DemasTower1Scene, DemasTower2Scene, DemasTower3Scene, SwampCaveActionScene, MysteriousTowerExteriorScene, MysteriousTower1FScene, LakeCastle3DScene, BatorasuFortressScene, StoneTownScene, MapSplashScene, BattleScene]
        : mapTestRequested === "no01"
          ? [MapTestNo01Scene]
          : mapTestRequested === "no02"
            // No.02単体確認: 西端でWorldMapSceneへ、NPC経由でBattleSceneへ遷移する(建物入口は2026-09-24削除)。
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
                      : mapTestRequested === "dakoha-port"
                        // No.12港町ダコハ単体確認: 北門でWorldMapSceneへ(世界地図から再入場すると入場演出を挟む)。
                        ? [DakohaPortScene, WorldMapScene, MapSplashScene]
                      : mapTestRequested === "posaro-castle"
                        // No.14ポサロ城単体確認: 南の大階段でWorldMapSceneへ戻り、世界地図から再入場すると外観演出を挟む。
                        ? [PosaroCastleScene, WorldMapScene, MapSplashScene]
                      : mapTestRequested === "revival-shrine"
                        // No.15ふっかつのほこら単体確認: 南口でWorldMapSceneへ(世界地図から再入場すると入場演出を挟む)。
                        ? [RevivalShrineScene, WorldMapScene, MapSplashScene]
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
                      : mapTestRequested === "kotankaim-cave"
                        // No.13コタンカイムの洞窟単体確認: (1)右上の扉⇄(2)南の石段、(2)左上の扉⇄(3)南の石段、(1)南の出口でWorldMapSceneへ(再入場で入場演出)。
                        ? [KotankaimCave1Scene, KotankaimCave2Scene, KotankaimCave3Scene, WorldMapScene, MapSplashScene]
                      : mapTestRequested === "batorasu-fortress"
                        // No.19 generator QA. &seed=1 etc. reproduces the exact room chain.
                        ? [BatorasuFortressScene, BattleScene]
                      : mapTestRequested === "demas-tower"
                        // No.16 only: floors, boss battle, victory return, and world-map exit.
                        ? [DemasTower1Scene, DemasTower2Scene, DemasTower3Scene, WorldMapScene, MapSplashScene, BattleScene]
                      : mapTestRequested === "mysterious-tower"
                        // 不思議なとう単体確認: 外→入口→1Fの核→外→WorldMapSceneを確認する。
                        ? [MysteriousTowerExteriorScene, MysteriousTower1FScene, WorldMapScene]
                      : mapTestRequested === "lake-castle-3d"
                        // No.11一人称3D。&floor=1|2|3 と &lakeCastleDebug=1 で各階・Collision/FPSを単体確認できる。
                        ? [LakeCastle3DScene, WorldMapScene, MapSplashScene, BattleScene]
                      : mapTestRequested === "stone-town"
                        // No.18いしのまち単体確認: 南門・北門でWorldMapSceneへ(世界地図から再入場すると入場演出を挟む)。石像を調べて広場の石像を目覚めさせると北の石の壁が崩れる。
                        ? [StoneTownScene, WorldMapScene, MapSplashScene]
                      : mapTestRequested === "majin-cave"
                        // 正式No.07（内部map_08_majin_cave）単体確認: 通常WorldMapSceneを経由・登録せず、このSceneだけを起動する。
                        ? [MajinCaveScene]
                      : mapTestRequested === "swamp-cave"
                        // 正式No.17の短い三人アクション区画。DEV中は宝箱・進行フラグを実セーブへ書き込まない。
                        ? [SwampCaveActionScene, WorldMapScene]
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
