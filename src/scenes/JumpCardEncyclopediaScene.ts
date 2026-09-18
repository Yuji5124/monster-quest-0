import Phaser from "phaser";
import { getJumpCardDisplayName, getJumpCardPage, getJumpCardRecords, JUMP_CARD_PAGE_SIZE, JUMP_CARD_TOTAL, preloadJumpCardImages } from "../data/jumpCards.ts";
import type { JumpCardRecord } from "../data/jumpCards.ts";
import { DISPLAY, SCALE_FACTOR } from "../config/display.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import type { GameState } from "../systems/GameStateRepository.ts";
import { InputSystem } from "../systems/InputSystem.ts";

const WINDOW_COLOR = 0x090c18;
const WINDOW_BORDER = 0xeeeeee;
const TEXT_COLOR = "#eeeeee";
const DIM_TEXT_COLOR = "#aab0c0";
const CURSOR = "▶ ";
const NO_CURSOR = "　 ";
const LIST_X = 20 * SCALE_FACTOR;
const LIST_Y = 70 * SCALE_FACTOR;
const LIST_WIDTH = 280 * SCALE_FACTOR;
const LIST_HEIGHT = 120 * SCALE_FACTOR;
const LIST_TEXT_X = 30 * SCALE_FACTOR;
const LIST_TEXT_Y = 75 * SCALE_FACTOR;
const LIST_LINE_HEIGHT = 12 * SCALE_FACTOR;
const DETAIL_Y = 132 * SCALE_FACTOR;

type BookMode = "list" | "detail" | "unobtainedNotice";

/** 読み取り専用のジャンカード図鑑。カード定義と取得状態を変更しない。 */
export class JumpCardEncyclopediaScene extends Phaser.Scene {
  private actions!: InputSystem;
  private readonly repository = new GameStateRepository();
  private state!: GameState;
  private records: readonly JumpCardRecord[] = [];
  private pageIndex = 0;
  private selectedIndex = 0;
  private mode: BookMode = "list";
  private statusText!: Phaser.GameObjects.Text;
  private pageText!: Phaser.GameObjects.Text;
  private listTexts: Phaser.GameObjects.Text[] = [];
  private footerText!: Phaser.GameObjects.Text;
  private detailContainer!: Phaser.GameObjects.Container;

  constructor() {
    super("JumpCardEncyclopediaScene");
  }

  preload(): void {
    preloadJumpCardImages(this.load);
  }

  create(): void {
    // 図鑑は load() だけを呼ぶ。保存・取得処理はJumpCardGachaSceneの責務。
    this.state = this.repository.load();
    this.records = getJumpCardRecords(this.state.cards.obtainedJumpCards);
    this.cameras.main.setBackgroundColor(0x101526);
    this.actions = new InputSystem(window, document);

    this.add.text(DISPLAY.width / 2, 16 * SCALE_FACTOR, "ジャンカード図鑑", {
      fontFamily: "monospace", fontSize: `${18 * SCALE_FACTOR}px`, color: TEXT_COLOR,
    }).setOrigin(0.5);
    this.createWindow(20 * SCALE_FACTOR, 30 * SCALE_FACTOR, 280 * SCALE_FACTOR, 32 * SCALE_FACTOR);
    this.statusText = this.add.text(32 * SCALE_FACTOR, 35 * SCALE_FACTOR, "", {
      fontFamily: "monospace", fontSize: `${9 * SCALE_FACTOR}px`, color: TEXT_COLOR, lineSpacing: 3,
    });
    this.pageText = this.add.text(288 * SCALE_FACTOR, 35 * SCALE_FACTOR, "", {
      fontFamily: "monospace", fontSize: `${9 * SCALE_FACTOR}px`, color: TEXT_COLOR, align: "right", lineSpacing: 3,
    }).setOrigin(1, 0);

    this.createWindow(LIST_X, LIST_Y, LIST_WIDTH, LIST_HEIGHT);
    this.listTexts = Array.from({ length: JUMP_CARD_PAGE_SIZE }, (_, index) =>
      this.add.text(LIST_TEXT_X, LIST_TEXT_Y + index * LIST_LINE_HEIGHT, "", {
        fontFamily: "monospace", fontSize: `${9 * SCALE_FACTOR}px`, color: TEXT_COLOR,
      })
    );
    this.footerText = this.add.text(DISPLAY.width / 2, 222 * SCALE_FACTOR, "", {
      fontFamily: "monospace", fontSize: `${8 * SCALE_FACTOR}px`, color: DIM_TEXT_COLOR, align: "center", lineSpacing: 3,
    }).setOrigin(0.5);
    this.detailContainer = this.add.container(DISPLAY.width / 2, DETAIL_Y).setVisible(false).setDepth(3);

    this.input.on("pointerdown", this.handlePointer, this);
    const cleanup = (): void => {
      this.actions.destroy();
      this.input.off("pointerdown", this.handlePointer, this);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    this.renderList();
  }

  update(): void {
    const confirm = this.actions.consumePressed("confirm");
    const cancel = this.actions.consumePressed("cancel");
    if (this.mode === "detail" || this.mode === "unobtainedNotice") {
      if (confirm || cancel) this.returnToList();
      return;
    }
    if (this.actions.consumePressed("moveUp")) this.moveSelection(-1);
    if (this.actions.consumePressed("moveDown")) this.moveSelection(1);
    if (this.actions.consumePressed("moveLeft")) this.movePage(-1);
    if (this.actions.consumePressed("moveRight")) this.movePage(1);
    if (cancel) this.returnToTitle();
    if (confirm) this.openSelectedCard();
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (this.mode !== "list") {
      this.actions.queuePressed("confirm");
      return;
    }
    if (pointer.y >= LIST_Y && pointer.y <= LIST_Y + LIST_HEIGHT && pointer.x >= LIST_X && pointer.x <= LIST_X + LIST_WIDTH) {
      const index = Math.floor((pointer.y - LIST_TEXT_Y) / LIST_LINE_HEIGHT);
      if (index >= 0 && index < this.currentPage().length) {
        this.selectedIndex = index;
        this.renderList();
        this.actions.queuePressed("confirm");
      }
      return;
    }
    // 下部の左右半分は、キーボードの←→と同じページ移動へ変換する。
    if (pointer.y >= 190 * SCALE_FACTOR) this.actions.queuePressed(pointer.x < DISPLAY.width / 2 ? "moveLeft" : "moveRight");
  }

  private moveSelection(delta: number): void {
    const count = this.currentPage().length;
    if (!count) return;
    this.selectedIndex = (this.selectedIndex + delta + count) % count;
    this.renderList();
  }

  private movePage(delta: number): void {
    const pageCount = Math.ceil(this.records.length / JUMP_CARD_PAGE_SIZE);
    const nextPage = this.pageIndex + delta;
    if (nextPage < 0 || nextPage >= pageCount) return;
    this.pageIndex = nextPage;
    this.selectedIndex = Math.min(this.selectedIndex, this.currentPage().length - 1);
    this.renderList();
  }

  private openSelectedCard(): void {
    const card = this.currentPage()[this.selectedIndex];
    if (!card) return;
    if (!card.obtained) {
      this.showUnobtainedNotice();
      return;
    }
    this.showCardDetail(card);
  }

  private showCardDetail(card: JumpCardRecord): void {
    this.mode = "detail";
    this.setListVisible(false);
    this.detailContainer.removeAll(true);
    this.detailContainer.setPosition(DISPLAY.width / 2, DETAIL_Y).setScale(1).setAlpha(1).setVisible(true);
    const frame = this.add.rectangle(0, 0, 238 * SCALE_FACTOR, 150 * SCALE_FACTOR, 0xefe4b0)
      .setStrokeStyle(4 * SCALE_FACTOR / 3, 0x573b20);
    const number = `No.${String(card.number).padStart(2, "0")}`;
    const heading = this.add.text(0, -59 * SCALE_FACTOR, `★ ${number} ★\n${getJumpCardDisplayName(card)}`, {
      fontFamily: "monospace", fontSize: `${11 * SCALE_FACTOR}px`, color: "#1a1a1a", align: "center", lineSpacing: 3,
    }).setOrigin(0.5);
    this.detailContainer.add([frame, heading]);
    this.renderCardImage(card);
    this.playDetailRevealAnimation();
    this.footerText.setText("決定／キャンセル：一覧へもどる").setVisible(true);
  }

  private playDetailRevealAnimation(): void {
    const flash = this.add.rectangle(0, 0, 244 * SCALE_FACTOR, 156 * SCALE_FACTOR, 0xfff1a8, 0.72);
    this.detailContainer.addAt(flash, 0);
    this.detailContainer.setPosition(DISPLAY.width / 2, DETAIL_Y + 16 * SCALE_FACTOR).setScale(0.68).setAlpha(0);
    this.tweens.add({
      targets: this.detailContainer,
      y: DETAIL_Y,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 260,
      ease: "Back.easeOut",
    });
    this.tweens.add({ targets: flash, alpha: 0, duration: 240, ease: "Sine.easeOut" });
  }

  private renderCardImage(card: JumpCardRecord): void {
    // imageKeyは共通カード定義からpreloadされた後にそのまま使える。
    if (card.imageKey && this.textures.exists(card.imageKey)) {
      const image = this.add.image(0, 8 * SCALE_FACTOR, card.imageKey);
      image.setScale(Math.min(142 * SCALE_FACTOR / image.width, 72 * SCALE_FACTOR / image.height, 1));
      this.detailContainer.add(image);
      return;
    }
    const placeholder = this.add.rectangle(0, 12 * SCALE_FACTOR, 132 * SCALE_FACTOR, 62 * SCALE_FACTOR, 0x4c5a78)
      .setStrokeStyle(2 * SCALE_FACTOR / 3, 0x1a2235);
    const label = this.add.text(0, 12 * SCALE_FACTOR, "カード画像\n準備中", {
      fontFamily: "monospace", fontSize: `${9 * SCALE_FACTOR}px`, color: "#eef2ff", align: "center", lineSpacing: 3,
    }).setOrigin(0.5);
    this.detailContainer.add([placeholder, label]);
  }

  private showUnobtainedNotice(): void {
    this.mode = "unobtainedNotice";
    this.setListVisible(false);
    this.detailContainer.removeAll(true);
    this.detailContainer.setVisible(true);
    const frame = this.add.rectangle(0, 0, 176 * SCALE_FACTOR, 48 * SCALE_FACTOR, WINDOW_COLOR)
      .setStrokeStyle(2 * SCALE_FACTOR / 3, WINDOW_BORDER);
    const message = this.add.text(0, 0, "まだ　もっていない。\n\n決定で　もどる", {
      fontFamily: "monospace", fontSize: `${9 * SCALE_FACTOR}px`, color: TEXT_COLOR, align: "center", lineSpacing: 3,
    }).setOrigin(0.5);
    this.detailContainer.add([frame, message]);
    this.footerText.setVisible(false);
  }

  private returnToList(): void {
    this.mode = "list";
    this.detailContainer.removeAll(true);
    this.detailContainer.setPosition(DISPLAY.width / 2, DETAIL_Y).setScale(1).setAlpha(1).setVisible(false);
    this.setListVisible(true);
    this.renderList();
  }

  private returnToTitle(): void {
    this.scene.start("TitleScene");
  }

  private currentPage(): readonly JumpCardRecord[] {
    return getJumpCardPage(this.records, this.pageIndex);
  }

  private renderList(): void {
    const cards = this.currentPage();
    const pageCount = Math.ceil(this.records.length / JUMP_CARD_PAGE_SIZE);
    this.statusText.setText(`あつめたカード　${this.state.cards.jumpCardCount} / ${JUMP_CARD_TOTAL}`);
    this.pageText.setText(`ページ\n${this.pageIndex + 1} / ${pageCount}`);
    this.listTexts.forEach((text, index) => {
      const card = cards[index];
      if (!card) {
        text.setVisible(false);
        return;
      }
      const number = `No.${String(card.number).padStart(2, "0")}`;
      // 未取得時はname/imageKeyを一切参照せず、番号と伏せ字だけを出す。
      const label = card.obtained ? `${number} ${getJumpCardDisplayName(card)}` : `${number} ？？？`;
      const selected = index === this.selectedIndex;
      text.setText(`${selected ? CURSOR : NO_CURSOR}${label}`).setVisible(true);
      text.setColor(selected && card.obtained ? "#fff0a8" : card.obtained ? TEXT_COLOR : DIM_TEXT_COLOR);
    });
    this.footerText.setText("↑↓：カード選択　←→：ページ移動\n決定：カードを見る　キャンセル：もどる").setVisible(true);
  }

  private setListVisible(visible: boolean): void {
    this.statusText.setVisible(visible);
    this.pageText.setVisible(visible);
    this.listTexts.forEach((text) => text.setVisible(visible));
  }

  private createWindow(x: number, y: number, width: number, height: number): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(x + width / 2, y + height / 2, width, height, WINDOW_COLOR)
      .setStrokeStyle(2 * SCALE_FACTOR / 3, WINDOW_BORDER);
  }
}
