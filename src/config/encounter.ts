/** TEMP_TEST_VALUE / DEV_BATTLE_BALANCE: pacing only, not a final MQ0 balance decision (BATTLE_SPEC.md §11). */
export interface RandomEncounterConfig {
  /** Background-pixel distance the player must actually walk before each encounter roll. */
  readonly stepDistance: number;
  /** Probability (0..1) that a roll started after stepDistance actually starts a battle. */
  readonly encounterChance: number;
  /** Background-pixel distance that must be walked after returning from battle before rolling resumes. */
  readonly postBattleCooldownDistance: number;
}

// 2026-09-19: No.03ビーエのもり（内部starting_forest）のworldScale(1.5、StartingForestScene参照)に合わせ、同じ相対頻度を保つため
// stepDistance/postBattleCooldownDistanceも1.5倍(240→360, 300→450)にスケールした。
export const STARTING_FOREST_RANDOM_ENCOUNTER: RandomEncounterConfig = {
  stepDistance: 360,
  encounterChance: 0.25,
  postBattleCooldownDistance: 450,
} as const;

// No.05レインランドのもりもworldScale 1.5の画像マップなので、ビーエのもりと同じ頻度を使う。
export const RAINLAND_FOREST_RANDOM_ENCOUNTER: RandomEncounterConfig = STARTING_FOREST_RANDOM_ENCOUNTER;

// No.09いわやまのどうくつもworldScale 1.5の画像マップなので、ビーエのもりと同じ頻度を使う(TEMP_TEST_VALUE)。
export const IWAYAMA_CAVE_RANDOM_ENCOUNTER: RandomEncounterConfig = STARTING_FOREST_RANDOM_ENCOUNTER;
