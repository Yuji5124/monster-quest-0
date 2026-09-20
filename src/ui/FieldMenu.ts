import Phaser from "phaser";
import { FIELD_MENU_ITEMS } from "../config/fieldMenu.ts";
import { ITEM_DEFINITIONS } from "../data/items.ts";
import { characterProgression } from "../systems/CharacterProgression.ts";
import { inventory } from "../systems/Inventory.ts";
import type { InputSystem } from "../systems/InputSystem.ts";
import { partySystem } from "../systems/PartySystem.ts";

const PANEL = { x: 120, y: 60, width: 720, height: 600 } as const;
const BOX_COLOR = 0x0a0a14;
const BORDER_COLOR = 0xeeeeee;
const BORDER_WIDTH = 2;
const TEXT_COLOR = "#eeeeee";
const DIM_TEXT_COLOR = "#8f8f9c";
const PADDING = 20;
const TITLE_FONT_SIZE = 26;
const BODY_FONT_SIZE = 20;
const FOOTER_FONT_SIZE = 16;
const BODY_LINE_SPACING = 10;

type FieldMenuView = "closed" | "main" | "status" | "items";

/**
 * 移動中に開くフィールドメニュー(既存の`menu`action=Cキー)。UI_INPUT_SPEC.md §6の最低項目のうち
 * 今回はステータス・どうぐのみを持つ。DialogueBox.tsと同じくSceneに1つ生成し、Scene側は
 * `isOpen`を見て開いている間だけ`handleInput`へ入力を渡し、Player移動を止める(§11 Input lock)。
 */
export class FieldMenu {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly footer: Phaser.GameObjects.Text;
  private view: FieldMenuView = "closed";
  private mainCursor = 0;
  private itemsCursor = 0;

  constructor(scene: Phaser.Scene) {
    this.background = scene.add
      .rectangle(PANEL.x + PANEL.width / 2, PANEL.y + PANEL.height / 2, PANEL.width, PANEL.height, BOX_COLOR, 1)
      .setStrokeStyle(BORDER_WIDTH, BORDER_COLOR)
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false);

    this.title = scene.add
      .text(PANEL.x + PADDING, PANEL.y + PADDING, "", {
        fontFamily: "monospace",
        fontSize: `${TITLE_FONT_SIZE}px`,
        color: TEXT_COLOR,
      })
      .setScrollFactor(0)
      .setDepth(3001)
      .setVisible(false);

    this.body = scene.add
      .text(PANEL.x + PADDING, PANEL.y + PADDING + TITLE_FONT_SIZE + PADDING, "", {
        fontFamily: "monospace",
        fontSize: `${BODY_FONT_SIZE}px`,
        color: TEXT_COLOR,
        lineSpacing: BODY_LINE_SPACING,
      })
      .setScrollFactor(0)
      .setDepth(3001)
      .setVisible(false);

    this.footer = scene.add
      .text(PANEL.x + PADDING, PANEL.y + PANEL.height - PADDING - FOOTER_FONT_SIZE, "", {
        fontFamily: "monospace",
        fontSize: `${FOOTER_FONT_SIZE}px`,
        color: DIM_TEXT_COLOR,
      })
      .setScrollFactor(0)
      .setDepth(3001)
      .setVisible(false);
  }

  get isOpen(): boolean {
    return this.view !== "closed";
  }

  open(): void {
    this.view = "main";
    this.mainCursor = 0;
    this.setVisible(true);
    this.render();
  }

  close(): void {
    this.view = "closed";
    this.setVisible(false);
  }

  /** 開いている間、Sceneのtickから毎フレーム呼ぶ。confirm/cancel/moveをここで消費する。 */
  handleInput(actions: InputSystem): void {
    if (this.view === "closed") return;

    if (actions.consumePressed("cancel")) {
      if (this.view === "main") this.close();
      else {
        this.view = "main";
        this.render();
      }
      return;
    }

    if (this.view === "main") {
      this.handleMainInput(actions);
      return;
    }

    if (this.view === "items") {
      this.handleItemsInput(actions);
    }
    // "status"は一覧表示のみで、cancel以外の入力を消費しない。
  }

  private handleMainInput(actions: InputSystem): void {
    const count = FIELD_MENU_ITEMS.length;
    if (actions.consumePressed("moveUp")) {
      this.mainCursor = (this.mainCursor - 1 + count) % count;
      this.render();
    } else if (actions.consumePressed("moveDown")) {
      this.mainCursor = (this.mainCursor + 1) % count;
      this.render();
    } else if (actions.consumePressed("confirm")) {
      this.view = FIELD_MENU_ITEMS[this.mainCursor].id;
      this.itemsCursor = 0;
      this.render();
    }
  }

  private handleItemsInput(actions: InputSystem): void {
    const count = inventory.getSlots().length;
    if (count === 0) return;
    if (actions.consumePressed("moveUp")) {
      this.itemsCursor = (this.itemsCursor - 1 + count) % count;
      this.render();
    } else if (actions.consumePressed("moveDown")) {
      this.itemsCursor = (this.itemsCursor + 1) % count;
      this.render();
    }
  }

  private setVisible(visible: boolean): void {
    this.background.setVisible(visible);
    this.title.setVisible(visible);
    this.body.setVisible(visible);
    this.footer.setVisible(visible);
  }

  private render(): void {
    if (this.view === "main") this.renderMain();
    else if (this.view === "status") this.renderStatus();
    else if (this.view === "items") this.renderItems();
  }

  private renderMain(): void {
    this.title.setText("メニュー");
    this.body.setText(
      FIELD_MENU_ITEMS.map((item, index) => `${index === this.mainCursor ? "> " : "  "}${item.label}`).join("\n"),
    );
    this.footer.setText("Z：けってい　X：とじる");
  }

  private renderStatus(): void {
    this.title.setText("ステータス");
    const members = partySystem.getActiveMembers();
    this.body.setText(
      members
        .map((member) => {
          const stats = characterProgression.getStats(member.id);
          const name = stats.displayName.padEnd(6, "　");
          const level = `Lv${String(stats.level).padStart(3, " ")}`;
          const hp = `HP ${String(stats.hp).padStart(3, " ")}/${String(stats.maxHp).padStart(3, " ")}`;
          const mp = `MP ${String(stats.mp).padStart(3, " ")}/${String(stats.maxMp).padStart(3, " ")}`;
          const battleStats =
            `こうげき${String(stats.attack).padStart(3, " ")}` +
            `　ぼうぎょ${String(stats.defense).padStart(3, " ")}` +
            `　すばやさ${String(stats.speed).padStart(3, " ")}`;
          const exp = `EXP ${String(stats.exp).padStart(3, " ")}/${String(stats.expToNextLevel).padStart(3, " ")}`;
          return `${name} ${level}\n ${hp}　${mp}\n ${exp}\n ${battleStats}`;
        })
        .join("\n\n"),
    );
    this.footer.setText("※ HP／MP等は仮の確認用数値(TEMP_TEST_VALUE)です\nX：もどる");
  }

  private renderItems(): void {
    this.title.setText("どうぐ");
    const slots = inventory.getSlots();
    if (slots.length === 0) {
      this.body.setText("なにも　もっていない。");
      this.footer.setText("X：もどる");
      return;
    }

    const rows = slots.map((slot, index) => {
      const definition = ITEM_DEFINITIONS[slot.itemId];
      const cursor = index === this.itemsCursor ? "> " : "  ";
      const name = definition.name.padEnd(10, "　");
      const quantity = `x${slot.quantity}`;
      return `${cursor}${name}${quantity}`;
    });

    const selected = ITEM_DEFINITIONS[slots[this.itemsCursor].itemId];
    const usable = `フィールド：${selected.usableOnField ? "○" : "－"}　せんとう：${selected.usableInBattle ? "○" : "－"}`;
    this.body.setText(`${rows.join("\n")}\n\n${selected.description}\n${usable}`);
    this.footer.setText("X：もどる");
  }
}
