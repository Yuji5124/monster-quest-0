import Phaser from "phaser";
import { MAJIN_CAVE_PRESENTATION, MAJIN_CAVE_SLASH_PRESENTATION, getMajinCaveSlashRotation } from "../config/majinCavePresentation.ts";
import type { MajinCavePoint } from "../config/majinCave.ts";
import type { MajinCaveDirection } from "./MajinCaveTurnSystem.ts";

export interface MajinCaveAttackPresentationOptions {
  readonly player: Phaser.GameObjects.Sprite;
  readonly direction: MajinCaveDirection;
  /** The logical result's enemy position, converted to world pixels by the Scene. */
  readonly impact: MajinCavePoint;
  readonly isMajin: boolean;
  /** Starts the target's existing hurt / defeat display exactly at the visible hit. */
  readonly onHit: () => Promise<void>;
}

/**
 * Disposable No.08-only rendering helper. It owns no dungeon data: the TurnSystem has already
 * resolved the attack before this helper plays the lunge, Graphics slash, and enemy hurt view.
 */
export class MajinCaveAttackPresentation {
  private readonly activeSlashes = new Set<Phaser.GameObjects.Graphics>();
  private readonly pendingDelayCancels = new Set<() => void>();
  private disposed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly hudCamera: Phaser.Cameras.Scene2D.Camera,
    private readonly depth: number,
  ) {}

  async play(options: MajinCaveAttackPresentationOptions): Promise<void> {
    if (this.disposed || !options.player.active) return;
    const lunge = this.lunge(
      options.player,
      options.direction,
      options.isMajin ? MAJIN_CAVE_SLASH_PRESENTATION.bossLungeMs : MAJIN_CAVE_PRESENTATION.movement.lungeMs,
    );
    await this.delay(MAJIN_CAVE_SLASH_PRESENTATION.hitDelayMs);
    if (this.disposed || !options.player.active) return;

    const slash = this.playSlash(options.impact, options.direction, options.isMajin);
    const hurt = options.onHit();
    await Promise.all([lunge, slash, hurt]);
  }

  dispose(): void {
    this.disposed = true;
    for (const cancel of this.pendingDelayCancels) cancel();
    this.pendingDelayCancels.clear();
    for (const slash of this.activeSlashes) {
      this.scene.tweens.killTweensOf(slash);
      slash.destroy();
    }
    this.activeSlashes.clear();
  }

  private lunge(player: Phaser.GameObjects.Sprite, direction: MajinCaveDirection, duration: number): Promise<void> {
    const delta = directionDelta(direction);
    const startX = player.x;
    const startY = player.y;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: player,
        x: startX + delta.x * MAJIN_CAVE_PRESENTATION.movement.lungeDistance,
        y: startY + delta.y * MAJIN_CAVE_PRESENTATION.movement.lungeDistance,
        duration,
        yoyo: true,
        ease: "Quad.easeOut",
        onComplete: () => {
          if (player.active) player.setPosition(startX, startY);
          resolve();
        },
      });
    });
  }

  private playSlash(impact: MajinCavePoint, direction: MajinCaveDirection, isMajin: boolean): Promise<void> {
    const delta = directionDelta(direction);
    const scale = isMajin ? MAJIN_CAVE_SLASH_PRESENTATION.bossScale : 1;
    const duration = isMajin ? MAJIN_CAVE_SLASH_PRESENTATION.bossDurationMs : MAJIN_CAVE_SLASH_PRESENTATION.durationMs;
    const slash = this.scene.add.graphics()
      .setPosition(impact.x - delta.x * 5, impact.y - delta.y * 5)
      .setRotation(getMajinCaveSlashRotation(direction))
      .setScale(0.52 * scale)
      .setDepth(this.depth)
      .setAlpha(1);
    this.hudCamera.ignore(slash);
    this.activeSlashes.add(slash);

    // A broad aqua arc plus a smaller white highlight keeps the impact readable at the 2x camera.
    slash.lineStyle(6, 0x8defff, 0.92);
    slash.beginPath();
    slash.arc(-1, 0, MAJIN_CAVE_SLASH_PRESENTATION.radius, -1.14, 1.14, false);
    slash.strokePath();
    slash.lineStyle(2, 0xffffff, 1);
    slash.beginPath();
    slash.arc(-2, 0, MAJIN_CAVE_SLASH_PRESENTATION.radius - 5, -1.02, 1.02, false);
    slash.strokePath();

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: slash,
        x: impact.x + delta.x * 8,
        y: impact.y + delta.y * 8,
        scaleX: 1.16 * scale,
        scaleY: 1.16 * scale,
        alpha: 0,
        duration,
        ease: "Quad.easeOut",
        onComplete: () => {
          this.activeSlashes.delete(slash);
          if (slash.active) slash.destroy();
          resolve();
        },
      });
    });
  }

  private delay(duration: number): Promise<void> {
    return new Promise((resolve) => {
      let finished = false;
      const finish = (): void => {
        if (finished) return;
        finished = true;
        this.pendingDelayCancels.delete(cancel);
        resolve();
      };
      const timer = this.scene.time.delayedCall(duration, finish);
      const cancel = (): void => {
        timer.remove(false);
        finish();
      };
      this.pendingDelayCancels.add(cancel);
    });
  }
}

function directionDelta(direction: MajinCaveDirection): MajinCavePoint {
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  if (direction === "up") return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}
