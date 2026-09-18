import Phaser from "phaser";
import { DISPLAY, SCALE_FACTOR } from "../config/display.ts";
import {
  GLITCH_FLICKER_INTERVAL_MS,
  GLITCH_MAX_FRAME_DELTA_MS,
  GLITCH_SHIFT_INTERVAL_MS,
  OPENING_GLITCH_DURATION_MS,
  OPENING_GLITCH_STAGES,
} from "../config/openingGlitch.ts";
import type { GlitchStage } from "../config/openingGlitch.ts";

const GLITCH_TEXT_POOL_SIZE = 3;
// 文字化け風の記号・数字・半角カナ断片。意味のある文章は作らない。
const GLITCH_CHARS = "█▓▒░#%&@*■□▲▼◆◇0123456789ｱｲｳｴｵｶｷｸｹｺﾊﾞｸﾞ";
const SCANLINE_COLORS = [0xffffff, 0x66e0ff, 0xff5ecb, 0x8888aa];
const FLASH_COLORS = [0xff2255, 0x22ffee, 0xffee22];

// 以下は旧320×240基準のpx値 * SCALE_FACTOR。演出の見た目の比率を解像度移行前と揃える。
const GLITCH_TEXT_FONT_SIZE = 10 * SCALE_FACTOR;
const GLITCH_TEXT_MARGIN_X = 40 * SCALE_FACTOR;
const GLITCH_TEXT_MARGIN_Y = 16 * SCALE_FACTOR;
const SHIFT_OFFSET_SHIFT_MIN = 2 * SCALE_FACTOR;
const SHIFT_OFFSET_SHIFT_MAX = 6 * SCALE_FACTOR;
const SHIFT_OFFSET_INTENSE_MIN = 3 * SCALE_FACTOR;
const SHIFT_OFFSET_INTENSE_MAX = 10 * SCALE_FACTOR;
const SHIFT_OFFSET_Y = 2 * SCALE_FACTOR;

/**
 * 「はじめから」直後の約5秒異常演出。FC〜初期SFC時代のデータ破損風を狙い、
 * 派手なデジタルグリッチ/VHS/シェーダー演出にはしない。
 * 終了後はNo.01「はじまりのばしょ」夜版へ遷移する。
 * 接続処理は completeOpening() に集約する。
 */
export class OpeningGlitchScene extends Phaser.Scene {
  private elapsedMs = 0;
  private finished = false;
  private blackOutStarted = false;
  private graphics!: Phaser.GameObjects.Graphics;
  private glitchTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("OpeningGlitchScene");
  }

  create(): void {
    this.elapsedMs = 0;
    this.finished = false;
    this.blackOutStarted = false;

    this.cameras.main.setBackgroundColor(0x000000);
    this.cameras.main.setScroll(0, 0);

    this.graphics = this.add.graphics();
    this.glitchTexts = Array.from({ length: GLITCH_TEXT_POOL_SIZE }, () =>
      this.add
        .text(0, 0, "", { fontFamily: "monospace", fontSize: `${GLITCH_TEXT_FONT_SIZE}px`, color: "#ffffff" })
        .setVisible(false)
    );
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;

    this.elapsedMs += Math.min(delta, GLITCH_MAX_FRAME_DELTA_MS);
    const clampedMs = Math.min(this.elapsedMs, OPENING_GLITCH_DURATION_MS);
    this.render(clampedMs);

    if (this.elapsedMs >= OPENING_GLITCH_DURATION_MS) {
      this.completeOpening();
    }
  }

  private render(elapsedMs: number): void {
    this.graphics.clear();
    this.hideGlitchTexts();

    switch (this.currentStageId(elapsedMs)) {
      case "blackIn":
        // 何も描かない。黒のまま。
        break;
      case "scanlines":
        this.renderScanlines(elapsedMs);
        break;
      case "shift":
        this.renderScanlines(elapsedMs);
        this.renderShift(elapsedMs, GLITCH_SHIFT_INTERVAL_MS, SHIFT_OFFSET_SHIFT_MIN, SHIFT_OFFSET_SHIFT_MAX);
        break;
      case "intense":
        this.renderScanlines(elapsedMs);
        this.renderShift(
          elapsedMs, GLITCH_SHIFT_INTERVAL_MS * 0.7, SHIFT_OFFSET_INTENSE_MIN, SHIFT_OFFSET_INTENSE_MAX,
        );
        this.renderColorFlash(elapsedMs);
        break;
      case "blackOut":
        this.renderBlackOut(elapsedMs);
        break;
    }
  }

  private currentStageId(elapsedMs: number): GlitchStage["id"] {
    const ratio = Math.min(elapsedMs / OPENING_GLITCH_DURATION_MS, 1);
    const stage = OPENING_GLITCH_STAGES.find((s) => ratio >= s.startRatio && ratio < s.endRatio);
    return stage?.id ?? OPENING_GLITCH_STAGES[OPENING_GLITCH_STAGES.length - 1].id;
  }

  private isOnBeat(elapsedMs: number, intervalMs: number): boolean {
    return Math.floor(elapsedMs / intervalMs) % 2 === 0;
  }

  // 断続的な横線ノイズ。オン/オフの切替は決まった間隔、線の位置・色だけ軽い乱数。
  private renderScanlines(elapsedMs: number): void {
    if (!this.isOnBeat(elapsedMs, GLITCH_FLICKER_INTERVAL_MS)) return;
    const barCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < barCount; i += 1) {
      const y = Math.random() * DISPLAY.height;
      const h = (1 + Math.random() * 2) * SCALE_FACTOR;
      const color = SCANLINE_COLORS[Math.floor(Math.random() * SCANLINE_COLORS.length)];
      this.graphics.fillStyle(color, 0.5 + Math.random() * 0.3);
      this.graphics.fillRect(0, y, DISPLAY.width, h);
    }
  }

  // 画面の一部が左右にずれたような表示位置異常 + 文字化け風の断片表示。
  private renderShift(elapsedMs: number, intervalMs: number, minOffset: number, maxOffset: number): void {
    if (this.isOnBeat(elapsedMs, intervalMs)) {
      const magnitude = minOffset + Math.floor(Math.random() * (maxOffset - minOffset + 1));
      const offsetX = (Math.random() < 0.5 ? -1 : 1) * magnitude;
      const offsetY = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) * SHIFT_OFFSET_Y : 0;
      this.cameras.main.setScroll(offsetX, offsetY);
      this.showGlitchText();
    } else {
      this.cameras.main.setScroll(0, 0);
    }
  }

  // 強い乱れ段階だけの、色がおかしくなる一瞬の全画面フラッシュ。
  private renderColorFlash(elapsedMs: number): void {
    if (!this.isOnBeat(elapsedMs, GLITCH_FLICKER_INTERVAL_MS)) return;
    if (Math.random() >= 0.25) return;
    const color = FLASH_COLORS[Math.floor(Math.random() * FLASH_COLORS.length)];
    this.graphics.fillStyle(color, 0.3 + Math.random() * 0.15);
    this.graphics.fillRect(0, 0, DISPLAY.width, DISPLAY.height);
  }

  private renderBlackOut(_elapsedMs: number): void {
    this.cameras.main.setScroll(0, 0);
    if (this.blackOutStarted) return;
    this.blackOutStarted = true;
    const blackOutStage = OPENING_GLITCH_STAGES.find((s) => s.id === "blackOut");
    const startMs = (blackOutStage?.startRatio ?? 1) * OPENING_GLITCH_DURATION_MS;
    const remainingMs = Math.max(0, OPENING_GLITCH_DURATION_MS - startMs);
    this.cameras.main.fadeOut(remainingMs, 0, 0, 0);
  }

  private showGlitchText(): void {
    const text = this.glitchTexts[Math.floor(Math.random() * this.glitchTexts.length)];
    text.setText(this.randomGlitchString());
    text.setPosition(
      Math.random() * (DISPLAY.width - GLITCH_TEXT_MARGIN_X),
      Math.random() * (DISPLAY.height - GLITCH_TEXT_MARGIN_Y),
    );
    text.setVisible(true);
  }

  private hideGlitchTexts(): void {
    for (const text of this.glitchTexts) text.setVisible(false);
  }

  private randomGlitchString(): string {
    const length = 3 + Math.floor(Math.random() * 5);
    let out = "";
    for (let i = 0; i < length; i += 1) {
      out += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
    }
    return out;
  }

  // Phase 4: 演出完了後、No.01夜版へ一度だけ引き渡す。
  private completeOpening(): void {
    if (this.finished) return;
    this.finished = true;
    this.graphics.clear();
    this.hideGlitchTexts();
    this.cameras.main.setScroll(0, 0);
    this.scene.start("StartingPlaceScene");
  }
}
