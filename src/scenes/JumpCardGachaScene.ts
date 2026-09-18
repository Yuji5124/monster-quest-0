import Phaser from "phaser";
import { getJumpCardDisplayName, JUMP_CARD_COST, JUMP_CARD_TOTAL, preloadJumpCardImages } from "../data/jumpCards.ts";
import type { JumpCardDefinition } from "../data/jumpCards.ts";
import { DISPLAY, SCALE_FACTOR } from "../config/display.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import type { GameState, JumpCardDrawResult } from "../systems/GameStateRepository.ts";
import { InputSystem } from "../systems/InputSystem.ts";

const WINDOW_COLOR = 0x090c18;
const WINDOW_BORDER = 0xeeeeee;
const TEXT_COLOR = "#eeeeee";
const DIM_TEXT_COLOR = "#aab0c0";
const CURSOR = "▶ ";
const NO_CURSOR = "　 ";
const GACHA_MACHINE_KEY = "ui.gacha.machine.reference";
const GACHA_MACHINE_FRAME = "machine-top";
const GACHA_MACHINE_IMAGE_PATH = new URL(
  "../../assets/ui/reference/gacha/mq0_gacha_005_0c06dc5303.png",
  import.meta.url,
).href;
// 指定素材(941x1672、透過なし)の上側1台だけを使う。下側に重複して写る筐体は見せない。
const GACHA_MACHINE_SOURCE_WIDTH = 941;
const GACHA_MACHINE_CROP_HEIGHT = 820;
const GACHA_REVEAL_DELAY_MS = 850;
const MACHINE_X = DISPLAY.width / 2;
const MACHINE_Y = 137 * SCALE_FACTOR;
const RESULT_Y = 128 * SCALE_FACTOR;

type GachaMode = "menu" | "spinning" | "reveal";

/** 独立したジャンカードガチャ画面。カード画像追加時は renderCard を置き換える。 */
export class JumpCardGachaScene extends Phaser.Scene {
  private actions!: InputSystem;
  private readonly repository = new GameStateRepository();
  private state!: GameState;
  private mode: GachaMode = "menu";
  private selectedIndex = 0;
  private infoText!: Phaser.GameObjects.Text;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private messageText!: Phaser.GameObjects.Text;
  private cardContainer!: Phaser.GameObjects.Container;
  private machineContainer!: Phaser.GameObjects.Container;
  private machineGlow!: Phaser.GameObjects.Rectangle;
  private revealTimer: Phaser.Time.TimerEvent | undefined;
  private readonly menuBounds = [
    { x: 24 * SCALE_FACTOR, y: 194 * SCALE_FACTOR, width: 272 * SCALE_FACTOR, height: 18 * SCALE_FACTOR },
    { x: 24 * SCALE_FACTOR, y: 216 * SCALE_FACTOR, width: 272 * SCALE_FACTOR, height: 18 * SCALE_FACTOR },
  ];

  constructor() {
    super("JumpCardGachaScene");
  }

  preload(): void {
    preloadJumpCardImages(this.load);
    this.load.image(GACHA_MACHINE_KEY, GACHA_MACHINE_IMAGE_PATH);
  }

  create(): void {
    this.state = this.repository.load();
    this.mode = "menu";
    this.selectedIndex = 0;
    this.cameras.main.setBackgroundColor(0x101526);
    this.actions = new InputSystem(window, document);

    this.add.text(DISPLAY.width / 2, 16 * SCALE_FACTOR, "ジャンカードガチャ", {
      fontFamily: "monospace", fontSize: `${18 * SCALE_FACTOR}px`, color: TEXT_COLOR,
    }).setOrigin(0.5);
    this.createWindow(20 * SCALE_FACTOR, 30 * SCALE_FACTOR, 280 * SCALE_FACTOR, 42 * SCALE_FACTOR);
    this.infoText = this.add.text(32 * SCALE_FACTOR, 34 * SCALE_FACTOR, "", {
      fontFamily: "monospace", fontSize: `${9 * SCALE_FACTOR}px`, color: TEXT_COLOR, lineSpacing: 3,
    });

    this.createWindow(20 * SCALE_FACTOR, 77 * SCALE_FACTOR, 280 * SCALE_FACTOR, 22 * SCALE_FACTOR).setDepth(3);
    this.messageText = this.add.text(DISPLAY.width / 2, 88 * SCALE_FACTOR, "", {
      fontFamily: "monospace", fontSize: `${9 * SCALE_FACTOR}px`, color: TEXT_COLOR, align: "center", lineSpacing: 3,
      wordWrap: { width: 252 * SCALE_FACTOR },
    }).setOrigin(0.5).setDepth(4);
    this.createMachineDisplay();
    this.cardContainer = this.add.container(DISPLAY.width / 2, RESULT_Y).setDepth(4);

    this.menuTexts = this.menuBounds.map((bounds) =>
      this.add.text(36 * SCALE_FACTOR, bounds.y + 3 * SCALE_FACTOR, "", {
        fontFamily: "monospace", fontSize: `${13 * SCALE_FACTOR}px`, color: TEXT_COLOR,
      }).setDepth(2)
    );
    this.createMenuWindows();
    this.input.on("pointerdown", this.handlePointer, this);

    const cleanup = (): void => {
      this.revealTimer?.remove(false);
      this.tweens.killTweensOf(this.machineContainer);
      this.tweens.killTweensOf(this.machineGlow);
      this.actions.destroy();
      this.input.off("pointerdown", this.handlePointer, this);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    this.render();
  }

  update(): void {
    if (this.mode === "spinning") return;
    const confirm = this.actions.consumePressed("confirm");
    const cancel = this.actions.consumePressed("cancel");
    if (this.mode === "reveal") {
      if (confirm || cancel) this.returnToMenu();
      return;
    }
    if (this.actions.consumePressed("moveUp")) this.moveSelection(-1);
    if (this.actions.consumePressed("moveDown")) this.moveSelection(1);
    if (cancel) this.returnToTitle();
    if (confirm) this.handleConfirm();
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (this.mode === "spinning") return;
    if (this.mode === "reveal") {
      this.actions.queuePressed("confirm");
      return;
    }
    const index = this.menuBounds.findIndex((bounds) =>
      pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.width &&
      pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.height,
    );
    if (index < 0) return;
    this.selectedIndex = index;
    this.render();
    this.actions.queuePressed("confirm");
  }

  private createMenuWindows(): void {
    for (const bounds of this.menuBounds) this.createWindow(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  private createWindow(x: number, y: number, width: number, height: number): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(x + width / 2, y + height / 2, width, height, WINDOW_COLOR)
      .setStrokeStyle(2 * SCALE_FACTOR / 3, WINDOW_BORDER);
  }

  private moveSelection(delta: number): void {
    this.selectedIndex = (this.selectedIndex + delta + this.menuTexts.length) % this.menuTexts.length;
    this.render();
  }

  private handleConfirm(): void {
    if (this.selectedIndex === 1) {
      this.returnToTitle();
      return;
    }
    this.beginDraw();
  }

  private beginDraw(): void {
    const result = this.repository.drawNextJumpCard();
    this.state = result.state;
    if (result.kind !== "obtained") {
      this.messageText.setText(result.kind === "complete" ? "カードは　ぜんぶ\nそろっています" : "おかねが　たりません");
      this.renderInfo();
      return;
    }

    this.mode = "spinning";
    this.actions.setLocked(true);
    this.messageText.setVisible(true);
    this.messageText.setText("ガチャガチャ…");
    this.renderInfo();
    this.cardContainer.removeAll(true);
    this.menuTexts.forEach((text) => text.setVisible(false));
    this.machineContainer.setVisible(true);
    this.playGachaMachineAnimation();
    this.revealTimer = this.time.delayedCall(GACHA_REVEAL_DELAY_MS, () => this.revealCard(result));
  }

  private revealCard(result: Extract<JumpCardDrawResult, { kind: "obtained" }>): void {
    this.revealTimer = undefined;
    this.mode = "reveal";
    this.actions.setLocked(false);
    this.messageText.setVisible(false);
    this.infoText.setVisible(false);
    this.machineContainer.setVisible(false);
    this.renderCard(result.card);
    this.playCardRevealAnimation();
    this.renderInfo();
  }

  private createMachineDisplay(): void {
    this.machineContainer = this.add.container(MACHINE_X, MACHINE_Y).setDepth(1);
    this.machineGlow = this.add.rectangle(0, 0, 134 * SCALE_FACTOR, 116 * SCALE_FACTOR, 0xffef9b, 0)
      .setStrokeStyle(2 * SCALE_FACTOR / 3, 0xfff3b0, 0);
    const frame = this.add.rectangle(0, 0, 132 * SCALE_FACTOR, 114 * SCALE_FACTOR, 0x101526)
      .setStrokeStyle(2 * SCALE_FACTOR / 3, WINDOW_BORDER);
    this.machineContainer.add([this.machineGlow, frame]);

    if (this.textures.exists(GACHA_MACHINE_KEY)) {
      const texture = this.textures.get(GACHA_MACHINE_KEY);
      if (!texture.has(GACHA_MACHINE_FRAME)) {
        texture.add(GACHA_MACHINE_FRAME, 0, 0, 0, GACHA_MACHINE_SOURCE_WIDTH, GACHA_MACHINE_CROP_HEIGHT);
      }
      const machine = this.add.image(0, 0, GACHA_MACHINE_KEY, GACHA_MACHINE_FRAME)
        .setDisplaySize(126 * SCALE_FACTOR, 110 * SCALE_FACTOR);
      this.machineContainer.add(machine);
      return;
    }

    // 読み込み失敗時も操作不能にせず、FC調の仮筐体で画面を維持する。
    const cabinet = this.add.rectangle(0, 0, 72 * SCALE_FACTOR, 70 * SCALE_FACTOR, 0xd6e2ee)
      .setStrokeStyle(3 * SCALE_FACTOR / 3, 0x41536c);
    const display = this.add.rectangle(0, -15 * SCALE_FACTOR, 58 * SCALE_FACTOR, 30 * SCALE_FACTOR, 0x315e91)
      .setStrokeStyle(2 * SCALE_FACTOR / 3, 0xffffff);
    const slot = this.add.rectangle(-14 * SCALE_FACTOR, 17 * SCALE_FACTOR, 22 * SCALE_FACTOR, 11 * SCALE_FACTOR, 0x1a2235)
      .setStrokeStyle(2 * SCALE_FACTOR / 3, 0x56677d);
    const dial = this.add.circle(18 * SCALE_FACTOR, 17 * SCALE_FACTOR, 10 * SCALE_FACTOR, 0xd3a94b)
      .setStrokeStyle(2 * SCALE_FACTOR / 3, 0x573b20);
    const label = this.add.text(0, -15 * SCALE_FACTOR, "ジャン\nカード", {
      fontFamily: "monospace", fontSize: `${7 * SCALE_FACTOR}px`, color: TEXT_COLOR, align: "center", lineSpacing: 2,
    }).setOrigin(0.5);
    this.machineContainer.add([cabinet, display, slot, dial, label]);
  }

  private playGachaMachineAnimation(): void {
    this.tweens.killTweensOf(this.machineContainer);
    this.tweens.killTweensOf(this.machineGlow);
    this.machineContainer.setPosition(MACHINE_X, MACHINE_Y).setScale(1);
    this.machineGlow.setAlpha(0);
    this.tweens.add({
      targets: this.machineContainer,
      y: MACHINE_Y - 3 * SCALE_FACTOR,
      scaleX: 1.025,
      scaleY: 0.98,
      duration: 85,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({ targets: this.machineGlow, alpha: 0.58, duration: 95, yoyo: true, repeat: 3 });
    this.time.delayedCall(430, () => {
      if (this.mode === "spinning") this.messageText.setText("コトン…");
    });
  }

  private playCardRevealAnimation(): void {
    const flash = this.add.rectangle(0, 0, 222 * SCALE_FACTOR, 148 * SCALE_FACTOR, 0xfff6bd, 0.72);
    this.cardContainer.addAt(flash, 0);
    this.cardContainer.setPosition(DISPLAY.width / 2, RESULT_Y + 20 * SCALE_FACTOR).setScale(0.64).setAlpha(0);
    this.tweens.add({
      targets: this.cardContainer,
      y: RESULT_Y,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 280,
      ease: "Back.easeOut",
    });
    this.tweens.add({ targets: flash, alpha: 0, duration: 260, ease: "Sine.easeOut" });
  }

  private renderCard(card: JumpCardDefinition): void {
    this.cardContainer.removeAll(true);
    // imageKeyが定義済みかつpreload済みなら実カードを表示する。
    const frame = this.add.rectangle(0, 0, 220 * SCALE_FACTOR, 146 * SCALE_FACTOR, 0xefe4b0)
      .setStrokeStyle(3 * SCALE_FACTOR / 3, 0x573b20);
    this.cardContainer.add(frame);
    if (card.imageKey && this.textures.exists(card.imageKey)) {
      const heading = this.add.text(0, -57 * SCALE_FACTOR, `No.${String(card.number).padStart(2, "0")}\n${getJumpCardDisplayName(card)}`, {
        fontFamily: "monospace", fontSize: `${10 * SCALE_FACTOR}px`, color: "#1a1a1a", align: "center", lineSpacing: 2,
      }).setOrigin(0.5);
      const image = this.add.image(0, 0, card.imageKey);
      image.setScale(Math.min(142 * SCALE_FACTOR / image.width, 72 * SCALE_FACTOR / image.height, 1));
      const message = this.add.text(0, 59 * SCALE_FACTOR, "を　てにいれた！\n決定で　もどる", {
        fontFamily: "monospace", fontSize: `${10 * SCALE_FACTOR}px`, color: "#1a1a1a", align: "center", lineSpacing: 2,
      }).setOrigin(0.5);
      this.cardContainer.add([heading, image, message]);
      return;
    }
    const label = this.add.text(0, -18 * SCALE_FACTOR, `ジャンカード No.${String(card.number).padStart(2, "0")}\n${getJumpCardDisplayName(card)}\n\nを　てにいれた！\n決定で　もどる`, {
      fontFamily: "monospace", fontSize: `${10 * SCALE_FACTOR}px`, color: "#1a1a1a", align: "center", lineSpacing: 3,
    }).setOrigin(0.5);
    this.cardContainer.add(label);
  }

  private returnToMenu(): void {
    this.mode = "menu";
    this.cardContainer.removeAll(true);
    this.cardContainer.setPosition(DISPLAY.width / 2, RESULT_Y).setScale(1).setAlpha(1);
    this.machineContainer.setPosition(MACHINE_X, MACHINE_Y).setScale(1).setVisible(true);
    this.machineGlow.setAlpha(0);
    this.infoText.setVisible(true);
    this.menuTexts.forEach((text) => text.setVisible(true));
    this.messageText.setVisible(true);
    this.messageText.setText("ガチャを　ひいて\nカードを　あつめよう");
    this.render();
  }

  private returnToTitle(): void {
    if (this.mode === "spinning") return;
    this.scene.start("TitleScene");
  }

  private render(): void {
    this.renderInfo();
    this.menuTexts.forEach((text, index) => {
      const label = index === 0 ? "ガチャを　ひく" : "もどる";
      text.setText(`${index === this.selectedIndex ? CURSOR : NO_CURSOR}${label}`);
      text.setColor(this.mode === "menu" ? TEXT_COLOR : DIM_TEXT_COLOR);
    });
    if (this.mode === "menu" && !this.messageText.text) this.messageText.setText("ガチャを　ひいて\nカードを　あつめよう");
  }

  private renderInfo(): void {
    this.infoText.setText(`おかね　${this.state.player.money}円　　1かい　${JUMP_CARD_COST}円\nあつめたカード　${this.state.cards.jumpCardCount} / ${JUMP_CARD_TOTAL}`);
  }
}
