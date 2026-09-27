import Phaser from "phaser";
import { STONE_RUBBLE, STONE_TOWN_AWAKENING, STONE_TOWN_LIFE } from "../config/stoneTown.ts";

/** Runtime (world px) rectangle. */
export interface WorldRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Small deterministic generator so the rubble and the cracks look the same every visit. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// ---- rubble ----------------------------------------------------------------------------------------------------------

export interface StoneRubble {
  /** Collapses the pile (staggered fall + dust). `onDone` runs once every piece is gone. */
  crumble(onDone: () => void): void;
  destroy(): void;
}

/** A pile of fallen wall stones across `bounds`. Drawn from code (stand-in); a formal sprite can replace it later. */
export function createStoneRubble(scene: Phaser.Scene, bounds: WorldRect): StoneRubble {
  const random = seeded(1804);
  const pieces: Phaser.GameObjects.Container[] = [];
  for (let index = 0; index < STONE_RUBBLE.count; index += 1) {
    const t = (index + 0.5) / STONE_RUBBLE.count;
    const x = bounds.x + bounds.width * t + (random() - 0.5) * bounds.width * 0.05;
    const y = bounds.y + bounds.height * (0.5 + 0.42 * random());
    const radius = bounds.height * (0.55 + 0.45 * random());
    const color = STONE_RUBBLE.colors[Math.floor(random() * STONE_RUBBLE.colors.length)];
    const outline: number[] = [];
    const corners = 7;
    for (let corner = 0; corner < corners; corner += 1) {
      const angle = (corner / corners) * Math.PI * 2 + random() * 0.4;
      const reach = radius * (0.78 + 0.32 * random());
      outline.push(Math.cos(angle) * reach, Math.sin(angle) * reach * 0.78);
    }
    const body = scene.add.polygon(0, 0, outline, color, 1).setOrigin(0, 0).setStrokeStyle(2, 0x4a4b57, 0.9);
    const light = scene.add.polygon(0, 0, [outline[0] * 0.9, outline[1] * 0.9, outline[2] * 0.7, outline[3] * 0.7, -radius * 0.1, -radius * 0.2], 0xd0d1d8, 0.55).setOrigin(0, 0);
    const shade = scene.add.polygon(0, 0, [outline[8] * 0.9, outline[9] * 0.9, outline[10] * 0.8, outline[11] * 0.8, radius * 0.15, radius * 0.2], 0x3a3b46, 0.5).setOrigin(0, 0);
    const piece = scene.add.container(x, y, [body, light, shade]);
    piece.setDepth(STONE_RUBBLE.depth + y * 0.001);
    pieces.push(piece);
  }
  // two broken pillar slabs leaning at the ends of the pile
  for (const side of [0.12, 0.88]) {
    const slab = scene.add.rectangle(0, 0, bounds.height * 0.55, bounds.height * 1.5, 0xb4b5be, 1).setStrokeStyle(2, 0x5a5b67, 0.9);
    const cap = scene.add.rectangle(0, -bounds.height * 0.72, bounds.height * 0.7, bounds.height * 0.22, 0xd2d3da, 1);
    const pillar = scene.add.container(bounds.x + bounds.width * side, bounds.y + bounds.height * 0.55, [slab, cap]);
    pillar.setAngle(side < 0.5 ? -14 : 12).setDepth(STONE_RUBBLE.depth + bounds.y * 0.001 + 0.5);
    pieces.push(pillar);
  }

  return {
    crumble(onDone: () => void): void {
      let remaining = pieces.length;
      scene.cameras.main.shake(STONE_TOWN_AWAKENING.crumbleMs, 0.006);
      pieces.forEach((piece, index) => {
        const delay = (index / pieces.length) * STONE_TOWN_AWAKENING.crumbleStaggerMs;
        scene.time.delayedCall(delay, () => spawnStoneDust(scene, piece.x + bounds.width * 0.0, bounds.y + bounds.height * 0.6, 2, 22));
        scene.tweens.add({
          targets: piece,
          y: piece.y + 26 + (index % 3) * 10,
          angle: (index % 2 === 0 ? 1 : -1) * (14 + (index % 4) * 6),
          scale: 0.62,
          alpha: 0,
          delay,
          duration: STONE_TOWN_AWAKENING.crumbleMs,
          ease: "Quad.easeIn",
          onComplete: () => {
            piece.destroy();
            remaining -= 1;
            if (remaining === 0) onDone();
          },
        });
      });
    },
    destroy(): void {
      for (const piece of pieces) piece.destroy();
    },
  };
}

// ---- dust, glow, light motes ----------------------------------------------------------------------------------------

/** Grey stone dust that swells, rises and fades. */
export function spawnStoneDust(scene: Phaser.Scene, x: number, y: number, count: number, spread: number): void {
  for (let index = 0; index < count; index += 1) {
    const size = 4 + Math.random() * 6;
    const puff = scene.add.circle(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread * 0.4, size, 0xcbcbd2, 0.5).setDepth(1400);
    scene.tweens.add({
      targets: puff,
      x: puff.x + (Math.random() - 0.5) * spread * 0.6,
      y: puff.y - 14 - Math.random() * 34,
      scale: 2.2 + Math.random(),
      alpha: 0,
      duration: 700 + Math.random() * 600,
      ease: "Sine.easeOut",
      onComplete: () => puff.destroy(),
    });
  }
}

/** A slow, warm light mote rising from a statue that has begun to warm up. */
export function startLifeMotes(scene: Phaser.Scene, bounds: WorldRect): Phaser.Time.TimerEvent {
  return scene.time.addEvent({
    delay: STONE_TOWN_LIFE.moteIntervalMs + Math.random() * 400,
    loop: true,
    callback: () => {
      const x = bounds.x + bounds.width * (0.3 + 0.4 * Math.random());
      const y = bounds.y + bounds.height * 0.2;
      const mote = scene.add.circle(x, y, 2.6, STONE_TOWN_LIFE.moteColor, 0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(1300);
      scene.tweens.add({
        targets: mote,
        y: y - STONE_TOWN_LIFE.moteRiseWorldPx,
        x: x + (Math.random() - 0.5) * 16,
        alpha: 0,
        duration: STONE_TOWN_LIFE.moteLifeMs,
        onComplete: () => mote.destroy(),
      });
    },
  });
}

const GLOW_TEXTURE_KEY = "stone-town.glow";
const GLOW_TEXTURE_SIZE = 256;

/** A soft radial light (white-gold centre fading to nothing), drawn once and shared by every glow. */
function ensureGlowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(GLOW_TEXTURE_KEY)) return;
  const canvas = scene.textures.createCanvas(GLOW_TEXTURE_KEY, GLOW_TEXTURE_SIZE, GLOW_TEXTURE_SIZE);
  if (!canvas) return;
  const context = canvas.getContext();
  const half = GLOW_TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, "rgba(255, 250, 220, 1)");
  gradient.addColorStop(0.22, "rgba(255, 238, 176, 0.55)");
  gradient.addColorStop(0.6, "rgba(255, 222, 146, 0.16)");
  gradient.addColorStop(1, "rgba(255, 222, 146, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, GLOW_TEXTURE_SIZE, GLOW_TEXTURE_SIZE);
  canvas.refresh();
}

/** The statue's star: hidden until it flares, then a slow warm pulse. */
export class StarGlow {
  private readonly halo: Phaser.GameObjects.Image;
  private readonly core: Phaser.GameObjects.Image;
  private readonly rays: Phaser.GameObjects.Rectangle[] = [];
  private readonly haloScale: number;
  private pulse?: Phaser.Tweens.Tween;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number) {
    ensureGlowTexture(scene);
    this.haloScale = (STONE_TOWN_AWAKENING.glowRadius * 2) / GLOW_TEXTURE_SIZE;
    this.halo = scene.add.image(x, y, GLOW_TEXTURE_KEY).setScale(this.haloScale).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(1290);
    this.core = scene.add.image(x, y, GLOW_TEXTURE_KEY).setScale((26 * 2) / GLOW_TEXTURE_SIZE).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(1291);
    // Shapes multiply their own fill alpha by the object alpha: keep the fill opaque and hide the rays through setAlpha(0).
    for (let index = 0; index < 6; index += 1) {
      this.rays.push(scene.add.rectangle(x, y, STONE_TOWN_AWAKENING.glowRadius * 1.5, 2, STONE_TOWN_AWAKENING.glowColor, 1)
        .setAlpha(0).setAngle(index * 30).setBlendMode(Phaser.BlendModes.ADD).setDepth(1289));
    }
  }

  /** The moment the star answers the gathered voices: a bright swell that settles into the slow pulse. */
  flare(): void {
    const base = this.haloScale;
    this.scene.tweens.add({ targets: this.halo, alpha: { from: 0, to: 0.95 }, scale: { from: base * 0.4, to: base * 1.5 }, duration: STONE_TOWN_AWAKENING.glowMs * 0.7, ease: "Sine.easeOut", yoyo: true, hold: 200, onComplete: () => this.settle() });
    this.scene.tweens.add({ targets: this.core, alpha: { from: 0, to: 1 }, duration: STONE_TOWN_AWAKENING.glowMs * 0.5, yoyo: true, hold: 240 });
    this.scene.tweens.add({ targets: this.rays, alpha: { from: 0, to: 0.5 }, angle: "+=40", duration: STONE_TOWN_AWAKENING.glowMs * 1.4, yoyo: true, ease: "Sine.easeInOut" });
  }

  /** The quiet, permanent glow after the awakening (also used when a saved game already awakened the statue). */
  settle(): void {
    this.pulse?.stop();
    this.halo.setScale(this.haloScale * (STONE_TOWN_LIFE.starGlowRadius / STONE_TOWN_AWAKENING.glowRadius));
    this.pulse = this.scene.tweens.add({
      targets: this.halo,
      alpha: { from: STONE_TOWN_LIFE.starGlowAlpha.min, to: STONE_TOWN_LIFE.starGlowAlpha.max },
      duration: STONE_TOWN_LIFE.starGlowPeriodMs / 2,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}

// ---- cracks in the plaza floor ---------------------------------------------------------------------------------------

/** Jagged cracks radiating from the fountain across the plaza paving; they stay once drawn. */
export class PlazaCracks {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly paths: Array<Array<{ x: number; y: number }>> = [];

  constructor(scene: Phaser.Scene, basin: { x: number; y: number; rx: number; ry: number }, clip: WorldRect) {
    this.graphics = scene.add.graphics().setDepth(2);
    const random = seeded(1805);
    const { crackCount, crackLength } = STONE_TOWN_AWAKENING;
    for (let index = 0; index < crackCount; index += 1) {
      const angle = (index / crackCount) * Math.PI * 2 + (random() - 0.5) * 0.35;
      let x = basin.x + Math.cos(angle) * basin.rx * 1.02;
      let y = basin.y + Math.sin(angle) * basin.ry * 1.02;
      const length = crackLength.min + random() * (crackLength.max - crackLength.min);
      const points = [{ x, y }];
      let travelled = 0;
      let heading = angle;
      while (travelled < length) {
        heading += (random() - 0.5) * 0.9;
        const step = 16 + random() * 16;
        x += Math.cos(heading) * step;
        y += Math.sin(heading) * step * 0.85;
        if (x < clip.x || x > clip.x + clip.width || y < clip.y || y > clip.y + clip.height) break;
        points.push({ x, y });
        travelled += step;
      }
      if (points.length > 1) this.paths.push(points);
    }
  }

  /** progress 0..1 grows every crack from the basin outward. */
  draw(progress: number): void {
    this.graphics.clear();
    this.graphics.lineStyle(2.5, STONE_TOWN_AWAKENING.crackColor, 0.6);
    for (const path of this.paths) {
      const last = Math.max(1, Math.floor((path.length - 1) * progress));
      this.graphics.beginPath();
      this.graphics.moveTo(path[0].x, path[0].y);
      for (let index = 1; index <= last; index += 1) this.graphics.lineTo(path[index].x, path[index].y);
      this.graphics.strokePath();
    }
  }
}
