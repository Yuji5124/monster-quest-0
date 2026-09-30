import Phaser from "phaser";
import { STARTING_TOWN_PRESENTATION } from "../config/startingTownPresentation.ts";
import type { StartingTownPresentationConfig } from "../config/startingTownPresentation.ts";

interface RopePoint {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  readonly pinned: boolean;
}

interface PlayerPosition {
  readonly x: number;
  readonly y: number;
}

const MAX_STEP_MS = 100;
const ROPE_SOLVER_STEPS = 3;

/**
 * No.02の水と日よけだけを生かす、表示専用の局所レイヤー。
 *
 * - phaser-raycaster: 町全体を覆う光ではなく、到達した地点だけが変化する設計を採用。
 * - physics-rope: 両端固定・少数点のVerletチェーンで、日よけの裾を風に反応させる。
 * - murmur: 足取りは速く追い、止まった後はゆっくり落ちる activity envelope にする。
 * - simple-water-waves-shader / WebGL-Fluid-Simulation: 噴水への近接を小さな波紋の入力として読む。
 * - GrayScott: 有機的な周期ずれだけを採り、重い反応拡散シミュレーションは動かさない。
 *
 * 背景、Collision、Object、入力、進行フラグ、セーブには触れない。Graphicsは20fps以下でのみ再描画し、
 * iPhone Safariまたは「視差効果を減らす」では静止した控えめな状態だけを一度描く。
 */
export function startStartingTownPresentation(
  scene: Phaser.Scene,
  worldScale: number,
  getPlayerPosition: () => PlayerPosition,
  config: StartingTownPresentationConfig = STARTING_TOWN_PRESENTATION,
): void {
  const reducedMotion = prefersReducedMotion();
  const water = scene.add.graphics().setDepth(config.depths.water).setBlendMode(Phaser.BlendModes.ADD);
  const awning = scene.add.graphics().setDepth(config.depths.awning).setBlendMode(Phaser.BlendModes.ADD);
  const rope = createAwningRope(config.awningHem);

  let elapsedMs = 0;
  let sinceDrawMs = Number.POSITIVE_INFINITY;
  let activity = 0;
  let previousPosition: PlayerPosition | undefined;

  const redraw = (): void => {
    drawWater(water, elapsedMs, worldScale, config, activity, reducedMotion);
    drawAwning(awning, rope, worldScale, config, activity);
  };
  redraw();
  if (reducedMotion) return;

  const update = (_time: number, rawDelta: number): void => {
    const delta = Math.min(rawDelta, MAX_STEP_MS);
    elapsedMs += delta;
    const player = getPlayerPosition();
    const nativePosition = { x: player.x / worldScale, y: player.y / worldScale };
    const speed = previousPosition
      ? Math.hypot(nativePosition.x - previousPosition.x, nativePosition.y - previousPosition.y) / Math.max(1, delta / 1000)
      : 0;
    previousPosition = nativePosition;
    const proximity = focusIntensity(nativePosition, config);
    // Murmurのように、歩き始めはすぐ反応し、停止後は穏やかに戻す。
    const targetActivity = Math.min(1, speed / 140) * 0.5 + proximity;
    activity += (targetActivity - activity) * Math.min(1, (targetActivity > activity ? 8 : 1.1) * delta / 1000);
    stepRope(rope, delta, elapsedMs, activity, config.awningHem);

    sinceDrawMs += delta;
    if (sinceDrawMs >= config.redrawIntervalMs) {
      redraw();
      sinceDrawMs = 0;
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  const cleanup = (): void => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}

function drawWater(
  graphics: Phaser.GameObjects.Graphics,
  elapsedMs: number,
  worldScale: number,
  config: StartingTownPresentationConfig,
  activity: number,
  reducedMotion: boolean,
): void {
  graphics.clear();
  const fountain = config.fountain;
  const fountainBoost = 1 + activity * config.playerResponse.maxIntensity;
  for (let index = 0; index < fountain.rings; index += 1) {
    const phase = reducedMotion ? (index + 1) / (fountain.rings + 1) : positiveModulo(elapsedMs / fountain.periodMs + index / fountain.rings, 1);
    const radiusX = fountain.radiusX + phase * fountain.radiusGrowth;
    const radiusY = fountain.radiusY + phase * fountain.radiusGrowth * 0.54;
    const alpha = fountain.alpha * fountainBoost * (1 - phase) * (0.7 + index * 0.1);
    graphics.lineStyle(Math.max(1, 1.2 * worldScale), fountain.color, alpha);
    graphics.strokeEllipse(fountain.x * worldScale, fountain.y * worldScale, radiusX * 2 * worldScale, radiusY * 2 * worldScale);
  }

  const waterfall = config.waterfall;
  for (let index = 0; index < waterfall.strands; index += 1) {
    const phase = reducedMotion ? index / waterfall.strands : positiveModulo(elapsedMs / (1100 + index * 170) + index * 0.173, 1);
    const x = (waterfall.x - waterfall.width / 2 + waterfall.width * (index + 0.5) / waterfall.strands + Math.sin(phase * Math.PI * 2) * 1.4) * worldScale;
    const top = (waterfall.y + phase * 8) * worldScale;
    const bottom = (waterfall.y + waterfall.height - phase * 10) * worldScale;
    graphics.lineStyle(Math.max(1, 1.1 * worldScale), waterfall.color, waterfall.alpha * (0.72 + phase * 0.28));
    graphics.lineBetween(x, top, x + Math.sin(phase * Math.PI * 4) * 1.2 * worldScale, bottom);
  }

  for (const glint of config.riverGlints) {
    const pulse = reducedMotion ? 0.45 : 0.25 + 0.75 * Math.max(0, Math.sin((elapsedMs / glint.periodMs + glint.phase) * Math.PI * 2));
    const drift = reducedMotion ? 0 : Math.sin((elapsedMs / (glint.periodMs * 0.78) + glint.phase) * Math.PI * 2) * 2.2;
    graphics.lineStyle(Math.max(1, worldScale), 0xf1ffff, 0.11 * pulse);
    graphics.lineBetween((glint.x - glint.width / 2 + drift) * worldScale, glint.y * worldScale, (glint.x + glint.width / 2 + drift) * worldScale, glint.y * worldScale);
  }
}

function drawAwning(
  graphics: Phaser.GameObjects.Graphics,
  rope: readonly RopePoint[],
  worldScale: number,
  config: StartingTownPresentationConfig,
  activity: number,
): void {
  graphics.clear();
  const hem = config.awningHem;
  graphics.lineStyle(Math.max(1, 1.2 * worldScale), hem.color, hem.alpha + activity * 0.1);
  graphics.beginPath();
  graphics.moveTo(rope[0].x * worldScale, rope[0].y * worldScale);
  for (let index = 1; index < rope.length; index += 1) graphics.lineTo(rope[index].x * worldScale, rope[index].y * worldScale);
  graphics.strokePath();
}

function createAwningRope(hem: StartingTownPresentationConfig["awningHem"]): RopePoint[] {
  return Array.from({ length: hem.segments + 1 }, (_, index) => {
    const ratio = index / hem.segments;
    const x = Phaser.Math.Linear(hem.start.x, hem.end.x, ratio);
    const y = Phaser.Math.Linear(hem.start.y, hem.end.y, ratio) + Math.sin(ratio * Math.PI) * hem.sag;
    return { x, y, previousX: x, previousY: y, pinned: index === 0 || index === hem.segments };
  });
}

function stepRope(
  rope: RopePoint[],
  deltaMs: number,
  elapsedMs: number,
  activity: number,
  hem: StartingTownPresentationConfig["awningHem"],
): void {
  const step = Math.min(2, deltaMs / (1000 / 60));
  const wind = Math.sin(elapsedMs / 1100) * (0.055 + activity * 0.12);
  for (const point of rope) {
    if (point.pinned) continue;
    const velocityX = (point.x - point.previousX) * 0.92;
    const velocityY = (point.y - point.previousY) * 0.92;
    point.previousX = point.x;
    point.previousY = point.y;
    point.x += velocityX + wind * step * step;
    point.y += velocityY + 0.032 * step * step;
  }

  const restLength = Math.hypot(hem.end.x - hem.start.x, hem.end.y - hem.start.y) / hem.segments;
  for (let iteration = 0; iteration < ROPE_SOLVER_STEPS; iteration += 1) {
    rope[0].x = hem.start.x;
    rope[0].y = hem.start.y;
    rope[rope.length - 1].x = hem.end.x;
    rope[rope.length - 1].y = hem.end.y;
    for (let index = 0; index < rope.length - 1; index += 1) {
      const first = rope[index];
      const second = rope[index + 1];
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const correction = (distance - restLength) / distance;
      if (!first.pinned) {
        first.x += dx * correction * 0.5;
        first.y += dy * correction * 0.5;
      }
      if (!second.pinned) {
        second.x -= dx * correction * 0.5;
        second.y -= dy * correction * 0.5;
      }
    }
  }
}

function focusIntensity(position: PlayerPosition, config: StartingTownPresentationConfig): number {
  const distance = Math.hypot(position.x - config.fountain.x, position.y - config.fountain.y);
  return Phaser.Math.Clamp(1 - distance / config.playerResponse.range, 0, 1) * config.playerResponse.maxIntensity;
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}
