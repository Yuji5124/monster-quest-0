import Phaser from "phaser";
import { DISPLAY } from "../../config/display.ts";
import type { BattleHitTier } from "../BattleSystem.ts";
import { BattleCameraController } from "./BattleCameraController.ts";
import { DamageNumberSystem, type DamageNumberKind } from "./DamageNumberSystem.ts";
import { EnemyTelegraphSystem } from "./EnemyTelegraphSystem.ts";
import { getBattleEffectParticleCount, type BattleEffectQuality } from "./EffectQuality.ts";
import { HitFeedbackSystem } from "./HitFeedbackSystem.ts";
import type { BattlePresentationProfile, EnemyTelegraphProfile } from "./BattlePresentationProfile.ts";

type BattlePortrait = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

export interface BattleEffectManagerOptions {
  readonly scene: Phaser.Scene;
  readonly portrait: BattlePortrait;
  readonly portraitOriginX: number;
  readonly statusWindows: readonly Phaser.GameObjects.Rectangle[];
  readonly statusTexts: readonly Phaser.GameObjects.Text[];
  readonly commandObjects: readonly (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[];
  readonly profile: BattlePresentationProfile;
  readonly quality: BattleEffectQuality;
  readonly onBusyChanged: (busy: boolean) => void;
}

export interface AttackEffectRequest {
  readonly memberId: string;
  readonly hitCount: number;
  readonly hitTier: BattleHitTier;
  readonly damage: number;
  readonly reactTarget?: boolean;
}

export interface DamageEffectRequest {
  readonly amount: number;
  readonly partyIndex?: number;
  readonly target?: BattlePortrait;
  readonly targetOriginX?: number;
  readonly kind?: DamageNumberKind;
  readonly heavy?: boolean;
}

export interface MagicEffectRequest extends DamageEffectRequest {
  readonly actionId: string;
  readonly reflected?: boolean;
}

/**
 * The BattleScene-facing facade for every generic combat effect. It owns only
 * display objects, camera effects and timers; BattleSystem remains the sole
 * authority for hit tiers, damage, Mirror, poison and turn order.
 */
export class BattleEffectManager {
  private readonly scene: Phaser.Scene;
  private readonly portrait: BattlePortrait;
  private readonly portraitOriginX: number;
  private readonly statusWindows: readonly Phaser.GameObjects.Rectangle[];
  private readonly statusTexts: readonly Phaser.GameObjects.Text[];
  private readonly commandObjects: readonly (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[];
  private readonly quality: BattleEffectQuality;
  private readonly onBusyChanged: (busy: boolean) => void;
  private readonly camera: BattleCameraController;
  private readonly damageNumbers: DamageNumberSystem;
  private readonly hitFeedback: HitFeedbackSystem;
  private readonly telegraphs: EnemyTelegraphSystem;
  private readonly active = new Set<Phaser.GameObjects.GameObject>();
  private readonly timers = new Set<Phaser.Time.TimerEvent>();
  private readonly idleTweens: Phaser.Tweens.Tween[] = [];
  private busyCount = 0;
  private disposed = false;

  constructor(options: BattleEffectManagerOptions) {
    this.scene = options.scene;
    this.portrait = options.portrait;
    this.portraitOriginX = options.portraitOriginX;
    this.statusWindows = options.statusWindows;
    this.statusTexts = options.statusTexts;
    this.commandObjects = options.commandObjects;
    this.quality = options.quality;
    this.onBusyChanged = options.onBusyChanged;
    this.camera = new BattleCameraController(this.scene);
    this.damageNumbers = new DamageNumberSystem(this.scene);
    this.hitFeedback = new HitFeedbackSystem(this.scene, this.camera, this.damageNumbers);
    this.telegraphs = new EnemyTelegraphSystem(this.scene);
    this.startIdleMotion(options.profile);
    if (options.profile.entrance === "bossFade") this.camera.playBossEntrance();
  }

  get isBusy(): boolean { return this.busyCount > 0; }

  /** Allows a custom boss controller to reuse the shared label treatment without owning a second number renderer. */
  showDamageNumber(request: { readonly amount: number; readonly x: number; readonly y: number; readonly kind?: DamageNumberKind; readonly scale?: number }): void {
    this.damageNumbers.show({ ...request, kind: request.kind ?? "damage" });
  }

  playAttack(request: AttackEffectRequest): void {
    if (this.disposed) return;
    this.begin();
    this.hitFeedback.playAttack({
      ...request,
      target: this.portrait,
      targetOriginX: this.portraitOriginX,
      onComplete: () => {
        if (request.hitTier === "tokudai") this.shakeUi(6);
        else if (request.hitTier === "dai") this.shakeUi(3);
        this.end();
      },
    });
  }

  playDamage(request: DamageEffectRequest): void {
    if (this.disposed || request.amount <= 0) return;
    this.begin();
    const kind = request.kind ?? "damage";
    const target = request.target;
    if (target) {
      const originX = request.targetOriginX ?? target.x;
      this.reactPortrait(target, originX, request.heavy ? 12 : 6, request.heavy ? 0xeaf4ff : 0xffffff);
      this.damageNumbers.show({ x: originX, y: target.y - target.displayHeight * 0.32, amount: request.amount, kind });
      this.camera.playMagicImpact();
    } else {
      const index = request.partyIndex ?? 0;
      const window = this.statusWindows[index];
      const text = this.statusTexts[index];
      const x = window?.x ?? DISPLAY.width * 0.22;
      const y = window?.y ?? DISPLAY.height * 0.16;
      this.damageNumbers.show({ x, y: y - 18, amount: request.amount, kind });
      this.reactStatus(index, request.heavy ? 5 : 3, kind === "heal" ? 0xbfffd1 : 0xffc6c6);
      if (text) text.setAlpha(1);
    }
    this.defer(request.heavy ? 330 : 220, () => this.end());
  }

  playMagic(request: MagicEffectRequest): void {
    if (this.disposed) return;
    this.begin();
    const target = request.target ?? this.portrait;
    const targetX = request.target ? request.targetOriginX ?? target.x : this.portraitOriginX;
    const targetY = target.y;
    if (request.actionId === "magic_heat") this.playHeat(targetX, targetY);
    else if (request.actionId === "magic_icesoon") this.playIce(targetX, targetY);
    else if (request.actionId === "magic_daidain" || request.actionId === "magic_elekitel") this.playLightning(targetX, targetY, request.actionId === "magic_daidain");
    else this.playArcane(targetX, targetY);
    const impactDelay = request.actionId === "magic_daidain" ? 360 : 250;
    this.defer(impactDelay, () => {
      if (request.amount > 0) {
        if (request.target) {
          this.reactPortrait(target, targetX, request.reflected ? 18 : 8, request.reflected ? 0xdffaff : 0xf0f5ff);
          this.damageNumbers.show({ x: targetX, y: targetY - target.displayHeight * 0.33, amount: request.amount, kind: "damage" });
        } else {
          this.reactStatus(request.partyIndex ?? 0, 4, 0xffd2d2);
          const window = this.statusWindows[request.partyIndex ?? 0];
          this.damageNumbers.show({ x: window?.x ?? DISPLAY.width * 0.22, y: (window?.y ?? 110) - 18, amount: request.amount, kind: "damage" });
        }
      }
      this.camera.playMagicImpact();
    });
    this.defer(impactDelay + 250, () => this.end());
  }

  playHeal(amount: number, partyIndex: number): void {
    if (this.disposed || amount <= 0) return;
    this.begin();
    const window = this.statusWindows[partyIndex];
    const x = window?.x ?? DISPLAY.width * 0.22;
    const y = window?.y ?? DISPLAY.height * 0.16;
    const ring = this.track(this.scene.add.circle(x, y, 18, 0xbfffd1, 0.22).setDepth(12).setBlendMode(Phaser.BlendModes.ADD));
    this.scene.tweens.add({ targets: ring, scale: 2.1, alpha: 0, duration: 380, ease: "Sine.easeOut", onComplete: () => this.destroy(ring) });
    this.damageNumbers.show({ x, y: y - 20, amount, kind: "heal" });
    this.reactStatus(partyIndex, 1, 0xbfffd1);
    this.defer(390, () => this.end());
  }

  playMirror(partyIndex: number): void {
    if (this.disposed) return;
    this.begin();
    const window = this.statusWindows[partyIndex];
    const x = window?.x ?? DISPLAY.width * 0.22;
    const y = window?.y ?? DISPLAY.height * 0.16;
    const mirror = this.track(this.scene.add.graphics().setDepth(13).setBlendMode(Phaser.BlendModes.ADD));
    const radius = 27;
    const points = Array.from({ length: 6 }, (_, index) => new Phaser.Math.Vector2(
      x + Math.cos(Phaser.Math.DegToRad(index * 60 - 90)) * radius,
      y + Math.sin(Phaser.Math.DegToRad(index * 60 - 90)) * radius,
    ));
    mirror.fillStyle(0xc9f6ff, 0.18).fillPoints(points, true);
    mirror.lineStyle(3, 0xf2ffff, 0.95).strokePoints(points, true);
    this.scene.tweens.add({ targets: mirror, scale: 1.45, alpha: 0, duration: 450, ease: "Sine.easeOut", onComplete: () => this.destroy(mirror) });
    const label = this.track(this.scene.add.text(x, y - 46, "ミラー", { fontFamily: "monospace", fontSize: "18px", color: "#e9ffff", stroke: "#234b5a", strokeThickness: 4 }).setOrigin(0.5).setDepth(21));
    this.scene.tweens.add({ targets: label, y: y - 60, alpha: 0, duration: 480, ease: "Quad.easeOut", onComplete: () => this.destroy(label) });
    this.defer(490, () => this.end());
  }

  playPoison(target: BattlePortrait = this.portrait): void {
    if (this.disposed) return;
    const x = target.x;
    const y = target.y;
    for (let index = 0; index < getBattleEffectParticleCount(this.quality, 7); index += 1) {
      const bubble = this.track(this.scene.add.circle(x + (index - 3) * 8, y + target.displayHeight * 0.18, 4 + index % 3, 0x9d6ad2, 0.72).setDepth(6));
      this.scene.tweens.add({ targets: bubble, y: bubble.y - 34 - index * 3, x: bubble.x + (index % 2 ? 9 : -9), alpha: 0, duration: 420 + index * 25, onComplete: () => this.destroy(bubble) });
    }
  }

  playMpInsufficient(): void {
    if (this.disposed) return;
    for (const object of this.commandObjects) {
      const baseX = object.x;
      this.scene.tweens.add({ targets: object, x: baseX + 4, duration: 45, yoyo: true, repeat: 2, onComplete: () => object.setX(baseX) });
    }
  }

  playEnemyTelegraph(profile: EnemyTelegraphProfile, onComplete: () => void): void {
    if (this.disposed) return;
    this.begin();
    this.telegraphs.play(profile, this.portrait, () => {
      this.end();
      onComplete();
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const timer of this.timers) timer.remove(false);
    this.timers.clear();
    for (const tween of this.idleTweens) tween.stop();
    this.scene.tweens.killTweensOf(this.portrait);
    for (const object of this.active) {
      this.scene.tweens.killTweensOf(object);
      if (object.active) object.destroy();
    }
    this.active.clear();
    this.hitFeedback.dispose();
    this.damageNumbers.dispose();
    this.telegraphs.dispose();
    this.camera.dispose();
    if (this.busyCount > 0) this.onBusyChanged(false);
    this.busyCount = 0;
  }

  private startIdleMotion(profile: BattlePresentationProfile): void {
    if (profile.idleMotion === "none" || profile.idleMotion === "custom") return;
    const target = this.portrait;
    const baseY = target.y;
    if (profile.idleMotion === "float") {
      this.idleTweens.push(this.scene.tweens.add({ targets: target, y: baseY - 4, scaleX: target.scaleX * 1.01, scaleY: target.scaleY * 0.99, duration: 1350, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
      return;
    }
    if (profile.idleMotion === "sway") {
      this.idleTweens.push(this.scene.tweens.add({ targets: target, x: this.portraitOriginX + 2, angle: 0.65, duration: 1150, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
      return;
    }
    this.idleTweens.push(this.scene.tweens.add({ targets: target, y: baseY - 2, scaleX: target.scaleX * 1.008, scaleY: target.scaleY * 0.992, duration: 1550, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
  }

  private reactPortrait(target: BattlePortrait, originX: number, knockbackPx: number, color: number): void {
    this.scene.tweens.killTweensOf(target);
    target.setX(originX).setTintFill(color);
    this.scene.tweens.add({ targets: target, x: originX + knockbackPx, duration: 58, yoyo: true, repeat: knockbackPx >= 16 ? 2 : 1, ease: "Quad.easeInOut", onComplete: () => target.setX(originX).clearTint() });
  }

  private reactStatus(index: number, shakePx: number, color: number): void {
    const window = this.statusWindows[index];
    const text = this.statusTexts[index];
    if (window) {
      const baseX = window.x;
      window.setStrokeStyle(3, color);
      this.scene.tweens.add({ targets: window, x: baseX + shakePx, alpha: 0.45, duration: 55, yoyo: true, repeat: 2, onComplete: () => window.setX(baseX).setAlpha(1).setStrokeStyle(2, 0xeeeeee) });
    }
    if (text) {
      const baseX = text.x;
      this.scene.tweens.add({ targets: text, x: baseX + shakePx, duration: 55, yoyo: true, repeat: 2, onComplete: () => text.setX(baseX) });
    }
  }

  private shakeUi(px: number): void {
    this.statusWindows.forEach((_window, index) => this.reactStatus(index, px, 0xffd75e));
  }

  private playHeat(targetX: number, targetY: number): void {
    const veil = this.track(this.scene.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, 0xff8b4d, 0.1).setDepth(9).setBlendMode(Phaser.BlendModes.ADD));
    this.scene.tweens.add({ targets: veil, alpha: 0, duration: 300, ease: "Quad.easeOut", onComplete: () => this.destroy(veil) });
    this.projectileBurst(0xffbd62, 0xff632f, targetX, targetY, 9, 52);
    const ring = this.track(this.scene.add.circle(targetX, targetY, 18, 0xffc27a, 0.28).setDepth(6).setBlendMode(Phaser.BlendModes.ADD));
    this.scene.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 300, ease: "Sine.easeOut", onComplete: () => this.destroy(ring) });
  }

  private playIce(targetX: number, targetY: number): void {
    const count = getBattleEffectParticleCount(this.quality, 10);
    for (let index = 0; index < count; index += 1) {
      const angle = Phaser.Math.DegToRad(index * (360 / count));
      const shard = this.track(this.scene.add.triangle(
        targetX + Math.cos(angle) * 150, targetY + Math.sin(angle) * 100, 0, 14, 7, 0, 14, 14, 0xcff5ff, 0.78,
      ).setDepth(6).setAngle(index * 43));
      this.scene.tweens.add({ targets: shard, x: targetX, y: targetY, alpha: 0, angle: shard.angle + 180, duration: 255 + index * 14, ease: "Quad.easeIn", onComplete: () => this.destroy(shard) });
    }
    const frost = this.track(this.scene.add.circle(targetX, targetY, 26, 0xcff5ff, 0.22).setDepth(6).setBlendMode(Phaser.BlendModes.ADD));
    this.scene.tweens.add({ targets: frost, scale: 2.35, alpha: 0, duration: 340, onComplete: () => this.destroy(frost) });
  }

  private playLightning(targetX: number, targetY: number, large: boolean): void {
    const bolt = this.track(this.scene.add.graphics().setDepth(8).setBlendMode(Phaser.BlendModes.ADD));
    const startX = DISPLAY.width * 0.34;
    const startY = 80;
    const segments = large ? 8 : 5;
    let lastX = startX;
    let lastY = startY;
    for (let index = 1; index <= segments; index += 1) {
      const progress = index / segments;
      const nextX = Phaser.Math.Linear(startX, targetX, progress) + (index === segments ? 0 : (index % 2 ? 22 : -18));
      const nextY = Phaser.Math.Linear(startY, targetY, progress);
      bolt.lineStyle(large ? 12 : 7, 0x8be5ff, 0.34).lineBetween(lastX, lastY, nextX, nextY);
      bolt.lineStyle(large ? 4 : 2, 0xf7ffff, 0.96).lineBetween(lastX, lastY, nextX, nextY);
      lastX = nextX;
      lastY = nextY;
    }
    this.scene.tweens.add({ targets: bolt, alpha: 0, duration: large ? 340 : 230, onComplete: () => this.destroy(bolt) });
  }

  private playArcane(targetX: number, targetY: number): void {
    this.projectileBurst(0xa8b7ff, 0xe9efff, targetX, targetY, 6, 36);
  }

  private projectileBurst(primary: number, secondary: number, targetX: number, targetY: number, normalCount: number, spread: number): void {
    const count = getBattleEffectParticleCount(this.quality, normalCount);
    for (let index = 0; index < count; index += 1) {
      const orb = this.track(this.scene.add.circle(DISPLAY.width * 0.28 + index * 7, DISPLAY.height * 0.59 + (index % 3) * 8, index % 3 === 0 ? 6 : 4, index % 2 ? primary : secondary, 0.9).setDepth(6).setBlendMode(Phaser.BlendModes.ADD));
      this.scene.tweens.add({ targets: orb, x: targetX + (index % 2 ? spread : -spread) * (index / Math.max(1, count - 1)), y: targetY + ((index % 3) - 1) * spread * 0.45, scale: 0.25, alpha: 0, duration: 250 + index * 16, ease: "Quad.easeIn", onComplete: () => this.destroy(orb) });
    }
  }

  private begin(): void {
    this.busyCount += 1;
    if (this.busyCount === 1) this.onBusyChanged(true);
  }

  private end(): void {
    this.busyCount = Math.max(0, this.busyCount - 1);
    if (this.busyCount === 0 && !this.disposed) this.onBusyChanged(false);
  }

  private defer(delay: number, callback: () => void): void {
    const timer = this.scene.time.delayedCall(delay, () => {
      this.timers.delete(timer);
      if (!this.disposed) callback();
    });
    this.timers.add(timer);
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T { this.active.add(object); return object; }
  private destroy(object: Phaser.GameObjects.GameObject): void {
    this.active.delete(object);
    if (object.active) object.destroy();
  }
}
