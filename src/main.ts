import Phaser from "phaser";
import { DISPLAY } from "./config/display.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { OpeningGlitchScene } from "./scenes/OpeningGlitchScene.ts";
import { StartingPlaceScene } from "./scenes/StartingPlaceScene.ts";
import { TitleScene } from "./scenes/TitleScene.ts";
import "./style.css";

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
  scene: [BootScene, TitleScene, OpeningGlitchScene, StartingPlaceScene],
});

// 開発時の差し替えでCanvas・イベントリスナーを増殖させない。
if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}
