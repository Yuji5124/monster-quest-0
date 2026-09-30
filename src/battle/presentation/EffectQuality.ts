/**
 * Presentation budget only. This intentionally does not alter combat values,
 * encounters, or save data. LOW is the safe default for touch/reduced-motion
 * devices; settings UI can expose this later without changing effect callers.
 */
export const BATTLE_EFFECT_QUALITIES = ["LOW", "NORMAL", "HIGH"] as const;
export type BattleEffectQuality = (typeof BATTLE_EFFECT_QUALITIES)[number];

export interface BattleEffectQualityEnvironment {
  readonly touch?: boolean;
  readonly reducedMotion?: boolean;
}

export function resolveBattleEffectQuality(environment: BattleEffectQualityEnvironment = {}): BattleEffectQuality {
  return environment.touch || environment.reducedMotion ? "LOW" : "NORMAL";
}

export function getBattleEffectParticleCount(quality: BattleEffectQuality, normalCount: number): number {
  const safeCount = Math.max(0, Math.floor(normalCount));
  if (quality === "LOW") return Math.min(6, Math.max(2, Math.ceil(safeCount * 0.5)));
  if (quality === "HIGH") return Math.ceil(safeCount * 1.25);
  return safeCount;
}
