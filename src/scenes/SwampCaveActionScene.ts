import Phaser from "phaser";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { SWAMP_CAVE_ACTION } from "../config/swampCaveAction.ts";
import type { SwampCaveAbilityId, SwampCavePoint } from "../config/swampCaveAction.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { idleFrame } from "../config/characterWalkSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite, walkAnimKey } from "../systems/CharacterWalkSprite.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { Inventory, inventory } from "../systems/Inventory.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import {
  advanceSwampCaveActionRun,
  areAllSwampCaveEnemiesDefeated,
  canOpenSwampCaveChest,
  createSwampCaveActionRun,
  openSwampCaveChest,
  restoreSwampCaveActionRun,
  useSwampCaveAbility,
} from "../systems/SwampCaveActionRun.ts";
import type { SwampCaveActionRun } from "../systems/SwampCaveActionRun.ts";
import type { Facing } from "../systems/PlayerMovement.ts";

const DEPTH = { background: 0, terrain: 4, shadow: 20, enemy: 40, actor: 70, effect: 100, worldHint: 120, hud: 200, touch: 230 } as const;
const ENEMY_TEXTURE_KEY = "swamp-cave-small-enemy";

type TouchDirection = "up" | "down" | "left" | "right" | null;

interface EnemyVisual {
  readonly body: Phaser.GameObjects.Image;
  readonly hp: Phaser.GameObjects.Graphics;
}

/**
 * No.17「ぬまちのどうくつ」の短い三人アクション区画。
 * ルールは SwampCaveActionRun に置き、この Scene は入力・描画・遷移だけを担当する。
 */
export class SwampCaveActionScene extends Phaser.Scene {
  private actions!: InputSystem;
  private run!: SwampCaveActionRun;
  private readonly gameState = new GameStateRepository();
  private caveInventory: Inventory = inventory;
  private hero!: Phaser.GameObjects.Sprite;
  private tarosa!: Phaser.GameObjects.Sprite;
  private mirei!: Phaser.GameObjects.Sprite;
  private heroShadow!: Phaser.GameObjects.Ellipse;
  private tarosaShadow!: Phaser.GameObjects.Ellipse;
  private mireiShadow!: Phaser.GameObjects.Ellipse;
  private chest!: Phaser.GameObjects.Container;
  private exitGlow!: Phaser.GameObjects.Arc;
  private readonly enemyVisuals = new Map<string, EnemyVisual>();
  private enduranceText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private terrainText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private touchDirection: TouchDirection = null;
  private facing: Facing = "up";
  private recovering = false;
  private transitioning = false;
  private showedChestHint = false;
  private isDevMapTest = false;
  private heroHurtUntil = 0;

  constructor() {
    super({ key: SWAMP_CAVE_ACTION.sceneKey });
  }

  preload(): void {
    if (!this.textures.exists(SWAMP_CAVE_ACTION.backgroundKey)) this.load.image(SWAMP_CAVE_ACTION.backgroundKey, SWAMP_CAVE_ACTION.backgroundPath);
    preloadWalkSprite(this, PROTAGONIST_SPRITE);
    preloadWalkSprite(this, TAROSA_SPRITE);
    preloadWalkSprite(this, MIREI_SPRITE);
  }

  create(): void {
    this.isDevMapTest = import.meta.env.DEV && new URLSearchParams(window.location.search).get("mapTest") === "swamp-cave";
    this.cameras.main.setBackgroundColor("#07131a");
    this.textures.get(SWAMP_CAVE_ACTION.backgroundKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.add.image(0, 0, SWAMP_CAVE_ACTION.backgroundKey).setOrigin(0).setDepth(DEPTH.background);
    this.createTerrainHints();
    this.createEnemyTexture();
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    ensureWalkAnimations(this, TAROSA_SPRITE);
    ensureWalkAnimations(this, MIREI_SPRITE);

    this.run = createSwampCaveActionRun();
    if (!this.isDevMapTest) {
      restoreSwampCaveActionRun(this.run, {
        cleared: this.gameState.hasFlag(SWAMP_CAVE_ACTION.flags.cleared),
        chestOpened: this.gameState.hasFlag(SWAMP_CAVE_ACTION.flags.chestOpened),
      });
    } else {
      this.caveInventory = new Inventory();
    }

    this.createParty();
    this.createEnemies();
    this.createTreasureAndExit();
    this.createHud();

    this.actions = new InputSystem(window, document);
    if (this.sys.game.device.input.touch) this.createTouchControls();
    this.cameras.main.setBounds(0, 0, SWAMP_CAVE_ACTION.world.width, SWAMP_CAVE_ACTION.world.height);
    this.cameras.main.setZoom(0.92);
    this.cameras.main.roundPixels = true;
    this.cameras.main.startFollow(this.hero, true, 1, 1);
    this.cameras.main.setDeadzone(200, 170);
    this.placeParty(false);
    this.refreshEnemyVisuals(0);
    this.refreshHud();
    this.setMessage(this.run.chestOpened ? "出口の光へ向かおう。" : "小さな魔物が群れている。三人の特技を使い分けよう。");
    this.cameras.main.fadeIn(220, 0, 0, 0);

    const cleanup = (): void => {
      this.actions.destroy();
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  update(time: number, delta: number): void {
    if (this.transitioning || this.recovering) return;
    this.handleActions(time);
    this.moveParty(delta);
    const advance = advanceSwampCaveActionRun(this.run, this.hero, time, delta);
    if (advance.contactDamage) this.presentDamage(time);
    this.refreshEnemyVisuals(time);
    this.refreshHud();

    if (this.run.endurance === 0) this.restartAfterDefeat();
    if (areAllSwampCaveEnemiesDefeated(this.run) && !this.showedChestHint && !this.run.chestOpened) {
      this.showedChestHint = true;
      this.setMessage("群れを退けた！　中央の宝箱を調べよう。", "#fff2a6");
    }
  }

  private createTerrainHints(): void {
    const graphics = this.add.graphics().setDepth(DEPTH.terrain);
    for (const zone of SWAMP_CAVE_ACTION.terrain.swamp) {
      graphics.fillStyle(0x163a3b, 0.12).fillRoundedRect(zone.x, zone.y, zone.width, zone.height, 26);
    }
    for (const zone of SWAMP_CAVE_ACTION.terrain.fast) {
      graphics.lineStyle(2, 0xc1df9d, 0.22).strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, 18);
    }
    // 背景上の橋・高台を補助する根道。見た目だけで、地形の速さはconfigの矩形で判定する。
    graphics.lineStyle(13, 0x4e3822, 0.3).lineBetween(758, 752, 790, 586).lineBetween(926, 548, 1040, 396);
    graphics.lineStyle(4, 0x9d7d48, 0.36).lineBetween(758, 752, 790, 586).lineBetween(926, 548, 1040, 396);
  }

  private createEnemyTexture(): void {
    if (this.textures.exists(ENEMY_TEXTURE_KEY)) return;
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x4b263d).fillCircle(16, 16, 14);
    graphics.fillStyle(0xb46283).fillCircle(12, 13, 4).fillCircle(20, 13, 4);
    graphics.fillStyle(0xfff2c8).fillCircle(12, 13, 1.5).fillCircle(20, 13, 1.5);
    graphics.lineStyle(2, 0x260f22).lineBetween(8, 23, 16, 27).lineBetween(16, 27, 24, 23);
    graphics.generateTexture(ENEMY_TEXTURE_KEY, 32, 32);
    graphics.destroy();
  }

  private createParty(): void {
    const start = SWAMP_CAVE_ACTION.playerStart;
    this.heroShadow = this.add.ellipse(start.x, start.y + 22, 34, 11, 0x031015, 0.42).setDepth(DEPTH.shadow);
    this.tarosaShadow = this.add.ellipse(start.x - 28, start.y + 44, 28, 9, 0x031015, 0.4).setDepth(DEPTH.shadow);
    this.mireiShadow = this.add.ellipse(start.x + 28, start.y + 44, 30, 9, 0x031015, 0.4).setDepth(DEPTH.shadow);
    this.hero = this.add.sprite(start.x, start.y, PROTAGONIST_SPRITE.key, idleFrame(this.facing)).setOrigin(0.5, 0.86).setDepth(DEPTH.actor);
    this.tarosa = this.add.sprite(start.x - 28, start.y + 30, TAROSA_SPRITE.key, idleFrame(this.facing)).setOrigin(0.5, 0.86).setDepth(DEPTH.actor - 1);
    this.mirei = this.add.sprite(start.x + 28, start.y + 30, MIREI_SPRITE.key, idleFrame(this.facing)).setOrigin(0.5, 0.86).setDepth(DEPTH.actor - 1);
  }

  private createEnemies(): void {
    for (const enemy of this.run.enemies) {
      const body = this.add.image(enemy.x, enemy.y, ENEMY_TEXTURE_KEY).setDepth(DEPTH.enemy).setScale(0.9);
      const hp = this.add.graphics().setDepth(DEPTH.enemy + 1);
      this.enemyVisuals.set(enemy.id, { body, hp });
    }
  }

  private createTreasureAndExit(): void {
    const { chest, exit } = SWAMP_CAVE_ACTION;
    const glow = this.add.circle(chest.x, chest.y, 42, 0xffd76b, 0.12).setDepth(DEPTH.terrain + 1);
    const box = this.add.rectangle(chest.x, chest.y, 34, 25, 0x875024).setStrokeStyle(3, 0xf0c86b).setDepth(DEPTH.enemy);
    const lid = this.add.rectangle(chest.x, chest.y - 11, 39, 8, 0xa6682d).setStrokeStyle(2, 0xffd984).setDepth(DEPTH.enemy + 1);
    const lock = this.add.rectangle(chest.x, chest.y + 1, 6, 8, 0xffdc6b).setDepth(DEPTH.enemy + 2);
    this.chest = this.add.container(0, 0, [glow, box, lid, lock]);
    this.chest.setVisible(!this.run.chestOpened);
    this.tweens.add({ targets: glow, alpha: { from: 0.08, to: 0.3 }, scale: { from: 0.9, to: 1.1 }, yoyo: true, repeat: -1, duration: 800 });

    this.exitGlow = this.add.circle(exit.x, exit.y, 34, 0x91eddf, 0.1).setStrokeStyle(2, 0xbfffe8, 0.65).setDepth(DEPTH.terrain + 2);
    this.exitGlow.setVisible(this.run.chestOpened);
    this.tweens.add({ targets: this.exitGlow, alpha: { from: 0.12, to: 0.58 }, scale: { from: 0.88, to: 1.18 }, yoyo: true, repeat: -1, duration: 900 });
  }

  private createHud(): void {
    const panel = this.add.rectangle(480, 42, 940, 76, 0x071018, 0.84).setStrokeStyle(1, 0x9ac5bf, 0.7).setDepth(DEPTH.hud).setScrollFactor(0);
    this.enduranceText = this.add.text(22, 15, "", { color: "#ffe4d8", fontFamily: "monospace", fontSize: "19px", stroke: "#071018", strokeThickness: 4 }).setDepth(DEPTH.hud + 1).setScrollFactor(0);
    this.progressText = this.add.text(22, 43, "", { color: "#d8f5ed", fontFamily: "monospace", fontSize: "16px", stroke: "#071018", strokeThickness: 4 }).setDepth(DEPTH.hud + 1).setScrollFactor(0);
    this.terrainText = this.add.text(680, 22, "", { color: "#dff8b9", fontFamily: "monospace", fontSize: "16px", stroke: "#071018", strokeThickness: 4 }).setDepth(DEPTH.hud + 1).setScrollFactor(0);
    this.add.text(480, 82, "Z: 主人公の剣　X: タロサの弓　C: ミレイの足止め魔法", { color: "#eafaff", fontFamily: "monospace", fontSize: "15px", stroke: "#071018", strokeThickness: 4 })
      .setOrigin(0.5, 1).setDepth(DEPTH.hud + 1).setScrollFactor(0);
    this.messageText = this.add.text(480, 684, "", { color: "#ffffff", fontFamily: "monospace", fontSize: "17px", stroke: "#071018", strokeThickness: 4, wordWrap: { width: 600 }, align: "center" })
      .setOrigin(0.5).setDepth(DEPTH.hud + 1).setScrollFactor(0);
    panel.setData("swamp-cave-hud", true);
  }

  private createTouchControls(): void {
    const directions: readonly [number, number, string, Exclude<TouchDirection, null>][] = [
      [78, 614, "↑", "up"], [40, 654, "←", "left"], [116, 654, "→", "right"], [78, 694, "↓", "down"],
    ];
    for (const [x, y, label, direction] of directions) {
      const button = this.add.circle(x, y, 28, 0x16354a, 0.78).setStrokeStyle(2, 0xc5edf0, 0.75).setDepth(DEPTH.touch).setScrollFactor(0).setInteractive();
      this.add.text(x, y, label, { color: "#ffffff", fontFamily: "monospace", fontSize: "24px" }).setOrigin(0.5).setDepth(DEPTH.touch + 1).setScrollFactor(0);
      button.on("pointerdown", () => { this.touchDirection = direction; });
      button.on("pointerup", () => { if (this.touchDirection === direction) this.touchDirection = null; });
      button.on("pointerout", () => { if (this.touchDirection === direction) this.touchDirection = null; });
    }
    this.createTouchActionButton(744, 654, "剣", 0x5a3024, "hero_sword");
    this.createTouchActionButton(824, 620, "弓", 0x294458, "tarosa_bow");
    this.createTouchActionButton(892, 670, "魔", 0x3d2b5b, "mirei_magic");
    this.input.on(Phaser.Input.Events.POINTER_UP, () => { this.touchDirection = null; });
    this.input.on(Phaser.Input.Events.GAME_OUT, () => { this.touchDirection = null; });
  }

  private createTouchActionButton(x: number, y: number, label: string, color: number, abilityId: SwampCaveAbilityId): void {
    const button = this.add.circle(x, y, 34, color, 0.86).setStrokeStyle(2, 0xf5e7c4, 0.78).setDepth(DEPTH.touch).setScrollFactor(0).setInteractive();
    this.add.text(x, y, label, { color: "#ffffff", fontFamily: "monospace", fontSize: "23px" }).setOrigin(0.5).setDepth(DEPTH.touch + 1).setScrollFactor(0);
    button.on("pointerdown", () => this.tryUseAbility(abilityId, this.time.now));
  }

  private handleActions(time: number): void {
    if (this.actions.consumePressed("confirm")) {
      if (this.tryOpenChest() || this.tryLeaveCave()) return;
      this.tryUseAbility("hero_sword", time);
    }
    if (this.actions.consumePressed("cancel")) this.tryUseAbility("tarosa_bow", time);
    if (this.actions.consumePressed("menu")) this.tryUseAbility("mirei_magic", time);
  }

  private moveParty(delta: number): void {
    let dx = Number(this.actions.isDown("moveRight")) - Number(this.actions.isDown("moveLeft"));
    let dy = Number(this.actions.isDown("moveDown")) - Number(this.actions.isDown("moveUp"));
    if (this.touchDirection === "left") { dx = -1; dy = 0; }
    if (this.touchDirection === "right") { dx = 1; dy = 0; }
    if (this.touchDirection === "up") { dx = 0; dy = -1; }
    if (this.touchDirection === "down") { dx = 0; dy = 1; }
    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      this.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
      const distance = SWAMP_CAVE_ACTION.player.moveSpeed * this.terrainMultiplier() * Math.min(delta, 50) / 1000;
      this.hero.x = Phaser.Math.Clamp(this.hero.x + dx * distance, 46, SWAMP_CAVE_ACTION.world.width - 46);
      this.hero.y = Phaser.Math.Clamp(this.hero.y + dy * distance, 54, SWAMP_CAVE_ACTION.world.height - 54);
    }
    this.placeParty(moving);
  }

  private placeParty(moving: boolean): void {
    const offsets = this.facing === "up" || this.facing === "down"
      ? { tarosa: { x: -30, y: 34 }, mirei: { x: 30, y: 34 } }
      : { tarosa: { x: -22, y: 38 }, mirei: { x: 26, y: 38 } };
    this.tarosa.setPosition(this.hero.x + offsets.tarosa.x, this.hero.y + offsets.tarosa.y);
    this.mirei.setPosition(this.hero.x + offsets.mirei.x, this.hero.y + offsets.mirei.y);
    this.heroShadow.setPosition(this.hero.x, this.hero.y + 19);
    this.tarosaShadow.setPosition(this.tarosa.x, this.tarosa.y + 19);
    this.mireiShadow.setPosition(this.mirei.x, this.mirei.y + 19);
    this.hero.setDepth(DEPTH.actor + this.hero.y * 0.01);
    this.tarosa.setDepth(DEPTH.actor + this.tarosa.y * 0.01);
    this.mirei.setDepth(DEPTH.actor + this.mirei.y * 0.01);
    const actors: readonly [Phaser.GameObjects.Sprite, typeof PROTAGONIST_SPRITE | typeof TAROSA_SPRITE | typeof MIREI_SPRITE][] = [[this.hero, PROTAGONIST_SPRITE], [this.tarosa, TAROSA_SPRITE], [this.mirei, MIREI_SPRITE]];
    for (const [actor, geometry] of actors) {
      if (moving) actor.play(walkAnimKey(geometry, this.facing), true);
      else { actor.anims.stop(); actor.setFrame(idleFrame(this.facing)); }
    }
  }

  private terrainMultiplier(): number {
    const point = this.hero as unknown as SwampCavePoint;
    const inFast = SWAMP_CAVE_ACTION.terrain.fast.some((zone) => point.x >= zone.x && point.x <= zone.x + zone.width && point.y >= zone.y && point.y <= zone.y + zone.height);
    if (inFast) return SWAMP_CAVE_ACTION.terrain.fastMultiplier;
    const inSwamp = SWAMP_CAVE_ACTION.terrain.swamp.some((zone) => point.x >= zone.x && point.x <= zone.x + zone.width && point.y >= zone.y && point.y <= zone.y + zone.height);
    return inSwamp ? SWAMP_CAVE_ACTION.terrain.swampMultiplier : 1;
  }

  private tryUseAbility(abilityId: SwampCaveAbilityId, time: number): void {
    const result = useSwampCaveAbility(this.run, abilityId, this.hero, time);
    if (!result.valid) {
      this.setMessage(result.reason === "cooldown" ? "まだ特技を使えない。" : "とどく所に小さな魔物がいない。", "#d7e6ef");
      return;
    }
    this.presentAbility(result.abilityId, result.target, result.affectedEnemyIds.length, result.defeatedEnemyIds.length);
    if (result.defeatedEnemyIds.length > 0) this.cameras.main.shake(70, 0.003);
  }

  private presentAbility(abilityId: SwampCaveAbilityId, target: SwampCavePoint, targets: number, defeated: number): void {
    if (abilityId === "hero_sword") {
      const angle = Phaser.Math.Angle.Between(this.hero.x, this.hero.y, target.x, target.y);
      const slash = this.add.graphics().setDepth(DEPTH.effect);
      slash.lineStyle(8, 0xf9f1c0, 0.92).beginPath().arc(this.hero.x, this.hero.y, 74, angle - 0.78, angle + 0.7, false).strokePath();
      slash.lineStyle(2, 0x84e9ff, 0.95).beginPath().arc(this.hero.x, this.hero.y, 86, angle - 0.68, angle + 0.62, false).strokePath();
      this.tweens.add({ targets: slash, alpha: 0, scale: 1.12, duration: 190, onComplete: () => slash.destroy() });
      this.setMessage(defeated > 0 ? "主人公の けんぎ！" : "主人公の けんぎが命中！", "#fff2b5");
    } else if (abilityId === "tarosa_bow") {
      const angle = Phaser.Math.Angle.Between(this.tarosa.x, this.tarosa.y, target.x, target.y);
      const arrow = this.add.rectangle(this.tarosa.x, this.tarosa.y, 30, 4, 0xffe5a5).setStrokeStyle(1, 0x6c4320).setRotation(angle).setDepth(DEPTH.effect);
      this.tweens.add({ targets: arrow, x: target.x, y: target.y, duration: 180, ease: "Quad.easeOut", onComplete: () => arrow.destroy() });
      this.setMessage("タロサの 遠距離射撃！", "#c7edff");
    } else {
      const blast = this.add.circle(target.x, target.y, 18, 0x8fdcff, 0.28).setStrokeStyle(4, 0xd1f8ff, 0.9).setDepth(DEPTH.effect);
      this.tweens.add({ targets: blast, scale: 6.5, alpha: 0, duration: 360, onComplete: () => blast.destroy() });
      this.setMessage(`ミレイの足止め魔法！ ${targets}体の動きが鈍った。`, "#d6c9ff");
    }
  }

  private refreshEnemyVisuals(time: number): void {
    for (const enemy of this.run.enemies) {
      const visual = this.enemyVisuals.get(enemy.id);
      if (!visual) continue;
      visual.body.setPosition(enemy.x, enemy.y).setDepth(DEPTH.enemy + enemy.y * 0.01).setVisible(enemy.alive);
      visual.hp.setVisible(enemy.alive).clear();
      if (!enemy.alive) continue;
      const hpWidth = 26;
      visual.hp.fillStyle(0x1a0c18, 0.9).fillRect(enemy.x - hpWidth / 2, enemy.y - 25, hpWidth, 4);
      visual.hp.fillStyle(0x84e8a8, 0.95).fillRect(enemy.x - hpWidth / 2, enemy.y - 25, hpWidth * (enemy.hp / SWAMP_CAVE_ACTION.enemy.maxHp), 4);
      if (enemy.frozenUntil > time) visual.body.setTint(0x8ddcff);
      else if (enemy.hitUntil > time) visual.body.setTint(0xffecb2);
      else visual.body.clearTint();
    }
    this.hero.setAlpha(time < this.heroHurtUntil && Math.floor(time / 90) % 2 === 0 ? 0.4 : 1);
  }

  private presentDamage(time: number): void {
    this.heroHurtUntil = time + SWAMP_CAVE_ACTION.player.hurtInvulnerableMs;
    this.cameras.main.shake(130, 0.008);
    this.cameras.main.flash(80, 180, 72, 86, false);
    this.setMessage("小さな魔物にぶつかった！　ぬまでは足が遅い。", "#ffd2d2");
  }

  private tryOpenChest(): boolean {
    if (!canOpenSwampCaveChest(this.run, this.hero)) return false;
    if (!openSwampCaveChest(this.run, this.hero)) return false;
    this.chest.setVisible(false);
    this.exitGlow.setVisible(true);
    if (!this.isDevMapTest) {
      this.caveInventory.add(SWAMP_CAVE_ACTION.reward.itemId, SWAMP_CAVE_ACTION.reward.quantity);
      this.gameState.setFlag(SWAMP_CAVE_ACTION.flags.cleared);
      this.gameState.setFlag(SWAMP_CAVE_ACTION.flags.chestOpened);
    }
    this.setMessage("奥の宝箱から かいふくやくを 1こ手に入れた！　出口の光へ。", "#fff0a8");
    return true;
  }

  private tryLeaveCave(): boolean {
    if (!this.run.chestOpened || Phaser.Math.Distance.Between(this.hero.x, this.hero.y, SWAMP_CAVE_ACTION.exit.x, SWAMP_CAVE_ACTION.exit.y) > SWAMP_CAVE_ACTION.exit.radius) return false;
    this.transitioning = true;
    beginMapTransition(this, this.actions, "WorldMapScene", { worldMapEntryId: "from_swamp_cave" }, 260);
    return true;
  }

  private restartAfterDefeat(): void {
    this.recovering = true;
    this.setMessage("ぬまに足をとられた……　隊列を立て直そう。", "#ffd0d0");
    this.time.delayedCall(900, () => {
      this.run = createSwampCaveActionRun();
      this.hero.setPosition(SWAMP_CAVE_ACTION.playerStart.x, SWAMP_CAVE_ACTION.playerStart.y);
      this.showedChestHint = false;
      this.recovering = false;
      this.refreshEnemyVisuals(this.time.now);
      this.setMessage("もう一度、橋と高い足場を使って進もう。", "#e9fff6");
    });
  }

  private refreshHud(): void {
    const defeated = this.run.enemies.filter((enemy) => !enemy.alive).length;
    this.enduranceText.setText(`隊列耐久　${"♥".repeat(this.run.endurance)}${"♡".repeat(SWAMP_CAVE_ACTION.player.endurance - this.run.endurance)}`);
    this.progressText.setText(this.run.chestOpened ? "最奥の宝箱：取得済み　出口へ" : `小さな魔物　${defeated}/${this.run.enemies.length}`);
    const multiplier = this.terrainMultiplier();
    this.terrainText.setText(multiplier < 1 ? "ぬま：移動が遅い" : multiplier > 1 ? "高い足場・根道：素早く移動" : "乾いた足場");
  }

  private setMessage(message: string, color = "#ffffff"): void {
    this.messageText?.setText(message).setColor(color);
  }
}
