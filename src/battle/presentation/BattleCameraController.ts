import Phaser from "phaser";
import type { BattleHitTier } from "../BattleSystem.ts";

/** Camera effects are owned here so they cannot outlive BattleScene. */
export class BattleCameraController {
  private readonly baseZoom: number;
  private disposed = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.baseZoom = scene.cameras.main.zoom;
  }

  playImpact(tier: BattleHitTier): void {
    if (this.disposed) return;
    const spec = tier === "tokudai"
      ? { duration: 250, intensity: 0.011, zoom: 1.022 }
      : tier === "dai"
        ? { duration: 180, intensity: 0.007, zoom: 1.012 }
        : { duration: 105, intensity: 0.0035, zoom: 1 };
    this.scene.cameras.main.shake(spec.duration, spec.intensity);
    if (spec.zoom > 1) this.pulseZoom(spec.zoom, spec.duration);
  }

  playMagicImpact(): void {
    if (this.disposed) return;
    this.scene.cameras.main.shake(155, 0.006);
    this.pulseZoom(1.01, 170);
  }

  playBossEntrance(): void {
    if (this.disposed) return;
    this.scene.tweens.add({ targets: this.scene.cameras.main, zoom: this.baseZoom * 1.018, duration: 360, yoyo: true, ease: "Sine.easeInOut" });
  }

  reset(): void {
    // Scene終了(SHUTDOWN)時はCameraManagerが先にmainを破棄している。ここで例外を出すと
    // PhaserのrequestAnimationFrameループが止まり、戦闘終了後に画面が固まる。
    const camera = this.scene.cameras?.main;
    if (!camera) return;
    this.scene.tweens.killTweensOf(camera);
    camera.resetFX();
    camera.setZoom(this.baseZoom);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
  }

  private pulseZoom(amount: number, duration: number): void {
    this.scene.tweens.killTweensOf(this.scene.cameras.main);
    this.scene.tweens.add({
      targets: this.scene.cameras.main,
      zoom: this.baseZoom * amount,
      duration: Math.max(45, duration * 0.42),
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => this.scene.cameras.main.setZoom(this.baseZoom),
    });
  }
}
