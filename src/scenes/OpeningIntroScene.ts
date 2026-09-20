import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { INPUT_ACTIONS } from "../config/input.ts";
import { OPENING_INTRO } from "../config/openingIntro.ts";
import type { OpeningMemoryImage, TitleSceneData } from "../config/openingIntro.ts";
import { InputSystem } from "../systems/InputSystem.ts";

const CREDIT_FONT_FAMILY = '"Helvetica Neue", Arial, sans-serif';
const SKIP_HINT_TEXT = "なにか　ボタンで　スキップ";
const SKIP_HINT_ALPHA = 0.4;

/**
 * 起動直後のオープニング。黒画面のクレジット「Produced by ARROWARE」(約3秒)の後、
 * 思い出を振り返るように回想の1枚絵6枚を、黒からのフェードイン→保持→黒へのフェードアウトで順に見せ(約10秒)、
 * TitleSceneへ渡す。どの時点でも何かボタン(タップ)を押せば、はじめから／つづきからのメニューへ直行する。
 * 入力・セーブ状態には触れない。1枚絵は画面を切り取らず全体を見せ、縁を黒へ溶かして黒画面の中に浮かべる。
 */
export class OpeningIntroScene extends Phaser.Scene {
  private actions!: InputSystem;
  private leaving = false;
  private creditDone = false;
  private loadDone = false;
  private memoriesStarted = false;
  private playable: OpeningMemoryImage[] = [];
  private credit!: Phaser.GameObjects.Container;
  private frame!: Phaser.GameObjects.Container;
  private photo!: Phaser.GameObjects.Image;
  private feather!: Phaser.GameObjects.Graphics;
  private skipHint!: Phaser.GameObjects.Text;

  constructor() {
    super("OpeningIntroScene");
  }

  create(): void {
    this.leaving = false;
    this.creditDone = false;
    this.loadDone = false;
    this.memoriesStarted = false;
    this.playable = [];

    this.cameras.main.setBackgroundColor("#000000");

    this.actions = new InputSystem(window, document);
    const onPointer = (): void => this.actions.queuePressed("confirm");
    this.input.on("pointerdown", onPointer);
    const cleanup = (): void => {
      this.input.off("pointerdown", onPointer);
      this.actions.destroy();
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    this.createCredit();
    this.createMemoryFrame();
    this.startLoading();
    this.playCredit();
  }

  update(): void {
    if (this.leaving) return;
    // 何かボタン = 登録済みactionのどれか。全てconsumeして取りこぼしを次のSceneへ持ち越さない。
    let pressed = false;
    for (const action of INPUT_ACTIONS) if (this.actions.consumePressed(action)) pressed = true;
    if (pressed) this.goToTitle(true);
  }

  private createCredit(): void {
    const { line1, line2 } = OPENING_INTRO.credit;
    const cx = DISPLAY.width / 2;
    const cy = DISPLAY.height / 2;
    const upper = this.add.text(cx, cy - 30, line1, {
      fontFamily: CREDIT_FONT_FAMILY,
      fontSize: "26px",
      color: "#9aa1ad",
    }).setOrigin(0.5).setLetterSpacing(4);
    const brand = this.add.text(cx, cy + 22, line2, {
      fontFamily: CREDIT_FONT_FAMILY,
      fontSize: "62px",
      fontStyle: "bold",
      color: "#f2f4f8",
    }).setOrigin(0.5).setLetterSpacing(14);
    this.credit = this.add.container(0, 0, [upper, brand]).setAlpha(0);
  }

  private createMemoryFrame(): void {
    this.photo = this.add.image(0, 0, "__DEFAULT");
    this.feather = this.add.graphics();
    this.frame = this.add.container(DISPLAY.width / 2, DISPLAY.height / 2, [this.photo, this.feather]).setAlpha(0).setVisible(false);
    this.skipHint = this.add.text(DISPLAY.width / 2, DISPLAY.height - 34, SKIP_HINT_TEXT, {
      fontFamily: CREDIT_FONT_FAMILY,
      fontSize: "20px",
      color: "#8b93a3",
    }).setOrigin(0.5).setAlpha(0);
  }

  private startLoading(): void {
    const finish = (): void => {
      if (this.leaving) return;
      this.playable = OPENING_INTRO.images.filter((image) => this.textures.exists(image.key));
      // 縮小表示なので滑らかに補間する(pixelArtの既定NEAREST=ギザギザを避ける)。
      for (const image of this.playable) this.textures.get(image.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.loadDone = true;
      this.tryStartMemories();
    };
    const pending = OPENING_INTRO.images.filter((image) => !this.textures.exists(image.key));
    if (pending.length === 0) {
      finish();
      return;
    }
    // 読み込み失敗は該当の1枚を飛ばすだけにし、演出全体を止めない。
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[OpeningIntroScene] failed to load ${file.key}`);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, finish);
    for (const image of pending) this.load.image(image.key, image.url);
    // 「Produced by ARROWARE」を見せている間に裏で読み込む。
    this.load.start();
  }

  private playCredit(): void {
    const { fadeInMs, holdMs, fadeOutMs } = OPENING_INTRO.credit;
    this.tweens.chain({
      targets: this.credit,
      tweens: [
        { alpha: 1, duration: fadeInMs, ease: "Sine.easeInOut" },
        { alpha: 1, duration: holdMs },
        { alpha: 0, duration: fadeOutMs, ease: "Sine.easeInOut" },
      ],
      onComplete: () => {
        this.time.delayedCall(OPENING_INTRO.gapAfterCreditMs, () => {
          this.creditDone = true;
          this.tryStartMemories();
        });
      },
    });
  }

  /** クレジットが終わり、かつ画像の読み込みも済んだときに一度だけ回想を始める(遅ければ黒のまま待つ)。 */
  private tryStartMemories(): void {
    if (this.leaving || this.memoriesStarted || !this.creditDone || !this.loadDone) return;
    this.memoriesStarted = true;
    this.tweens.add({ targets: this.skipHint, alpha: SKIP_HINT_ALPHA, duration: OPENING_INTRO.memory.fadeInMs, ease: "Sine.easeInOut" });
    this.playMemory(0);
  }

  private playMemory(index: number): void {
    if (this.leaving) return;
    const image = this.playable[index];
    if (!image) {
      this.time.delayedCall(OPENING_INTRO.endBlackMs, () => this.goToTitle(false));
      return;
    }

    this.photo.setTexture(image.key);
    // 切り取らず全体を見せる(4:3画面の中央に16:9をそのまま置く)。
    const fit = Math.min(DISPLAY.width / this.photo.width, DISPLAY.height / this.photo.height);
    this.photo.setScale(fit);
    this.drawFeather(this.photo.displayWidth, this.photo.displayHeight);
    this.frame.setScale(1).setAlpha(0).setVisible(true);

    const { fadeInMs, holdMs, fadeOutMs, slowZoomTo } = OPENING_INTRO.memory;
    this.tweens.add({ targets: this.frame, scale: slowZoomTo, duration: fadeInMs + holdMs + fadeOutMs, ease: "Sine.easeInOut" });
    this.tweens.chain({
      targets: this.frame,
      tweens: [
        { alpha: 1, duration: fadeInMs, ease: "Sine.easeInOut" },
        { alpha: 1, duration: holdMs },
        { alpha: 0, duration: fadeOutMs, ease: "Sine.easeInOut" },
      ],
      onComplete: () => this.playMemory(index + 1),
    });
  }

  /** 画像の四辺を黒へ溶かす。四角い写真が黒画面から浮いて見えないようにするための、黒→透明のグラデーション。 */
  private drawFeather(width: number, height: number): void {
    const f = Math.min(OPENING_INTRO.memory.featherPx, width / 2, height / 2);
    const halfW = width / 2;
    const halfH = height / 2;
    const g = this.feather;
    g.clear();
    // fillGradientStyle(左上, 右上, 左下, 右下の色, 各隅のalpha)。画像の外側ぶんも1px余分に覆って縁の隙間を消す。
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 1, 1, 0, 0);
    g.fillRect(-halfW - 1, -halfH - 1, width + 2, f + 1);
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 1, 1);
    g.fillRect(-halfW - 1, halfH - f, width + 2, f + 1);
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 1, 0, 1, 0);
    g.fillRect(-halfW - 1, -halfH - 1, f + 1, height + 2);
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 1, 0, 1);
    g.fillRect(halfW - f, -halfH - 1, f + 1, height + 2);
  }

  /** 演出を終えてTitleSceneへ。回想テクスチャは以後不要なので解放する(iPhone Safariのメモリ負荷を抑える)。 */
  private goToTitle(skipToMenu: boolean): void {
    if (this.leaving) return;
    this.leaving = true;
    this.actions.setLocked(true);
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.frame.destroy();
    for (const image of OPENING_INTRO.images) if (this.textures.exists(image.key)) this.textures.remove(image.key);
    const data: TitleSceneData = { fromIntro: true, skipToMenu };
    this.scene.start("TitleScene", data);
  }
}
