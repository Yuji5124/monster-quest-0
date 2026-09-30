import Phaser from "phaser";
import type { EnemyTelegraphProfile } from "./BattlePresentationProfile.ts";

/** A brief, no-damage warning that uses the exact next action supplied by BattleSystem. */
export class EnemyTelegraphSystem {
  private disposed = false;
  private active: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  play(profile: EnemyTelegraphProfile, target: Phaser.GameObjects.Image, onComplete: () => void): void {
    if (this.disposed) return;
    this.clear();
    const aura = this.scene.add.ellipse(target.x, target.y, target.displayWidth * 1.22, target.displayHeight * 0.74, profile.auraColor, 0.05)
      .setDepth(0.72).setBlendMode(Phaser.BlendModes.ADD);
    const label = this.scene.add.text(target.x, target.y - target.displayHeight * 0.63, "!", {
      fontFamily: "monospace", fontSize: "38px", fontStyle: "bold", color: "#f0f7ff", stroke: "#26316b", strokeThickness: 6,
    }).setOrigin(0.5).setDepth(21).setAlpha(0);
    this.active.push(aura, label);
    const baseX = target.x;
    this.scene.tweens.add({ targets: aura, alpha: 0.42, scale: 1.26, duration: profile.durationMs * 0.48, yoyo: true, ease: "Sine.easeInOut" });
    this.scene.tweens.add({ targets: target, x: baseX + 3, duration: 55, yoyo: true, repeat: 4, ease: "Quad.easeInOut" });
    this.scene.tweens.add({ targets: label, alpha: 1, scale: 1.22, duration: 130, ease: "Back.easeOut" });
    this.scene.time.delayedCall(profile.durationMs, () => {
      if (this.disposed) return;
      target.setX(baseX);
      this.clear();
      onComplete();
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
  }

  private clear(): void {
    for (const object of this.active) {
      this.scene.tweens.killTweensOf(object);
      if (object.active) object.destroy();
    }
    this.active = [];
  }
}
