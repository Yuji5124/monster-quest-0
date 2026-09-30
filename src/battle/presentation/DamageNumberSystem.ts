import Phaser from "phaser";
import { DISPLAY } from "../../config/display.ts";

export type DamageNumberKind = "damage" | "heal" | "dai" | "tokudai" | "poison";

export interface DamageNumberRequest {
  readonly x: number;
  readonly y: number;
  readonly amount: number;
  readonly kind: DamageNumberKind;
  /** Additional visual emphasis supplied by HitFeedbackSystem. */
  readonly scale?: number;
}

export interface FormattedDamageNumber {
  readonly text: string;
  readonly color: string;
  readonly stroke: string;
  readonly baseScale: number;
}

/** Punctuation and scale make hit tiers readable even when colour perception differs. */
export function formatDamageNumber(amount: number, kind: DamageNumberKind): FormattedDamageNumber {
  const value = Math.max(0, Math.floor(Math.abs(amount)));
  if (kind === "heal") return { text: `+${value}`, color: "#bfffd1", stroke: "#165236", baseScale: 1 };
  if (kind === "dai") return { text: `${value}!`, color: "#fff0a6", stroke: "#7a3900", baseScale: 1.2 };
  if (kind === "tokudai") return { text: `${value}!!`, color: "#fff7c8", stroke: "#892000", baseScale: 1.52 };
  if (kind === "poison") return { text: `${value}`, color: "#c6a0e8", stroke: "#43245f", baseScale: 0.94 };
  return { text: `${value}`, color: "#ffffff", stroke: "#17243b", baseScale: 1 };
}

/**
 * Short-lived world-space damage labels. Every text object destroys itself on
 * completion; there is no persistent particle emitter or event listener.
 */
export class DamageNumberSystem {
  private disposed = false;
  private readonly active = new Set<Phaser.GameObjects.Text>();

  constructor(private readonly scene: Phaser.Scene) {}

  show(request: DamageNumberRequest): void {
    if (this.disposed || !Number.isFinite(request.amount) || request.amount < 0) return;
    const style = formatDamageNumber(request.amount, request.kind);
    const text = this.scene.add.text(
      Phaser.Math.Clamp(request.x, 20, DISPLAY.width - 20),
      Phaser.Math.Clamp(request.y, 24, DISPLAY.height - 24),
      style.text,
      {
        fontFamily: "monospace",
        fontSize: request.kind === "tokudai" ? "36px" : request.kind === "dai" ? "31px" : "26px",
        fontStyle: "bold",
        color: style.color,
        stroke: style.stroke,
        strokeThickness: 6,
      },
    ).setOrigin(0.5).setDepth(22).setAlpha(0).setScale(0.52);
    this.active.add(text);
    const scale = style.baseScale * Math.max(0.65, request.scale ?? 1);
    this.scene.tweens.add({
      targets: text,
      alpha: { from: 0, to: 1 },
      scale: scale * 1.14,
      duration: 105,
      ease: "Back.easeOut",
      onComplete: () => this.scene.tweens.add({
        targets: text,
        y: text.y - 34,
        scale: scale,
        alpha: 0,
        duration: 430,
        delay: 105,
        ease: "Quad.easeOut",
        onComplete: () => this.destroy(text),
      }),
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const text of this.active) {
      this.scene.tweens.killTweensOf(text);
      text.destroy();
    }
    this.active.clear();
  }

  private destroy(text: Phaser.GameObjects.Text): void {
    this.active.delete(text);
    if (text.active) text.destroy();
  }
}
