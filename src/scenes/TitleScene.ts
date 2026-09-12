import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { TITLE_MENU_ITEMS } from "../config/menu.ts";
import { InputSystem } from "../systems/InputSystem.ts";

const LOGO_KEY = "titleLogo";
// 配信用コピー。CURRENTの元画像と旧素材の履歴はasset_catalog.json / ASSET_INDEX.mdで管理。
const LOGO_PATH = "assets/ui/title/mq0_title_logo.png";

const MARGIN_X = 8;
const MARGIN_TOP = 8;
const MARGIN_BOTTOM = 8;
const MENU_GAP = 12;
const MENU_LINE_HEIGHT = 15;
const MENU_FONT_SIZE = 12;

const CURSOR = "▶ ";
const NO_CURSOR = "  ";

/** タイトル画面。正式ロゴ表示と6項目メニューの選択・決定のみを扱う。 */
export class TitleScene extends Phaser.Scene {
  private actions!: InputSystem;
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private gameStarting = false;

  constructor() {
    super("TitleScene");
  }

  preload(): void {
    this.load.image(LOGO_KEY, LOGO_PATH);
  }

  create(): void {
    this.actions = new InputSystem(window, document);
    this.selectedIndex = 0;
    this.gameStarting = false;

    const logo = this.add.image(DISPLAY.width / 2, MARGIN_TOP, LOGO_KEY).setOrigin(0.5, 0);
    const maxLogoWidth = DISPLAY.width - MARGIN_X * 2;
    const menuHeight = TITLE_MENU_ITEMS.length * MENU_LINE_HEIGHT;
    const maxLogoHeight = DISPLAY.height - MARGIN_TOP - MARGIN_BOTTOM - MENU_GAP - menuHeight;
    // 縦横比は維持したまま、はみ出す辺に合わせて縮小のみ行う(拡大はしない)。
    const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height, 1);
    logo.setScale(scale);

    const menuTop = MARGIN_TOP + logo.displayHeight + MENU_GAP;
    this.itemTexts = TITLE_MENU_ITEMS.map((item, index) =>
      this.add.text(MARGIN_X, menuTop + index * MENU_LINE_HEIGHT, "", {
        fontFamily: "monospace",
        fontSize: `${MENU_FONT_SIZE}px`,
        color: item.enabled ? "#eeeeee" : "#5a5a5a",
      })
    );
    this.renderMenu();

    const input = this.actions;
    const cleanup = (): void => {
      input.destroy();
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  update(): void {
    if (this.actions.consumePressed("moveUp")) this.moveSelection(-1);
    if (this.actions.consumePressed("moveDown")) this.moveSelection(1);
    if (this.actions.consumePressed("confirm")) this.handleConfirm();
    if (this.actions.consumePressed("cancel")) {
      console.log("[TitleScene] cancel (no parent menu at title)");
    }
  }

  private moveSelection(delta: number): void {
    const next = this.selectedIndex + delta;
    // 上端/下端では止める(ラップしない)。
    if (next < 0 || next >= TITLE_MENU_ITEMS.length) return;
    this.selectedIndex = next;
    this.renderMenu();
  }

  private renderMenu(): void {
    TITLE_MENU_ITEMS.forEach((item, index) => {
      const cursor = index === this.selectedIndex ? CURSOR : NO_CURSOR;
      this.itemTexts[index].setText(`${cursor}${item.label}`);
    });
  }

  private handleConfirm(): void {
    const item = TITLE_MENU_ITEMS[this.selectedIndex];
    if (!item.enabled) {
      console.log(`[TitleScene] ${item.action} is not available yet (no save data).`);
      return;
    }
    console.log(`[TitleScene] action: ${item.action}`);

    if (item.action === "START_GAME") {
      // 二重決定でOpeningGlitchSceneが複数回起動しないようにする。
      if (this.gameStarting) return;
      this.gameStarting = true;
      this.scene.start("OpeningGlitchScene");
    }
  }
}
