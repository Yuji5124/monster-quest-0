import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import type { ShopDefinition } from "../config/shops.ts";
import { ITEM_DEFINITIONS } from "../data/items.ts";
import { getWeaponById } from "../data/weapons.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import type { InputSystem } from "../systems/InputSystem.ts";
import { inventory } from "../systems/Inventory.ts";
import { buyItem, buyWeapon, getCurrentWeapon, getMoney, stayAtInn } from "../systems/ShopSystem.ts";

const BOX_COLOR = 0x0a0a14;
const BORDER_COLOR = 0xeeeeee;
const BORDER_WIDTH = 6;
const TEXT_COLOR = "#eeeeee";
const FONT_SIZE = 22;
const LINE_HEIGHT = 36;
const PADDING = 24;
const MARGIN = 24;
const DEPTH = 2600;
const INN_FADE_MS = 700;

// DialogueBox.tsと同じ位置・大きさの下部メッセージ窓。
const MESSAGE = { x: MARGIN, y: DISPLAY.height - MARGIN - 192, width: DISPLAY.width - MARGIN * 2, height: 192 };
const CHOICES = { x: MARGIN, y: MARGIN, width: 420 };
const MONEY = { width: 240, height: 72 };

interface Choice {
  readonly label: string;
  readonly price?: number;
  readonly note?: string;
  readonly run: () => void;
}

type ShopView = "closed" | "choices" | "message" | "busy";

/**
 * FC〜初期SFC風のお店・やどや窓。上に選択肢、右上に所持金、下にお店の人の言葉を出す。
 * StartingTownSceneのNPC会話と同じく、開いている間はSceneのtickから`handleInput`だけを呼び、
 * 主人公の移動を止める。タップは選択肢なら選んで決定、それ以外は決定(ページ送り)として扱う。
 */
export class ShopWindow {
  private readonly scene: Phaser.Scene;
  private readonly repository = new GameStateRepository();
  private readonly onTalk: (npcId: string) => void;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly messageText: Phaser.GameObjects.Text;
  private readonly choicesBox: Phaser.GameObjects.Rectangle;
  private readonly choicesText: Phaser.GameObjects.Text;
  private readonly moneyText: Phaser.GameObjects.Text;
  private view: ShopView = "closed";
  private npcId = "";
  private shop: ShopDefinition | undefined;
  private choices: readonly Choice[] = [];
  private cursor = 0;
  private afterMessage: (() => void) | undefined;
  private pendingTap = false;

  constructor(scene: Phaser.Scene, onTalk: (npcId: string) => void) {
    this.scene = scene;
    this.onTalk = onTalk;

    this.box(MESSAGE.x, MESSAGE.y, MESSAGE.width, MESSAGE.height);
    this.messageText = this.text(MESSAGE.x + PADDING, MESSAGE.y + PADDING, MESSAGE.width - PADDING * 2);
    this.choicesBox = this.box(CHOICES.x, CHOICES.y, CHOICES.width, 100);
    this.choicesText = this.text(CHOICES.x + PADDING, CHOICES.y + PADDING, CHOICES.width - PADDING * 2);
    const moneyX = DISPLAY.width - MARGIN - MONEY.width;
    this.box(moneyX, MARGIN, MONEY.width, MONEY.height);
    this.moneyText = this.text(moneyX + PADDING, MARGIN + PADDING, MONEY.width - PADDING * 2);
    this.setVisible(false);
    scene.input.on("pointerdown", this.handlePointer, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.input.off("pointerdown", this.handlePointer, this));
  }

  get isOpen(): boolean {
    return this.view !== "closed";
  }

  open(npcId: string, shop: ShopDefinition): void {
    this.npcId = npcId;
    this.shop = shop;
    this.setVisible(true);
    this.showMainMenu(greeting(shop));
  }

  close(): void {
    this.view = "closed";
    this.setVisible(false);
  }

  /** `confirmPressed`はSceneのtickが先に消費した決定入力(DialogueBoxと同じ受け渡し)。 */
  handleInput(actions: InputSystem, confirmPressed: boolean): void {
    if (this.view === "closed" || this.view === "busy") return;
    const confirm = confirmPressed || this.pendingTap;
    this.pendingTap = false;
    if (this.view === "message") {
      if (confirm || actions.consumePressed("cancel")) this.finishMessage();
      return;
    }
    const count = this.choices.length;
    if (actions.consumePressed("moveUp")) {
      this.cursor = (this.cursor - 1 + count) % count;
      this.render();
    } else if (actions.consumePressed("moveDown")) {
      this.cursor = (this.cursor + 1) % count;
      this.render();
    } else if (actions.consumePressed("cancel")) {
      // いちばん下の選択肢(やめる/いいえ)をキャンセルとして扱う。
      this.choices[count - 1]?.run();
    } else if (confirm) {
      this.choices[this.cursor]?.run();
    }
  }

  private showMainMenu(message: string): void {
    const shop = this.shop!;
    this.showChoices(message, [
      shop.kind === "inn"
        ? { label: "とまる", run: () => this.confirmInn() }
        : { label: "かう", run: () => this.showStock() },
      { label: "はなす", run: () => { this.close(); this.onTalk(this.npcId); } },
      { label: "やめる", run: () => this.say(farewell(shop), () => this.close()) },
    ]);
  }

  private confirmInn(): void {
    const shop = this.shop;
    if (shop?.kind !== "inn") return;
    this.showChoices(`ひとばん　${shop.price}Gだが\nとまって　いくかい？`, [
      { label: "はい", run: () => this.stayAtInn(shop.price) },
      { label: "いいえ", run: () => this.showMainMenu("そうかい。\nほかに　ようは　あるかい？") },
    ]);
  }

  private stayAtInn(price: number): void {
    if (stayAtInn(this.repository, price).kind === "insufficientMoney") {
      this.say("おや　おかねが　たりないようだね。\nまた　おいで。", () => this.showMainMenu("ほかに　ようは　あるかい？"));
      return;
    }
    this.view = "busy";
    this.render();
    const camera = this.scene.cameras.main;
    camera.fadeOut(INN_FADE_MS, 0, 0, 0);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.time.delayedCall(INN_FADE_MS, () => {
        camera.fadeIn(INN_FADE_MS, 0, 0, 0);
        this.say(
          "おはよう。　ゆうべは　よく\nねむれたかい？\nみんなの　HPと　MPが　かいふくした！",
          () => this.showMainMenu("ほかに　ようは　あるかい？"),
        );
      });
    });
  }

  private showStock(): void {
    const shop = this.shop;
    if (!shop || shop.kind === "inn") return;
    const back: Choice = { label: "やめる", run: () => this.showMainMenu("ほかに　ようは　あるかい？") };
    if (shop.kind === "item") {
      this.showChoices("どれに　するかい？", [
        ...shop.stock.map((entry) => {
          const item = ITEM_DEFINITIONS[entry.itemId];
          return { label: item.name, price: entry.price, run: () => this.confirmItem(entry.itemId, entry.price) };
        }),
        back,
      ]);
      return;
    }
    const current = getCurrentWeapon(this.repository, "hero");
    this.showChoices(`どれに　する？\nいまの　ぶきは　${current.displayName}だ。`, [
      ...shop.stock.map((entry) => {
        const weapon = getWeaponById(entry.memberId, entry.weaponId);
        const label = weapon?.displayName ?? entry.weaponId;
        const note = weapon?.id === current.id ? "E" : undefined;
        return { label, price: entry.price, note, run: () => this.confirmWeapon(entry.weaponId, label, entry.price) };
      }),
      back,
    ]);
  }

  private confirmItem(itemId: keyof typeof ITEM_DEFINITIONS, price: number): void {
    const item = ITEM_DEFINITIONS[itemId];
    this.showChoices(`${item.name}は　${price}Gだよ。\n${item.description}\nかっていくかい？`, [
      {
        label: "はい",
        run: () => {
          const result = buyItem(this.repository, inventory, itemId, price);
          this.say(
            result.kind === "bought" ? `まいど　ありがとう！\n${item.name}を　てにいれた。` : "おかねが　たりないよ。",
            () => this.showStock(),
          );
        },
      },
      { label: "いいえ", run: () => this.showStock() },
    ]);
  }

  private confirmWeapon(weaponId: string, label: string, price: number): void {
    this.showChoices(`${label}は　${price}Gだ。\nかっていくかい？`, [
      {
        label: "はい",
        run: () => {
          const result = buyWeapon(this.repository, "hero", weaponId, price);
          const message = result.kind === "equipped"
            ? `まいど！\n${result.weapon.displayName}を　そうびした！`
            : result.kind === "notStronger"
              ? `いまの　${result.current.displayName}の　ほうが\nつよいぜ。　かう　ことは　ねえよ。`
              : result.kind === "insufficientMoney"
                ? "おかねが　たりねえな。"
                : "その　ぶきは　いま　きらしてるんだ。";
          this.say(message, () => this.showStock());
        },
      },
      { label: "いいえ", run: () => this.showStock() },
    ]);
  }

  private showChoices(message: string, choices: readonly Choice[]): void {
    this.view = "choices";
    this.messageText.setText(message);
    this.choices = choices;
    this.cursor = 0;
    this.render();
  }

  private say(message: string, after: () => void): void {
    this.view = "message";
    this.messageText.setText(message);
    this.afterMessage = after;
    this.render();
  }

  private finishMessage(): void {
    const after = this.afterMessage;
    this.afterMessage = undefined;
    after?.();
  }

  private render(): void {
    const showChoices = this.view === "choices";
    this.choicesBox.setVisible(showChoices);
    this.choicesText.setVisible(showChoices);
    if (showChoices) {
      const rows = this.choices.map((choice, index) => {
        const cursor = index === this.cursor ? "▶" : "　";
        const note = choice.note ? `${choice.note} ` : "　";
        const price = choice.price === undefined ? "" : `${String(choice.price).padStart(5, " ")}G`;
        return `${cursor}${note}${choice.label.padEnd(8, "　")}${price}`;
      });
      this.choicesText.setText(rows.join("\n"));
      const height = PADDING * 2 + rows.length * LINE_HEIGHT - (LINE_HEIGHT - FONT_SIZE);
      this.choicesBox.setSize(CHOICES.width, height).setPosition(CHOICES.x + CHOICES.width / 2, CHOICES.y + height / 2);
    }
    this.moneyText.setText(`おかね　${getMoney(this.repository)}G`);
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (this.view === "choices") {
      const top = CHOICES.y + PADDING;
      const index = Math.floor((pointer.y - top) / LINE_HEIGHT);
      const inside = pointer.x >= CHOICES.x && pointer.x <= CHOICES.x + CHOICES.width && index >= 0 && index < this.choices.length;
      if (!inside) return;
      this.cursor = index;
      this.render();
    }
    if (this.view === "choices" || this.view === "message") this.pendingTap = true;
  }

  private box(x: number, y: number, width: number, height: number): Phaser.GameObjects.Rectangle {
    const rectangle = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, BOX_COLOR, 1)
      .setStrokeStyle(BORDER_WIDTH, BORDER_COLOR)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.objects.push(rectangle);
    return rectangle;
  }

  private text(x: number, y: number, wrapWidth: number): Phaser.GameObjects.Text {
    const text = this.scene.add.text(x, y, "", {
      fontFamily: "monospace",
      fontSize: `${FONT_SIZE}px`,
      color: TEXT_COLOR,
      lineSpacing: LINE_HEIGHT - FONT_SIZE,
      wordWrap: { width: wrapWidth },
    }).setScrollFactor(0).setDepth(DEPTH + 1);
    this.objects.push(text);
    return text;
  }

  private setVisible(visible: boolean): void {
    for (const object of this.objects) (object as Phaser.GameObjects.Rectangle).setVisible(visible);
    if (visible) this.render();
  }
}

function greeting(shop: ShopDefinition): string {
  if (shop.kind === "inn") return `たびの　やどやへ　ようこそ。\nひとばん　${shop.price}Gだよ。`;
  if (shop.kind === "weapon") return "ここは　ぶきやだ。\nなにか　ようかい？";
  return "いらっしゃい。　どうぐやだよ。\nなにか　いるかい？";
}

function farewell(shop: ShopDefinition): string {
  if (shop.kind === "inn") return "きを　つけて　いくんだよ。";
  if (shop.kind === "weapon") return "また　きな。\nいきて　かえって　くるんだぞ。";
  return "また　おいで。";
}
