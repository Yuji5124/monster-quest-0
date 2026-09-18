import Phaser from "phaser";
import { readDevMapTest } from "./config/devMapTest.ts";
import { DISPLAY } from "./config/display.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { BattleScene } from "./scenes/BattleScene.ts";
import { FieldScene } from "./scenes/FieldScene.ts";
import { InteriorScene } from "./scenes/InteriorScene.ts";
import { JumpCardEncyclopediaScene } from "./scenes/JumpCardEncyclopediaScene.ts";
import { JumpCardGachaScene } from "./scenes/JumpCardGachaScene.ts";
import { ImageMapTestNo01Scene } from "./scenes/ImageMapTestNo01Scene.ts";
import { MapTestNo01Scene } from "./scenes/MapTestNo01Scene.ts";
import { OpeningGlitchScene } from "./scenes/OpeningGlitchScene.ts";
import { StartingPlaceScene } from "./scenes/StartingPlaceScene.ts";
import { StartingTownScene } from "./scenes/StartingTownScene.ts";
import { TitleScene } from "./scenes/TitleScene.ts";
import { WorldMapScene } from "./scenes/WorldMapScene.ts";
import { WorldMapTestScene } from "./scenes/WorldMapTestScene.ts";
import "./style.css";

// DEV_BATTLE_TEST is isolated from normal Title → Opening → map startup.
const battleTestRequested = new URLSearchParams(window.location.search).has("battleTest");
const gachaTestRequested = new URLSearchParams(window.location.search).has("gachaTest");
const cardBookTestRequested = new URLSearchParams(window.location.search).has("cardBookTest");
const worldMapTestRequested = new URLSearchParams(window.location.search).has("worldMapTest");
// DEV_MAP_TEST (?mapTest=no01|no02|image-no01): 通常起動に接続せず、対象マップだけを確認する。
const mapTestRequested = readDevMapTest(window.location.search);
const normalScenes = [BootScene, TitleScene, OpeningGlitchScene, StartingPlaceScene, WorldMapScene, FieldScene, StartingTownScene, InteriorScene, BattleScene, JumpCardGachaScene, JumpCardEncyclopediaScene];

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
          // ワールド地図から正式No.01画像マップ / 既存No.02へ移る検証用。
          ? [WorldMapTestScene, StartingPlaceScene, StartingTownScene]
        : mapTestRequested === "no01"
          ? [MapTestNo01Scene]
          : mapTestRequested === "no02"
            ? [StartingTownScene]
            : mapTestRequested === "image-no01"
              // 正式No.01画像マップの北門EventはWorldMapSceneへ遷移する。
              // 最初に起動するのは配列先頭の画像マップSceneのみ。
              ? [ImageMapTestNo01Scene, WorldMapScene, StartingTownScene]
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
