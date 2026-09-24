import type { AnomalyHotspot, MapAnomalyConfig } from "../config/bieVillageAnomaly.ts";

/**
 * 画像マップの小さな異変(チリチリ・横ずれ・マップチップ化け)の「どこに・どれだけ」を決める純粋関数。
 * Phaserに依存しないのでテストから乱数を注入して検証できる。座標はすべてネイティブ背景ピクセル。
 */
export type Random = () => number;

export interface MapSize {
  readonly width: number;
  readonly height: number;
}

export interface SparkPlan {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly color: number;
  readonly durationMs: number;
}

export interface TearPlan {
  readonly y: number;
  readonly height: number;
  /** 正なら右、負なら左へずれる。 */
  readonly shift: number;
  readonly durationMs: number;
}

export interface BlockPlan {
  readonly targetX: number;
  readonly targetY: number;
  readonly sourceX: number;
  readonly sourceY: number;
  readonly size: number;
  readonly durationMs: number;
}

export function randomInt(random: Random, range: { readonly min: number; readonly max: number }): number {
  return range.min + Math.floor(random() * (range.max - range.min + 1));
}

export function pickHotspot(random: Random, hotspots: readonly AnomalyHotspot[]): AnomalyHotspot {
  const total = hotspots.reduce((sum, hotspot) => sum + hotspot.weight, 0);
  let roll = random() * total;
  for (const hotspot of hotspots) {
    roll -= hotspot.weight;
    if (roll < 0) return hotspot;
  }
  return hotspots[hotspots.length - 1];
}

export function planSparks(random: Random, config: MapAnomalyConfig): SparkPlan[] {
  const hotspot = pickHotspot(random, config.hotspots);
  const count = randomInt(random, config.sparkCount);
  const sparks: SparkPlan[] = [];
  for (let index = 0; index < count; index += 1) {
    const size = randomInt(random, config.sparkSize);
    sparks.push({
      x: hotspot.area.x + Math.floor(random() * Math.max(1, hotspot.area.width - size)),
      y: hotspot.area.y + Math.floor(random() * Math.max(1, hotspot.area.height - size)),
      size,
      color: config.sparkColors[Math.floor(random() * config.sparkColors.length)],
      durationMs: randomInt(random, config.sparkDurationMs),
    });
  }
  return sparks;
}

export function planTear(random: Random, config: MapAnomalyConfig, map: MapSize): TearPlan {
  const height = randomInt(random, config.tearHeight);
  const magnitude = randomInt(random, config.tearShift);
  return {
    y: Math.floor(random() * (map.height - height)),
    height,
    shift: random() < 0.5 ? -magnitude : magnitude,
    durationMs: randomInt(random, config.tearDurationMs),
  };
}

export function planBlock(random: Random, config: MapAnomalyConfig, map: MapSize): BlockPlan {
  const size = randomInt(random, config.blockSize);
  const hotspot = pickHotspot(random, config.hotspots);
  return {
    targetX: hotspot.area.x + Math.floor(random() * Math.max(1, hotspot.area.width - size)),
    targetY: hotspot.area.y + Math.floor(random() * Math.max(1, hotspot.area.height - size)),
    sourceX: Math.floor(random() * (map.width - size)),
    sourceY: Math.floor(random() * (map.height - size)),
    size,
    durationMs: randomInt(random, config.blockDurationMs),
  };
}
