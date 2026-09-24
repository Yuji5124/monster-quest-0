import Phaser from "phaser";
import { BATTLE_COMMAND_LABELS, DEV_BATTLE_COMMANDS, DEV_BATTLE_EVENT_FADE_MS, DEV_BATTLE_PLAYER, DEV_BATTLE_UI_LAYOUT, getBattleStatusWindows, readDevBattleMonsterId } from "../config/battle.ts";
import { DISPLAY } from "../config/display.ts";
import { getDevBattleMonster } from "../data/monsters.ts";
import type { BattleSceneStartData } from "../events/BattleEventData.ts";
import { BattleSystem } from "../battle/BattleSystem.ts";
import type { BattleCombatant, BattleSnapshot } from "../battle/BattleSystem.ts";
import { buildPartyCombatant } from "../battle/PartyCombatants.ts";
import { ITEM_DEFINITIONS } from "../data/items.ts";
import type { InventorySlot } from "../systems/Inventory.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { characterProgression, formatStatGainEntries } from "../systems/CharacterProgression.ts";
import type { CharacterLevelUp } from "../systems/CharacterProgression.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { inventory } from "../systems/Inventory.ts";
import { partySystem } from "../systems/PartySystem.ts";

const WINDOW_COLOR = 0x090c18;
const TEXT_COLOR = "#eeeeee";
const LEVEL_UP_GOLD = 0xffd75e;

/**
 * 勝利後に1ページずつ送る追加メッセージ。`celebrateMemberId`があるページは表示と同時にレベルアップ演出を行う。
 * 順番: レベルアップ(演出つき) → 戦闘の最後に能力増加の説明 → 新しく覚えた魔法。
 */
interface VictoryPage {
  readonly text: string;
  readonly celebrateMemberId?: string;
}

function buildLevelUpPages(levelUps: readonly CharacterLevelUp[]): VictoryPage[] {
  const celebrations = levelUps.map((levelUp) => ({
    text: `${levelUp.displayName}は　レベル${levelUp.toLevel}に　あがった！`,
    celebrateMemberId: levelUp.memberId,
  }));
  const explanations = levelUps.flatMap((levelUp) => {
    const entries = formatStatGainEntries(levelUp.statGains);
    // 2項目ずつ1行にまとめ、メッセージ窓の行数に収める。
    const rows: string[] = [];
    for (let index = 0; index < entries.length; index += 2) rows.push(entries.slice(index, index + 2).join("　　"));
    const pages: VictoryPage[] = [{ text: [`${levelUp.displayName}の　のうりょくが　あがった！`, ...rows].join("\n") }];
    if (levelUp.learnedMagicNames.length > 0) {
      pages.push({ text: levelUp.learnedMagicNames.map((name) => `${levelUp.displayName}は　${name}を　おぼえた！`).join("\n") });
    }
    return pages;
  });
  return [...celebrations, ...explanations];
}

/** Shared DEV battle display. Actions, damage and reflection remain in BattleSystem. */
export class BattleScene extends Phaser.Scene {
  private actions!: InputSystem;
  private battle: BattleSystem | undefined;
  private eventData: BattleSceneStartData | undefined;
  private portrait!: Phaser.GameObjects.Image;
  private groundShadow!: Phaser.GameObjects.Ellipse;
  private commandText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private statusTexts: Phaser.GameObjects.Text[] = [];
  private statusWindows: Phaser.GameObjects.Rectangle[] = [];
  private hintText!: Phaser.GameObjects.Text;
  private portraitOriginX = 0;
  private commandIndex = 0;
  private magicMenu = false;
  private magicIndex = 0;
  private itemMenu = false;
  private itemIndex = 0;
  private transitioning = false;
  private rewardGranted = false;
  /** 勝利メッセージの後に送るレベルアップ／能力増加／魔法習得ページ。 */
  private victoryPages: VictoryPage[] = [];
  /** -1 = まだ勝利メッセージを表示中。 */
  private victoryPageIndex = -1;
  private levelUpEffectObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly gameState = new GameStateRepository();

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
    this.rewardGranted = false;
    this.victoryPages = [];
    this.victoryPageIndex = -1;
    this.levelUpEffectObjects = [];
    this.commandIndex = 0;
    this.magicMenu = false;
    this.magicIndex = 0;
    this.itemMenu = false;
    this.itemIndex = 0;
    this.statusTexts = [];
    this.statusWindows = [];
    this.eventData = data?.mode === "event" ? data : undefined;
    const resolvedEnemy = getDevBattleMonster(this.eventData?.monsterId ?? readDevBattleMonsterId(window.location.search));
    if (!resolvedEnemy) {
      this.add.text(DISPLAY.width / 2, DISPLAY.height / 2, "DEV BATTLE\nUNKNOWN MONSTER", { fontSize: "22px", align: "center", color: TEXT_COLOR }).setOrigin(0.5);
      return;
    }
    // A local boss can use the player's named role without duplicating or mutating the
    // shared monster roster's combat stats, portrait, or later-area display name.
    const enemy = this.eventData?.monsterDisplayName
      ? { ...resolvedEnemy, displayName: this.eventData.monsterDisplayName }
      : resolvedEnemy;
    // enemy.devPlayerがある単体確認用ボス(デーマス等)はTEMP_TEST_VALUEの単独ダミーを維持する。
    // それ以外は実際の加入パーティ＋レベル成長＋装備(CharacterProgression/PartyCombatants)を使う。
    this.battle = new BattleSystem(enemy.devPlayer ?? this.buildLivePartyCombatants(), enemy);
    this.cameras.main.setBackgroundColor(0x101526);
    this.createBackground(enemy.background);
    const key = `battle.monster.${enemy.id}`;
    this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const layout = DEV_BATTLE_UI_LAYOUT;
    const scale = enemy.display?.scale ?? 1;
    this.portrait = this.add.image(layout.enemy.x, layout.enemy.y + (enemy.display?.offsetY ?? 0) * DISPLAY.height, key).setDepth(1);
    this.portrait.setScale(Math.min(layout.enemy.maxWidth * scale / this.portrait.width, layout.enemy.maxHeight * scale / this.portrait.height, 1));
    // 全ての敵に共通する接地影。画像固有の描き足しを避け、透明ポートレートでも背景から浮かないようにする。
    this.groundShadow = this.createGroundShadow(this.portrait);
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

  /** 実際の加入パーティ(1〜3人)を、現在のレベル・装備・習得魔法込みで組み立てる。 */
  private buildLivePartyCombatants() {
    const members = partySystem.getActiveMembers();
    if (members.length === 0) return DEV_BATTLE_PLAYER;
    return members.map((member) => buildPartyCombatant(member.id, characterProgression.getStats(member.id).level));
  }

  update(): void {
    if (!this.battle || this.transitioning) return;
    const confirm = this.actions.consumePressed("confirm");
    const cancel = this.actions.consumePressed("cancel");
    const up = this.actions.consumePressed("moveUp");
    const down = this.actions.consumePressed("moveDown");
    if (cancel) {
      if (this.magicMenu || this.itemMenu) { this.magicMenu = false; this.itemMenu = false; this.render(); }
      else if (this.battle.getSnapshot().state === "DEFEAT" && this.eventData) this.returnToEventMap();
      return;
    }
    const snapshot = this.battle.getSnapshot();
    if (snapshot.state === "COMMAND" && (up || down)) {
      const actor = snapshot.party[snapshot.actingIndex];
      const count = this.magicMenu ? actor.learnedMagic?.length ?? 0 : this.itemMenu ? this.usableItemSlots().length : DEV_BATTLE_COMMANDS.length;
      if (count) {
        if (this.magicMenu) this.magicIndex = (this.magicIndex + (up ? -1 : 1) + count) % count;
        else if (this.itemMenu) this.itemIndex = (this.itemIndex + (up ? -1 : 1) + count) % count;
        else this.commandIndex = (this.commandIndex + (up ? -1 : 1) + count) % count;
      }
      this.render();
    }
    if (confirm) this.handleConfirm();
  }

  private usableItemSlots(): readonly InventorySlot[] {
    return inventory.getSlots().filter((slot) => ITEM_DEFINITIONS[slot.itemId].usableInBattle);
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (!this.battle || this.transitioning) return;
    const snapshot = this.battle.getSnapshot();
    const state = snapshot.state;
    const bounds = DEV_BATTLE_UI_LAYOUT.commandWindow;
    if (state === "COMMAND") {
      if (pointer.x < bounds.x || pointer.x > bounds.x + bounds.width || pointer.y < bounds.y || pointer.y > bounds.y + bounds.height) {
        if (this.magicMenu || this.itemMenu) this.actions.queuePressed("cancel");
        return;
      }
      const actor = snapshot.party[snapshot.actingIndex];
      const index = Math.floor((pointer.y - bounds.y - DEV_BATTLE_UI_LAYOUT.padding / 2) / DEV_BATTLE_UI_LAYOUT.commandLineHeight);
      const count = this.magicMenu ? actor.learnedMagic?.length ?? 0 : this.itemMenu ? this.usableItemSlots().length : DEV_BATTLE_COMMANDS.length;
      if (index < 0 || index >= count) return;
      if (this.magicMenu) this.magicIndex = index; else if (this.itemMenu) this.itemIndex = index; else this.commandIndex = index;
    } else if (state === "DEFEAT" && this.eventData && pointer.x < bounds.x + bounds.width) {
      this.actions.queuePressed("cancel");
      return;
    }
    this.actions.queuePressed("confirm");
  }

  private handleConfirm(): void {
    if (!this.battle) return;
    const before = this.battle.getSnapshot();
    if (before.state === "VICTORY" && this.victoryPageIndex < this.victoryPages.length - 1) {
      this.victoryPageIndex += 1;
      this.clearLevelUpEffect();
      const page = this.victoryPages[this.victoryPageIndex];
      if (page.celebrateMemberId) this.playLevelUpEffect(before.party.findIndex((member) => member.id === page.celebrateMemberId));
      this.render();
      return;
    }
    if (before.state === "VICTORY" || before.state === "ESCAPED") {
      if (this.eventData) this.returnToEventMap(); else this.scene.restart();
      return;
    }
    if (before.state === "DEFEAT") {
      if (this.eventData) this.scene.restart(this.eventData); else this.scene.restart();
      return;
    }
    const actor = before.party[before.actingIndex];
    const command = DEV_BATTLE_COMMANDS[this.commandIndex];
    if (before.state === "COMMAND" && command === "magic" && !this.magicMenu && !this.itemMenu && actor.learnedMagic?.length) {
      this.magicMenu = true;
      this.magicIndex = 0;
      this.render();
      return;
    }
    if (before.state === "COMMAND" && command === "item" && !this.magicMenu && !this.itemMenu && this.usableItemSlots().length > 0) {
      this.itemMenu = true;
      this.itemIndex = 0;
      this.render();
      return;
    }
    const magic = this.magicMenu ? actor.learnedMagic?.[this.magicIndex] : undefined;
    const item = this.itemMenu ? this.usableItemSlots()[this.itemIndex] : undefined;
    this.battle.confirm(command, magic?.id, item?.itemId);
    if (item) inventory.remove(item.itemId);
    this.magicMenu = false;
    this.itemMenu = false;
    const after = this.battle.getSnapshot();
    this.grantVictoryReward(after);
    this.applyVisualFeedback(before, after);
    this.render();
  }

  /** Event battles write their reward once; standalone ?battleTest visual QA never touches a player's save. */
  private grantVictoryReward(snapshot: BattleSnapshot): void {
    if (this.rewardGranted || !this.eventData || snapshot.state !== "VICTORY" || !snapshot.reward) return;
    this.rewardGranted = true;
    const { levelUps } = characterProgression.awardExperience(partySystem.getPartyOrder(), snapshot.reward.experience);
    this.victoryPages = buildLevelUpPages(levelUps);
    this.gameState.addMoney(snapshot.reward.money);
    if (snapshot.reward.itemId && Object.hasOwn(ITEM_DEFINITIONS, snapshot.reward.itemId)) {
      inventory.add(snapshot.reward.itemId as keyof typeof ITEM_DEFINITIONS);
    }
  }

  /**
   * レベルアップ演出: 金色のフラッシュ、中央に弾んで出る「LEVEL UP!」、上がったメンバーの
   * ステータス窓から立ちのぼる光の粒と、窓枠の金色の点滅。次のページへ送ると片付ける。
   */
  private playLevelUpEffect(memberIndex: number): void {
    this.cameras.main.flash(280, 255, 225, 120);
    const layout = DEV_BATTLE_UI_LAYOUT;
    const bannerY = layout.enemy.y - layout.enemy.maxHeight * 0.15;
    const banner = this.add.text(DISPLAY.width / 2, bannerY, "LEVEL UP!", {
      fontFamily: "monospace", fontSize: `${Math.round(layout.fontSize * 2.4)}px`, fontStyle: "bold",
      color: "#fff3b0", stroke: "#7a4a00", strokeThickness: 8,
    }).setOrigin(0.5).setDepth(20).setScale(0.2).setAlpha(0);
    this.levelUpEffectObjects.push(banner);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 360, ease: "Back.easeOut" });
    this.tweens.add({ targets: banner, y: bannerY - 6, duration: 700, delay: 380, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const windowRect = this.statusWindows[memberIndex];
    if (!windowRect) return;
    windowRect.setStrokeStyle(3, LEVEL_UP_GOLD);
    this.tweens.add({ targets: windowRect, alpha: 0.55, duration: 110, yoyo: true, repeat: 3 });
    for (let index = 0; index < 12; index += 1) {
      const x = windowRect.x - windowRect.width / 2 + (windowRect.width * (index + 0.5)) / 12;
      const y = windowRect.y + windowRect.height / 2;
      const star = this.add.star(x, y, 4, 2, 6, index % 3 === 0 ? 0xffffff : LEVEL_UP_GOLD).setDepth(12).setAlpha(0);
      this.levelUpEffectObjects.push(star);
      this.tweens.add({
        targets: star,
        y: y - windowRect.height * (1.1 + (index % 4) * 0.25),
        alpha: { from: 1, to: 0 },
        angle: 180,
        duration: 900 + (index % 5) * 120,
        delay: (index % 6) * 70,
      });
    }
  }

  private clearLevelUpEffect(): void {
    for (const object of this.levelUpEffectObjects) {
      this.tweens.killTweensOf(object);
      object.destroy();
    }
    this.levelUpEffectObjects = [];
    for (const windowRect of this.statusWindows) {
      this.tweens.killTweensOf(windowRect);
      windowRect.setAlpha(1).setStrokeStyle(2, 0xeeeeee);
    }
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

  /** Shared grounding treatment for normal enemies and bosses; it stays behind the portrait and above the battle background. */
  private createGroundShadow(portrait: Phaser.GameObjects.Image): Phaser.GameObjects.Ellipse {
    const width = Math.max(42, portrait.displayWidth * 0.62);
    const height = Math.max(10, portrait.displayHeight * 0.12);
    return this.add
      // Imageの下端より少し下に出して、輪郭や透明領域に隠れない接地影にする。
      .ellipse(portrait.x, portrait.y + portrait.displayHeight / 2 + Math.max(4, height / 2), width, height, 0x05070b, 0.46)
      .setDepth(0.5);
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
    if (after.party.some((member, i) => member.hp < (before.party[i]?.hp ?? member.hp))) {
      this.tweens.killTweensOf(this.statusWindows);
      this.statusWindows.forEach(window => window.setAlpha(1));
      this.tweens.add({ targets: this.statusWindows, alpha: 0.35, duration: 70, yoyo: true, repeat: 1 });
    }
    if (after.state === "VICTORY") {
      this.tweens.killTweensOf([this.portrait, this.groundShadow]);
      this.tweens.add({ targets: [this.portrait, this.groundShadow], alpha: 0, duration: 160 });
    }
  }

  private returnToEventMap(): void {
    if (!this.eventData || this.transitioning) return;
    this.transitioning = true;
    this.actions.setLocked(true);
    // Boss/chest/world state is committed only after a real VICTORY. Escaping or losing an
    // event battle leaves it repeatable, and duplicate flags are harmlessly idempotent.
    if (this.battle?.getSnapshot().state === "VICTORY") {
      const flags = [this.eventData.victoryFlag, ...(this.eventData.victoryFlags ?? [])]
        .filter((flag): flag is string => typeof flag === "string");
      for (const flag of new Set(flags)) this.gameState.setFlag(flag);
    }
    this.cameras.main.fadeOut(DEV_BATTLE_EVENT_FADE_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const event = this.eventData!;
      const hasExactReturnPosition = event.returnSpawnX !== undefined && event.returnSpawnY !== undefined;
      this.scene.start(event.returnSceneKey, {
        spawnId: event.returnSpawnId,
        ...(hasExactReturnPosition ? { spawnX: event.returnSpawnX, spawnY: event.returnSpawnY, spawnFacing: event.returnFacing } : {}),
        battleEventReturn: true,
      });
    });
  }

  private statusLine(member: BattleCombatant, isActing: boolean): string {
    const marker = member.status.mirror ? " ◇" : member.status.poisoned ? " ☠" : "";
    const cursor = isActing && member.hp > 0 ? "▷" : "　";
    return `${cursor}${member.displayName}${marker}\nHP ${member.hp} / ${member.maxHp}\nMP ${member.mp} / ${member.maxMp ?? 0}`;
  }

  private render(): void {
    if (!this.battle) return;
    const snapshot = this.battle.getSnapshot();
    const actor = snapshot.party[snapshot.actingIndex];
    snapshot.party.forEach((member, i) => this.statusTexts[i].setText(this.statusLine(member, snapshot.state === "COMMAND" && i === snapshot.actingIndex)));
    const victoryPage = snapshot.state === "VICTORY" ? this.victoryPages[this.victoryPageIndex] : undefined;
    this.messageText.setText(victoryPage ? victoryPage.text : snapshot.message);
    this.hintText.setText("決定: Z / Enter / タップ");
    if (snapshot.state === "COMMAND") {
      // 誰の番かは各ステータス窓の「▷」カーソルで示す(コマンド窓に名前行を足すと4行の枠に
      // 収まらなくなるため、ここでは重ねない)。
      if (this.magicMenu) {
        const labels = actor.learnedMagic?.map((action) => action.kind === "attack" ? "こうげき" : action.name) ?? [];
        this.commandText.setText(labels.map((label, i) => `${i === this.magicIndex ? "▶" : "　"} ${label}`).join("\n"));
        this.hintText.setText("もどる: X / Esc / メニュー外をタップ");
      } else if (this.itemMenu) {
        const slots = this.usableItemSlots();
        const labels = slots.map((slot) => `${ITEM_DEFINITIONS[slot.itemId].name} x${slot.quantity}`);
        this.commandText.setText(labels.map((label, i) => `${i === this.itemIndex ? "▶" : "　"} ${label}`).join("\n"));
        this.hintText.setText("もどる: X / Esc / メニュー外をタップ");
      } else {
        this.commandText.setText(BATTLE_COMMAND_LABELS.map((label, i) => `${i === this.commandIndex ? "▶" : "　"} ${label}`).join("\n"));
      }
    } else if (snapshot.state === "DEFEAT" && this.eventData) {
      this.commandText.setText("X: もどる\n\nここをタップ");
      this.hintText.setText("再戦: Z / Enter / メッセージをタップ");
    } else {
      const hasPendingLevelUp = snapshot.state === "VICTORY" && this.victoryPageIndex < this.victoryPages.length - 1;
      this.commandText.setText(hasPendingLevelUp ? "▶ つづける" : snapshot.state === "VICTORY" || snapshot.state === "ESCAPED" ? (this.eventData ? "▶ もどる" : "▶ もういちど") : "▶ つづける");
    }
  }
}
