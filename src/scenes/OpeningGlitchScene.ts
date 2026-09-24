import Phaser from "phaser";
import { DISPLAY, SCALE_FACTOR } from "../config/display.ts";
import {
  OPENING_CORRUPTION_FRAGMENTS,
  OPENING_DEBUG_BOOT_LINES,
  OPENING_DEBUG_ERROR_LINES,
  OPENING_GLITCH_STAGES,
} from "../config/openingGlitch.ts";
import type { OpeningGlitchStageId } from "../config/openingGlitch.ts";

const SMALL_FONT_SIZE = 7 * SCALE_FACTOR;
const NORMAL_FONT_SIZE = 9 * SCALE_FACTOR;
const DENSE_FRAGMENT_COUNT = 96;
const STAGE_DEPTH = 10;
const BLACK = 0x000000;
const WHITE = "#d8d8d8";
const GREY = "#7b7f83";
const ERROR_RED = "#8c3232";

/**
 * タイトルの直後に、内部の起動情報が一瞬だけ漏れたように見せる5秒の制御演出。
 * 背景画像・タイトル・ロゴ・人物・地図はロードも表示もしない。
 */
export class OpeningGlitchScene extends Phaser.Scene {
  private stageObjects: Phaser.GameObjects.GameObject[] = [];
  private finished = false;

  constructor() {
    super("OpeningGlitchScene");
  }

  create(): void {
    this.finished = false;
    this.cameras.main.setBackgroundColor("#000000");
    this.cameras.main.setScroll(0, 0);
    this.playStage(0);
  }

  private playStage(index: number): void {
    if (this.finished) return;
    const stage = OPENING_GLITCH_STAGES[index];
    if (!stage) {
      this.completeOpening();
      return;
    }
    this.clearStage();
    this.renderStage(stage.id);
    this.time.delayedCall(stage.durationMs, () => this.playStage(index + 1));
  }

  private renderStage(stageId: OpeningGlitchStageId): void {
    if (stageId === "boot") this.renderBoot();
    if (stageId === "debugOverlap") this.renderDebugOverlap();
    if (stageId === "corruption") this.renderCorruption();
    if (stageId === "recovery") this.renderRecovery();
    if (stageId === "blackOut") this.addBackdrop();
  }

  /** 0.0〜1.0秒: 少数の文字だけが黒から浮く。 */
  private renderBoot(): void {
    this.addBackdrop();
    this.addCrtScanlines(0.035);
    const positions = [
      [42, 54], [42, 88], [42, 122], [570, 72], [570, 108], [92, 474], [560, 550],
    ] as const;
    OPENING_DEBUG_BOOT_LINES.forEach((line, index) => {
      const [x, y] = positions[index];
      const text = this.addText(x, y, line, index === 2 ? GREY : WHITE, SMALL_FONT_SIZE).setAlpha(0);
      this.tweens.add({ targets: text, alpha: 0.78, duration: 70, delay: index * 95, ease: "Linear" });
    });
    this.addDigitalNoise(6, 0.16);
  }

  /** 1.0〜2.3秒: 断片的なパネルとエラーが重なる。 */
  private renderDebugOverlap(): void {
    this.addBackdrop();
    this.addCrtScanlines(0.055);
    this.addDebugPanel(34, 48, 344, 182, [
      "> INIT_PLAYER...", "> LOAD_MAP...", "> MEMORY CHECK...", "0x00A18F  3F 0A FF 7E",
    ], WHITE);
    this.addDebugPanel(500, 64, 392, 154, [
      "> CRC ERROR", "> DATA MISMATCH", "> RETRY...", "> UNKNOWN",
    ], GREY);
    this.addDebugPanel(132, 404, 406, 190, [
      "> 0x804D210 : ??", "> JMP  ???", "> CMP  ??,???", "> NULL",
    ], GREY);
    this.addDebugPanel(584, 430, 292, 150, [
      OPENING_DEBUG_ERROR_LINES[0], OPENING_DEBUG_ERROR_LINES[1], OPENING_DEBUG_ERROR_LINES[5],
    ], ERROR_RED);
    this.addDigitalNoise(24, 0.48);
    this.addDropouts(9);
  }

  /** 2.3〜3.8秒: 読めない断片を高密度にちらつかせる。 */
  private renderCorruption(): void {
    this.addBackdrop();
    this.addCrtScanlines(0.1);
    for (let index = 0; index < DENSE_FRAGMENT_COUNT; index += 1) {
      const text = OPENING_CORRUPTION_FRAGMENTS[Math.floor(Math.random() * OPENING_CORRUPTION_FRAGMENTS.length)];
      const x = Phaser.Math.Between(12, DISPLAY.width - 210);
      const y = Phaser.Math.Between(14, DISPLAY.height - 24);
      const color = index % 13 === 0 ? ERROR_RED : index % 4 === 0 ? GREY : WHITE;
      const fragment = this.addText(x, y, text, color, Phaser.Math.Between(SMALL_FONT_SIZE - 3, SMALL_FONT_SIZE + 3))
        .setAlpha(Phaser.Math.FloatBetween(0.22, 0.75));
      this.tweens.add({
        targets: fragment,
        alpha: 0.04,
        duration: Phaser.Math.Between(70, 150),
        delay: Phaser.Math.Between(0, 620),
        yoyo: true,
        repeat: 2,
        ease: "Linear",
      });
    }
    this.addDigitalNoise(62, 0.74);
    this.addDropouts(22);
    this.addHorizontalTears(11);
  }

  /** 3.8〜4.6秒: ほとんどの文字を消し、数行だけを点滅させる。 */
  private renderRecovery(): void {
    this.addBackdrop();
    this.addCrtScanlines(0.028);
    const remaining = [
      [126, 176, "..."], [486, 334, "???"], [706, 512, "LOAD..."],
    ] as const;
    remaining.forEach(([x, y, line], index) => {
      const text = this.addText(x, y, line, index === 1 ? GREY : WHITE, NORMAL_FONT_SIZE).setAlpha(0.86);
      this.tweens.add({ targets: text, alpha: 0.08, duration: 95, delay: index * 90, yoyo: true, repeat: 3, ease: "Linear" });
    });
    this.addHorizontalTears(2, 610);
  }

  private addDebugPanel(x: number, y: number, width: number, height: number, lines: readonly string[], color: string): void {
    const border = this.track(this.add.graphics().setDepth(STAGE_DEPTH));
    border.lineStyle(1 * SCALE_FACTOR, Phaser.Display.Color.HexStringToColor(color).color, 0.48);
    border.strokeRect(x, y, width, height);
    lines.forEach((line, index) => this.addText(x + 18, y + 20 + index * 30, line, color, SMALL_FONT_SIZE));
  }

  /** 低コントラストの走査線。緑のコード雨にはしない。 */
  private addCrtScanlines(alpha: number): void {
    const scanlines = this.track(this.add.graphics().setDepth(STAGE_DEPTH + 20));
    scanlines.fillStyle(0xffffff, alpha);
    for (let y = 0; y < DISPLAY.height; y += 12) scanlines.fillRect(0, y, DISPLAY.width, 1);
  }

  /** 圧縮ブロックと短いRGBの信号ずれ。背景画面にはならない小ささに限定する。 */
  private addDigitalNoise(count: number, alpha: number): void {
    const noise = this.track(this.add.graphics().setDepth(STAGE_DEPTH + 16));
    const colors = [0xe0e0e0, 0x6d2529, 0x264d68, 0x655a30];
    for (let index = 0; index < count; index += 1) {
      const width = Phaser.Math.Between(8, 58);
      const height = Phaser.Math.Between(2, 9);
      noise.fillStyle(colors[index % colors.length], alpha * Phaser.Math.FloatBetween(0.2, 1));
      noise.fillRect(Phaser.Math.Between(0, DISPLAY.width - width), Phaser.Math.Between(0, DISPLAY.height - height), width, height);
    }
  }

  private addDropouts(count: number): void {
    const holes = this.track(this.add.graphics().setDepth(STAGE_DEPTH + 18));
    holes.fillStyle(BLACK, 1);
    for (let index = 0; index < count; index += 1) {
      holes.fillRect(Phaser.Math.Between(8, DISPLAY.width - 120), Phaser.Math.Between(8, DISPLAY.height - 32), Phaser.Math.Between(18, 105), Phaser.Math.Between(8, 28));
    }
  }

  private addHorizontalTears(count: number, fixedY?: number): void {
    const tears = this.track(this.add.graphics().setDepth(STAGE_DEPTH + 22));
    const colors = [0xd6d6d6, 0x812b32, 0x2b5874];
    for (let index = 0; index < count; index += 1) {
      const y = fixedY ?? Phaser.Math.Between(28, DISPLAY.height - 28);
      tears.fillStyle(colors[index % colors.length], index === 0 ? 0.78 : 0.35);
      tears.fillRect(Phaser.Math.Between(0, 140), y, Phaser.Math.Between(330, DISPLAY.width), Phaser.Math.Between(1, 5));
    }
  }

  private addBackdrop(): void {
    this.track(this.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, BLACK, 1).setDepth(0));
  }

  private addText(x: number, y: number, text: string, color: string, fontSize: number): Phaser.GameObjects.Text {
    return this.track(this.add.text(x, y, text, {
      color,
      fontFamily: "monospace",
      fontSize: `${fontSize}px`,
      padding: { x: 1, y: 0 },
    }).setDepth(STAGE_DEPTH));
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.stageObjects.push(object);
    return object;
  }

  private clearStage(): void {
    for (const object of this.stageObjects) {
      this.tweens.killTweensOf(object);
      object.destroy();
    }
    this.stageObjects = [];
  }

  private completeOpening(): void {
    if (this.finished) return;
    this.finished = true;
    this.clearStage();
    this.scene.start("StartingPlaceScene", { openingSequence: true });
  }
}
