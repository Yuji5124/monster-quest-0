import type { DevBattleMonsterId } from "../config/battle.ts";

/**
 * Region encounter table (DATA_CONTRACTS.md §9 / BATTLE_SPEC.md §11: "地域ごとの敵構成・出現率はJSON管理").
 * `enemies` stays an array for contract compatibility, but every entry here holds exactly one
 * monster: MONSTER_QUEST_0_SPEC (item 8 of this task) requires a single enemy per battle only.
 */
export interface EncounterTableEntry {
  readonly enemies: readonly [DevBattleMonsterId];
  readonly weight: number;
}

export interface EncounterTable {
  readonly id: string;
  readonly entries: readonly EncounterTableEntry[];
}

export const ENCOUNTER_TABLES = {
  starting_forest: {
    id: "encounter_starting_forest",
    entries: [
      { enemies: ["001"], weight: 1 },
      { enemies: ["003"], weight: 1 },
    ],
  },
  // No.05レインランドのもり(その1・その2共通)。出現率は均等のTEMP_TEST_VALUE。
  rainland_forest: {
    id: "encounter_rainland_forest",
    entries: [
      { enemies: ["obake_tsumuri"], weight: 1 },
      { enemies: ["fancy_duck"], weight: 1 },
      { enemies: ["snow_bomb"], weight: 1 },
    ],
  },
  // No.09いわやまのどうくつ(1F・2F共通)。まじんのどうくつ7〜10Fの敵(ユーザーのメモ)を引き継ぐ。構成・出現率は均等のTEMP_TEST_VALUE。
  iwayama_cave: {
    id: "encounter_iwayama_cave",
    entries: [
      { enemies: ["koakuma"], weight: 1 },
      { enemies: ["erimaki_hebi"], weight: 1 },
      { enemies: ["daija"], weight: 1 },
    ],
  },
} as const satisfies Record<string, EncounterTable>;

export type EncounterTableId = keyof typeof ENCOUNTER_TABLES;

/** Weighted single-enemy pick. Throws on an empty/invalid table rather than silently defaulting an enemy. */
export function rollEncounterMonster(table: EncounterTable, random: () => number = Math.random): DevBattleMonsterId {
  const totalWeight = table.entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (table.entries.length === 0 || totalWeight <= 0) {
    throw new Error(`encounter table ${table.id} has no positive-weight entries`);
  }
  let roll = random() * totalWeight;
  for (const entry of table.entries) {
    roll -= entry.weight;
    if (roll < 0) return entry.enemies[0];
  }
  return table.entries[table.entries.length - 1].enemies[0];
}
