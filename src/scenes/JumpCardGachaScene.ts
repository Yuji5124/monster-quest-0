import Phaser from "phaser";
import { getJumpCardDisplayName, JUMP_CARD_COIN_COST, JUMP_CARD_TOTAL, preloadJumpCardImages } from "../data/jumpCards.ts";
import type { JumpCardDefinition } from "../data/jumpCards.ts";
import { DISPLAY, SCALE_FACTOR } from "../config/display.ts";
import { JUMP_CARD_GACHA_PRESENTATION } from "../config/jumpCardGachaPresentation.ts";
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
const GACHA_COIN_INSERT_KEY = "ui.gacha.coin-insert";
const GACHA_COIN_INSERT_IMAGE_PATH = new URL(
  "../../assets/title/reference/H.png",
  import.meta.url,
).href;
const GACHA_TURN_KEY = "ui.gacha.turn";
const GACHA_TURN_IMAGE_PATH = new URL(
  "../../assets/title/reference/I.png",
  import.meta.url,
).href;
// 指定素材(941x1672、透過なし)の上側1台だけを使う。下側に重複して写る筐体は見せない。
const GACHA_MACHINE_SOURCE_WIDTH = 941;
const GACHA_MACHINE_CROP_HEIGHT = 820;
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
  private coinPresentation: Phaser.GameObjects.Container | undefined;
  private revealTimer: Phaser.Time.TimerEvent | undefined;
  private presentationTimers: Phaser.Time.TimerEvent[] = [];
  private presentationCounter: Phaser.Tweens.Tween | undefined;
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
    this.load.image(GACHA_COIN_INSERT_KEY, GACHA_COIN_INSERT_IMAGE_PATH);
    this.load.image(GACHA_TURN_KEY, GACHA_TURN_IMAGE_PATH);
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
      this.clearCoinPresentation();
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
      this.messageText.setText(result.kind === "complete" ? "カードは　ぜんぶ\nそろっています" : "ジャンコインが　たりません");
      this.renderInfo();
      return;
    }

    this.mode = "spinning";
    this.actions.setLocked(true);
    this.messageText.setVisible(true);
    this.messageText.setText("");
    this.infoText.setVisible(false);
    this.cardContainer.removeAll(true);
    this.menuTexts.forEach((text) => text.setVisible(false));
    this.machineContainer.setVisible(false);
    this.playGachaCoinPresentation();
    this.revealTimer = this.time.delayedCall(
      JUMP_CARD_GACHA_PRESENTATION.totalDurationMs,
      () => this.revealCard(result),
    );
  }

  private revealCard(result: Extract<JumpCardDrawResult, { kind: "obtained" }>): void {
    this.revealTimer = undefined;
    this.mode = "reveal";
    this.actions.setLocked(false);
    this.clearCoinPresentation();
    this.messageText.setVisible(false);
    this.infoText.setVisible(false);
    this.machineContainer.setVisible(false);
    this.renderCard(result.card);
    this.playCardRevealAnimation();
    this.renderInfo();
    // 演出最後の白フラッシュからカードへ明ける。
    const whiteout = this.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, 0xffffff, 1)
      .setDepth(12);
    this.tweens.add({ targets: whiteout, alpha: 0, duration: 420, ease: "Sine.easeOut", onComplete: () => whiteout.destroy() });
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
      // 旧筐体画像に焼き込まれた「20円」を覆い、現行ルールを待機画面にも明示する。
      const coinCostPlate = this.add.rectangle(50, 50, 74, 32, 0xc91f29)
        .setStrokeStyle(2, 0xffeea6);
      const coinCostText = this.add.text(50, 50, "1枚\nジャンコイン", {
        fontFamily: "monospace", fontSize: `${4 * SCALE_FACTOR}px`, color: "#ffffff",
        align: "center", lineSpacing: -4,
      }).setOrigin(0.5);
      this.machineContainer.add([machine, coinCostPlate, coinCostText]);
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

  /**
   * 約6秒のレア演出。H.png(コイン投入)→I.png(ハンドルを回す)→虹色の後光→白フラッシュ。
   * 秒数は JUMP_CARD_GACHA_PRESENTATION に集約。
   */
  private playGachaCoinPresentation(): void {
    this.clearCoinPresentation();
    const timing = JUMP_CARD_GACHA_PRESENTATION;
    const presentation = this.add.container(DISPLAY.width / 2, DISPLAY.height / 2).setDepth(12);
    const veil = this.add.rectangle(0, 0, DISPLAY.width, DISPLAY.height, 0x04050b, 0.96);
    const rays = this.createRareRays().setAlpha(0);
    const panelWidth = 166 * SCALE_FACTOR;
    const panelHeight = 226 * SCALE_FACTOR;
    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x101526)
      .setStrokeStyle(2 * SCALE_FACTOR, 0xe7c84e);
    const insert = this.addFittedImage(GACHA_COIN_INSERT_KEY, 156 * SCALE_FACTOR, 218 * SCALE_FACTOR).setAlpha(0);
    const turn = this.addFittedImage(GACHA_TURN_KEY, 156 * SCALE_FACTOR, 218 * SCALE_FACTOR).setAlpha(0);
    const panelGlow = this.add.rectangle(0, 0, panelWidth, panelHeight, 0xfff3b0, 0).setBlendMode(Phaser.BlendModes.ADD);
    const caption = this.add.text(0, 100 * SCALE_FACTOR, "", {
      fontFamily: "monospace", fontSize: `${12 * SCALE_FACTOR}px`, color: "#fff6c7",
      stroke: "#15101d", strokeThickness: 2 * SCALE_FACTOR,
    }).setOrigin(0.5);
    const whiteout = this.add.rectangle(0, 0, DISPLAY.width, DISPLAY.height, 0xffffff, 0);
    presentation.add([veil, rays, panel, insert, turn, panelGlow, caption, whiteout]);
    presentation.setAlpha(0);
    this.coinPresentation = presentation;

    const at = (ms: number, callback: () => void): void => {
      this.presentationTimers.push(this.time.delayedCall(ms, callback));
    };
    const setCaption = (text: string): void => {
      caption.setText(text).setScale(1.25);
      this.tweens.add({ targets: caption, scaleX: 1, scaleY: 1, duration: 180, ease: "Back.easeOut" });
    };

    this.tweens.add({ targets: presentation, alpha: 1, duration: 220 });

    // 1) H.png: コインを持った手が現れ、スロットへ押し込む。
    const insertX = insert.x;
    const insertY = insert.y;
    const insertScale = insert.scaleX;
    insert.setPosition(insertX + 28 * SCALE_FACTOR, insertY - 18 * SCALE_FACTOR).setScale(insertScale * 0.94);
    this.tweens.add({
      targets: insert,
      x: insertX,
      y: insertY,
      scaleX: insertScale,
      scaleY: insertScale,
      alpha: 1,
      delay: timing.coinShowStartMs,
      duration: 560,
      ease: "Back.easeOut",
      onStart: () => setCaption("ジャンコインを　いれる…"),
    });
    this.tweens.add({
      targets: insert,
      y: insertY + 7 * SCALE_FACTOR,
      scaleX: insertScale * 1.03,
      scaleY: insertScale * 1.03,
      delay: timing.coinPushStartMs,
      duration: timing.coinDropMs - timing.coinPushStartMs,
      ease: "Cubic.easeIn",
    });
    // H.png内のコイン投入口(元画像比 x≈0.39, y≈0.43)で火花を散らす。
    const slotX = insertX + (0.39 - 0.5) * insert.displayWidth;
    const slotY = insertY + 7 * SCALE_FACTOR + (0.43 - 0.5) * insert.displayHeight;
    at(timing.coinDropMs, () => {
      setCaption("チャリン！");
      this.cameras.main.shake(140, 0.006);
      this.burstSparkles(presentation, slotX, slotY, 10, 0xffe066, 34 * SCALE_FACTOR);
      this.tweens.add({ targets: panelGlow, alpha: { from: 0.55, to: 0 }, duration: 320, ease: "Sine.easeOut" });
    });

    // 2) I.png: 画面が切り替わり、ハンドルを3段で回す。
    this.tweens.add({ targets: insert, alpha: 0, delay: timing.turnStartMs, duration: 320, ease: "Sine.easeIn" });
    const turnScale = turn.scaleX;
    turn.setScale(turnScale * 1.08);
    this.tweens.add({
      targets: turn,
      alpha: 1,
      scaleX: turnScale,
      scaleY: turnScale,
      delay: timing.turnStartMs,
      duration: 420,
      ease: "Cubic.easeOut",
      onStart: () => setCaption("ハンドルを　まわす…"),
    });
    // I.png内のハンドル中心(元画像比 x≈0.51, y≈0.65)。
    const knobX = turn.x + (0.51 - 0.5) * turn.displayWidth;
    const knobY = turn.y + (0.65 - 0.5) * turn.displayHeight;
    const clickLabels = ["ガチャ…", "ガチャ…", "ガチャリ！"];
    timing.turnClickMs.forEach((ms, index) => {
      const last = index === timing.turnClickMs.length - 1;
      at(ms, () => {
        setCaption(clickLabels[index] ?? "ガチャ…");
        this.cameras.main.shake(last ? 220 : 110, last ? 0.01 : 0.004);
        // 手ごと時計回りにひねり、ラチェットの戻りで1段回した感触を出す。
        this.tweens.add({
          targets: turn,
          angle: { from: 0, to: last ? 4 : 2.5 },
          duration: 120,
          yoyo: true,
          ease: "Quad.easeOut",
        });
        this.burstSparkles(presentation, knobX, knobY, last ? 14 : 6, last ? 0xffffff : 0xfff3b0, (last ? 60 : 36) * SCALE_FACTOR);
        this.tweens.add({ targets: panelGlow, alpha: { from: last ? 0.5 : 0.22, to: 0 }, duration: 260 });
      });
    });

    // 3) 虹色の枠と後光が高まり、白フラッシュでカードへつなぐ。
    at(timing.rareGlowStartMs, () => {
      setCaption("なにかが　でてくる…！");
      this.presentationCounter = this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 700,
        repeat: -1,
        onUpdate: (tween) => {
          const hue = tween.getValue() ?? 0;
          panel.setStrokeStyle(3 * SCALE_FACTOR, Phaser.Display.Color.HSVToRGB(hue, 0.65, 1).color);
        },
      });
      this.tweens.add({ targets: rays, alpha: 0.85, duration: 600, ease: "Sine.easeOut" });
      this.tweens.add({ targets: rays, angle: 360, duration: 3_600, repeat: -1 });
      this.tweens.add({ targets: panelGlow, alpha: 0.35, duration: timing.finalFlashStartMs - timing.rareGlowStartMs, ease: "Sine.easeIn" });
      this.tweens.add({
        targets: turn,
        scaleX: turnScale * 1.05,
        scaleY: turnScale * 1.05,
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      const sparkleCount = 5;
      for (let i = 0; i < sparkleCount; i += 1) {
        at(timing.rareGlowStartMs + i * 220, () =>
          this.burstSparkles(presentation, 0, 0, 8, Phaser.Display.Color.HSVToRGB(i / sparkleCount, 0.55, 1).color, 110 * SCALE_FACTOR));
      }
    });
    at(timing.finalFlashStartMs, () => {
      this.cameras.main.shake(260, 0.008);
      this.tweens.add({ targets: whiteout, alpha: 1, duration: 360, ease: "Quad.easeIn" });
    });
  }

  /** 元画像の縦横比を保ったまま枠内へ収める。 */
  private addFittedImage(key: string, maxWidth: number, maxHeight: number): Phaser.GameObjects.Image {
    const image = this.add.image(0, 0, key);
    if (image.width > 0 && image.height > 0) image.setScale(Math.min(maxWidth / image.width, maxHeight / image.height));
    return image;
  }

  /** パネル背後で回る後光。 */
  private createRareRays(): Phaser.GameObjects.Graphics {
    const rays = this.add.graphics();
    const rayCount = 16;
    const length = DISPLAY.width;
    for (let i = 0; i < rayCount; i += 1) {
      const angle = (Math.PI * 2 * i) / rayCount;
      const half = Math.PI / rayCount / 2;
      const color = Phaser.Display.Color.HSVToRGB(i / rayCount, 0.45, 1).color;
      rays.fillStyle(color, 0.35);
      rays.fillTriangle(
        0, 0,
        Math.cos(angle - half) * length, Math.sin(angle - half) * length,
        Math.cos(angle + half) * length, Math.sin(angle + half) * length,
      );
    }
    return rays;
  }

  private burstSparkles(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    count: number,
    color: number,
    radius: number,
  ): void {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = radius * (0.6 + Math.random() * 0.5);
      const star = this.add.star(x, y, 4, 1.2 * SCALE_FACTOR, 4.5 * SCALE_FACTOR, color).setBlendMode(Phaser.BlendModes.ADD);
      container.addAt(star, container.length - 1);
      this.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        angle: 180,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 520 + Math.random() * 200,
        ease: "Cubic.easeOut",
        onComplete: () => star.destroy(),
      });
    }
  }

  private clearCoinPresentation(): void {
    this.presentationTimers.forEach((timer) => timer.remove(false));
    this.presentationTimers = [];
    this.presentationCounter?.stop();
    this.presentationCounter = undefined;
    if (!this.coinPresentation) return;
    this.tweens.killTweensOf(this.coinPresentation);
    this.tweens.killTweensOf(this.coinPresentation.list);
    this.coinPresentation.destroy(true);
    this.coinPresentation = undefined;
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
    this.clearCoinPresentation();
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
    this.infoText.setText(`ジャンコイン　${this.state.cards.jumpCoinCount}枚　　1かい　${JUMP_CARD_COIN_COST}枚\nあつめたカード　${this.state.cards.jumpCardCount} / ${JUMP_CARD_TOTAL}`);
  }
}
