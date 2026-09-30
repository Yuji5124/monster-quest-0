/**
 * Renderer-owned enemy identity. Combat definitions intentionally remain in
 * monsters.ts/BattleSystem; a missing profile receives the safe default.
 */
export type BattleIdleMotion = "none" | "breathe" | "float" | "sway" | "custom";
export type BattleDamageReaction = "light" | "normal" | "heavy" | "custom";
export type BattleEntrance = "none" | "bossFade";

export interface EnemyTelegraphProfile {
  readonly actionId: string;
  readonly message: string;
  readonly auraColor: number;
  readonly durationMs: number;
}

export interface BattlePresentationProfile {
  readonly monsterId: string;
  readonly idleMotion: BattleIdleMotion;
  readonly damageReaction: BattleDamageReaction;
  readonly entrance: BattleEntrance;
  readonly phaseHpRatios: readonly number[];
  readonly telegraphs: readonly EnemyTelegraphProfile[];
}

const DEFAULT_PROFILE: BattlePresentationProfile = {
  monsterId: "default",
  idleMotion: "breathe",
  damageReaction: "normal",
  entrance: "none",
  phaseHpRatios: [],
  telegraphs: [],
};

/** Add enemy-specific visual identity here without adding BattleScene conditionals. */
export const BATTLE_PRESENTATION_PROFILES: Readonly<Record<string, BattlePresentationProfile>> = {
  demas: {
    monsterId: "demas",
    idleMotion: "custom", // DemasBossController owns its supplied sprite-sheet motion.
    damageReaction: "custom",
    entrance: "bossFade",
    phaseHpRatios: [0.35],
    telegraphs: [{
      actionId: "magic_daidain",
      message: "デーマスは　ちからを　ためている！",
      auraColor: 0x8ba7ff,
      durationMs: 620,
    }],
  },
  batorasu: {
    monsterId: "batorasu",
    idleMotion: "sway",
    damageReaction: "heavy",
    entrance: "bossFade",
    phaseHpRatios: [0.5],
    telegraphs: [],
  },
};

export function getBattlePresentationProfile(monsterId: string): BattlePresentationProfile {
  return BATTLE_PRESENTATION_PROFILES[monsterId] ?? DEFAULT_PROFILE;
}

export function getEnemyTelegraph(profile: BattlePresentationProfile, actionId: string): EnemyTelegraphProfile | undefined {
  return profile.telegraphs.find((telegraph) => telegraph.actionId === actionId);
}
