import Phaser from "phaser";
import {
  MAJIN_CAVE_MONSTER_ANIMATION_SPECS,
  MAJIN_CAVE_MONSTER_FRAME_COUNT,
  MAJIN_CAVE_MONSTER_SPRITE_PROFILES,
  getMajinCaveMonsterSpriteProfile,
  majinCaveMonsterAnimationDurationMs,
  majinCaveMonsterAnimationKey,
} from "../config/majinCaveMonsterSprites.ts";
import type { MajinCaveMonsterAnimationName } from "../config/majinCaveMonsterSprites.ts";
import type { MajinCavePoint } from "../config/majinCave.ts";
import type { MajinCaveEnemyState } from "./MajinCaveRunState.ts";
import type { MajinCaveEnemyDefinition } from "../data/majinCaveEnemies.ts";
import { MAJIN_CAVE_PRESENTATION } from "../config/majinCavePresentation.ts";

const ACTOR_DEPTH = 20;
const ENEMY_MOVE_MS = MAJIN_CAVE_PRESENTATION.movement.playerMs;

interface MonsterVisual {
  readonly object: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container | Phaser.GameObjects.Image;
  readonly sprite?: Phaser.GameObjects.Sprite;
}

export function preloadMajinCaveMonsterSprites(scene: Phaser.Scene): void {
  for (const profile of Object.values(MAJIN_CAVE_MONSTER_SPRITE_PROFILES)) {
    if (!scene.textures.exists(profile.textureKey)) {
      scene.load.spritesheet(profile.textureKey, profile.assetUrl, {
        frameWidth: profile.frameWidth,
        frameHeight: profile.frameHeight,
      });
    }
  }
}

/** AnimationManager is game-global, so repeated cave entry must reuse registered keys. */
export function ensureMajinCaveMonsterAnimations(scene: Phaser.Scene): void {
  for (const profile of Object.values(MAJIN_CAVE_MONSTER_SPRITE_PROFILES)) {
    if (!scene.textures.exists(profile.textureKey)) continue;
    for (const [name, spec] of Object.entries(profile.animationSpecs) as [MajinCaveMonsterAnimationName, typeof MAJIN_CAVE_MONSTER_ANIMATION_SPECS[MajinCaveMonsterAnimationName]][]) {
      const key = majinCaveMonsterAnimationKey(profile, name);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(profile.textureKey, { frames: [...spec.frames] }),
        frameRate: spec.frameRate,
        repeat: spec.repeat,
      });
    }
  }
}

/** DEV-only validation: warnings aid import debugging but never crash a production run. */
export function validateMajinCaveMonsterSprites(scene: Phaser.Scene): readonly string[] {
  const warnings: string[] = [];
  for (const profile of Object.values(MAJIN_CAVE_MONSTER_SPRITE_PROFILES)) {
    const texture = scene.textures.get(profile.textureKey);
    const source = texture?.getSourceImage() as { width?: number; height?: number } | undefined;
    const expectedWidth = profile.frameWidth * 4;
    const expectedHeight = profile.frameHeight * 4;
    if (!source || source.width !== expectedWidth || source.height !== expectedHeight) {
      warnings.push(`${profile.monsterId}: expected RGBA ${expectedWidth}x${expectedHeight} source, received ${source?.width ?? "missing"}x${source?.height ?? "missing"}`);
      continue;
    }
    for (let frame = 0; frame < MAJIN_CAVE_MONSTER_FRAME_COUNT; frame += 1) {
      const textureFrame = texture.get(frame);
      if (!textureFrame || textureFrame.width !== profile.frameWidth || textureFrame.height !== profile.frameHeight) {
        warnings.push(`${profile.monsterId}: missing or invalid ${profile.frameWidth}x${profile.frameHeight} frame ${frame}`);
        break;
      }
    }
  }
  for (const warning of warnings) console.warn(`[DEV_MAJIN_CAVE] sprite validation: ${warning}`);
  return warnings;
}

/**
 * Disposable renderer-facing state. It deliberately never enters MajinCaveRunState so that
 * logical combat/coordinates are independent from tween and animation lifetimes.
 */
export class MajinCaveMonsterSpriteController {
  private readonly visuals = new Map<string, MonsterVisual>();
  private readonly pendingTimers = new Set<Phaser.Time.TimerEvent>();
  private hudCamera: Phaser.Cameras.Scene2D.Camera | undefined;
  private disposed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly toPixel: (point: MajinCavePoint) => MajinCavePoint,
    private readonly definitions: Readonly<Record<string, MajinCaveEnemyDefinition>>,
  ) {}

  beginFloor(enemies: readonly MajinCaveEnemyState[]): void {
    this.destroyAll();
    this.syncAlive(enemies);
  }

  syncAlive(enemies: readonly MajinCaveEnemyState[]): void {
    if (this.disposed) return;
    for (const enemy of enemies) {
      if (!enemy.defeated && !this.visuals.has(enemy.id)) this.create(enemy);
    }
  }

  /** Keep renderer objects out of the fixed, non-zoomed HUD camera. */
  setHudCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
    this.hudCamera = camera;
    for (const visual of this.visuals.values()) camera.ignore(visual.object);
  }

  /** Enemies outside the hero's current vision never leak through the darkness. */
  setVisibility(visibleEnemyIds: ReadonlySet<string>): void {
    if (this.disposed) return;
    for (const [enemyId, visual] of this.visuals) {
      visual.object.setVisible(visibleEnemyIds.has(enemyId)).setAlpha(1);
    }
  }

  /** A Monster House may reveal its density for one short, presentation-only beat. */
  flashReveal(enemies: readonly MajinCaveEnemyState[]): void {
    if (this.disposed) return;
    const targets = enemies
      .map((enemy) => this.visuals.get(enemy.id)?.object)
      .filter((object): object is MonsterVisual["object"] => object !== undefined);
    for (const target of targets) target.setVisible(true).setAlpha(0.32);
    if (targets.length > 0) {
      this.scene.tweens.add({
        targets,
        alpha: 1,
        duration: 90,
        yoyo: true,
        repeat: 1,
        ease: "Quad.easeOut",
      });
    }
  }

  async move(enemy: MajinCaveEnemyState): Promise<void> {
    const visual = this.visuals.get(enemy.id);
    if (!visual || this.disposed) return;
    const target = this.toPixel(enemy.position);
    await this.tween(visual.object, { x: target.x, y: target.y }, ENEMY_MOVE_MS);
    this.playIdle(visual.sprite, enemy);
  }

  async attack(enemy: MajinCaveEnemyState, target: MajinCavePoint, onImpact?: () => void): Promise<void> {
    const visual = this.visuals.get(enemy.id);
    if (!visual || this.disposed) return;
    const lunge = this.lungeToward(visual.object, target);
    if (!visual.sprite) {
      if (onImpact) this.delay(80, onImpact);
      await lunge;
      return;
    }
    const profile = getMajinCaveMonsterSpriteProfile(enemy.definitionId);
    if (onImpact) this.delay(majinCaveMonsterAnimationDurationMs("attack", profile) / 2, onImpact);
    await Promise.all([this.playOnce(visual.sprite, enemy, "attack"), lunge]);
    this.playIdle(visual.sprite, enemy);
  }

  async damage(enemy: MajinCaveEnemyState, defeated: boolean): Promise<void> {
    const visual = this.visuals.get(enemy.id);
    if (!visual || this.disposed) return;
    const profile = getMajinCaveMonsterSpriteProfile(enemy.definitionId);
    if (visual.sprite) {
      await this.playOnce(visual.sprite, enemy, defeated ? "defeat" : "damage");
      if (defeated && profile?.defeatHoldMs) await this.wait(profile.defeatHoldMs);
    } else {
      await this.tween(visual.object, { alpha: defeated ? 0 : 0.35 }, defeated ? 520 : 140, !defeated);
    }
    if (defeated) {
      this.destroy(enemy.id);
      return;
    }
    this.playIdle(visual.sprite, enemy);
  }

  /** 10F-only entrance beat. State remains in MajinCaveRunState; this owns pixels and tweens. */
  async revealBoss(enemy: MajinCaveEnemyState): Promise<void> {
    if (enemy.definitionId !== "majin" || this.disposed) return;
    const visual = this.visuals.get(enemy.id);
    const profile = getMajinCaveMonsterSpriteProfile(enemy.definitionId);
    if (!visual || !profile) return;
    const baseScaleX = visual.object.scaleX;
    const baseScaleY = visual.object.scaleY;
    visual.object.setVisible(true).setAlpha(0).setScale(baseScaleX * 0.78, baseScaleY * 0.78);
    if (visual.sprite) {
      visual.sprite.anims.stop();
      visual.sprite.setFrame(profile.animationSpecs.idle.frames[0]);
    }
    await this.tween(visual.object, { alpha: 1, scaleX: baseScaleX, scaleY: baseScaleY }, 280);
    if (!visual.sprite || this.disposed) return;
    visual.sprite.setFrame(profile.animationSpecs.attack.frames[0]);
    await this.wait(150);
    this.playIdle(visual.sprite, enemy);
  }

  dispose(): void {
    this.disposed = true;
    for (const timer of this.pendingTimers) timer.remove(false);
    this.pendingTimers.clear();
    this.destroyAll();
  }

  private create(enemy: MajinCaveEnemyState): void {
    const position = this.toPixel(enemy.position);
    const profile = getMajinCaveMonsterSpriteProfile(enemy.definitionId);
    if (profile && this.scene.textures.exists(profile.textureKey)) {
      const sprite = this.scene.add.sprite(position.x, position.y, profile.textureKey, 0)
        .setOrigin(profile.originX, profile.originY)
        .setScale(profile.displayScale)
        .setDepth(ACTOR_DEPTH);
      this.visuals.set(enemy.id, { object: sprite, sprite });
      this.hudCamera?.ignore(sprite);
      this.playIdle(sprite, enemy);
      return;
    }

    // Existing safe fallback for a sheet that is absent or fails to load.
    const fallback = this.definitions[enemy.definitionId];
    if (fallback?.portrait && this.scene.textures.exists(fallback.portrait.key)) {
      const portrait = this.scene.add.image(position.x, position.y, fallback.portrait.key)
        .setDisplaySize(25, 25)
        .setDepth(ACTOR_DEPTH)
        .setTint(fallback.markerColor);
      this.visuals.set(enemy.id, { object: portrait });
      this.hudCamera?.ignore(portrait);
      return;
    }
    const color = fallback?.markerColor ?? 0x8a95a6;
    const radius = fallback?.isBoss ? 15 : 12;
    const marker = this.scene.add.circle(0, 0, radius, color, 0.92).setStrokeStyle(2, 0xffffff, 0.85);
    const symbol = this.scene.add.text(0, 0, fallback?.isBoss ? "魔" : "◆", { color: "#14121d", fontFamily: "monospace", fontSize: fallback?.isBoss ? "22px" : "16px" }).setOrigin(0.5);
    const container = this.scene.add.container(position.x, position.y, [marker, symbol]).setDepth(ACTOR_DEPTH);
    this.visuals.set(enemy.id, { object: container });
    this.hudCamera?.ignore(container);
  }

  private playIdle(sprite: Phaser.GameObjects.Sprite | undefined, enemy: MajinCaveEnemyState): void {
    const profile = getMajinCaveMonsterSpriteProfile(enemy.definitionId);
    if (!sprite || !profile || this.disposed) return;
    sprite.play(majinCaveMonsterAnimationKey(profile, "idle"), true);
  }

  private playOnce(sprite: Phaser.GameObjects.Sprite, enemy: MajinCaveEnemyState, animation: Exclude<MajinCaveMonsterAnimationName, "idle">): Promise<void> {
    const profile = getMajinCaveMonsterSpriteProfile(enemy.definitionId);
    if (!profile || this.disposed) return Promise.resolve();
    const key = majinCaveMonsterAnimationKey(profile, animation);
    return new Promise((resolve) => {
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + key, resolve);
      sprite.play(key, true);
    });
  }

  private tween(
    target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container | Phaser.GameObjects.Image,
    properties: Record<string, number>,
    duration: number,
    yoyo = false,
  ): Promise<void> {
    if (this.disposed || !target.active) return Promise.resolve();
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: target,
        ...properties,
        duration,
        yoyo,
        repeat: 0,
        ease: "Quad.easeOut",
        onComplete: () => resolve(),
      });
    });
  }

  private lungeToward(
    target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container | Phaser.GameObjects.Image,
    destination: MajinCavePoint,
  ): Promise<void> {
    const destinationPixel = this.toPixel(destination);
    const xDirection = Math.sign(destinationPixel.x - target.x);
    const yDirection = Math.sign(destinationPixel.y - target.y);
    return this.tween(target, {
      x: target.x + xDirection * MAJIN_CAVE_PRESENTATION.movement.lungeDistance,
      y: target.y + yDirection * MAJIN_CAVE_PRESENTATION.movement.lungeDistance,
    }, MAJIN_CAVE_PRESENTATION.movement.lungeMs, true);
  }

  private destroy(enemyId: string): void {
    const visual = this.visuals.get(enemyId);
    if (!visual) return;
    this.scene.tweens.killTweensOf(visual.object);
    visual.object.destroy();
    this.visuals.delete(enemyId);
  }

  private destroyAll(): void {
    for (const enemyId of [...this.visuals.keys()]) this.destroy(enemyId);
  }

  private delay(duration: number, callback: () => void): void {
    const timer = this.scene.time.delayedCall(duration, () => {
      this.pendingTimers.delete(timer);
      if (!this.disposed) callback();
    });
    this.pendingTimers.add(timer);
  }

  private wait(duration: number): Promise<void> {
    if (this.disposed) return Promise.resolve();
    return new Promise((resolve) => this.delay(duration, resolve));
  }
}

export function majinCaveMonsterAnimationTiming(animation: MajinCaveMonsterAnimationName, profile?: ReturnType<typeof getMajinCaveMonsterSpriteProfile>): number {
  return majinCaveMonsterAnimationDurationMs(animation, profile);
}
