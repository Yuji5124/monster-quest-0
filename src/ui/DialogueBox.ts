import Phaser from "phaser";
import { DISPLAY, SCALE_FACTOR } from "../config/display.ts";

// 旧320×240基準のレイアウト値 * SCALE_FACTOR。見た目の比率は解像度移行前と同じ。
const MARGIN = 8 * SCALE_FACTOR;
const BOX_HEIGHT = 64 * SCALE_FACTOR;
const TEXT_PADDING = 8 * SCALE_FACTOR;
const BOX_COLOR = 0x0a0a14;
const BORDER_COLOR = 0xeeeeee;
const TEXT_COLOR = "#eeeeee";
// 会話文字サイズ調整: 解像度移行時点のサイズ(12px*SCALE_FACTOR=36px)を約60%に縮小。
const PREVIOUS_FONT_SIZE = 12 * SCALE_FACTOR;
const FONT_SIZE_ADJUST = 0.6;
const FONT_SIZE = Math.round(PREVIOUS_FONT_SIZE * FONT_SIZE_ADJUST);
const LINE_SPACING = 4 * SCALE_FACTOR;
const NEXT_INDICATOR_OFFSET_X = 8 * SCALE_FACTOR;
const NEXT_INDICATOR_OFFSET_Y = 12 * SCALE_FACTOR;
const BORDER_WIDTH = 2 * SCALE_FACTOR;
const NEXT_PAGE_INDICATOR = "▼";

/**
 * FC〜初期SFC風の下部会話ウィンドウ。ページ配列を渡して開き、決定入力のたびに
 * advance() を呼ぶだけでページ送り・終了までを管理する。装飾Tween等は使わない。
 */
export class DialogueBox {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private readonly nextIndicator: Phaser.GameObjects.Text;
  private pages: readonly string[] = [];
  private pageIndex = 0;
  private opened = false;

  constructor(scene: Phaser.Scene) {
    const boxX = MARGIN;
    const boxY = DISPLAY.height - MARGIN - BOX_HEIGHT;
    const boxWidth = DISPLAY.width - MARGIN * 2;

    this.background = scene.add
      .rectangle(boxX + boxWidth / 2, boxY + BOX_HEIGHT / 2, boxWidth, BOX_HEIGHT, BOX_COLOR, 1)
      .setStrokeStyle(BORDER_WIDTH, BORDER_COLOR)
      .setVisible(false);

    this.text = scene.add
      .text(boxX + TEXT_PADDING, boxY + TEXT_PADDING, "", {
        fontFamily: "monospace",
        fontSize: `${FONT_SIZE}px`,
        color: TEXT_COLOR,
        lineSpacing: LINE_SPACING,
        wordWrap: { width: boxWidth - TEXT_PADDING * 2 },
      })
      .setVisible(false);

    this.nextIndicator = scene.add
      .text(
        boxX + boxWidth - TEXT_PADDING - NEXT_INDICATOR_OFFSET_X,
        boxY + BOX_HEIGHT - TEXT_PADDING - NEXT_INDICATOR_OFFSET_Y,
        NEXT_PAGE_INDICATOR,
        {
          fontFamily: "monospace",
          fontSize: `${FONT_SIZE}px`,
          color: TEXT_COLOR,
        },
      )
      .setVisible(false);
  }

  get isOpen(): boolean {
    return this.opened;
  }

  open(pages: readonly string[]): void {
    this.pages = pages;
    this.pageIndex = 0;
    this.opened = true;
    this.background.setVisible(true);
    this.text.setVisible(true);
    this.render();
  }

  /** 次ページへ進める。最終ページだった場合は閉じてtrueを返す(会話終了)。 */
  advance(): boolean {
    if (this.pageIndex < this.pages.length - 1) {
      this.pageIndex += 1;
      this.render();
      return false;
    }
    this.close();
    return true;
  }

  close(): void {
    this.opened = false;
    this.background.setVisible(false);
    this.text.setVisible(false);
    this.nextIndicator.setVisible(false);
  }

  private render(): void {
    this.text.setText(this.pages[this.pageIndex]);
    this.nextIndicator.setVisible(this.pageIndex < this.pages.length - 1);
  }
}
