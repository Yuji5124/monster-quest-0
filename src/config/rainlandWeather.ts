/**
 * No.05 レインランドのもり専用の天候状態。
 *
 * これは背景アニメーションの選択値ではなく、探索距離で進む小さなゲーム状態である。
 * 数値はすべて TEMP_VISUAL_VALUE。背景の正本・Collision・エンカウント率・戦闘数値は変更しない。
 */

export const RAINLAND_WEATHER_PHASES = [
  "overcast",
  "drizzle",
  "fog",
  "heavyRain",
  "thunderstorm",
  "clearing",
] as const;

export type RainlandWeatherPhase = (typeof RAINLAND_WEATHER_PHASES)[number];

export interface RainlandWeatherState {
  readonly phase: RainlandWeatherPhase;
  /** 現フェーズで実際に歩いたランタイム座標の距離。 */
  readonly phaseDistance: number;
}

export interface RainlandWeatherVisualProfile {
  readonly grade: { readonly color: number; readonly alpha: number };
  /** 画面内に最大で見せる雨筋の本数。タッチ／視差低減ではさらに減らす。 */
  readonly rainCount: number;
  readonly rainAlpha: number;
  readonly fogAlpha: number;
  readonly wind: number;
  readonly leafCount: number;
  readonly rippleAlpha: number;
  readonly godRayAlpha: number;
  readonly hasLightning: boolean;
}

/**
 * フェーズごとの探索距離。`null` は、その地域を出るまで状態を保つ。
 * 1/2マップを通る普通の探索で順番に一度ずつ見せるための TEMP_VISUAL_VALUE。
 */
export const RAINLAND_WEATHER_PHASE_DISTANCE: Readonly<Record<RainlandWeatherPhase, number | null>> = {
  overcast: 900,
  drizzle: 1050,
  fog: 760,
  heavyRain: 980,
  thunderstorm: 820,
  clearing: null,
};

/** All values are presentation-only and remain available for human visual tuning. */
export const RAINLAND_WEATHER_VISUALS: Readonly<Record<RainlandWeatherPhase, RainlandWeatherVisualProfile>> = {
  overcast: {
    grade: { color: 0x7893ac, alpha: 0.1 }, rainCount: 0, rainAlpha: 0,
    fogAlpha: 0.04, wind: 10, leafCount: 2, rippleAlpha: 0, godRayAlpha: 0, hasLightning: false,
  },
  drizzle: {
    grade: { color: 0x6d8fa9, alpha: 0.16 }, rainCount: 18, rainAlpha: 0.34,
    fogAlpha: 0.08, wind: 18, leafCount: 3, rippleAlpha: 0.16, godRayAlpha: 0, hasLightning: false,
  },
  fog: {
    grade: { color: 0xa9bcc3, alpha: 0.18 }, rainCount: 4, rainAlpha: 0.12,
    fogAlpha: 0.36, wind: 5, leafCount: 1, rippleAlpha: 0.04, godRayAlpha: 0, hasLightning: false,
  },
  heavyRain: {
    grade: { color: 0x4e6e8e, alpha: 0.26 }, rainCount: 34, rainAlpha: 0.52,
    fogAlpha: 0.16, wind: 62, leafCount: 8, rippleAlpha: 0.31, godRayAlpha: 0, hasLightning: false,
  },
  thunderstorm: {
    grade: { color: 0x344a6b, alpha: 0.35 }, rainCount: 42, rainAlpha: 0.66,
    fogAlpha: 0.21, wind: 86, leafCount: 12, rippleAlpha: 0.42, godRayAlpha: 0, hasLightning: true,
  },
  clearing: {
    grade: { color: 0xffe0a4, alpha: 0.075 }, rainCount: 7, rainAlpha: 0.16,
    fogAlpha: 0.1, wind: 22, leafCount: 4, rippleAlpha: 0.1, godRayAlpha: 0.2, hasLightning: false,
  },
};

export function createDefaultRainlandWeatherState(): RainlandWeatherState {
  return { phase: "overcast", phaseDistance: 0 };
}

export function isRainlandWeatherPhase(value: unknown): value is RainlandWeatherPhase {
  return typeof value === "string" && (RAINLAND_WEATHER_PHASES as readonly string[]).includes(value);
}

/** Reject malformed saves while allowing old saves to start at the natural first state. */
export function normalizeRainlandWeatherState(value: unknown): RainlandWeatherState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as { phase?: unknown; phaseDistance?: unknown };
  if (!isRainlandWeatherPhase(candidate.phase) || typeof candidate.phaseDistance !== "number" || !Number.isFinite(candidate.phaseDistance) || candidate.phaseDistance < 0) return undefined;
  return { phase: candidate.phase, phaseDistance: Math.floor(candidate.phaseDistance) };
}

/**
 * Moves through every intervening phase in order. This permits a large frame delta after a
 * backgrounded browser tab without skipping authored state transitions.
 */
export function advanceRainlandWeather(state: RainlandWeatherState, exploredDistance: number): RainlandWeatherState {
  let phase = state.phase;
  let phaseDistance = state.phaseDistance + (Number.isFinite(exploredDistance) && exploredDistance > 0 ? exploredDistance : 0);
  while (true) {
    const limit = RAINLAND_WEATHER_PHASE_DISTANCE[phase];
    if (limit === null || phaseDistance < limit) return { phase, phaseDistance };
    phaseDistance -= limit;
    const index = RAINLAND_WEATHER_PHASES.indexOf(phase);
    phase = RAINLAND_WEATHER_PHASES[Math.min(index + 1, RAINLAND_WEATHER_PHASES.length - 1)];
  }
}
