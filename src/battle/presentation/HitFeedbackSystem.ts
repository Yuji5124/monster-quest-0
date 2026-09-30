import Phaser from "phaser";
import { BATTLE_HIT_FEEDBACK, BATTLE_SLASH_EFFECT_TIMING, getBattleSlashAngles } from "../../config/battle.ts";
import type { BattleHitTier } from "../BattleSystem.ts";
import { BattleCameraController } from "./BattleCameraController.ts";
import { DamageNumberSystem } from "./DamageNumberSystem.ts";

type BattlePortrait = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

export interface HitFeedbackRequest {
  readonly memberId: string;
  readonly hitCount: number;
  readonly hitTier: BattleHitTier;
  readonly damage: number;
  readonly target: BattlePortrait;
  readonly targetOriginX: number;
  /** Custom animated bosses can keep their own damage animation while sharing slash/number feedback. */
  readonly reactTarget?: boolean;
  /** Reserved for authored ally sprites; current battle HUD has no player battle sprite asset. */
  readonly attacker?: BattlePortrait;
  readonly onComplete: () => void;
}

/**
 * Physical hit choreography only. It has no access to BattleSystem: damage is
 * supplied after calculation and this class can never change a combat result.
 */
export class HitFeedbackSystem {
  private disposed = false;
  private readonly active = new Set<Phaser.GameObjects.GameObject>();
  private readonly timers = new Set<Phaser.Time.TimerEvent>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly camera: BattleCameraController,
    private readonly damageNumbers: DamageNumberSystem,
  ) {}

  playAttack(request: HitFeedbackRequest): void {
    if (this.disposed) return;
    const cue = BATTLE_HIT_FEEDBACK[request.hitTier];
    const { style, anglesDeg } = getBattleSlashAngles(request.memberId, request.hitCount);
    const big = request.hitTier !== "normal";
    const centerX = request.targetOriginX;
    const centerY = request.target.y;
    const baseLength = Math.max(request.target.displayWidth, request.target.displayHeight) * 1.06;
    const length = baseLength * (big ? request.hitTier === "tokudai" ? 1.92 : 1.58 : 1);
    const thickness = Math.max(5, baseLength * 0.065) * (big ? request.hitTier === "tokudai" ? 2.55 : 2.05 : 1);
    const drawMs = BATTLE_SLASH_EFFECT_TIMING.drawMs * (big ? 1.18 : 1);
    const fadeMs = BATTLE_SLASH_EFFECT_TIMING.fadeMs * (big ? 1.14 : 1);
    const impactAt = cue.chargeMs + drawMs;
    const finalAt = impactAt + cue.hitStopMs + fadeMs + Math.max(0, anglesDeg.length - 1) * BATTLE_SLASH_EFFECT_TIMING.hitIntervalMs;

    this.lungeAttacker(request.attacker, cue.chargeMs + drawMs);
    for (const [index, angleDeg] of anglesDeg.entries()) {
      const delay = cue.chargeMs + index * BATTLE_SLASH_EFFECT_TIMING.hitIntervalMs;
      this.defer(delay, () => this.createSlash(centerX, centerY, angleDeg, length, thickness, style, big, drawMs, fadeMs));
    }
    this.defer(impactAt, () => {
      this.camera.playImpact(request.hitTier);
      if (request.reactTarget !== false) this.reactTarget(request.target, request.targetOriginX, cue.knockbackPx, cue.flashMs);
    });
    this.defer(impactAt + cue.hitStopMs, () => {
      this.damageNumbers.show({
        x: centerX,
        y: centerY - Math.max(18, request.target.displayHeight * 0.34),
        amount: request.damage,
        kind: request.hitTier === "tokudai" ? "tokudai" : request.hitTier === "dai" ? "dai" : "damage",
        scale: cue.numberScale,
      });
    });
    this.defer(finalAt, request.onComplete);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const timer of this.timers) timer.remove(false);
    this.timers.clear();
    for (const object of this.active) {
      this.scene.tweens.killTweensOf(object);
      if (object.active) object.destroy();
    }
    this.active.clear();
  }

  private lungeAttacker(attacker: BattlePortrait | undefined, duration: number): void {
    if (!attacker) return;
    const startX = attacker.x;
    this.scene.tweens.add({
      targets: attacker,
      x: startX + Math.max(6, attacker.displayWidth * 0.06),
      duration: Math.max(35, duration * 0.45),
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => attacker.setX(startX),
    });
  }

  private reactTarget(target: BattlePortrait, originX: number, knockbackPx: number, flashMs: number): void {
    this.scene.tweens.killTweensOf(target);
    target.setX(originX).setTintFill(0xffffff);
    this.scene.tweens.add({
      targets: target,
      x: originX + knockbackPx,
      duration: 52,
      yoyo: true,
      repeat: knockbackPx >= 18 ? 2 : 1,
      ease: "Quad.easeOut",
      onComplete: () => target.setX(originX).clearTint(),
    });
    this.defer(flashMs, () => { if (target.active) target.clearTint(); });
  }

  private createSlash(
    x: number,
    y: number,
    angleDeg: number,
    length: number,
    thickness: number,
    style: { readonly coreColor: number; readonly glowColor: number },
    big: boolean,
    drawMs: number,
    fadeMs: number,
  ): void {
    const blade = this.track(this.scene.add.graphics({ x, y }).setDepth(5).setAngle(angleDeg));
    const lens = (width: number, color: number, alpha: number): void => {
      blade.fillStyle(color, alpha);
      blade.fillPoints([
        new Phaser.Math.Vector2(-length / 2, 0), new Phaser.Math.Vector2(-length / 6, -width / 2),
        new Phaser.Math.Vector2(length / 6, -width / 2), new Phaser.Math.Vector2(length / 2, 0),
        new Phaser.Math.Vector2(length / 6, width / 2), new Phaser.Math.Vector2(-length / 6, width / 2),
      ], true);
    };
    if (big) lens(thickness * 3.05, 0xffd75e, 0.31);
    lens(thickness * 2.15, style.glowColor, 0.48);
    lens(thickness, style.coreColor, 1);
    blade.setScale(0.04, 1);
    this.scene.tweens.add({
      targets: blade,
      scaleX: 1,
      duration: drawMs,
      ease: "Cubic.easeOut",
      onComplete: () => this.scene.tweens.add({ targets: blade, alpha: 0, scaleY: 0.16, duration: fadeMs, ease: "Quad.easeIn", onComplete: () => this.destroy(blade) }),
    });
    const flash = this.track(this.scene.add.circle(x, y, thickness * 1.15, 0xffffff, 0.62).setDepth(5).setBlendMode(Phaser.BlendModes.ADD));
    this.scene.tweens.add({ targets: flash, scale: big ? 2.65 : 1.8, alpha: 0, duration: drawMs + fadeMs * 0.58, onComplete: () => this.destroy(flash) });
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
