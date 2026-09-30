import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { RAINLAND_WEATHER_VISUALS } from "../config/rainlandWeather.ts";
import type { RainlandWeatherPhase, RainlandWeatherState, RainlandWeatherVisualProfile } from "../config/rainlandWeather.ts";
import type { BattleWeatherContext } from "../events/BattleEventData.ts";
import { isRainlandBattleWeather } from "./BattleWeatherBridge.ts";

const MAX_DELTA_MS = 100;
const WEATHER_TRANSITION_MS = 2800;
const DRAW_INTERVAL_MS = 33;

export const RAINLAND_WEATHER_DEPTH = {
  /** Field: above player(1000), below DEV/text/dialogue. Battle: background/enemy(0..1), below HUD(10). */
  field: { grade: 1240, atmosphere: 1340, precipitation: 1390, lightning: 1800 },
  battle: { grade: 4, atmosphere: 5, precipitation: 7, lightning: 8 },
} as const;

interface WeatherVisualValues {
  rainCount: number;
  rainAlpha: number;
  fogAlpha: number;
  wind: number;
  leafCount: number;
  rippleAlpha: number;
  godRayAlpha: number;
}

interface RainDrop {
  x: number;
  y: number;
  readonly length: number;
  readonly fallSpeed: number;
  readonly alpha: number;
}

interface Leaf {
  x: number;
  y: number;
  readonly size: number;
  readonly phase: number;
}

interface FogPuff {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly phase: number;
}

type PresentationMode = "field" | "battle";

/**
 * Lightweight screen-space weather view. It deliberately uses Phaser Graphics rather than an
 * extra WebGL canvas, post-process pipeline, or full-screen refraction shader so it remains
 * safe on the iPhone Safari target. State is supplied by RainlandWeatherController.
 */
export class RainlandWeatherLayer {
  private readonly scene: Phaser.Scene;
  private readonly mode: PresentationMode;
  private readonly grade: Phaser.GameObjects.Rectangle;
  private readonly atmosphere: Phaser.GameObjects.Graphics;
  private readonly precipitation: Phaser.GameObjects.Graphics;
  private readonly lightning: Phaser.GameObjects.Rectangle;
  private readonly drops: readonly RainDrop[];
  private readonly leaves: readonly Leaf[];
  private readonly fogPuffs: readonly FogPuff[];
  private values: WeatherVisualValues;
  private target: WeatherVisualValues;
  private targetProfile: RainlandWeatherVisualProfile;
  private phase: RainlandWeatherPhase;
  private elapsedMs = 0;
  private sinceDrawMs = DRAW_INTERVAL_MS;
  private untilLightningMs: number | undefined;
  private disposed = false;
  private readonly reducedMotion: boolean;
  private readonly updateHandler: (_time: number, delta: number) => void;

  constructor(
    scene: Phaser.Scene,
    initial: RainlandWeatherState,
    mode: PresentationMode,
    random: () => number = Math.random,
  ) {
    this.scene = scene;
    this.mode = mode;
    const depths = RAINLAND_WEATHER_DEPTH[mode];
    this.phase = initial.phase;
    this.targetProfile = RAINLAND_WEATHER_VISUALS[initial.phase];
    this.values = toVisualValues(this.targetProfile);
    this.target = toVisualValues(this.targetProfile);
    this.reducedMotion = prefersReducedMotion();
    const maxDrops = this.reducedMotion ? 16 : scene.sys.game.device.input.touch ? 28 : 48;
    this.drops = Array.from({ length: maxDrops }, () => createDrop(random));
    this.leaves = Array.from({ length: this.reducedMotion ? 5 : 14 }, () => createLeaf(random));
    this.fogPuffs = Array.from({ length: 6 }, () => createFogPuff(random));
    this.grade = scene.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, this.targetProfile.grade.color, this.targetProfile.grade.alpha)
      .setScrollFactor(0).setDepth(depths.grade);
    this.atmosphere = scene.add.graphics().setScrollFactor(0).setDepth(depths.atmosphere).setBlendMode(Phaser.BlendModes.ADD);
    this.precipitation = scene.add.graphics().setScrollFactor(0).setDepth(depths.precipitation);
    this.lightning = scene.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, 0xdce9ff, 0)
      .setScrollFactor(0).setDepth(depths.lightning).setBlendMode(Phaser.BlendModes.ADD);
    this.scheduleLightning(random);
    this.updateHandler = (_time, rawDelta) => this.update(rawDelta);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateHandler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
    this.draw();
  }

  setWeather(next: RainlandWeatherState): void {
    if (this.phase === next.phase) return;
    this.phase = next.phase;
    this.targetProfile = RAINLAND_WEATHER_VISUALS[next.phase];
    this.target = toVisualValues(this.targetProfile);
    this.grade.setFillStyle(this.targetProfile.grade.color);
    this.scheduleLightning();
  }

  /** A pale warning flash, then the visible strike 0.2 seconds later. Sound is intentionally not fabricated here. */
  predictLightning(): void {
    if (this.disposed || !this.targetProfile.hasLightning) return;
    this.lightning.setAlpha(0.14);
    this.scene.tweens.add({ targets: this.lightning, alpha: 0, duration: 95, ease: "Quad.easeOut" });
    this.scene.time.delayedCall(200, () => this.strikeLightning());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateHandler);
    this.scene.tweens.killTweensOf(this.lightning);
    this.grade.destroy();
    this.atmosphere.destroy();
    this.precipitation.destroy();
    this.lightning.destroy();
  }

  private update(rawDelta: number): void {
    const delta = Math.min(Math.max(0, rawDelta), MAX_DELTA_MS);
    if (!this.reducedMotion) this.elapsedMs += delta;
    const blend = Math.min(1, delta / WEATHER_TRANSITION_MS);
    this.values = blendValues(this.values, this.target, blend);
    this.grade.setAlpha(Phaser.Math.Linear(this.grade.alpha, this.targetProfile.grade.alpha, blend));
    if (this.untilLightningMs !== undefined) {
      this.untilLightningMs -= delta;
      if (this.untilLightningMs <= 0) {
        this.untilLightningMs = undefined;
        this.predictLightning();
        this.scheduleLightning();
      }
    }
    this.sinceDrawMs += delta;
    if (this.sinceDrawMs >= DRAW_INTERVAL_MS || this.reducedMotion) {
      this.draw();
      this.sinceDrawMs = 0;
    }
  }

  private scheduleLightning(random: () => number = Math.random): void {
    this.untilLightningMs = this.targetProfile.hasLightning && !this.reducedMotion
      ? 5800 + random() * 5600
      : undefined;
  }

  private strikeLightning(): void {
    if (this.disposed || !this.targetProfile.hasLightning) return;
    this.lightning.setAlpha(0.68);
    this.scene.tweens.add({ targets: this.lightning, alpha: 0, duration: 150, ease: "Quad.easeIn" });
    this.scene.cameras.main.shake(this.mode === "battle" ? 130 : 90, this.mode === "battle" ? 0.004 : 0.002);
  }

  private draw(): void {
    this.drawAtmosphere();
    this.drawPrecipitation();
  }

  private drawAtmosphere(): void {
    const graphics = this.atmosphere;
    graphics.clear();
    const fog = this.values.fogAlpha;
    if (fog > 0.003) {
      for (const puff of this.fogPuffs) {
        const drift = this.reducedMotion ? 0 : Math.sin(this.elapsedMs / 7000 + puff.phase) * 44;
        const alpha = fog * (0.34 + 0.18 * Math.sin(this.elapsedMs / 4700 + puff.phase));
        graphics.fillStyle(0xdce8eb, Math.max(0, alpha));
        graphics.fillEllipse(puff.x + drift, puff.y, puff.width, puff.height);
      }
    }
    // A small, deliberately non-volumetric god-ray approximation for clearing weather. The
    // source reference needs an occlusion render pass; the one-image map has no such mask.
    if (this.values.godRayAlpha > 0.003) {
      const alpha = this.values.godRayAlpha;
      for (const [index, x] of [105, 250, 410].entries()) {
        const sway = this.reducedMotion ? 0 : Math.sin(this.elapsedMs / (4900 + index * 700) + index) * 24;
        graphics.fillStyle(index === 1 ? 0xfff4c7 : 0xffe4a3, alpha * (index === 1 ? 0.58 : 0.38));
        graphics.fillTriangle(x + sway, -12, x + 76 + sway, -12, x + 260 + sway, DISPLAY.height * 0.72);
      }
    }
  }

  private drawPrecipitation(): void {
    const graphics = this.precipitation;
    graphics.clear();
    const seconds = this.reducedMotion ? 0 : DRAW_INTERVAL_MS / 1000;
    const activeDrops = Math.round(this.values.rainCount);
    for (const [index, drop] of this.drops.entries()) {
      if (index >= activeDrops || this.values.rainAlpha <= 0.002) continue;
      drop.x += this.values.wind * seconds;
      drop.y += drop.fallSpeed * seconds;
      if (drop.y > DISPLAY.height + drop.length) resetDrop(drop, true);
      if (drop.x > DISPLAY.width + 42) drop.x = -42;
      if (drop.x < -42) drop.x = DISPLAY.width + 42;
      graphics.lineStyle(index % 5 === 0 ? 2 : 1, 0xd7ecff, this.values.rainAlpha * drop.alpha);
      graphics.lineBetween(drop.x, drop.y, drop.x - this.values.wind * 0.07, drop.y - drop.length);
    }

    const activeLeaves = Math.round(this.values.leafCount);
    for (const [index, leaf] of this.leaves.entries()) {
      if (index >= activeLeaves) continue;
      const speed = 18 + this.values.wind * 0.48;
      leaf.x += speed * seconds;
      leaf.y += (7 + this.values.wind * 0.08) * seconds;
      if (leaf.x > DISPLAY.width + 28 || leaf.y > DISPLAY.height + 28) resetLeaf(leaf);
      const wobble = this.reducedMotion ? 0 : Math.sin(this.elapsedMs / 180 + leaf.phase) * 8;
      graphics.fillStyle(index % 3 === 0 ? 0xd8be63 : 0x9eb66b, Math.min(0.75, 0.16 + this.values.wind / 180));
      graphics.fillEllipse(leaf.x, leaf.y + wobble, leaf.size, leaf.size * 0.48);
    }

    if (this.values.rippleAlpha > 0.003) {
      const count = this.reducedMotion ? 3 : 7;
      for (let index = 0; index < count; index += 1) {
        const phase = (this.elapsedMs / 850 + index * 0.618) % 1;
        const x = ((index * 149 + 72) % DISPLAY.width) + Math.sin(this.elapsedMs / 2200 + index) * 28;
        const y = DISPLAY.height * (0.57 + (index % 4) * 0.085);
        const width = 8 + phase * 28;
        graphics.lineStyle(1, 0xd5eaff, this.values.rippleAlpha * (1 - phase) * 0.7);
        graphics.strokeEllipse(x, y, width, Math.max(2, width * 0.24));
      }
    }
  }
}

/** Battle-only behavior stays renderer-side; stats, turn order and rewards remain in BattleSystem. */
export class RainlandBattleWeatherPresentation {
  private readonly scene: Phaser.Scene;
  private readonly layer: RainlandWeatherLayer;
  private enemy?: Phaser.GameObjects.Image;
  private silhouetteVisible: boolean;
  private resolvedActionCount = 0;
  private readonly phase: RainlandWeatherPhase;
  private readonly updateHandler: (time: number) => void;

  constructor(scene: Phaser.Scene, weather: BattleWeatherContext) {
    this.scene = scene;
    if (!isRainlandBattleWeather(weather)) throw new Error("Rainland battle presentation requires Rainland weather");
    this.phase = weather.phase;
    this.silhouetteVisible = weather.phase === "fog";
    this.layer = new RainlandWeatherLayer(scene, { phase: weather.phase, phaseDistance: 0 }, "battle");
    this.updateHandler = (time) => {
      if (this.enemy && (this.phase === "heavyRain" || this.phase === "thunderstorm")) {
        // Rotating a fraction of a degree makes the sprite feel caught by gusts without
        // moving its combat anchor or disturbing hit tests/command UI.
        this.enemy.setAngle(Math.sin(time / 260) * 1.4);
      }
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateHandler);
  }

  attachEnemy(enemy: Phaser.GameObjects.Image): void {
    this.enemy = enemy;
    if (this.silhouetteVisible) enemy.setTint(0x17202a);
  }

  /** Call once for each successfully resolved player command. */
  onActionResolved(): void {
    this.resolvedActionCount += 1;
    if (this.silhouetteVisible && this.enemy) {
      this.silhouetteVisible = false;
      this.enemy.clearTint();
      this.scene.tweens.add({ targets: this.enemy, alpha: 0.35, duration: 90, yoyo: true, repeat: 1 });
    }
    // Every fourth resolved command in a thunderstorm receives a readable warning flash,
    // then the strike. It is intentionally visual-only until authored damage values exist.
    if (this.phase === "thunderstorm" && this.resolvedActionCount % 4 === 0) this.layer.predictLightning();
  }

  dispose(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateHandler);
    if (this.enemy) this.enemy.setAngle(0);
    this.layer.dispose();
  }
}

function toVisualValues(profile: RainlandWeatherVisualProfile): WeatherVisualValues {
  return {
    rainCount: profile.rainCount,
    rainAlpha: profile.rainAlpha,
    fogAlpha: profile.fogAlpha,
    wind: profile.wind,
    leafCount: profile.leafCount,
    rippleAlpha: profile.rippleAlpha,
    godRayAlpha: profile.godRayAlpha,
  };
}

function blendValues(current: WeatherVisualValues, target: WeatherVisualValues, amount: number): WeatherVisualValues {
  return {
    rainCount: Phaser.Math.Linear(current.rainCount, target.rainCount, amount),
    rainAlpha: Phaser.Math.Linear(current.rainAlpha, target.rainAlpha, amount),
    fogAlpha: Phaser.Math.Linear(current.fogAlpha, target.fogAlpha, amount),
    wind: Phaser.Math.Linear(current.wind, target.wind, amount),
    leafCount: Phaser.Math.Linear(current.leafCount, target.leafCount, amount),
    rippleAlpha: Phaser.Math.Linear(current.rippleAlpha, target.rippleAlpha, amount),
    godRayAlpha: Phaser.Math.Linear(current.godRayAlpha, target.godRayAlpha, amount),
  };
}

function createDrop(random: () => number): RainDrop {
  return {
    x: random() * DISPLAY.width,
    y: random() * DISPLAY.height,
    length: 11 + random() * 25,
    fallSpeed: 410 + random() * 280,
    alpha: 0.55 + random() * 0.42,
  };
}

function resetDrop(drop: RainDrop, fromTop = false): void {
  drop.x = Math.random() * DISPLAY.width;
  drop.y = fromTop ? -drop.length - Math.random() * 120 : Math.random() * DISPLAY.height;
}

function createLeaf(random: () => number): Leaf {
  return { x: random() * DISPLAY.width, y: random() * DISPLAY.height, size: 8 + random() * 8, phase: random() * Math.PI * 2 };
}

function resetLeaf(leaf: Leaf): void {
  leaf.x = -20;
  leaf.y = Math.random() * DISPLAY.height * 0.82;
}

function createFogPuff(random: () => number): FogPuff {
  return {
    x: random() * DISPLAY.width,
    y: DISPLAY.height * (0.25 + random() * 0.65),
    width: 260 + random() * 290,
    height: 44 + random() * 64,
    phase: random() * Math.PI * 2,
  };
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}
