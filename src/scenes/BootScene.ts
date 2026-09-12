import Phaser from "phaser";

/** 初期化のみを担当し、TitleSceneへ引き渡す起動シーン。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.scene.start("TitleScene");
  }
}
