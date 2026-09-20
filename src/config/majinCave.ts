/** No.08 only. These values are intentionally isolated from normal field movement and battle. */
export const MAJIN_CAVE_SCENE_KEY = "MajinCaveScene";
export const MAJIN_CAVE_MAP_ID = "map_08_majin_cave";
export const MAJIN_CAVE_FLOOR_COUNT = 10;
export const MAJIN_CAVE_DEFAULT_SEED = 8008;

export const MAJIN_CAVE_GRID = {
  columns: 24,
  rows: 17,
  tileSize: 32,
  originX: 96,
  originY: 66,
} as const;

export const MAJIN_CAVE_TILESET = {
  key: "map.majin_cave.tileset",
  metadataKey: "map.majin_cave.tileset_metadata",
  imageUrl: new URL("../../assets/maps/majin_cave/tileset.png", import.meta.url).toString(),
  metadataUrl: new URL("../../assets/maps/majin_cave/tileset.json", import.meta.url).toString(),
} as const;

/**
 * DEV_MAJIN_CAVE_BALANCE: No.08's formal Lv8 values are not decided yet.
 * This state is local to a run and does not overwrite GameState character progression.
 */
export const DEV_MAJIN_CAVE_BALANCE = {
  level: 8,
  maxHp: 220,
  maxMp: 24,
  playerAttack: 22,
  stairRecovery: 18,
  visionRadius: 4,
  enemyChaseDistance: 6,
  /** Normal 1F–9F population. 10F keeps its own two escorts plus the fixed boss. */
  normalEnemyCount: { min: 2, max: 3 },
  /** One 4F–9F floor doubles its independently rolled normal population (4 or 6). */
  monsterHouseEnemyMultiplier: 2,
} as const;

/** Exactly one candidate is selected from this list for every No.08 run. */
export const MAJIN_CAVE_MONSTER_HOUSE_CANDIDATE_FLOORS = [4, 5, 6, 7, 8, 9] as const;

export type MajinCavePhase = "descent" | "ascent";

export interface MajinCavePoint {
  readonly x: number;
  readonly y: number;
}

export interface MajinCaveTheme {
  readonly floorFrames: readonly number[];
  readonly wallFrame: number;
  readonly tint: number;
  readonly accentFrames: readonly number[];
}

/** The supplied 1–3F atlas is reused with small, non-destructive tint changes for depth. */
export function getMajinCaveTheme(floorNumber: number): MajinCaveTheme {
  if (floorNumber <= 3) return { floorFrames: [0, 1, 3, 4, 5, 6], wallFrame: 56, tint: 0xffffff, accentFrames: [38, 43, 49] };
  if (floorNumber <= 6) return { floorFrames: [2, 5, 7, 61], wallFrame: 57, tint: 0x9ecaff, accentFrames: [40, 41, 54] };
  if (floorNumber <= 9) return { floorFrames: [2, 7, 44, 60], wallFrame: 56, tint: 0xb985a2, accentFrames: [42, 49, 51] };
  return { floorFrames: [2, 7, 44, 60], wallFrame: 57, tint: 0xb277c9, accentFrames: [42, 51, 54] };
}
