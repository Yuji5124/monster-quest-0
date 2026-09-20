import { DEV_BATTLE_MONSTERS } from "./monsters.ts";

export type MajinCaveEnemyId =
  | "purin"
  | "tamago_ghost"
  | "obake_tsumuri"
  | "fancy_duck"
  | "snow_bomb"
  | "koakuma"
  | "erimaki_hebi"
  | "daija"
  | "majin";

export interface MajinCaveEnemyDefinition {
  readonly id: MajinCaveEnemyId;
  readonly name: string;
  /** DEV_MAJIN_CAVE_BALANCE only. Do not treat as formal MQ0 monster values. */
  readonly maxHp: number;
  /** DEV_MAJIN_CAVE_BALANCE only. Do not treat as formal MQ0 monster values. */
  readonly attack: number;
  readonly markerColor: number;
  readonly isBoss?: boolean;
  /** Only names with a verified existing runtime portrait receive one. */
  readonly portrait?: { readonly key: string; readonly url: string };
}

export const MAJIN_CAVE_ENEMIES: Readonly<Record<MajinCaveEnemyId, MajinCaveEnemyDefinition>> = {
  purin: {
    id: "purin", name: "プリン", maxHp: 24, attack: 6, markerColor: 0xffd66b,
    portrait: { key: "majin-cave.enemy.purin", url: DEV_BATTLE_MONSTERS["003"].portraitUrl },
  },
  tamago_ghost: {
    id: "tamago_ghost", name: "たまゴースト", maxHp: 20, attack: 5, markerColor: 0x8be7ff,
    portrait: { key: "majin-cave.enemy.tamago_ghost", url: DEV_BATTLE_MONSTERS["001"].portraitUrl },
  },
  // No dungeon-size image with a verified name mapping exists for the following enemies.
  obake_tsumuri: { id: "obake_tsumuri", name: "おばけつむり", maxHp: 34, attack: 9, markerColor: 0x9ad487 },
  fancy_duck: { id: "fancy_duck", name: "ファンシーダック", maxHp: 30, attack: 10, markerColor: 0xffa3d1 },
  snow_bomb: { id: "snow_bomb", name: "スノーボム", maxHp: 36, attack: 11, markerColor: 0xa9d8ff },
  koakuma: { id: "koakuma", name: "こあくま", maxHp: 43, attack: 13, markerColor: 0xdb82d6 },
  erimaki_hebi: { id: "erimaki_hebi", name: "エリマキヘビ", maxHp: 46, attack: 14, markerColor: 0xe5b45d },
  daija: { id: "daija", name: "ダイジャ", maxHp: 52, attack: 15, markerColor: 0xd2806c },
  majin: { id: "majin", name: "まじん", maxHp: 150, attack: 19, markerColor: 0xb468ff, isBoss: true },
};

const ENEMY_TABLES = {
  early: ["purin", "tamago_ghost"],
  middle: ["obake_tsumuri", "fancy_duck", "snow_bomb"],
  deep: ["koakuma", "erimaki_hebi", "daija"],
} as const satisfies Record<string, readonly MajinCaveEnemyId[]>;

export function getMajinCaveEnemyTable(floorNumber: number): readonly MajinCaveEnemyId[] {
  if (floorNumber <= 3) return ENEMY_TABLES.early;
  if (floorNumber <= 6) return ENEMY_TABLES.middle;
  return ENEMY_TABLES.deep;
}

export function chooseMajinCaveEnemy(floorNumber: number, random: () => number): MajinCaveEnemyDefinition {
  const table = getMajinCaveEnemyTable(floorNumber);
  return MAJIN_CAVE_ENEMIES[table[Math.floor(random() * table.length)]];
}
