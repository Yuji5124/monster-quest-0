import Phaser from "phaser";
import { DISPLAY, SCALE_FACTOR } from "../config/display.ts";
import { TITLE_MENU_ITEMS } from "../config/menu.ts";
import { TITLE_PRESENTATION } from "../config/titlePresentation.ts";
import { InputSystem } from "../systems/InputSystem.ts";

const LOGO_KEY = "titleLogo";
const LOGO_PATH = "assets/ui/title/mq0_title_logo.png";
const BACKGROUND_KEY = "titleBackground";
const BACKGROUND_PATH = "assets/ui/title/mq0_title_background.png";

const BACKGROUND_OVERLAY_ALPHA = 0.45;
const MARGIN_X = 8 * SCALE_FACTOR;
const MARGIN_TOP = 8 * SCALE_FACTOR;
const MARGIN_BOTTOM = 8 * SCALE_FACTOR;
const MENU_GAP = 12 * SCALE_FACTOR;
const PREVIOUS_MENU_FONT_SIZE = 8;
const PREVIOUS_MENU_LINE_HEIGHT = 10;
const MENU_SIZE_ADJUST = 0.7;
const MENU_FONT_SIZE = Math.round(PREVIOUS_MENU_FONT_SIZE * SCALE_FACTOR * MENU_SIZE_ADJUST);
const MENU_LINE_HEIGHT = Math.round(PREVIOUS_MENU_LINE_HEIGHT * SCALE_FACTOR * MENU_SIZE_ADJUST);
const TEXT_STROKE_THICKNESS = 3;
const PROMPT_TEXT = "なにか　ボタンを　おしてください";
const PROMPT_BLINK_INTERVAL_MS = 500;

type TitleMode = "splash" | "menu";

/** タイトル画面。既存の入力・遷移を維持しながら、静かな登場・待機演出を加える。 */
export class TitleScene extends Phaser.Scene {
  private actions!: InputSystem;
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private promptText!: Phaser.GameObjects.Text;
  private menuCursor!: Phaser.GameObjects.Text;
  private logoMain!: Phaser.GameObjects.Image;
  private logoBaseX = 0;
  private selectedIndex = 0;
  private gameStarting = false;
  private mode: TitleMode = "splash";
  private promptBlinkElapsedMs = 0;
  private cursorTween?: Phaser.Tweens.Tween;

  constructor() {
    super("TitleScene");
  }

  preload(): void {
    this.load.image(LOGO_KEY, LOGO_PATH);
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH);
  }

  create(): void {
    this.actions = new InputSystem(window, document);
    this.selectedIndex = 0;
    this.gameStarting = false;
    this.mode = "splash";
    this.promptBlinkElapsedMs = 0;

    this.textures.get(BACKGROUND_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get(LOGO_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.createBackgroundLayers();

    const { menuTop, menuHeight } = this.createLogo();
    this.createMenu(menuTop);
    this.createPrompt(menuTop, menuHeight);
    this.playLogoIntro();
    this.scheduleIdleGlitch();

    const input = this.actions;
    const cleanup = (): void => {
      input.destroy();
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  update(_time: number, delta: number): void {
    if (this.mode === "splash") {
      this.updateSplash(delta);
      return;
    }
    if (this.gameStarting) return;
    if (this.actions.consumePressed("moveUp")) this.moveSelection(-1);
    if (this.actions.consumePressed("moveDown")) this.moveSelection(1);
    if (this.actions.consumePressed("confirm")) this.handleConfirm();
    if (this.actions.consumePressed("cancel")) console.log("[TitleScene] cancel (no parent menu at title)");
  }

  /** 遠景→城郭の空気→霧の3層。正式背景素材への差し替え位置を分けている。 */
  private createBackgroundLayers(): void {
    const background = this.add.image(DISPLAY.width / 2, DISPLAY.height / 2, BACKGROUND_KEY);
    const backgroundScale = Math.max(DISPLAY.width / background.width, DISPLAY.height / background.height);
    background.setScale(backgroundScale);

    if (TITLE_PRESENTATION.background.enabled) {
      this.tweens.add({
        targets: background,
        x: background.x + TITLE_PRESENTATION.background.farDriftPixels,
        y: background.y - 1,
        duration: TITLE_PRESENTATION.background.farDriftDurationMs,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    }

    // Layer 2: 既存の城門背景の輪郭を壊さない、低コントラストの遠景シルエット。
    const silhouette = this.add.graphics();
    silhouette.fillStyle(0x10192c, 0.12);
    silhouette.fillTriangle(0, DISPLAY.height * 0.7, DISPLAY.width * 0.23, DISPLAY.height * 0.44, DISPLAY.width * 0.48, DISPLAY.height * 0.7);
    silhouette.fillTriangle(DISPLAY.width * 0.43, DISPLAY.height * 0.7, DISPLAY.width * 0.7, DISPLAY.height * 0.48, DISPLAY.width, DISPLAY.height * 0.7);
    silhouette.fillRect(0, DISPLAY.height * 0.7, DISPLAY.width, DISPLAY.height * 0.3);
    if (TITLE_PRESENTATION.background.enabled) {
      this.tweens.add({
        targets: silhouette,
        x: TITLE_PRESENTATION.background.midDriftPixels,
        duration: TITLE_PRESENTATION.background.midDriftDurationMs,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    }

    // Layer 3: パーティクルではなく、数枚の淡い霧だけをゆっくり流す。
    const haze = this.add.graphics();
    haze.fillStyle(0xc7dcf5, 0.055);
    haze.fillEllipse(DISPLAY.width * 0.18, DISPLAY.height * 0.59, DISPLAY.width * 0.52, DISPLAY.height * 0.14);
    haze.fillEllipse(DISPLAY.width * 0.74, DISPLAY.height * 0.68, DISPLAY.width * 0.62, DISPLAY.height * 0.16);
    if (TITLE_PRESENTATION.background.enabled) {
      this.tweens.add({
        targets: haze,
        x: -TITLE_PRESENTATION.background.hazeDriftPixels,
        duration: TITLE_PRESENTATION.background.hazeDriftDurationMs,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    }

    this.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, 0x000000, BACKGROUND_OVERLAY_ALPHA);
    this.createAmbientBackgroundEffects();
    const vignette = this.add.graphics();
    vignette.fillStyle(0x060911, TITLE_PRESENTATION.background.vignetteAlpha);
    vignette.fillRect(0, 0, DISPLAY.width, 36 * SCALE_FACTOR);
    vignette.fillRect(0, DISPLAY.height - 24 * SCALE_FACTOR, DISPLAY.width, 24 * SCALE_FACTOR);
    vignette.fillRect(0, 0, 32 * SCALE_FACTOR, DISPLAY.height);
    vignette.fillRect(DISPLAY.width - 32 * SCALE_FACTOR, 0, 32 * SCALE_FACTOR, DISPLAY.height);
  }

  /** 背景用の常時演出。ロゴやメニューより後ろで、光の筋と同一種の小さな光粒だけを動かす。 */
  private createAmbientBackgroundEffects(): void {
    if (!TITLE_PRESENTATION.background.enabled) return;

    // 空気中を流れる淡い光。背景絵を塗りつぶさない低い透明度に留める。
    for (const [index, startX] of [-180, -520].entries()) {
      const shaft = this.add.rectangle(
        startX,
        DISPLAY.height * (index === 0 ? 0.42 : 0.66),
        54 * SCALE_FACTOR,
        DISPLAY.height * 1.45,
        index === 0 ? 0xd9edff : 0xffe6a8,
        0.065,
      ).setRotation(-0.28);
      this.tweens.add({
        targets: shaft,
        x: DISPLAY.width + 220,
        alpha: 0.16,
        duration: TITLE_PRESENTATION.background.lightShaftDurationMs + index * 1800,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    }

    // パーティクルはこの「光粒」1種類のみ。生成・破棄を繰り返さず、既存オブジェクトをTweenする。
    const motePositions = [
      [0.12, 0.35], [0.24, 0.61], [0.38, 0.22], [0.62, 0.48], [0.76, 0.3], [0.88, 0.58],
    ] as const;
    motePositions.forEach(([xRatio, yRatio], index) => {
      const mote = this.add.circle(
        DISPLAY.width * xRatio,
        DISPLAY.height * yRatio,
        (index % 2 === 0 ? 1.35 : 0.9) * SCALE_FACTOR,
        index % 3 === 0 ? 0xffe7a3 : 0xcde9ff,
        0.34,
      );
      this.tweens.add({
        targets: mote,
        x: mote.x + (index % 2 === 0 ? 1 : -1) * TITLE_PRESENTATION.background.moteDriftPixels,
        y: mote.y - TITLE_PRESENTATION.background.moteDriftPixels,
        alpha: 0.85,
        scale: 1.65,
        duration: TITLE_PRESENTATION.background.moteDriftDurationMs + index * 190,
        delay: index * 190,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    });
  }

  private createLogo(): { menuTop: number; menuHeight: number } {
    const maxLogoWidth = DISPLAY.width - MARGIN_X * 2;
    const menuHeight = TITLE_MENU_ITEMS.length * MENU_LINE_HEIGHT;
    const maxLogoHeight = DISPLAY.height - MARGIN_TOP - MARGIN_BOTTOM - MENU_GAP - menuHeight;
    const logo = this.add.image(DISPLAY.width / 2, MARGIN_TOP, LOGO_KEY).setOrigin(0.5, 0);
    const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height, 1);
    const logoX = DISPLAY.width / 2;
    this.logoBaseX = logoX;

    // サブタイトルを含む正式ロゴ1枚をそのまま表示する。文字を個別に切り出さない。
    this.logoMain = logo.setScale(scale);
    this.logoMain.setAlpha(0);

    return { menuTop: MARGIN_TOP + this.logoMain.displayHeight + MENU_GAP, menuHeight };
  }

  private createMenu(menuTop: number): void {
    this.itemTexts = TITLE_MENU_ITEMS.map((item, index) =>
      this.add.text(DISPLAY.width / 2, menuTop + index * MENU_LINE_HEIGHT, item.label, {
        fontFamily: "monospace",
        fontSize: `${MENU_FONT_SIZE}px`,
        color: item.enabled ? "#eeeeee" : "#5a5a5a",
        stroke: "#000000",
        strokeThickness: TEXT_STROKE_THICKNESS,
      }).setOrigin(0.5, 0).setVisible(false)
    );
    this.menuCursor = this.add.text(0, 0, "▶", {
      fontFamily: "monospace",
      fontSize: `${MENU_FONT_SIZE}px`,
      color: "#fff1a8",
      stroke: "#000000",
      strokeThickness: TEXT_STROKE_THICKNESS,
    }).setOrigin(1, 0).setVisible(false);
    this.renderMenu();
  }

  private createPrompt(menuTop: number, menuHeight: number): void {
    this.promptText = this.add.text(DISPLAY.width / 2, menuTop + menuHeight / 2, PROMPT_TEXT, {
      fontFamily: "monospace",
      fontSize: `${MENU_FONT_SIZE}px`,
      color: "#eeeeee",
      stroke: "#000000",
      strokeThickness: TEXT_STROKE_THICKNESS,
    }).setOrigin(0.5, 0.5).setAlpha(0);
  }

  private playLogoIntro(): void {
    if (!TITLE_PRESENTATION.logo.enabled) {
      this.logoMain.setAlpha(1);
      this.promptText.setAlpha(1);
      this.startLogoIdleAnimation(this.logoMain.scaleX);
      return;
    }
    const logoScale = this.logoMain.scaleX;
    this.time.delayedCall(TITLE_PRESENTATION.logo.delayMs, () => {
      this.logoMain.setScale(logoScale * TITLE_PRESENTATION.logo.startScale);
      this.tweens.add({
        targets: this.logoMain,
        alpha: 1,
        scaleX: logoScale * TITLE_PRESENTATION.logo.overshootScale,
        scaleY: logoScale * TITLE_PRESENTATION.logo.overshootScale,
        duration: TITLE_PRESENTATION.logo.introDurationMs,
        ease: "Sine.easeOut",
        onComplete: () => this.tweens.add({
          targets: this.logoMain,
          scaleX: logoScale,
          scaleY: logoScale,
          duration: TITLE_PRESENTATION.logo.settleDurationMs,
          ease: "Sine.easeInOut",
          onComplete: () => this.startLogoIdleAnimation(logoScale),
        }),
      });
    });
    this.time.delayedCall(TITLE_PRESENTATION.logo.subtitleDelayMs, () => {
      this.tweens.add({ targets: this.promptText, alpha: 1, duration: TITLE_PRESENTATION.logo.subtitleFadeDurationMs, ease: "Sine.easeOut" });
    });
    this.scheduleLogoShines();
  }

  /** 登場後もほんの少し浮遊・脈動させ、静止画に戻らないようにする。 */
  private startLogoIdleAnimation(baseScale: number): void {
    this.tweens.add({
      targets: this.logoMain,
      scaleX: baseScale * TITLE_PRESENTATION.logo.idlePulseScale,
      scaleY: baseScale * TITLE_PRESENTATION.logo.idlePulseScale,
      y: MARGIN_TOP - TITLE_PRESENTATION.logo.idlePulsePixels,
      duration: TITLE_PRESENTATION.logo.idlePulseDurationMs,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  private scheduleLogoShines(): void {
    this.time.delayedCall(TITLE_PRESENTATION.logo.shineDelayMs, () => {
      this.playLogoShine();
      this.time.addEvent({
        delay: TITLE_PRESENTATION.logo.shineIntervalMs,
        loop: true,
        callback: () => this.playLogoShine(),
      });
    });
  }

  /** 赤い主文字を横切る一度きりの、細く控えめな反射光。 */
  private playLogoShine(): void {
    const shine = this.add.graphics();
    const y = MARGIN_TOP + 205 * this.logoMain.scaleY;
    const height = 104 * this.logoMain.scaleY;
    shine.fillStyle(0xfff4cc, 0.29);
    shine.fillTriangle(-130, y + height, -130, y, 110, y + height);
    shine.lineStyle(2 * SCALE_FACTOR, 0xffffff, 0.19);
    shine.lineBetween(-130, y, 110, y + height);
    shine.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: shine,
      x: DISPLAY.width + 100,
      duration: TITLE_PRESENTATION.logo.shineDurationMs,
      ease: "Sine.easeInOut",
      onComplete: () => shine.destroy(),
    });
  }

  private scheduleIdleGlitch(): void {
    if (!TITLE_PRESENTATION.idleGlitch.enabled) return;
    this.time.delayedCall(TITLE_PRESENTATION.idleGlitch.delayMs, () => this.playSubtleIdleGlitch());
  }

  /** 演出は一度きり。実フリーズや保存状態の変更を伴わない。 */
  private playSubtleIdleGlitch(): void {
    const line = this.add.rectangle(
      DISPLAY.width / 2,
      Phaser.Math.Between(80 * SCALE_FACTOR, DISPLAY.height - 90 * SCALE_FACTOR),
      DISPLAY.width,
      TITLE_PRESENTATION.idleGlitch.noiseLineHeight * SCALE_FACTOR,
      0xdde8ff,
      0.38,
    );
    const shift = TITLE_PRESENTATION.idleGlitch.logoShiftPixels;
    this.logoMain.x = this.logoBaseX + shift;
    this.time.delayedCall(TITLE_PRESENTATION.idleGlitch.durationMs, () => {
      this.logoMain.x = this.logoBaseX;
      line.destroy();
    });
  }

  private updateSplash(delta: number): void {
    this.promptBlinkElapsedMs += delta;
    if (this.promptBlinkElapsedMs >= PROMPT_BLINK_INTERVAL_MS) {
      this.promptBlinkElapsedMs -= PROMPT_BLINK_INTERVAL_MS;
      this.promptText.setVisible(!this.promptText.visible);
    }
    const confirmPressed = this.actions.consumePressed("confirm");
    const cancelPressed = this.actions.consumePressed("cancel");
    const upPressed = this.actions.consumePressed("moveUp");
    const downPressed = this.actions.consumePressed("moveDown");
    const leftPressed = this.actions.consumePressed("moveLeft");
    const rightPressed = this.actions.consumePressed("moveRight");
    if (confirmPressed || cancelPressed || upPressed || downPressed || leftPressed || rightPressed) this.enterMenu();
  }

  private enterMenu(): void {
    this.mode = "menu";
    this.promptText.setVisible(false);
    for (const text of this.itemTexts) text.setVisible(true);
    this.menuCursor.setVisible(true);
    this.renderMenu();
  }

  private moveSelection(delta: number): void {
    const next = this.selectedIndex + delta;
    if (next < 0 || next >= TITLE_MENU_ITEMS.length) return;
    this.selectedIndex = next;
    this.renderMenu();
  }

  private renderMenu(): void {
    TITLE_MENU_ITEMS.forEach((item, index) => {
      this.itemTexts[index].setColor(index === this.selectedIndex ? "#fff1a8" : item.enabled ? "#eeeeee" : "#5a5a5a");
    });
    const selectedText = this.itemTexts[this.selectedIndex];
    this.menuCursor.setPosition(selectedText.x - selectedText.displayWidth / 2 - 5 * SCALE_FACTOR, selectedText.y);
    this.cursorTween?.stop();
    this.cursorTween = this.tweens.add({
      targets: this.menuCursor,
      x: this.menuCursor.x - TITLE_PRESENTATION.menu.cursorSwayPixels,
      duration: TITLE_PRESENTATION.menu.cursorSwayDurationMs,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  private handleConfirm(): void {
    const item = TITLE_MENU_ITEMS[this.selectedIndex];
    if (!item.enabled) {
      console.log(`[TitleScene] ${item.action} is not available yet (no save data).`);
      return;
    }
    if (this.gameStarting) return;
    this.gameStarting = true;
    this.actions.setLocked(true);
    this.cursorTween?.stop();
    const selectedText = this.itemTexts[this.selectedIndex];
    this.tweens.add({
      targets: [selectedText, this.menuCursor],
      alpha: 0.25,
      duration: TITLE_PRESENTATION.menu.confirmFlashDurationMs,
      yoyo: true,
      repeat: 1,
      onComplete: () => this.runMenuAction(item.action),
    });
  }

  private runMenuAction(action: string): void {
    console.log(`[TitleScene] action: ${action}`);
    if (action === "START_GAME") this.scene.start("OpeningGlitchScene");
    if (action === "JANCARD_GACHA") this.scene.start("JumpCardGachaScene");
    if (action === "JANCARD_BOOK") this.scene.start("JumpCardEncyclopediaScene");
    // 未接続項目は、既存どおり入力解除してタイトルへ留まる。
    if (action === "TRAVEL_PASSWORD" || action === "SETTINGS") {
      this.gameStarting = false;
      this.actions.setLocked(false);
      this.renderMenu();
    }
  }
}
