import Phaser from "phaser";
import { OPENING_INTRO_SCENE_KEY } from "../config/openingIntro.ts";

/** 初期化のみを担当し、オープニング演出(OpeningIntroScene → TitleScene)へ引き渡す起動シーン。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.scene.start(OPENING_INTRO_SCENE_KEY);
  }
}
