import Phaser from "phaser";
import { BATTLE_COMMAND_LABELS, DEV_BATTLE_COMMANDS, DEV_BATTLE_EVENT_FADE_MS, DEV_BATTLE_PLAYER, DEV_BATTLE_UI_LAYOUT, getBattleStatusWindows, readDevBattleMonsterId } from "../config/battle.ts";
import { DISPLAY } from "../config/display.ts";
import { getDevBattleMonster } from "../data/monsters.ts";
import type { BattleSceneStartData } from "../events/BattleEventData.ts";
import { BattleSystem } from "../battle/BattleSystem.ts";
import type { BattleSnapshot } from "../battle/BattleSystem.ts";
import { InputSystem } from "../systems/InputSystem.ts";

const WINDOW_COLOR = 0x090c18;
const TEXT_COLOR = "#eeeeee";

/** Shared DEV battle display. Actions, damage and reflection remain in BattleSystem. */
export class BattleScene extends Phaser.Scene {
  private actions!: InputSystem;
  private battle: BattleSystem | undefined;
  private eventData: BattleSceneStartData | undefined;
  private portrait!: Phaser.GameObjects.Image;
  private commandText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private statusTexts: Phaser.GameObjects.Text[] = [];
  private statusWindows: Phaser.GameObjects.Rectangle[] = [];
  private hintText!: Phaser.GameObjects.Text;
  private portraitOriginX = 0;
  private commandIndex = 0;
  private magicMenu = false;
  private magicIndex = 0;
  private transitioning = false;

  constructor() { super("BattleScene"); }

  preload(): void {
    const data = this.sys.settings.data as Partial<BattleSceneStartData>;
    const enemy = getDevBattleMonster(data.mode === "event" ? data.monsterId ?? null : readDevBattleMonsterId(window.location.search));
    if (!enemy) return;
    // Per-enemy keys prevent the previous NPC's portrait appearing in a later battle.
    const key = `battle.monster.${enemy.id}`;
    if (!this.textures.exists(key)) this.load.image(key, enemy.portraitUrl);
    if (enemy.background && !this.textures.exists(enemy.background.key)) this.load.image(enemy.background.key, enemy.background.url);
  }

  create(data?: BattleSceneStartData): void {
    this.battle = undefined;
    this.transitioning = false;
    this.commandIndex = 0;
    this.magicMenu = false;
    this.magicIndex = 0;
    this.statusTexts = [];
    this.statusWindows = [];
    this.eventData = data?.mode === "event" ? data : undefined;
    const enemy = getDevBattleMonster(this.eventData?.monsterId ?? readDevBattleMonsterId(window.location.search));
    if (!enemy) {
      this.add.text(DISPLAY.width / 2, DISPLAY.height / 2, "DEV BATTLE\nUNKNOWN MONSTER", { fontSize: "22px", align: "center", color: TEXT_COLOR }).setOrigin(0.5);
      return;
    }
    // Temporary test loadout only, until GameState / party growth exists.
    this.battle = new BattleSystem(enemy.devPlayer ?? DEV_BATTLE_PLAYER, enemy);
    this.cameras.main.setBackgroundColor(0x101526);
    this.createBackground(enemy.background);
    const key = `battle.monster.${enemy.id}`;
    this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const layout = DEV_BATTLE_UI_LAYOUT;
    const scale = enemy.display?.scale ?? 1;
    this.portrait = this.add.image(layout.enemy.x, layout.enemy.y + (enemy.display?.offsetY ?? 0) * DISPLAY.height, key).setDepth(1);
    this.portrait.setScale(Math.min(layout.enemy.maxWidth * scale / this.portrait.width, layout.enemy.maxHeight * scale / this.portrait.height, 1));
    this.portraitOriginX = this.portrait.x;

    const style: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: "monospace", fontSize: `${layout.fontSize}px`, color: TEXT_COLOR, lineSpacing: 5 };
    for (const bounds of getBattleStatusWindows(this.battle.getSnapshot().party.length)) {
      this.statusWindows.push(this.createWindow(bounds));
      this.statusTexts.push(this.add.text(bounds.x + layout.padding, bounds.y + layout.padding, "", style).setDepth(11));
    }
    this.createWindow(layout.commandWindow);
    this.createWindow(layout.messageWindow);
    this.commandText = this.add.text(layout.commandWindow.x + layout.padding, layout.commandWindow.y + layout.padding, "", {
      ...style, lineSpacing: layout.commandLineHeight - layout.fontSize,
    }).setDepth(11);
    this.messageText = this.add.text(layout.messageWindow.x + layout.padding, layout.messageWindow.y + layout.padding, "", {
      ...style, wordWrap: { width: layout.messageWindow.width - layout.padding * 2 },
    }).setDepth(11);
    this.hintText = this.add.text(layout.messageWindow.x + layout.padding, layout.messageWindow.y + layout.messageWindow.height - layout.padding, "", {
      ...style, fontSize: `${layout.fontSize * 0.8}px`, color: "#b7bfd3",
    }).setOrigin(0, 1).setDepth(11);

    this.actions = new InputSystem(window, document);
    // Pointer input is queued through the same InputSystem as keyboard input.
    this.input.on("pointerdown", this.handlePointer, this);
    const cleanup = (): void => {
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
    if (!this.battle || this.transitioning) return;
    const confirm = this.actions.consumePressed("confirm");
    const cancel = this.actions.consumePressed("cancel");
    const up = this.actions.consumePressed("moveUp");
    const down = this.actions.consumePressed("moveDown");
    if (cancel) {
      if (this.magicMenu) { this.magicMenu = false; this.render(); }
      else if (this.battle.getSnapshot().state === "DEFEAT" && this.eventData) this.returnToEventMap();
      return;
    }
    if (this.battle.getSnapshot().state === "COMMAND" && (up || down)) {
      const count = this.magicMenu ? this.battle.getSnapshot().player.learnedMagic?.length ?? 0 : DEV_BATTLE_COMMANDS.length;
      if (count) {
        if (this.magicMenu) this.magicIndex = (this.magicIndex + (up ? -1 : 1) + count) % count;
        else this.commandIndex = (this.commandIndex + (up ? -1 : 1) + count) % count;
      }
      this.render();
    }
    if (confirm) this.handleConfirm();
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (!this.battle || this.transitioning) return;
    const state = this.battle.getSnapshot().state;
    const bounds = DEV_BATTLE_UI_LAYOUT.commandWindow;
    if (state === "COMMAND") {
      if (pointer.x < bounds.x || pointer.x > bounds.x + bounds.width || pointer.y < bounds.y || pointer.y > bounds.y + bounds.height) {
        if (this.magicMenu) this.actions.queuePressed("cancel");
        return;
      }
      const index = Math.floor((pointer.y - bounds.y - DEV_BATTLE_UI_LAYOUT.padding / 2) / DEV_BATTLE_UI_LAYOUT.commandLineHeight);
      const count = this.magicMenu ? this.battle.getSnapshot().player.learnedMagic?.length ?? 0 : DEV_BATTLE_COMMANDS.length;
      if (index < 0 || index >= count) return;
      if (this.magicMenu) this.magicIndex = index; else this.commandIndex = index;
    } else if (state === "DEFEAT" && this.eventData && pointer.x < bounds.x + bounds.width) {
      this.actions.queuePressed("cancel");
      return;
    }
    this.actions.queuePressed("confirm");
  }

  private handleConfirm(): void {
    if (!this.battle) return;
    const before = this.battle.getSnapshot();
    if (before.state === "VICTORY" || before.state === "ESCAPED") {
      if (this.eventData) this.returnToEventMap(); else this.scene.restart();
      return;
    }
    if (before.state === "DEFEAT") {
      if (this.eventData) this.scene.restart(this.eventData); else this.scene.restart();
      return;
    }
    const command = DEV_BATTLE_COMMANDS[this.commandIndex];
    if (before.state === "COMMAND" && command === "magic" && !this.magicMenu && before.player.learnedMagic?.length) {
      this.magicMenu = true;
      this.magicIndex = 0;
      this.render();
      return;
    }
    const magic = this.magicMenu ? before.player.learnedMagic?.[this.magicIndex] : undefined;
    this.battle.confirm(command, magic?.id);
    this.magicMenu = false;
    this.applyVisualFeedback(before, this.battle.getSnapshot());
    this.render();
  }

  private createBackground(background?: { readonly key: string; readonly url: string }): void {
    if (background && this.textures.exists(background.key)) {
      this.textures.get(background.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const image = this.add.image(DISPLAY.width / 2, DISPLAY.height / 2, background.key).setDepth(0);
      image.setScale(Math.max(DISPLAY.width / image.width, DISPLAY.height / image.height));
      return;
    }
    // Existing normal-enemy DEV background, also a safe image-load fallback.
    this.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, 0x1e3154);
    this.add.rectangle(DISPLAY.width / 2, DISPLAY.height * 0.65, DISPLAY.width, DISPLAY.height * 0.35, 0x243b31);
  }

  private createWindow(bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width, bounds.height, WINDOW_COLOR)
      .setStrokeStyle(2, 0xeeeeee).setDepth(10);
  }

  private applyVisualFeedback(before: BattleSnapshot, after: BattleSnapshot): void {
    if (after.enemy.hp < before.enemy.hp) {
      this.tweens.killTweensOf(this.portrait);
      this.portrait.setX(this.portraitOriginX).setAlpha(1);
      this.tweens.add({ targets: this.portrait, x: this.portraitOriginX + 8, alpha: 0.35, duration: 55, yoyo: true, repeat: 2 });
    }
    if (after.player.hp < before.player.hp) {
      this.tweens.killTweensOf(this.statusWindows);
      this.statusWindows.forEach(window => window.setAlpha(1));
      this.tweens.add({ targets: this.statusWindows, alpha: 0.35, duration: 70, yoyo: true, repeat: 1 });
    }
    if (after.state === "VICTORY") {
      this.tweens.killTweensOf(this.portrait);
      this.tweens.add({ targets: this.portrait, alpha: 0, duration: 160 });
    }
  }

  private returnToEventMap(): void {
    if (!this.eventData || this.transitioning) return;
    this.transitioning = true;
    this.actions.setLocked(true);
    // TODO: persist event.victoryFlag through the future GameState / SaveSystem,
    // only on VICTORY. There is currently no flag store; DEV NPCs remain repeatable.
    this.cameras.main.fadeOut(DEV_BATTLE_EVENT_FADE_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(this.eventData!.returnSceneKey, { spawnId: this.eventData!.returnSpawnId, battleEventReturn: true });
    });
  }

  private render(): void {
    if (!this.battle) return;
    const snapshot = this.battle.getSnapshot();
    snapshot.party.forEach((member, i) => this.statusTexts[i].setText(`${member.displayName}${member.status.mirror ? " ◇" : ""}\nHP ${member.hp} / ${member.maxHp}\nMP ${member.mp} / ${member.maxMp ?? 0}`));
    this.messageText.setText(snapshot.message);
    this.hintText.setText("決定: Z / Enter / タップ");
    if (snapshot.state === "COMMAND") {
      const labels = this.magicMenu ? snapshot.player.learnedMagic?.map(action => action.kind === "attack" ? "こうげき" : action.name) ?? [] : BATTLE_COMMAND_LABELS;
      const selected = this.magicMenu ? this.magicIndex : this.commandIndex;
      this.commandText.setText(labels.map((label, i) => `${i === selected ? "▶" : "　"} ${label}`).join("\n"));
      if (this.magicMenu) this.hintText.setText("もどる: X / Esc / メニュー外をタップ");
    } else if (snapshot.state === "DEFEAT" && this.eventData) {
      this.commandText.setText("X: もどる\n\nここをタップ");
      this.hintText.setText("再戦: Z / Enter / メッセージをタップ");
    } else {
      this.commandText.setText(snapshot.state === "VICTORY" || snapshot.state === "ESCAPED" ? (this.eventData ? "▶ もどる" : "▶ もういちど") : "▶ つづける");
    }
  }
}
