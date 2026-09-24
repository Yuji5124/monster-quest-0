import { getLearnedMagicAtLevel } from "./characterGrowth.ts";
import { MAGIC_HEAT } from "../data/battleActions.ts";
import type { BattleAction } from "../data/battleActions.ts";

// MAGIC_HEATはBattleAction(判別可能union)として宣言されているため、mpCost/powerへ
// アクセスするにはkind:"magic_damage"を静的に確定させる必要がある(定義側の型は変えない)。
const heatMagicAction = MAGIC_HEAT as Extract<BattleAction, { readonly kind: "magic_damage" }>;

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

const MAJIN_CAVE_HERO_LEVEL = 9; // 2026-09-22ユーザー確定仕様: まじん戦はLv9〜10前後を想定

/**
 * DEV_MAJIN_CAVE_BALANCE: No.08のバランス値。level/maxHp/maxMp/playerAttackは2026-09-23以降
 * 実プレイでは使わず(主人公の実レベルを引き継ぐ)、`DEV_MAJIN_CAVE_HERO`の基準値としてのみ残す。
 */
export const DEV_MAJIN_CAVE_BALANCE = {
  level: MAJIN_CAVE_HERO_LEVEL,
  maxHp: 220,
  maxMp: 24,
  playerAttack: 22,
  heatMpCost: heatMagicAction.mpCost,
  heatDamage: heatMagicAction.power,
  stairRecovery: 18,
  visionRadius: 4,
  enemyChaseDistance: 6,
  /** Normal 1F–9F population. 10F keeps its own two escorts plus the fixed boss. */
  normalEnemyCount: { min: 2, max: 3 },
  /** One 4F–9F floor doubles its independently rolled normal population (4 or 6). */
  monsterHouseEnemyMultiplier: 2,
} as const;

/**
 * 2026-09-23ユーザー指示「まじんのどうくつでは、これまでのレベルを引き継いで冒険する」。
 * どうくつ内の主人公はCharacterProgression(通常フィールド・通常戦闘と同じ累積EXP)から
 * 組み立てる。`DEV_MAJIN_CAVE_HERO`は単体テスト・Scene外検証用の従来値(Lv9固定)のみ。
 */
export interface MajinCaveHeroStats {
  readonly level: number;
  readonly maxHp: number;
  readonly maxMp: number;
  /** 武器補正込みの攻撃力(CharacterProgression.getStats().attack)。 */
  readonly attack: number;
  readonly defense: number;
  readonly hasHeat: boolean;
}

/**
 * TEMP_TEST_VALUE: どうくつの敵HPは通常戦闘と別のDEV値のため、攻撃力をそのままダメージにしない。
 * 想定Lv9(攻撃40)で従来の固定ダメージ22になる比率(22/40)に合わせ、既存の1F〜10F調整を保つ。
 */
export const MAJIN_CAVE_PLAYER_DAMAGE_RATE = 0.55;
/** TEMP_TEST_VALUE: 敵の攻撃は主人公の防御の1/4だけ軽減する(最低1)。 */
export const MAJIN_CAVE_DEFENSE_DIVISOR = 4;

export const DEV_MAJIN_CAVE_HERO: MajinCaveHeroStats = {
  level: MAJIN_CAVE_HERO_LEVEL,
  maxHp: DEV_MAJIN_CAVE_BALANCE.maxHp,
  maxMp: DEV_MAJIN_CAVE_BALANCE.maxMp,
  // 22 / 0.55 = 40。防御0なので敵の攻撃値はそのまま入る(従来どおり)。
  attack: Math.round(DEV_MAJIN_CAVE_BALANCE.playerAttack / MAJIN_CAVE_PLAYER_DAMAGE_RATE),
  defense: 0,
  hasHeat: true,
};

export function getMajinCavePlayerDamage(hero: MajinCaveHeroStats): number {
  return Math.max(1, Math.round(hero.attack * MAJIN_CAVE_PLAYER_DAMAGE_RATE));
}

export function getMajinCaveEnemyDamage(enemyAttack: number, hero: MajinCaveHeroStats): number {
  return Math.max(1, enemyAttack - Math.floor(hero.defense / MAJIN_CAVE_DEFENSE_DIVISOR));
}

/** Lv9主人公が10Fに着く時点でヒートを習得済みであることの安全確認用(データ整合性チェック)。 */
export const MAJIN_CAVE_HERO_HAS_HEAT = getLearnedMagicAtLevel("hero", MAJIN_CAVE_HERO_LEVEL).some((magic) => magic.id === MAGIC_HEAT.id);

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
