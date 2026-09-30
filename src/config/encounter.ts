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
// レインランドのもり・いわやまのどうくつの基準頻度(抽選1回あたり25%)。
// 2026-09-27: ユーザー指示で全ダンジョン・森共通の出現率を1.5倍(0.25→0.375)にした。抽選間隔は同じなので、
// 平均して歩く距離は約2/3になる(360÷0.25=1440px → 360÷0.375=960pxごとに1回)。戦闘後の再エンカウント禁止距離は変えない。
const IMAGE_MAP_BASE_RANDOM_ENCOUNTER: RandomEncounterConfig = {
  stepDistance: 360,
  encounterChance: 0.375,
  postBattleCooldownDistance: 450,
} as const;

// 2026-09-25: ユーザー指示でビーエのもりの出現率だけを2倍(0.25→0.5)にした。
// 2026-09-27: ユーザー指示でその時点の値からさらに1.5倍(0.5→0.75)にした。抽選間隔は同じなので、平均して歩く距離は2/3になる
// (360÷0.5=720px → 360÷0.75=480pxごとに1回)。戦闘後の再エンカウント禁止距離は変えない。
export const STARTING_FOREST_RANDOM_ENCOUNTER: RandomEncounterConfig = {
  ...IMAGE_MAP_BASE_RANDOM_ENCOUNTER,
  encounterChance: 0.75,
} as const;

// No.05レインランドのもりもworldScale 1.5の画像マップ。IMAGE_MAP_BASE_RANDOM_ENCOUNTERと同じ頻度(1.5倍後)を使う。
export const RAINLAND_FOREST_RANDOM_ENCOUNTER: RandomEncounterConfig = IMAGE_MAP_BASE_RANDOM_ENCOUNTER;

// No.09いわやまのどうくつもworldScale 1.5の画像マップ。IMAGE_MAP_BASE_RANDOM_ENCOUNTERと同じ頻度(1.5倍後、TEMP_TEST_VALUE)を使う。
export const IWAYAMA_CAVE_RANDOM_ENCOUNTER: RandomEncounterConfig = IMAGE_MAP_BASE_RANDOM_ENCOUNTER;

// No.11 is a compact native-3D grid (one world unit per cell), so its pacing values use
// that coordinate space rather than the 1.5x image-map pixel convention above.
// 2026-09-29: formal monster selection is ENCOUNTER_TABLES.lake_castle. The compact-grid
// pacing values remain TEMP_TEST_VALUE until a device playtest confirms their feel.
// 2026-09-27: ユーザー指示で他のダンジョン・森と同じ割合(encounterChanceのみ0.25→0.375、1.5倍)にした。
export const LAKE_CASTLE_RANDOM_ENCOUNTER: RandomEncounterConfig = {
  stepDistance: 22,
  encounterChance: 0.375,
  postBattleCooldownDistance: 28,
} as const;
