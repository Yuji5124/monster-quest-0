import Phaser from "phaser";
import { BATTLE_BIG_HIT_EFFECT, BATTLE_COMMAND_LABELS, BATTLE_SLASH_EFFECT_TIMING, DEV_BATTLE_COMMANDS, DEV_BATTLE_EVENT_FADE_MS, DEV_BATTLE_PLAYER, DEV_BATTLE_UI_LAYOUT, getBattleSlashAngles, getBattleStatusWindows, readDevBattleMonsterId } from "../config/battle.ts";
import { DISPLAY } from "../config/display.ts";
import { getDevBattleMonster } from "../data/monsters.ts";
import type { BattleSceneStartData } from "../events/BattleEventData.ts";
import { BattleSystem } from "../battle/BattleSystem.ts";
import type { BattleCombatant, BattleCombatantDefinition, BattleHitTier, BattleSnapshot } from "../battle/BattleSystem.ts";
import { buildDebugParty, buildPartyCombatant } from "../battle/PartyCombatants.ts";
import { DEBUG_PARTY_LEVEL, isDebugMode } from "../config/debugMode.ts";
import { ITEM_DEFINITIONS } from "../data/items.ts";
import type { InventorySlot } from "../systems/Inventory.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { characterProgression, formatStatGainEntries } from "../systems/CharacterProgression.ts";
import type { CharacterLevelUp } from "../systems/CharacterProgression.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { inventory } from "../systems/Inventory.ts";
import { partySystem } from "../systems/PartySystem.ts";
import { DemasBossController } from "../battle/DemasBossController.ts";
import { DEMAS_BATTLE_PARTY_IDS, DEMAS_BATTLE_PRESENTATION } from "../data/demasBattlePresentation.ts";

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
  private vitalsSaved = false;
  /** 勝利メッセージの後に送るレベルアップ／能力増加／魔法習得ページ。 */
  private victoryPages: VictoryPage[] = [];
  /** -1 = まだ勝利メッセージを表示中。 */
  private victoryPageIndex = -1;
  /** 固有の撃破演出が完了するまでイベントマップへの復帰を待つ。 */
  private victoryReadyAt = 0;
  private victoryPresentation: "fortress-stop" | undefined;
  private levelUpEffectObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly gameState = new GameStateRepository();
  /** Optional image layer so Demas can bend only its battlefield, never the HUD. */
  private battleBackground: Phaser.GameObjects.Image | undefined;
  /** Disposable renderer-only boss presentation. BattleSystem remains the source of truth. */
  private demasController: DemasBossController | undefined;
  /** Daidain owns the camera briefly so confirm input cannot skip its telegraph or reflection. */
  private presentationLocked = false;

  constructor() { super("BattleScene"); }

  preload(): void {
    const data = this.sys.settings.data as Partial<BattleSceneStartData>;
    const enemy = getDevBattleMonster(data.mode === "event" ? data.monsterId ?? null : readDevBattleMonsterId(window.location.search));
    if (!enemy) return;
    // Per-enemy keys prevent the previous NPC's portrait appearing in a later battle.
    const key = `battle.monster.${enemy.id}`;
    if (!this.textures.exists(key)) this.load.image(key, enemy.portraitUrl);
    if (enemy.battleSpriteSheet && !this.textures.exists(enemy.battleSpriteSheet.key)) {
      this.load.spritesheet(enemy.battleSpriteSheet.key, enemy.battleSpriteSheet.url, {
        frameWidth: enemy.battleSpriteSheet.frameWidth,
        frameHeight: enemy.battleSpriteSheet.frameHeight,
      });
    }
    if (enemy.background && !this.textures.exists(enemy.background.key)) this.load.image(enemy.background.key, enemy.background.url);
  }

  create(data?: BattleSceneStartData): void {
    this.demasController?.dispose();
    this.demasController = undefined;
    this.presentationLocked = false;
    this.battle = undefined;
    this.transitioning = false;
    this.rewardGranted = false;
    this.vitalsSaved = false;
    this.victoryPages = [];
    this.victoryPageIndex = -1;
    this.victoryReadyAt = 0;
    this.victoryPresentation = undefined;
    this.levelUpEffectObjects = [];
    this.commandIndex = 0;
    this.magicMenu = false;
    this.magicIndex = 0;
    this.itemMenu = false;
    this.itemIndex = 0;
    this.statusTexts = [];
    this.statusWindows = [];
    this.battleBackground = undefined;
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
    this.victoryPresentation = enemy.victoryPresentation;
    // デーマス本戦は主人公・タロサ・ミレイの3人固定。開発クエリだけは、実セーブを
    // 汚さずMirrorを確認できるTEMP_TEST_VALUEの同じ3人編成を使う。
    const directDemasTest = !this.eventData && enemy.id === "demas";
    // DEBUG_MODEは敵・入口を問わず、加入状況もセーブも見ずに3人Lv30の編成で始める(戦闘のみ参加)。
    const party = isDebugMode()
      ? buildDebugParty()
      : directDemasTest
        ? enemy.devParty ?? enemy.devPlayer ?? this.buildLivePartyCombatants()
        : enemy.id === "demas"
          ? this.buildDemasPartyCombatants(enemy.devParty)
          : enemy.devPlayer ?? this.buildLivePartyCombatants();
    this.battle = new BattleSystem(party, enemy);
    this.cameras.main.setBackgroundColor(0x101526);
    this.battleBackground = this.createBackground(enemy.background, enemy.backgroundTheme);
    const key = `battle.monster.${enemy.id}`;
    this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const layout = DEV_BATTLE_UI_LAYOUT;
    const scale = enemy.display?.scale ?? 1;
    const enemyY = layout.enemy.y + (enemy.display?.offsetY ?? 0) * DISPLAY.height;
    const animatedSheet = enemy.battleSpriteSheet && this.textures.exists(enemy.battleSpriteSheet.key)
      ? enemy.battleSpriteSheet
      : undefined;
    const animatedDemas = animatedSheet ? this.add.sprite(layout.enemy.x, enemyY, animatedSheet.key, 0).setDepth(1) : undefined;
    this.portrait = animatedDemas ?? this.add.image(layout.enemy.x, enemyY, key).setDepth(1);
    this.portrait.setScale(Math.min(layout.enemy.maxWidth * scale / this.portrait.width, layout.enemy.maxHeight * scale / this.portrait.height, 1));
    // 全ての敵に共通する接地影。画像固有の描き足しを避け、透明ポートレートでも背景から浮かないようにする。
    this.groundShadow = this.createGroundShadow(this.portrait);
    this.portraitOriginX = this.portrait.x;
    if (animatedDemas && animatedSheet) this.demasController = new DemasBossController(this, animatedDemas, this.groundShadow, animatedSheet.key, this.battleBackground);

    const style: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: "monospace", fontSize: `${layout.fontSize}px`, color: TEXT_COLOR, lineSpacing: 5 };
    for (const bounds of getBattleStatusWindows(this.battle.getSnapshot().party.length)) {
      this.statusWindows.push(this.createWindow(bounds));
      this.statusTexts.push(this.add.text(bounds.x + layout.padding, bounds.y + layout.padding, "", style).setDepth(11));
    }
    this.createWindow(layout.commandWindow);
    this.createWindow(layout.messageWindow);
    // 状態窓にはレベルが出ないため、DEBUG_MODE中だけ編成が固定であることを小さく示す(本番ビルドには出ない)。
    if (isDebugMode()) {
      const bounds = layout.statusWindow;
      this.add.text(bounds.x, bounds.y + bounds.height + 2, `DEBUG　ぜんいんLv${DEBUG_PARTY_LEVEL}`, {
        ...style, fontSize: `${layout.fontSize * 0.85}px`, color: "#ffd75e", stroke: "#05070b", strokeThickness: 4,
      }).setDepth(11);
    }
    this.commandText =this.add.text(layout.commandWindow.x + layout.padding, layout.commandWindow.y + layout.padding, "", {
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
      this.demasController?.dispose();
      this.demasController = undefined;
      this.presentationLocked = false;
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
    // ?battleTest単体確認はセーブを読まない(characterProgressionがrepository無し)ため、全快・自動装備になる。
    return members.map((member) => buildPartyCombatant(
      member.id,
      characterProgression.getStats(member.id).level,
      undefined,
      characterProgression.getLiveState(member.id),
    ));
  }

  /**
   * Authored Demas party order. The story path has already introduced all three
   * members; the temporary in-town debug event falls back to the same 3-person
   * query fixture until that progression is present.
   */
  private buildDemasPartyCombatants(fallback?: readonly BattleCombatantDefinition[]) {
    if (!DEMAS_BATTLE_PARTY_IDS.every((memberId) => partySystem.hasMember(memberId))) {
      return fallback ?? this.buildLivePartyCombatants();
    }
    return DEMAS_BATTLE_PARTY_IDS.map((memberId) => buildPartyCombatant(
      memberId,
      characterProgression.getStats(memberId).level,
      undefined,
      characterProgression.getLiveState(memberId),
    ));
  }

  update(): void {
    if (!this.battle || this.transitioning) return;
    if (this.presentationLocked) {
      this.actions.consumePressed("confirm");
      this.actions.consumePressed("cancel");
      this.actions.consumePressed("moveUp");
      this.actions.consumePressed("moveDown");
      return;
    }
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
    if (!this.battle || this.transitioning || this.presentationLocked) return;
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
    if (before.state === "VICTORY" && this.victoryPageIndex >= this.victoryPages.length - 1 && this.time.now < this.victoryReadyAt) {
      this.hintText.setText("砦の　いしが　くずれていく……");
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
    // 通常攻撃(コマンド「こうげき」/ まほう一覧の「こうげき」)が実行されたら斬撃を重ねる。
    const isPhysicalAttack = command === "fight" && !magic && !item || magic?.kind === "attack";
    if (before.state === "COMMAND" && after.state !== "COMMAND" && isPhysicalAttack) {
      this.playSlashEffect(actor.id, actor.weaponAction?.hitCount ?? 1, after.lastHitTier);
    }
    this.grantVictoryReward(after);
    this.savePartyVitals(after);
    const deferRenderUntilDaidainEnds = this.applyVisualFeedback(before, after);
    if (!deferRenderUntilDaidainEnds) this.render();
  }

  /**
   * 戦闘の結果HP/MPを持ち越す(やどやで回復する前提)。勝利・逃走はその時点の値を保存する。
   * 全滅時の正式なペナルティ・復帰地点はBATTLE_SPEC.md §7でTBDのため、従来どおり全快へ戻して
   * 「もういちど」／マップ復帰で詰まないようにする。?battleTest単体確認はセーブへ触れない。
   */
  private savePartyVitals(snapshot: BattleSnapshot): void {
    // DEBUG_MODEの編成は毎回Lv30・全快で始まる固定値のため、セーブのHP/MPへ触れない。
    if (this.vitalsSaved || !this.eventData || isDebugMode()) return;
    if (snapshot.state === "VICTORY" || snapshot.state === "ESCAPED") {
      this.vitalsSaved = true;
      // A development shortcut may render the three-person fixture before the
      // companions have joined. Do not write those temporary vitals into saves.
      characterProgression.saveVitals(snapshot.party.filter((member) => partySystem.hasMember(member.id)));
    } else if (snapshot.state === "DEFEAT") {
      this.vitalsSaved = true;
      characterProgression.restoreVitals();
    }
  }

  /** Event battles write their reward once; standalone ?battleTest visual QA never touches a player's save. */
  private grantVictoryReward(snapshot: BattleSnapshot): void {
    if (this.rewardGranted || !this.eventData || snapshot.state !== "VICTORY" || !snapshot.reward) return;
    this.rewardGranted = true;
    // DEBUG_MODEの編成はLv30固定(成長上限Lv25の外側)。実セーブのEXPを進めず、レベルアップ表示も出さない。
    const levelUps = isDebugMode() ? [] : characterProgression.awardExperience(partySystem.getPartyOrder(), snapshot.reward.experience).levelUps;
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

  /**
   * 味方の攻撃時の斬撃: 敵ポートレートの中心を横切る細い刃の光が一瞬で伸び、白い閃光と
   * 火花を残して消える。多段攻撃はhitCountぶん時間差で交差させる。
   * だいヒット/とくだいヒットでは刃を大きく金色に光らせ、交差斬撃・画面の揺れ・閃光・
   * ヒットストップ・「だいヒット！」の文字を足して大げさにする。
   */
  private playSlashEffect(memberId: string, hitCount: number, hitTier: BattleHitTier = "normal"): void {
    const { style, anglesDeg } = getBattleSlashAngles(memberId, hitCount);
    const big = hitTier !== "normal";
    const bigHit = BATTLE_BIG_HIT_EFFECT;
    const durationScale = big ? bigHit.durationScale : 1;
    const drawMs = BATTLE_SLASH_EFFECT_TIMING.drawMs * durationScale;
    const fadeMs = BATTLE_SLASH_EFFECT_TIMING.fadeMs * durationScale;
    const centerX = this.portraitOriginX;
    const centerY = this.portrait.y;
    const baseLength = Math.max(this.portrait.displayWidth, this.portrait.displayHeight) * 1.1;
    const length = baseLength * (big ? bigHit.lengthScale : 1);
    const thickness = Math.max(6, baseLength * 0.07) * (big ? bigHit.thicknessScale : 1);
    const sparkCount = big ? bigHit.sparkCount : 6;
    // だいヒットは各撃に交差斬撃を足す(2本目以降は少し遅らせてX字に重ねる)。
    const slashes = anglesDeg.flatMap((angleDeg, index) => [
      { angleDeg, delay: index * BATTLE_SLASH_EFFECT_TIMING.hitIntervalMs },
      ...(big ? Array.from({ length: bigHit.extraSlashes }, (_, extra) => ({
        angleDeg: -angleDeg + (extra % 2 === 0 ? 8 : -8),
        delay: index * BATTLE_SLASH_EFFECT_TIMING.hitIntervalMs + drawMs * 0.6 * (extra + 1),
      })) : []),
    ]);
    if (big) this.playBigHitImpact(hitTier, drawMs);
    for (const { angleDeg, delay } of slashes) {
      this.time.delayedCall(delay, () => {
        const blade = this.add.graphics({ x: centerX, y: centerY }).setDepth(5).setAngle(angleDeg);
        // 両端が尖ったレンズ形。外側の光と芯を重ねる。
        const drawLens = (width: number, color: number, alpha: number): void => {
          blade.fillStyle(color, alpha);
          blade.fillPoints([
            new Phaser.Math.Vector2(-length / 2, 0),
            new Phaser.Math.Vector2(-length / 6, -width / 2),
            new Phaser.Math.Vector2(length / 6, -width / 2),
            new Phaser.Math.Vector2(length / 2, 0),
            new Phaser.Math.Vector2(length / 6, width / 2),
            new Phaser.Math.Vector2(-length / 6, width / 2),
          ], true);
        };
        if (big) drawLens(thickness * 3.2, bigHit.auraColor, 0.35);
        drawLens(thickness * 2.2, style.glowColor, 0.45);
        drawLens(thickness, style.coreColor, 1);
        blade.setScale(0.05, 1);
        this.tweens.add({
          targets: blade,
          scaleX: 1,
          duration: drawMs,
          ease: "Cubic.easeOut",
          onComplete: () => this.tweens.add({
            targets: blade, alpha: 0, scaleY: 0.2, duration: fadeMs, ease: "Quad.easeIn", delay: big ? bigHit.hitStopMs : 0, onComplete: () => blade.destroy(),
          }),
        });
        const flash = this.add.circle(centerX, centerY, thickness * 1.2, 0xffffff, 0.6).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: flash, scale: big ? 2.6 : 1.8, alpha: 0, duration: drawMs + fadeMs * 0.6, onComplete: () => flash.destroy() });
        const radians = Phaser.Math.DegToRad(angleDeg);
        for (let spark = 0; spark < sparkCount; spark += 1) {
          const along = (spark / (sparkCount - 1) - 0.5) * length * 0.8;
          const sparkX = centerX + Math.cos(radians) * along;
          const sparkY = centerY + Math.sin(radians) * along;
          const side = spark % 2 === 0 ? 1 : -1;
          const reach = thickness * (big ? 2 + (spark % 3) : 3);
          const color = big && spark % 3 === 0 ? bigHit.auraColor : style.glowColor;
          const dot = this.add.rectangle(sparkX, sparkY, thickness * 0.5, thickness * 0.5, color).setDepth(5).setAngle(45);
          this.tweens.add({
            targets: dot,
            x: sparkX - Math.sin(radians) * reach * side,
            y: sparkY + Math.cos(radians) * reach * side,
            alpha: 0,
            scale: 0.2,
            duration: fadeMs + 80,
            delay: drawMs * 0.5,
            onComplete: () => dot.destroy(),
          });
        }
      });
    }
  }

  /** だいヒットの画面全体の演出: 白い閃光・画面の揺れ・中央に弾んで出る「だいヒット！」。 */
  private playBigHitImpact(hitTier: BattleHitTier, drawMs: number): void {
    const bigHit = BATTLE_BIG_HIT_EFFECT;
    this.time.delayedCall(drawMs, () => {
      this.cameras.main.flash(bigHit.flashMs, 255, 250, 225);
      this.cameras.main.shake(bigHit.shakeMs, bigHit.shakeIntensity);
    });
    const layout = DEV_BATTLE_UI_LAYOUT;
    const bannerY = layout.enemy.y - layout.enemy.maxHeight * 0.55;
    const banner = this.add.text(DISPLAY.width / 2, bannerY, hitTier === "tokudai" ? "とくだいヒット！！" : "だいヒット！", {
      fontFamily: "monospace", fontSize: `${Math.round(layout.fontSize * 2.2)}px`, fontStyle: "bold",
      color: "#fff3b0", stroke: "#8a2a00", strokeThickness: 8,
    }).setOrigin(0.5).setDepth(20).setScale(2.2).setAlpha(0).setAngle(-6);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, angle: 0, duration: 180, delay: drawMs, ease: "Back.easeOut" });
    this.tweens.add({
      targets: banner, alpha: 0, y: bannerY - 10, duration: 260, delay: drawMs + bigHit.bannerMs, onComplete: () => banner.destroy(),
    });
  }

  private createBackground(background?: { readonly key: string; readonly url: string }, theme?: "fortress"): Phaser.GameObjects.Image | undefined {
    if (theme === "fortress") {
      const stone = this.add.graphics().setDepth(0);
      stone.fillStyle(0x17141a, 1);
      stone.fillRect(0, 0, DISPLAY.width, DISPLAY.height);
      stone.fillStyle(0x2a252c, 1);
      stone.fillRect(0, DISPLAY.height * 0.56, DISPLAY.width, DISPLAY.height * 0.44);
      for (let row = 0; row < 5; row += 1) for (let column = 0; column < 11; column += 1) {
        const x = column * (DISPLAY.width / 10) - (row % 2) * 18;
        const y = DISPLAY.height * 0.56 + row * 32;
        stone.lineStyle(2, 0x494049, 0.75);
        stone.strokeRect(x, y, DISPLAY.width / 10 - 2, 30);
      }
      stone.fillStyle(0x5b1f2a, 0.72);
      stone.fillRect(0, 0, DISPLAY.width, 9);
      stone.fillStyle(0x54c86b, 0.16);
      stone.fillEllipse(DISPLAY.width * 0.5, DISPLAY.height * 0.7, DISPLAY.width * 0.72, DISPLAY.height * 0.24);
      return undefined;
    }
    if (background && this.textures.exists(background.key)) {
      this.textures.get(background.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const image = this.add.image(DISPLAY.width / 2, DISPLAY.height / 2, background.key).setDepth(0);
      image.setScale(Math.max(DISPLAY.width / image.width, DISPLAY.height / image.height));
      return image;
    }
    // Existing normal-enemy DEV background, also a safe image-load fallback.
    this.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, 0x1e3154);
    this.add.rectangle(DISPLAY.width / 2, DISPLAY.height * 0.65, DISPLAY.width, DISPLAY.height * 0.35, 0x243b31);
    return undefined;
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

  /**
   * Presentation follows the resolved action trace; it does not alter damage, turn order, or Mirror charges.
   * Returning true means Daidain owns the camera briefly, so render/input resume at sequence completion.
   */
  private applyVisualFeedback(before: BattleSnapshot, after: BattleSnapshot): boolean {
    const action = after.lastAction;
    const enemyAction = action?.casterId === after.enemy.id ? action : undefined;
    const isDaidain = enemyAction?.actionId === "magic_daidain";
    if (isDaidain && this.demasController) {
      this.presentationLocked = true;
      this.demasController.playDaidain({
        reflected: enemyAction.reflected,
        weak: this.isDemasWeak(after),
        onPartyImpact: () => this.flashPartyDamage(),
        onComplete: () => {
          this.presentationLocked = false;
          if (!this.transitioning) this.render();
        },
      });
      return true;
    }

    if (after.enemy.hp < before.enemy.hp) {
      if (this.demasController) this.demasController.playDamage(this.isDemasWeak(after));
      else {
        this.tweens.killTweensOf(this.portrait);
        this.portrait.setX(this.portraitOriginX).setAlpha(1);
        this.tweens.add({ targets: this.portrait, x: this.portraitOriginX + 8, alpha: 0.35, duration: 55, yoyo: true, repeat: 2 });
      }
    }
    if (!before.enemy.status.poisoned && after.enemy.status.poisoned) {
      this.cameras.main.flash(180, 88, 220, 116);
      this.cameras.main.shake(190, 0.008);
      this.portrait.setTint(0x82df8e);
      this.time.delayedCall(520, () => this.portrait.clearTint());
    }
    if (after.party.some((member, i) => member.hp < (before.party[i]?.hp ?? member.hp))) this.flashPartyDamage();

    if (this.demasController && enemyAction?.kind === "attack") this.demasController.playNormalAttack(this.isDemasWeak(after));
    if (this.demasController && enemyAction?.kind === "mirror") this.demasController.playMirrorCast(this.isDemasWeak(after));

    if (after.state === "VICTORY") {
      this.demasController?.dispose();
      this.demasController = undefined;
      this.tweens.killTweensOf([this.portrait, this.groundShadow]);
      if (this.victoryPresentation === "fortress-stop") {
        const dissolveMs = 1450;
        this.victoryReadyAt = this.time.now + dissolveMs;
        const collapseFlash = this.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, 0xb5d8bb, 0)
          .setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
        this.cameras.main.shake(320, 0.012);
        this.portrait.setTint(0x9ddf9a);
        this.tweens.add({ targets: collapseFlash, alpha: 0.48, duration: 120, yoyo: true, repeat: 2, onComplete: () => collapseFlash.destroy() });
        this.tweens.add({
          targets: [this.portrait, this.groundShadow], alpha: 0, duration: dissolveMs, ease: "Quad.easeIn",
          onComplete: () => this.portrait.clearTint(),
        });
      } else {
        this.tweens.add({ targets: [this.portrait, this.groundShadow], alpha: 0, duration: 160 });
      }
    }
    return false;
  }

  private flashPartyDamage(): void {
    this.tweens.killTweensOf(this.statusWindows);
    this.statusWindows.forEach(window => window.setAlpha(1));
    this.tweens.add({ targets: this.statusWindows, alpha: 0.35, duration: 70, yoyo: true, repeat: 1 });
  }

  private isDemasWeak(snapshot: BattleSnapshot): boolean {
    return snapshot.enemy.id === "demas" && snapshot.enemy.hp / snapshot.enemy.maxHp <= DEMAS_BATTLE_PRESENTATION.weakHpRatio;
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
        ...(hasExactReturnPosition ? { spawnX: event.returnSpawnX, spawnY: event.returnSpawnY, spawnFacing: event.returnFacing, floor: event.returnFloor, spawnYaw: event.returnYaw } : {}),
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
