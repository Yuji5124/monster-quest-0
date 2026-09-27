import Phaser from "phaser";
import type { BattleAction } from "../data/battleActions.ts";
import { ITEM_DEFINITIONS } from "../data/items.ts";
import type { ItemId } from "../data/items.ts";
import type { InventorySlot } from "../systems/Inventory.ts";
import type { InputSystem } from "../systems/InputSystem.ts";
import type { MajinCaveDirection } from "../systems/MajinCaveTurnSystem.ts";

const PANEL_DEPTH = 320;
const TEXT_DEPTH = PANEL_DEPTH + 1;

type MenuView = "closed" | "root" | "magic" | "items" | "target";
export type MajinCaveKnownMagic = Exclude<BattleAction, { readonly kind: "attack" }>;

export type MajinCaveActionMenuEvent =
  | { readonly kind: "none" }
  | { readonly kind: "help" }
  | { readonly kind: "magic"; readonly magic: MajinCaveKnownMagic }
  | { readonly kind: "magic_target"; readonly magic: Extract<BattleAction, { readonly kind: "magic_damage" }>; readonly direction: MajinCaveDirection }
  | { readonly kind: "item"; readonly itemId: ItemId };

/**
 * No.08専用の軽量な行動ウィンドウ。所持品と習得魔法は受け取って表示するだけで、
 * 消費・回復・ターン進行などのゲームルールは持たない。
 */
export class MajinCaveActionMenu {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private view: MenuView = "closed";
  private cursor = 0;
  private magic: readonly MajinCaveKnownMagic[] = [];
  private items: readonly InventorySlot[] = [];
  private targetMagic: Extract<BattleAction, { readonly kind: "magic_damage" }> | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly registerHudObject: <T extends Phaser.GameObjects.GameObject>(object: T) => T,
  ) {}

  get isOpen(): boolean {
    return this.view !== "closed";
  }

  open(magic: readonly MajinCaveKnownMagic[], items: readonly InventorySlot[]): void {
    this.magic = magic;
    this.items = items;
    this.view = "root";
    this.cursor = 0;
    this.targetMagic = null;
    this.render();
  }

  close(): void {
    this.view = "closed";
    this.cursor = 0;
    this.targetMagic = null;
    this.destroyObjects();
  }

  dispose(): void {
    this.close();
  }

  /** Menu-local input only. The scene converts the returned request into a logical cave action. */
  handleInput(actions: InputSystem): MajinCaveActionMenuEvent {
    if (!this.isOpen) return { kind: "none" };
    if (actions.consumePressed("cancel") || actions.consumePressed("menu")) {
      this.goBack();
      return { kind: "none" };
    }
    if (this.view === "target") return this.handleTargetInput(actions);

    const count = this.entryCount();
    if (count > 0 && actions.consumePressed("moveUp")) {
      this.cursor = (this.cursor - 1 + count) % count;
      this.render();
      return { kind: "none" };
    }
    if (count > 0 && actions.consumePressed("moveDown")) {
      this.cursor = (this.cursor + 1) % count;
      this.render();
      return { kind: "none" };
    }
    if (!actions.consumePressed("confirm")) return { kind: "none" };

    if (this.view === "root") return this.confirmRoot();
    if (this.view === "magic") return this.confirmMagic();
    return this.confirmItem();
  }

  private confirmRoot(): MajinCaveActionMenuEvent {
    if (this.cursor === 0) {
      this.view = "magic";
      this.cursor = 0;
      this.render();
      return { kind: "none" };
    }
    if (this.cursor === 1) {
      this.view = "items";
      this.cursor = 0;
      this.render();
      return { kind: "none" };
    }
    return { kind: "help" };
  }

  private confirmMagic(): MajinCaveActionMenuEvent {
    const magic = this.magic[this.cursor];
    if (!magic) return { kind: "none" };
    if (magic.kind === "magic_damage") {
      this.targetMagic = magic;
      this.view = "target";
      this.render();
      return { kind: "none" };
    }
    return { kind: "magic", magic };
  }

  private confirmItem(): MajinCaveActionMenuEvent {
    const slot = this.items[this.cursor];
    return slot ? { kind: "item", itemId: slot.itemId } : { kind: "none" };
  }

  private handleTargetInput(actions: InputSystem): MajinCaveActionMenuEvent {
    const magic = this.targetMagic;
    if (!magic) return { kind: "none" };
    const direction = consumeDirection(actions);
    return direction ? { kind: "magic_target", magic, direction } : { kind: "none" };
  }

  private goBack(): void {
    if (this.view === "root") {
      this.close();
      return;
    }
    this.view = "root";
    this.cursor = 0;
    this.targetMagic = null;
    this.render();
  }

  private entryCount(): number {
    if (this.view === "root") return 3;
    if (this.view === "magic") return this.magic.length;
    if (this.view === "items") return this.items.length;
    return 0;
  }

  private render(): void {
    this.destroyObjects();
    if (!this.isOpen) return;

    const panel = this.registerHudObject(this.scene.add.rectangle(480, 344, 570, 315, 0x060a15, 0.97)
      .setStrokeStyle(2, 0xd8e4ff, 0.94).setDepth(PANEL_DEPTH).setScrollFactor(0));
    this.objects.push(panel);

    if (this.view === "root") this.renderRoot();
    else if (this.view === "magic") this.renderMagic();
    else if (this.view === "items") this.renderItems();
    else this.renderTarget();
  }

  private renderRoot(): void {
    this.addText(240, 220, "こうどう", "24px", "#ffffff");
    this.addText(240, 267, selectRows(["まほう", "どうぐ", "ヘルプ"], this.cursor), "22px", "#ffffff", 10);
    this.addText(240, 425, "Z: えらぶ　X / C: もどる", "15px", "#b7c9e0");
  }

  private renderMagic(): void {
    this.addText(240, 220, "まほう", "24px", "#ffffff");
    if (this.magic.length === 0) {
      this.addText(240, 282, "つかえる まほうがない。", "19px", "#c7d5e9");
    } else {
      const rows = this.magic.map((magic) => `${magic.name}　MP ${magic.mpCost}`);
      this.addText(240, 265, selectRows(rows, this.cursor), "20px", "#ffffff", 8);
      const selected = this.magic[this.cursor];
      if (selected) this.addText(240, 405, magicHint(selected), "15px", "#b7c9e0", 3);
    }
    this.addText(240, 442, "↑↓: えらぶ　Z: けってい　X / C: もどる", "14px", "#b7c9e0");
  }

  private renderItems(): void {
    this.addText(240, 220, "どうぐ", "24px", "#ffffff");
    if (this.items.length === 0) {
      this.addText(240, 282, "どうぐを もっていない。", "19px", "#c7d5e9");
    } else {
      const rows = this.items.map((slot) => `${ITEM_DEFINITIONS[slot.itemId].name}　x${slot.quantity}`);
      this.addText(240, 265, selectRows(rows, this.cursor), "20px", "#ffffff", 8);
      const selected = this.items[this.cursor];
      if (selected) this.addText(240, 405, ITEM_DEFINITIONS[selected.itemId].description, "15px", "#b7c9e0", 3);
    }
    this.addText(240, 442, "↑↓: えらぶ　Z: つかう　X / C: もどる", "14px", "#b7c9e0");
  }

  private renderTarget(): void {
    const name = this.targetMagic?.name ?? "まほう";
    this.addText(480, 286, `${name}を となりに かける`, "25px", "#ffffff", 0, 0.5);
    this.addText(480, 348, "↑ ↓ ← → で ほうこうを えらぶ", "20px", "#dcecff", 0, 0.5);
    this.addText(480, 413, "X / C: もどる", "15px", "#b7c9e0", 0, 0.5);
  }

  private addText(x: number, y: number, text: string, size: string, color: string, lineSpacing = 0, originX = 0): void {
    const object = this.registerHudObject(this.scene.add.text(x, y, text, {
      color,
      fontFamily: "monospace",
      fontSize: size,
      lineSpacing,
      wordWrap: { width: 470 },
    }).setOrigin(originX, 0).setDepth(TEXT_DEPTH).setScrollFactor(0));
    this.objects.push(object);
  }

  private destroyObjects(): void {
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
  }
}

function selectRows(rows: readonly string[], cursor: number): string {
  return rows.map((row, index) => `${index === cursor ? "▶" : "　"} ${row}`).join("\n");
}

function magicHint(magic: MajinCaveKnownMagic): string {
  if (magic.kind === "magic_damage") return "となりの てきに ダメージ。";
  if (magic.kind === "heal") return "じぶんの HPを かいふく。";
  return "この まほうは どうくつでは つかえない。";
}

function consumeDirection(actions: InputSystem): MajinCaveDirection | null {
  if (actions.consumePressed("moveUp")) return "up";
  if (actions.consumePressed("moveDown")) return "down";
  if (actions.consumePressed("moveLeft")) return "left";
  if (actions.consumePressed("moveRight")) return "right";
  return null;
}
